/* =========================================================================
   scene-core.js — module ES, chargé dynamiquement par scene-ui.js.
   Construit une seule visualisation Three.js à partir des mêmes données que
   le reste du site (globals de data.js : FAM, KINDS, S, BASE, SAMPLE, DD) :
   le contenu mémoire du PE rendu comme une barrette de RAM, que l'on peut
   « disséquer » (faire décoller les puces de la carte pour les examiner
   séparément).
   ========================================================================= */
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

/* ---------- utilitaires partagés avec le reste du site ---------- */
function getArch() {
  try { const a = localStorage.getItem("pe-ref-arch"); return a === "32" ? 32 : 64; } catch (e) { return 64; }
}
function famColor(fam) { return (FAM[fam] || FAM.pad).color; }
function esc(s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }
function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
function truncText(ctx, text, maxW) {
  if (ctx.measureText(text).width <= maxW) return text;
  let t = text;
  while (t.length > 1 && ctx.measureText(t + "…").width > maxW) t = t.slice(0, -1);
  return t + "…";
}

/* ---------- étiquette texte simple (sprite canvas) ---------- */
function makeLabel(text, colorHex) {
  const cnv = document.createElement("canvas");
  cnv.width = 256; cnv.height = 56;
  const ctx = cnv.getContext("2d");
  ctx.font = "600 30px 'JetBrains Mono', monospace";
  ctx.textBaseline = "middle";
  const w = Math.min(ctx.measureText(text).width + 22, 252);
  ctx.clearRect(0, 0, 256, 56);
  ctx.fillStyle = "rgba(8,11,16,.82)";
  roundRect(ctx, (256 - w) / 2, 8, w, 40, 9);
  ctx.fill();
  ctx.strokeStyle = colorHex; ctx.lineWidth = 1.5;
  roundRect(ctx, (256 - w) / 2, 8, w, 40, 9);
  ctx.stroke();
  ctx.fillStyle = "#f3f6fb";
  ctx.textAlign = "center";
  ctx.fillText(text, 128, 29, w - 14);
  const tex = new THREE.CanvasTexture(cnv);
  tex.colorSpace = THREE.SRGBColorSpace;
  const mat = new THREE.SpriteMaterial({ map: tex, depthWrite: false, transparent: true });
  const sprite = new THREE.Sprite(mat);
  sprite.scale.set(1.9, 0.42, 1);
  return sprite;
}

/* =========================================================================
   createScene : point d'entrée appelé par scene-ui.js
   ========================================================================= */
export function createScene(host, opts) {
  const panelEl = opts.panelEl, legendEl = opts.legendEl;
  const arch = getArch();

  const scene = new THREE.Scene();
  const bg = new THREE.Color(0x0a0d12);
  scene.background = bg;
  scene.fog = new THREE.Fog(bg, 20, 70);

  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 300);
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
  } catch (e) {
    throw new Error(t("scene3d.webglUnavailable"));
  }
  renderer.setClearColor(bg, 1);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  host.appendChild(renderer.domElement);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.minDistance = 3;
  controls.maxDistance = 140;
  controls.maxPolarAngle = Math.PI * 0.94;

  scene.add(new THREE.HemisphereLight(0xaebfe0, 0x0a0d12, 1.1));
  const dir = new THREE.DirectionalLight(0xffffff, 1.0);
  dir.position.set(8, 14, 10);
  scene.add(dir);
  const fill = new THREE.PointLight(0x6a7dff, 0.5, 90);
  fill.position.set(-10, 6, -8);
  scene.add(fill);

  const raycaster = new THREE.Raycaster();
  const mouse = new THREE.Vector2();

  const ramGroup = new THREE.Group();
  scene.add(ramGroup);

  const ramPick = [], ramLabels = [];
  const chipGroups = [], pinObjs = [];
  let dissected = false;
  let hovered = null;
  let destroyed = false;

  /* ================= barrette de RAM — image mémoire du PE ================= */
  (function buildRamStick() {
    const DOS = 0x40, STUB = 0x40;
    const richEntries = SAMPLE.rich.length;
    const RICH = 4 + 12 + richEntries * 8 + 4 + 4;
    const NT_OFF = DOS + STUB + RICH;
    const OPT_SIZE = arch === 32 ? 0xE0 : 0xF0;
    const DD_SIZE = 128;
    const SEC_OFF = NT_OFF + 24 + OPT_SIZE;
    const SEC_HDRS = 40 * SAMPLE.sections.length;
    const HDR_END = SEC_OFF + SEC_HDRS;
    const SIZE_OF_HEADERS = 0x400;
    const SECTION_COLOR = "#7ee0a6";

    const memEnd = Math.max(SIZE_OF_HEADERS, ...SAMPLE.sections.map(s => s.VirtualAddress + s.VirtualSize));
    const W = 32;
    const SCALE = W / memEnd;
    const x0 = off => off * SCALE - W / 2;

    const Y = 0.55, D = 1.7;
    const PCB_T = 0.16;
    const STAIR = 0.62;

    /* ---- carte PCB (le corps de la barrette) ---- */
    const pcbMat = new THREE.MeshStandardMaterial({ color: 0x0c3d28, roughness: 0.6, metalness: 0.12 });
    const pcb = new THREE.Mesh(new THREE.BoxGeometry(W + 1.2, PCB_T, D + 0.5), pcbMat);
    pcb.position.set(0, -PCB_T / 2, 0);
    ramGroup.add(pcb);

    /* encoche d'alignement, comme sur une vraie barrette DIMM */
    const notchMat = new THREE.MeshStandardMaterial({ color: 0x06160f, roughness: 0.85 });
    const notch = new THREE.Mesh(new THREE.BoxGeometry(0.5, PCB_T + 0.02, 0.3), notchMat);
    notch.position.set(-W * 0.18, -PCB_T / 2, -(D + 0.5) / 2 + 0.02);
    ramGroup.add(notch);

    /* connecteurs dorés le long du bord avant */
    const N_PINS = 46;
    const pinGeo = new THREE.BoxGeometry(0.11, 0.05, 0.3);
    const pinMat = new THREE.MeshStandardMaterial({ color: 0xd8b24a, roughness: 0.35, metalness: 0.75, emissive: 0x3a2d08, emissiveIntensity: 0.2 });
    const pinsMesh = new THREE.InstancedMesh(pinGeo, pinMat, N_PINS);
    const m4 = new THREE.Matrix4();
    for (let i = 0; i < N_PINS; i++) {
      const px = -W / 2 - 0.4 + (i + 0.5) * ((W + 0.8) / N_PINS);
      m4.makeTranslation(px, -PCB_T - 0.01, (D + 0.5) / 2 - 0.1);
      pinsMesh.setMatrixAt(i, m4);
    }
    ramGroup.add(pinsMesh);

    let order = 0;
    function chip({ start, size, fam, label, sub, goto: g, minW }) {
      const w = Math.max(minW || 0.12, size * SCALE);
      const grp = new THREE.Group();
      grp.position.set(x0(start) + w / 2, 0, 0);
      ramGroup.add(grp);

      const color = fam ? famColor(fam) : SECTION_COLOR;
      const mat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(color), roughness: 0.42, metalness: 0.12,
        emissive: new THREE.Color(color), emissiveIntensity: 0.16
      });
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, Y, D), mat);
      mesh.position.set(0, Y / 2, 0);
      mesh.userData = { kind: "block", label, sub, fam, goto: g, baseEmissive: 0.16, baseScale: 1 };
      grp.add(mesh);
      ramPick.push(mesh);

      const lab = makeLabel(label, color);
      lab.position.set(0, Y + 0.42, 0);
      grp.add(lab);
      ramLabels.push(lab);

      grp.userData.homeY = 0;
      grp.userData.explodedY = 0.9 + order * STAIR;
      order++;
      chipGroups.push(grp);
      return grp;
    }

    const headerParts = [
      { start: 0, size: DOS, fam: "dos", label: "DOS Header", goto: "#dos" },
      { start: DOS, size: STUB, fam: "stub", label: "Stub MS-DOS", goto: "#dos" },
      { start: DOS + STUB, size: RICH, fam: "rich", label: "Rich Header", goto: "#rich" },
      { start: NT_OFF, size: 24, fam: "file", label: "Signature + File Hdr", goto: "#file" },
      { start: NT_OFF + 24, size: OPT_SIZE - DD_SIZE, fam: "opt", label: "Optional Header", goto: "#optional" },
      { start: NT_OFF + 24 + (OPT_SIZE - DD_SIZE), size: DD_SIZE, fam: "dd", label: "Data Directory[16]", goto: "#optional/s-DDTABLE" },
      { start: SEC_OFF, size: SEC_HDRS, fam: "sec", label: "Section Headers", goto: "#sections" }
    ];
    if (HDR_END < SIZE_OF_HEADERS) headerParts.push({ start: HDR_END, size: SIZE_OF_HEADERS - HDR_END, fam: "pad", label: t("common.padding"), goto: null });

    headerParts.forEach(p => chip(Object.assign({ sub: "RVA 0x" + p.start.toString(16).toUpperCase() }, p)));

    SAMPLE.sections.forEach(sec => {
      chip({
        start: sec.VirtualAddress, size: sec.VirtualSize, label: sec.Name,
        sub: "RVA 0x" + sec.VirtualAddress.toString(16).toUpperCase() + " · " + tf("scene3d.alsoFileOffset", { off: "0x" + sec.PointerToRawData.toString(16).toUpperCase() }),
        goto: "#sections", minW: 0.25
      });
    });

    function findSection(rva) { return SAMPLE.sections.find(s => rva >= s.VirtualAddress && rva < s.VirtualAddress + s.VirtualSize); }
    function pin(rva, fam, label, g) {
      const sec = findSection(rva);
      const baseY = Y + 0.95;
      const px = x0(rva);
      const grp = new THREE.Group();
      const sph = new THREE.Mesh(new THREE.SphereGeometry(0.16, 16, 16), new THREE.MeshStandardMaterial({ color: famColor(fam), emissive: famColor(fam), emissiveIntensity: 0.5, roughness: 0.3 }));
      sph.position.set(px, baseY, -D / 2 - 0.5);
      sph.userData = { kind: "block", label, sub: "DataDirectory → 0x" + rva.toString(16).toUpperCase() + (sec ? " · section " + sec.Name : ""), fam, goto: g, baseEmissive: 0.5, baseScale: 1 };
      grp.add(sph);
      ramPick.push(sph);
      const pts = [new THREE.Vector3(px, Y / 2, -D / 2), new THREE.Vector3(px, baseY, -D / 2 - 0.5)];
      grp.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: famColor(fam), transparent: true, opacity: 0.55 })));
      const lab = makeLabel(label, famColor(fam));
      lab.position.set(px, baseY + 0.42, -D / 2 - 0.5);
      grp.add(lab);
      ramLabels.push(lab);
      ramGroup.add(grp);
      pinObjs.push(grp);
    }
    Object.keys(SAMPLE.dirs).forEach(k => {
      const d = DD[+k];
      if (!d || !d[3]) return;
      pin(SAMPLE.dirs[k][0], S[d[3]].fam, d[1], "#" + d[4] + "/s-" + d[3]);
    });
    pin(SAMPLE.entry, "opt", "EntryPoint", "#optional/f-IMAGE_OPTIONAL_HEADER.AddressOfEntryPoint");
  })();

  /* ================= légende (familles présentes sur la barrette) ================= */
  if (legendEl) {
    const used = new Set();
    ramPick.forEach(m => used.add(m.userData.fam));
    legendEl.innerHTML = [...used].filter(f => FAM[f]).map(f =>
      "<span class=\"s3-lg\" style=\"--c:" + famColor(f) + "\"><i></i>" + FAM[f].label + "</span>"
    ).join("");
  }

  /* ================= caméra / redimensionnement ================= */
  function resize() {
    const r = host.getBoundingClientRect();
    const w = Math.max(1, r.width), h = Math.max(1, r.height);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    renderer.setSize(w, h, false);
  }
  const ro = new ResizeObserver(resize);
  ro.observe(host);

  function resetCamera() {
    camera.position.set(0, 13, 17);
    controls.target.set(0, 0, 0);
    controls.update();
  }

  function setLabels(v) { ramLabels.forEach(l => l.visible = v); }
  function setDissect(v) {
    dissected = v;
    pinObjs.forEach(o => o.visible = !v);
  }

  function defaultPanel() {
    return "<div class=\"s3-empty\">" + esc(t("scene3d.hoverHint")) + "</div>";
  }
  if (panelEl) panelEl.innerHTML = defaultPanel();

  /* ================= interaction souris ================= */
  function setPointer(e) {
    const r = host.getBoundingClientRect();
    mouse.x = ((e.clientX - r.left) / r.width) * 2 - 1;
    mouse.y = -((e.clientY - r.top) / r.height) * 2 + 1;
  }
  function applyHoverStyle(obj, on) {
    if (!obj || !obj.userData) return;
    if (!obj.material) return;
    obj.material.emissiveIntensity = on ? obj.userData.baseEmissive * 2.4 + 0.25 : obj.userData.baseEmissive;
  }
  function onMove(e) {
    setPointer(e);
    raycaster.setFromCamera(mouse, camera);
    const hits = raycaster.intersectObjects(ramPick, false);
    const hit = hits[0] && hits[0].object;
    if (hit === hovered) return;
    if (hovered) applyHoverStyle(hovered, false);
    hovered = hit || null;
    if (hovered) {
      applyHoverStyle(hovered, true);
      host.style.cursor = "pointer";
      if (panelEl) panelEl.innerHTML = panelFor(hovered.userData);
    } else {
      host.style.cursor = "grab";
      if (panelEl) panelEl.innerHTML = defaultPanel();
    }
  }
  function onClick() {
    if (!hovered) return;
    const d = hovered.userData;
    if (d.goto) location.hash = d.goto;
  }
  function panelFor(d) {
    return "<div class=\"s3-card\" style=\"--c:" + famColor(d.fam) + "\"><h5>" + esc(d.label) + "</h5>" +
      (d.sub ? "<p class=\"s3-sub\">" + esc(d.sub) + "</p>" : "") +
      (d.goto ? "<a class=\"s3-open\" href=\"" + d.goto + "\">" + esc(t("scene3d.openSheet")) + "</a>" : "<span class=\"s3-nolink\">" + esc(t("scene3d.visualMarkerNoSheet")) + "</span>") + "</div>";
  }

  host.addEventListener("pointermove", onMove);
  host.addEventListener("click", onClick);
  host.style.cursor = "grab";

  resize();
  resetCamera();

  let raf = 0;
  function tick() {
    if (destroyed) return;
    chipGroups.forEach(g => {
      const target = dissected ? g.userData.explodedY : g.userData.homeY;
      g.position.y += (target - g.position.y) * 0.1;
    });
    controls.update();
    renderer.render(scene, camera);
    raf = requestAnimationFrame(tick);
  }
  tick();

  function destroy() {
    destroyed = true;
    cancelAnimationFrame(raf);
    ro.disconnect();
    host.removeEventListener("pointermove", onMove);
    host.removeEventListener("click", onClick);
    controls.dispose();
    scene.traverse(obj => {
      /* géométries et matériaux sont parfois partagés : dispose() est sans
         effet de bord s'il est appelé plusieurs fois sur la même ressource. */
      if (obj.geometry) obj.geometry.dispose();
      if (obj.material) {
        const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
        mats.forEach(m => { if (m.map) m.map.dispose(); m.dispose(); });
      }
    });
    renderer.dispose();
    if (renderer.domElement.parentNode) renderer.domElement.parentNode.removeChild(renderer.domElement);
  }

  return { resetCamera, setLabels, setDissect, destroy };
}
