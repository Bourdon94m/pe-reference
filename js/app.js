"use strict";
(function () {
  /* ======================= état ======================= */
  let ARCH = 64;
  let THEME = "dark";
  let CUR = null;
  try {
    const a = localStorage.getItem("pe-ref-arch");
    if (a === "32" || a === "64") ARCH = +a;
    if (localStorage.getItem("pe-ref-theme") === "light") THEME = "light";
  } catch (e) { /* stockage indisponible */ }
  const a32 = () => ARCH === 32;
  const $ = (s, r) => (r || document).querySelector(s);
  const main = $("#main");

  /* ======================= utilitaires ======================= */
  const esc = s => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  const hex = (n, w) => "0x" + BigInt(n).toString(16).toUpperCase().padStart(w || 0, "0");
  const famColor = f => (FAM[f] || FAM.pad).color;

  function fmt(p) {
    return esc(p)
      .replace(/\{\{([A-Z0-9_]+)(?:\.([A-Za-z0-9_]+))?\}\}/g, (m, id, f) => sLink(id, f))
      .replace(/\*\*([^*\n]+)\*\*/g, "<b>$1</b>")
      .replace(/\*([^*\n]+)\*/g, "<i>$1</i>")
      .replace(/\n/g, "<br>");
  }
  function rich(t) {
    return String(t).split("`").map((p, i) => (i % 2 ? "<code>" + esc(p) + "</code>" : fmt(p))).join("");
  }

  function dispName(id) {
    const s = S[id];
    return s && Array.isArray(s.name) ? s.name[a32() ? 0 : 1] : id;
  }
  function sLink(id, f, via) {
    const s = S[id];
    if (!s) return "<span class=\"tname\">" + esc(id) + "</span>";
    return "<a class=\"slink\"" + (via ? " data-via=\"" + esc(via) + "\"" : "") + " style=\"--c:" + famColor(s.fam) + "\" href=\"#" + s.page + "/" + (f ? "f-" + id + "." + f : "s-" + id) + "\">" + esc(id) + (f ? "." + esc(f) : "") + "</a>";
  }

  /* ======================= fil d'Ariane de navigation ======================= */
  function getTrail() {
    try { return JSON.parse(sessionStorage.getItem("pe-ref-trail") || "[]"); } catch (e) { return []; }
  }
  function setTrail(trail) {
    try { sessionStorage.setItem("pe-ref-trail", JSON.stringify(trail)); } catch (e) { /* ignore */ }
  }
  function trailNavigate(srcId, targetId, via) {
    if (!srcId || !targetId || srcId === targetId) return;
    let trail = getTrail();
    if (!trail.length || trail[trail.length - 1].id !== srcId) trail = [{ id: srcId }];
    const idx = trail.findIndex(n => n.id === targetId);
    if (idx >= 0) trail = trail.slice(0, idx + 1);
    else trail.push({ id: targetId, via: via || null });
    setTrail(trail);
  }
  function trailBlock(id) {
    const trail = getTrail();
    const idx = trail.findIndex(n => n.id === id);
    if (idx < 1) return "";
    const nodes = trail.slice(0, idx + 1);
    const parts = nodes.map((n, i) => {
      const s = S[n.id];
      const last = i === nodes.length - 1;
      const c = s ? famColor(s.fam) : "#8f9bab";
      const label = esc(s ? dispName(n.id) : n.id);
      const sep = i > 0 ? "<span class=\"bc-sep\">→</span>" + (n.via ? "<span class=\"bc-via\">" + esc(n.via) + "</span>" : "") : "";
      const crumb = last
        ? "<span class=\"bc-cur\" style=\"--c:" + c + "\">" + label + "</span>"
        : "<a class=\"bc-link\" style=\"--c:" + c + "\" href=\"#" + (s ? s.page : "overview") + "/s-" + n.id + "\">" + label + "</a>";
      return sep + crumb;
    }).join("");
    return "<div class=\"breadcrumb\"><span class=\"bc-label\">" + esc(t("trail.label")) + "</span>" + parts + "<button class=\"bc-clear\" data-trail-clear title=\"" + esc(t("trail.clear")) + "\">✕</button></div>";
  }
  function kchip(k) {
    const kd = KINDS[k];
    if (!kd) return "";
    return "<span class=\"kchip\" style=\"--c:" + kd.color + "\" title=\"" + esc(kd.help) + "\">" + kd.label + "</span>";
  }

  /* ======================= mise en page des structures ======================= */
  const memo = {};
  const typeOf = f => (Array.isArray(f.t) ? f.t[a32() ? 0 : 1] : f.t);
  function sizeOfType(t) {
    if (BASE[t]) return BASE[t];
    if (S[t]) return layout(t).size;
    return 1; /* ASCIIZ & co */
  }
  function layout(id) {
    const key = id + ARCH;
    if (memo[key]) return memo[key];
    const s = S[id];
    let off = 0, max = 0, vs = false;
    const rows = [];
    for (const f of s.fields) {
      if (f.only && f.only !== ARCH) continue;
      const t = typeOf(f);
      const esz = sizeOfType(t);
      const n = f.c || 1;
      const size = esz * n;
      rows.push({ f, t, off: s.union ? 0 : off, esz, n, size });
      if (s.union) max = Math.max(max, size); else off += size;
      if (f.vs) vs = true;
    }
    return (memo[key] = { rows, size: s.union ? max : off, vs });
  }

  /* ======================= génération du code C ======================= */
  function cgen(id) {
    const s = S[id];
    const L = layout(id);
    const name = dispName(id);
    const out = [];
    if (s.hdr && /non document/.test(s.hdr)) out.push("/* structure non officielle — absente de windows.h */");
    if (s.pack) out.push("#pragma pack(push, " + s.pack + ")");
    out.push("typedef struct _" + name + " {");
    const entries = [];
    if (s.union) {
      out.push("    union {");
      L.rows.forEach(r => out.push("        " + r.t + " " + r.f.n + ";"));
      out.push("    } " + (s.wrapper || "u") + ";");
    } else {
      L.rows.forEach(r => {
        const f = r.f;
        if (f.cRaw) { entries.push([f.cRaw, "", true]); return; }
        const tn = S[r.t] ? dispName(r.t) : r.t;
        const arr = f.c ? (f.vs ? "[1]" : "[" + f.c + "]") : "";
        let decl;
        if (f.alt) {
          const nm = f.u || "DUMMYUNIONNAME";
          decl = "union { " + f.alt.map(a => tn + " " + a + "; ").join("") + tn + " " + f.n + "; } " + nm + ";";
        } else decl = tn + " " + f.n + arr + ";";
        entries.push([decl, "// +" + hex(r.off, 2), false]);
      });
      const w = Math.max.apply(null, entries.filter(e => !e[2]).map(e => e[0].length).concat([0]));
      entries.forEach(e => out.push("    " + (e[2] ? e[0] : e[0].padEnd(w + 2) + e[1])));
    }
    out.push("} " + name + ", *P" + name + ";");
    if (s.pack) out.push("#pragma pack(pop)");
    if (Array.isArray(s.name)) out.push("/* typedef " + name + " " + id + ";   (" + s.name[a32() ? 1 : 0] + " si compilé pour " + (a32() ? "x64" : "x86") + ") */");
    return out.join("\n");
  }

  function identFam(name) {
    let s = name.replace(/^P(?=IMAGE_)/, "");
    if (S[s]) return S[s].fam;
    s = s.replace(/(32|64)$/, "");
    if (S[s]) return S[s].fam;
    const pref = [["IMAGE_REL_BASED_", "reloc"], ["IMAGE_DIRECTORY_ENTRY_", "dd"], ["IMAGE_SCN_", "sec"], ["IMAGE_FIRST_SECTION", "sec"], ["IMAGE_FILE_", "file"],
      ["IMAGE_DLLCHARACTERISTICS_", "opt"], ["IMAGE_DOS_SIGNATURE", "dos"], ["IMAGE_NT_SIGNATURE", "nt"], ["IMAGE_ORDINAL", "imp"], ["IMAGE_SNAP", "imp"], ["IMAGE_SUBSYSTEM_", "opt"], ["IMAGE_DEBUG_", "debug"]];
    for (const [p, f] of pref) if (name.indexOf(p) === 0) return f;
    return null;
  }
  function hlC(src) {
    return esc(src).replace(/(\/\*[\s\S]*?\*\/|\/\/[^\n]*)|\b(P?IMAGE_[A-Z0-9_]+|WIN_CERTIFICATE|UNWIND_INFO|GUID|CV_INFO_PDB70|RICH_[A-Z_]+)\b|\b(BYTE|WORD|DWORD|ULONGLONG|LONG|CHAR|WCHAR|ULONG_PTR|HMODULE|HINSTANCE|LPVOID|LPCSTR|BOOL|VOID|SIZE_T|PBYTE)\b|\b(typedef|struct|union|return|if|for|while|switch|case|break|const|char)\b/g,
      (m, cm, id, ty, kw) => {
        if (cm) return "<span class=\"cm\">" + cm + "</span>";
        if (id) { const f = identFam(id); return f ? "<span class=\"ci\" style=\"--c:" + famColor(f) + "\">" + id + "</span>" : id; }
        if (ty) return "<span class=\"ct\">" + ty + "</span>";
        return "<span class=\"ck\">" + kw + "</span>";
      });
  }

  /* ======================= constantes ======================= */
  const cvHex = v => (typeof v === "string" ? v : hex(v));
  function constBlock(key) {
    const e = E[key];
    const rows = e.items.map(it => {
      const [n, v, d] = it;
      return "<tr data-v=\"" + cvHex(v) + "\" data-star=\"" + (/\*$/.test(n) ? 1 : 0) + "\"><td class=\"cn\">" + esc(e.prefix + n) + "</td><td class=\"cv\">" + cvHex(v) + "</td><td class=\"cd\">" + esc(d || "") + "</td></tr>";
    }).join("");
    return "<div class=\"cblock\" data-key=\"" + key + "\"><div class=\"cdec\"><label>" + t("decode.label") + "&nbsp;<input class=\"dec\" spellcheck=\"false\" placeholder=\"" + esc(t("decode.placeholder")) + "\"></label><span class=\"decout\"></span></div><table class=\"ctab\"><tbody>" + rows + "</tbody></table></div>";
  }
  function decode(input) {
    const blk = input.closest(".cblock");
    const e = E[blk.dataset.key];
    const out = $(".decout", blk);
    const rows = blk.querySelectorAll("tr");
    rows.forEach(r => r.classList.remove("on"));
    const txt = input.value.trim();
    if (!txt) { out.textContent = ""; return; }
    let val;
    try { val = BigInt(/^0x/i.test(txt) ? txt : (/^[0-9a-f]+$/i.test(txt) && /[a-f]/i.test(txt) ? "0x" + txt : txt)); } catch (err) { out.textContent = t("decode.invalidValue"); return; }
    if (e.kind === "enum") {
      let hit = null;
      rows.forEach(r => { if (BigInt(r.dataset.v) === val) { r.classList.add("on"); hit = r; } });
      out.textContent = hit ? "= " + e.prefix + e.items[[...rows].indexOf(hit)][0] : t("decode.unknownValue");
      return;
    }
    let known = 0n, n = 0;
    rows.forEach(r => {
      const v = BigInt(r.dataset.v);
      const star = r.dataset.star === "1";
      known |= v;
      if (star ? (val & v) !== 0n : (val & v) === v && v !== 0n) { r.classList.add("on"); n++; }
    });
    const unk = val & ~known;
    out.textContent = n + " " + t("decode.activeFlags") + (unk ? " · " + t("decode.unknownBits") + " " + hex(unk) : "");
  }

  /* ======================= échantillon PE (hexdump coloré) ======================= */
  const sampleCache = {};
  const toBytes = (v, size) => { const o = []; let x = BigInt(v); for (let i = 0; i < size; i++) { o.push(Number(x & 0xFFn)); x >>= 8n; } return o; };
  const pick = s => (s && typeof s === "object" && !Array.isArray(s) && ("32" in s || "64" in s) ? s[ARCH] : s);
  const ascii = str => [...str].map(c => c.charCodeAt(0));
  const rol32 = (x, n) => { n %= 32; return n === 0 ? x >>> 0 : (((x << n) | (x >>> (32 - n))) >>> 0); };
  const posObj = (id, arr) => { const o = {}; layout(id).rows.forEach((r, i) => { o[r.f.n] = arr[i]; }); return o; };

  function emit(out, id, abs, ov, path) {
    layout(id).rows.forEach(r => {
      const f = r.f;
      const o = abs + r.off;
      const p = path + "." + f.n;
      const v = ov && ov[f.n] !== undefined ? ov[f.n] : pick(f.s);
      if (S[r.t]) {
        for (let i = 0; i < r.n; i++) {
          let sv = f.c ? (v ? v[i] : undefined) : v;
          if (Array.isArray(sv)) sv = posObj(r.t, sv);
          emit(out, r.t, o + i * r.esz, sv, p + (f.c ? "[" + i + "]" : ""));
        }
        return;
      }
      let bytes;
      if (typeof v === "string") { bytes = ascii(v); while (bytes.length < r.size) bytes.push(0); }
      else if (Array.isArray(v)) { bytes = []; v.forEach(x => bytes.push.apply(bytes, toBytes(x, r.esz))); while (bytes.length < r.size) bytes.push(0); }
      else if (r.n === 1) bytes = toBytes(v === undefined ? 0 : v, r.size);
      else bytes = new Array(r.size).fill(0);
      out.push({ off: o, size: r.size, bytes, fam: S[id].fam, struct: id, field: f.n, path: p, kind: f.k, desc: f.d, type: r.t, count: r.n, arr: typeof v === "string" });
    });
  }

  function getSample() {
    if (sampleCache[ARCH]) return sampleCache[ARCH];
    const out = [];
    emit(out, "IMAGE_DOS_HEADER", 0, null, "IMAGE_DOS_HEADER");
    const stub = [0x0E, 0x1F, 0xBA, 0x0E, 0x00, 0xB4, 0x09, 0xCD, 0x21, 0xB8, 0x01, 0x4C, 0xCD, 0x21].concat(ascii("This program cannot be run in DOS mode.\r\r\n$"));
    while (stub.length < 0x40) stub.push(0);
    out.push({ off: 0x40, size: 0x40, bytes: stub, fam: "stub", struct: null, field: "stub", path: t("sample.stubPath"), kind: "str", desc: t("sample.stubDesc"), note: t("sample.stubNote") });

    /* Rich header (clé calculée selon l’algorithme réel) */
    const flat = new Uint8Array(0x80);
    out.forEach(r => flat.set(r.bytes, r.off));
    let ck = 0x80;
    for (let i = 0; i < 0x80; i++) { if (i >= 0x3C && i < 0x40) continue; ck = (ck + rol32(flat[i], i)) >>> 0; }
    const comps = SAMPLE.rich.map(([p, b, c]) => ({ id: ((p << 16) | b) >>> 0, p, b, c }));
    comps.forEach(c => { ck = (ck + rol32(c.id, c.c)) >>> 0; });
    const x32 = v => toBytes((v ^ ck) >>> 0, 4);
    let o = 0x80;
    const rr = (size, bytes, field, struct, desc, note, kind, path) => { out.push({ off: o, size, bytes, fam: "rich", struct, field, path: path || ("RICH_HEADER." + field), kind, desc, note }); o += size; };
    rr(4, x32(0x536E6144), "DanS", "RICH_HEADER", S.RICH_HEADER.fields[0].d, t("sample.richNoteDanS"), "magic");
    rr(12, [].concat(x32(0), x32(0), x32(0)), "Padding", "RICH_HEADER", S.RICH_HEADER.fields[1].d, t("sample.richNotePadding"), "res");
    comps.forEach((c, i) => rr(8, x32(c.id).concat(x32(c.c)), "Entries", "RICH_HEADER", tf("sample.richEntryDesc", { p: hex(c.p, 4), b: c.b, c: c.c }), tf("sample.richEntryNote", { p: hex(c.p, 4), b: c.b, c: c.c }), "struct", "RICH_HEADER.Entries[" + i + "]"));
    rr(4, ascii("Rich"), "Rich", "RICH_HEADER", S.RICH_HEADER.fields[3].d, t("sample.richNoteRichTag"), "magic");
    rr(4, toBytes(ck, 4), "XorKey", "RICH_HEADER", S.RICH_HEADER.fields[4].d, tf("sample.richNoteXorKey", { key: hex(ck, 8) }), "chk");

    const ntOff = o;           /* = e_lfanew */
    emit(out, "IMAGE_NT_HEADERS", ntOff, null, "IMAGE_NT_HEADERS");
    let so = ntOff + layout("IMAGE_NT_HEADERS").size;
    SAMPLE.sections.forEach((sec, i) => { emit(out, "IMAGE_SECTION_HEADER", so, sec, "IMAGE_SECTION_HEADER[" + i + "]"); so += 40; });
    const end = Math.ceil(so / 16) * 16;
    if (end > so) out.push({ off: so, size: end - so, bytes: new Array(end - so).fill(0), fam: "pad", struct: null, field: "padding", path: t("sample.paddingPath"), kind: "res", desc: t("sample.headerPaddingDesc") });
    out.forEach((r, i) => { r.i = i; });
    return (sampleCache[ARCH] = { regs: out, ntOff, secOff: ntOff + layout("IMAGE_NT_HEADERS").size });
  }

  function regValue(r) {
    if (r.arr || (r.type === "CHAR") || (r.type === "BYTE" && r.count > 1 && r.field !== "Data4")) {
      const t = r.bytes.map(b => (b >= 32 && b < 127 ? String.fromCharCode(b) : "·")).join("");
      return "\"" + esc(t.replace(/·+$/, "")) + "\"";
    }
    if (r.note && !r.struct) return esc(r.note);
    if (r.note) return esc(r.note);
    if (r.bytes.length <= 8 && r.count <= 1) { let v = 0n; for (let i = r.bytes.length - 1; i >= 0; i--) v = (v << 8n) | BigInt(r.bytes[i]); return hex(v, r.bytes.length * 2); }
    return r.bytes.map(b => b.toString(16).toUpperCase().padStart(2, "0")).join(" ");
  }

  function hexView(fams, title) {
    const { regs } = getSample();
    const sel = regs.filter(r => !fams || fams.indexOf(r.fam) >= 0);
    if (!sel.length) return "";
    const start = Math.floor(Math.min.apply(null, sel.map(r => r.off)) / 16) * 16;
    const end = Math.ceil(Math.max.apply(null, sel.map(r => r.off + r.size)) / 16) * 16;
    const map = {};
    sel.forEach(r => { for (let i = 0; i < r.size; i++) map[r.off + i] = r; });
    let rows = "";
    for (let a = start; a < end; a += 16) {
      let hx = "", as = "";
      for (let i = 0; i < 16; i++) {
        const r = map[a + i];
        const b = r ? r.bytes[a + i - r.off] : null;
        if (r) {
          hx += "<span class=\"b fam-" + r.fam + (r.i % 2 ? " a" : " c") + "\" data-r=\"" + r.i + "\">" + b.toString(16).toUpperCase().padStart(2, "0") + "</span>";
          as += "<span class=\"fam-" + r.fam + " " + (r.i % 2 ? "a" : "c") + "\" data-r=\"" + r.i + "\">" + (b >= 32 && b < 127 ? esc(String.fromCharCode(b)) : "·") + "</span>";
        } else { hx += "<span class=\"b dim\">··</span>"; as += "<span class=\"dim\">·</span>"; }
        if (i === 7) hx += "<span class=\"gap\"></span>";
      }
      rows += "<div class=\"hr\"><span class=\"ha\">" + a.toString(16).toUpperCase().padStart(4, "0") + "</span><span class=\"hb\">" + hx + "</span><span class=\"hc\">" + as + "</span></div>";
    }
    const used = [...new Set(sel.map(r => r.fam))];
    const legend = used.map(f => "<span class=\"lg\"><i style=\"background:" + famColor(f) + "\"></i>" + FAM[f].label + "</span>").join("");
    return "<section class=\"hexwrap\"><div class=\"hexhead\"><h3>" + (title || t("hex.defaultTitle")) + "</h3><div class=\"lgs\">" + legend + "</div></div>" +
      "<div class=\"hex\">" + rows + "</div><div class=\"hexinfo\"><span class=\"hint\">" + esc(tf("hex.hint", { arch: a32() ? "PE32" : "PE32+" })) + "</span></div></section>";
  }
  function showInfo(span) {
    const wrap = span.closest(".hexwrap");
    const r = getSample().regs[+span.dataset.r];
    const s = r.struct && S[r.struct];
    wrap.querySelectorAll(".sel").forEach(x => x.classList.remove("sel"));
    wrap.querySelectorAll("[data-r=\"" + r.i + "\"]").forEach(x => x.classList.add("sel"));
    $(".hexinfo", wrap).innerHTML = "<div class=\"hi\" style=\"--c:" + famColor(r.fam) + "\"><div class=\"hit\"><i></i><b>" + esc(r.path) + "</b></div><div class=\"him\"><span>" + t("hex.offsetLabel") + " <b>" + hex(r.off, 4) + "</b></span><span><b>" + r.size + "</b> " + (r.size > 1 ? t("common.bytes") : t("common.byte")) + "</span><span>" + t("hex.valueLabel") + " <b>" + regValue(r) + "</b></span>" + (r.kind ? kchip(r.kind) : "") + "</div><p>" + esc(r.desc || "") + "</p></div>";
  }

  /* ======================= cartes de structure ======================= */
  function natureDot(k) {
    const kd = KINDS[k];
    if (!kd) return "";
    return "<span class=\"nature\" title=\"" + esc(kd.help) + "\"><i style=\"--kc:" + kd.color + "\"></i>" + kd.label + "</span>";
  }

  /* Bande d'octets : un segment par champ, largeur proportionnelle à sa taille
     réelle, coloré par sa NATURE (pas par la famille) — la couleur porte une
     information (pointeur ? réservé ? taille ?), pas une simple décoration. */
  function byteMap(id) {
    const L = layout(id);
    const total = Math.max(L.size, 1);
    const segs = L.rows.map(r => {
      const f = r.f;
      const kd = KINDS[f.k] || KINDS.struct;
      const w = f.vs ? Math.max(total * 0.05, 1) : Math.max(r.size, 0.001);
      const sub = f.vs ? t("struct.variableSize") : r.size + " " + t("common.byteAbbr");
      return "<div class=\"seg-b\" style=\"flex-grow:" + w + ";--kc:" + kd.color + "\" data-fi=\"f-" + id + "." + f.n + "\" title=\"" + esc(f.n) + " — " + hex(r.off, 2) + " · " + sub + "\"></div>";
    }).join("");
    const ticks = [0, 0.25, 0.5, 0.75, 1].map(frac =>
      "<i style=\"left:" + (frac * 100) + "%\">" + hex(Math.round(total * frac)) + "</i>"
    ).join("");
    return "<div class=\"bytemap-wrap\"><div class=\"bytemap\">" + segs + "</div><div class=\"ruler\">" + ticks + "</div></div>";
  }

  function structCard(id) {
    const s = S[id];
    const L = layout(id);
    const name = dispName(id);
    const c = famColor(s.fam);
    const sizeTxt = L.vs ? tf("struct.sizePlusVariable", { size: hex(L.size) }) : tf("struct.sizeOctets", { size: hex(L.size), n: L.size });
    const rows = L.rows.map(r => {
      const f = r.f;
      const diff = f.only || Array.isArray(f.t);
      const tn = S[r.t] ? sLink(r.t, undefined, f.n) : "<span class=\"ty\">" + esc(r.t) + "</span>";
      const arr = f.c ? "<span class=\"tarr\">[" + (f.vs ? "" : f.c) + "]</span>" : "";
      const nm = (f.u && f.u !== "DUMMYUNIONNAME" ? "<span class=\"tu\">" + f.u + ".</span>" : "") + esc(f.n);
      const aka = f.alt ? "<span class=\"aka\">= " + f.alt.map(esc).join(" = ") + "</span>" : "";
      const to = f.to ? " <span class=\"to\">→ " + (S[f.to] ? sLink(f.to, undefined, f.n) : esc(f.to)) + "</span>" : "";
      const bits = f.bits ? "<div class=\"bits\">" + f.bits.map(b => "<span><b>" + esc(b[0]) + "</b> " + esc(b[1]) + "</span>").join("") + "</div>" : "";
      const vals = f.v ? "<details class=\"vals\"><summary>" + esc(t("struct.valuesPrefix")) + esc(E[f.v].title) + "</summary>" + constBlock(f.v) + "</details>" : "";
      const dchip = f.only ? "<span class=\"dchip\" title=\"" + esc(tf("struct.onlyBitsTitle", { bits: f.only })) + "\">" + esc(t(f.only === 32 ? "struct.only32" : "struct.only64")) + "</span>" : (Array.isArray(f.t) ? "<span class=\"dchip\" title=\"" + esc(t("struct.diffSizeTitle")) + "\">" + esc(t("struct.diffSizeChip")) + "</span>" : "");
      return "<tr" + (diff ? " data-diff=\"1\"" : "") + " id=\"f-" + id + "." + f.n + "\" data-fi=\"f-" + id + "." + f.n + "\">" +
        "<td class=\"off\" data-lbl=\"" + esc(t("struct.colOffset")) + "\">+" + hex(r.off, 2) + "<small> · " + (f.vs ? t("common.varAbbr") : r.size + " " + t("common.byteAbbr")) + "</small></td>" +
        "<td class=\"ty\" data-lbl=\"" + esc(t("struct.colType")) + "\">" + tn + arr + "</td>" +
        "<td class=\"nm\" data-lbl=\"" + esc(t("struct.colField")) + "\"><b>" + nm + "</b>" + aka + dchip + to + "</td>" +
        "<td data-lbl=\"" + esc(t("struct.colNature")) + "\">" + natureDot(f.k) + "</td>" +
        "<td class=\"dd\" data-lbl=\"" + esc(t("struct.colRole")) + "\">" + rich(f.d) + bits + vals + "</td></tr>";
    }).join("");
    const code = cgen(id);
    return "<section class=\"struct\" id=\"s-" + id + "\" style=\"--c:" + c + "\">" +
      "<header class=\"sh\">" + trailBlock(id) + "<div class=\"eyebrow\"><i></i>" + esc(FAM[s.fam].label) + "</div><div class=\"sh1\"><h3>" + esc(name) + "</h3>" +
      (Array.isArray(s.name) ? "<span class=\"alias\">" + esc(t("struct.aliasPrefix")) + id + "</span>" : "") +
      "<span class=\"hdr\">" + esc(s.hdr) + "</span></div>" +
      "<div class=\"sh2\"><span>" + esc(t("struct.sizeLabel")) + "<b>" + sizeTxt + "</b></span>" + (s.loc ? "<span>" + esc(t("struct.locationLabel")) + rich(s.loc) + "</span>" : "") + "</div>" +
      "<p class=\"sd\">" + rich(s.desc) + "</p>" + relBlock(id) +
      "<div class=\"tabs\"><button class=\"on\" data-t=\"tab\">" + esc(t("struct.tabTable")) + "</button><button data-t=\"code\">" + esc(t("struct.tabCode")) + "</button></div></header>" +
      "<div class=\"panel tab\">" + byteMap(id) +
      "<div class=\"tw\"><table class=\"sdoc\"><thead><tr><th>" + esc(t("struct.colOffset")) + "</th><th>" + esc(t("struct.colType")) + "</th><th>" + esc(t("struct.colField")) + "</th><th>" + esc(t("struct.colNature")) + "</th><th>" + esc(t("struct.colRole")) + "</th></tr></thead><tbody>" + rows + "</tbody></table></div></div>" +
      "<div class=\"panel code\" hidden><button class=\"copy\">" + esc(t("common.copy")) + "</button><pre class=\"c\">" + hlC(code) + "</pre></div></section>";
  }

  /* ======================= graphe parents / enfants ======================= */
  let EDGES = null;
  function buildEdges() {
    const raw = [], seenNodes = new Set(), seenStruct = new Set();
    function walk(spec, parent) {
      const me = spec.s || parent;
      if (spec.s && parent) raw.push({ from: parent, to: spec.s, how: spec.how, via: spec.via || "" });
      if (spec.stop || seenNodes.has(spec)) return;
      seenNodes.add(spec);
      if (spec.s && !spec.kids) { if (seenStruct.has(spec.s)) return; seenStruct.add(spec.s); }
      (spec.kids || (spec.s && KIDS[spec.s]) || []).forEach(k => walk(k, me));
    }
    ROOTS.forEach(r => r.kids.forEach(k => walk(k, null)));
    Object.keys(KIDS).forEach(id => { if (!seenStruct.has(id)) { seenStruct.add(id); KIDS[id].forEach(k => walk(k, id)); } });
    const seen = {};
    EDGES = raw.filter(e => { const k = e.from + ">" + e.to + ">" + e.via; if (seen[k]) return false; seen[k] = 1; return true; });
  }
  const howBadge = h => "<span class=\"how\" style=\"--c:" + HOW[h].color + "\" title=\"" + esc(HOW[h].help) + "\">" + HOW[h].label + "</span>";
  function relChips(list, dir) {
    const by = {};
    list.forEach(e => { const o = dir === "up" ? e.from : e.to; (by[o + "|" + e.how] = by[o + "|" + e.how] || { o, how: e.how, via: [] }).via.push(e.via); });
    return Object.keys(by).map(k => {
      const r = by[k];
      const vias = r.via.filter(Boolean).filter((v, i, a) => a.indexOf(v) === i).slice(0, 3).join(" · ");
      const viaAttr = dir === "down" && r.via.filter(Boolean)[0] ? " data-via=\"" + esc(r.via.filter(Boolean)[0]) + "\"" : "";
      return "<a class=\"rchip\"" + viaAttr + " style=\"--c:" + famColor(S[r.o].fam) + "\" href=\"#" + S[r.o].page + "/s-" + r.o + "\">" + howBadge(r.how) + "<b>" + esc(r.o) + "</b>" + (vias ? "<small>" + esc(vias) + "</small>" : "") + "</a>";
    }).join("");
  }
  function relBlock(id) {
    if (!EDGES) buildEdges();
    const up = EDGES.filter(e => e.to === id && e.from !== id), down = EDGES.filter(e => e.from === id && e.to !== id);
    if (!up.length && !down.length) return "";
    return "<div class=\"rels\">" +
      "<div><h6>" + esc(t("rel.parentsTitle")) + " <span>" + esc(t("rel.parentsSub")) + "</span></h6><div class=\"rcs\">" + (up.length ? relChips(up, "up") : "<em>" + esc(t("rel.noneRoot")) + "</em>") + "</div></div>" +
      "<div><h6>" + esc(t("rel.childrenTitle")) + " <span>" + esc(t("rel.childrenSub")) + "</span></h6><div class=\"rcs\">" + (down.length ? relChips(down, "down") : "<em>" + esc(t("rel.noneLeaf")) + "</em>") + "</div></div>" +
      "<a class=\"rtree\" href=\"#tree\">" + esc(t("rel.seeTree")) + "</a></div>";
  }

  /* ======================= page « arbre des structures » ======================= */
  const OPEN_DEPTH = 3;
  function treeNode(spec, depth, path) {
    const isS = !!spec.s;
    const fam = isS ? S[spec.s].fam : (spec.fam || "pad");
    const col = famColor(fam);
    const cycle = isS && !spec.kids && path.indexOf(spec.s) >= 0;
    const kids = (cycle || spec.stop) ? [] : (spec.kids || (isS && KIDS[spec.s]) || []);
    const nm = isS ? dispName(spec.s) : spec.leaf;
    let size = "";
    if (isS) { const L = layout(spec.s); size = "<span class=\"tsz\">" + (L.vs ? hex(L.size) + "+" : hex(L.size)) + " " + t("common.byteAbbr") + "</span>"; }
    const chip = isS
      ? "<a class=\"tn\" style=\"--c:" + col + "\" href=\"#" + S[spec.s].page + "/s-" + spec.s + "\" title=\"" + esc(S[spec.s].desc.replace(/[`*{}]/g, "")) + "\">" + esc(nm) + "</a>"
      : "<span class=\"tn leaf\" style=\"--c:" + col + "\">" + esc(nm) + "</span>";
    const row = (spec.how ? howBadge(spec.how) : "") + chip + (spec.mult ? "<span class=\"tm\">" + esc(spec.mult) + "</span>" : "") + size +
      (spec.via ? "<span class=\"tv\">" + esc(t("tree.via")) + "<code>" + esc(spec.via) + "</code></span>" : "") +
      (spec.opt ? "<span class=\"topt\">" + esc(t("common.optional")) + "</span>" : "") +
      (cycle ? "<span class=\"tcyc\">" + esc(t("tree.recursiveNote")) + "</span>" : "") +
      (spec.stop ? "<span class=\"tcyc\">" + esc(t("tree.sameFormatNote")) + "</span>" : "") +
      (spec.note ? "<span class=\"tnt\">" + esc(spec.note) + "</span>" : "");
    if (!kids.length) return "<li><div class=\"trow\">" + row + "</div></li>";
    const np = isS ? path.concat(spec.s) : path;
    return "<li><details" + (depth < OPEN_DEPTH ? " open" : "") + "><summary class=\"trow\">" + row + "<span class=\"tcount\">" + kids.length + "</span></summary><ul>" +
      kids.map(k => treeNode(k, depth + 1, np)).join("") + "</ul></details></li>";
  }
  function treePage(p) {
    const leg = Object.keys(HOW).map(h => "<div class=\"kl\">" + howBadge(h) + "<span>" + esc(HOW[h].help) + "</span></div>").join("");
    const roots = ROOTS.map(r => "<section class=\"treecard\" style=\"--c:" + famColor(r.fam) + "\"><h2>" + esc(r.title) + "</h2><p class=\"mdesc\">" + rich(r.desc) + "</p><ul class=\"tr root\">" +
      r.kids.map(k => treeNode(k, 0, [])).join("") + "</ul></section>").join("");
    return pageHead(p) +
      "<p class=\"intro\">" + rich(t("tree.intro")) + "</p>" +
      "<section class=\"howto\"><div class=\"kleg\">" + leg + "</div></section>" +
      "<div class=\"tctl\"><button data-tree=\"all\">" + esc(t("tree.expandAll")) + "</button><button data-tree=\"none\">" + esc(t("tree.collapseAll")) + "</button><button data-tree=\"def\">" + esc(t("tree.resetDepth")) + "</button></div>" +
      roots + pageNav(p);
  }

  /* ======================= page « Vue 3D » ======================= */
  function scene3dPage(p) {
    return pageHead(p) +
      "<p class=\"intro\">" + rich(t("scene3d.intro")) + "</p>" +
      "<div class=\"stage3d\" id=\"stage3d\">" +
      "<div class=\"stage3d-bar\"><div class=\"stage3d-tools\">" +
      "<label class=\"lot\" data-s3=\"dissect-wrap\"><input type=\"checkbox\" data-s3=\"dissect\"><span>" + esc(t("scene3d.dissectToggle")) + "</span></label>" +
      "<label class=\"lot\" data-s3=\"labels-wrap\"><input type=\"checkbox\" data-s3=\"labels\" checked><span>" + esc(t("scene3d.labelsToggle")) + "</span></label>" +
      "<button class=\"s3-btn\" data-s3=\"reset\">" + esc(t("scene3d.resetCamera")) + "</button></div></div>" +
      "<div class=\"stage3d-body\"><div class=\"stage3d-canvas\"></div><aside class=\"stage3d-panel\"><div class=\"s3-empty\">" + esc(t("common.loading")) + "</div></aside></div>" +
      "<div class=\"stage3d-legend\"></div></div>" +
      "<p class=\"s3-hint\">" + esc(t("scene3d.hint")) + "</p>" +
      pageNav(p);
  }

  function chainItem(it) {
    if (it.a !== undefined) return "<span class=\"carr\"><i>" + esc(it.a) + "</i><u></u></span>";
    if (it.s) {
      const s = S[it.s];
      return "<a class=\"node\" style=\"--c:" + famColor(s.fam) + "\" href=\"#" + s.page + "/f-" + it.s + "." + it.f + "\"><b>" + it.s + "</b><span>." + it.f + "</span></a>";
    }
    return "<span class=\"node\" style=\"--c:" + famColor(it.fam) + "\"><b>" + esc(it.x) + "</b>" + (it.note ? "<small>" + esc(it.note) + "</small>" : "") + "</span>";
  }
  const chains = list => list.map(c => "<div class=\"chain\"><h4>" + esc(c.title) + "</h4><div class=\"crow\">" + c.items.map(chainItem).join("") + "</div></div>").join("");
  const ICON = { tip: "✦", warn: "⚠", info: "i" };
  const notes = list => list.map(n => "<aside class=\"callout " + n.t + "\"><h5><span>" + ICON[n.t] + "</span>" + esc(n.h) + "</h5><p>" + rich(n.b) + "</p></aside>").join("");

  /* ======================= tableau des Data Directories ======================= */
  function ddTable() {
    const rows = DD.map(d => {
      const [i, macro, name, sid, page, kind] = d;
      const col = sid ? famColor(S[sid].fam) : "#4b5563";
      const isOff = /OFFSET/.test(kind);
      const sl = sid ? "<a class=\"slink\" style=\"--c:" + col + "\" href=\"#" + page + "/s-" + sid + "\">" + sid + "</a>" : "<span class=\"muted\">—</span>";
      return "<tr style=\"--c:" + col + "\"><td class=\"di\">" + i + "</td><td class=\"dm\">IMAGE_DIRECTORY_ENTRY_" + macro + "</td><td>" + esc(name) + "</td><td>" + sl + "</td><td><span class=\"kchip" + (isOff ? " warnk" : "") + "\" style=\"--c:" + (isOff ? KINDS.off.color : KINDS.rva.color) + "\">" + esc(kind) + "</span></td></tr>";
    }).join("");
    return "<section class=\"struct ddt\" id=\"s-DDTABLE\" style=\"--c:" + FAM.dd.color + "\"><header class=\"sh\"><div class=\"sh1\"><h3>" + esc(t("dd.title")) + "</h3><span class=\"hdr\">DataDirectory[index]</span></div><p class=\"sd\">" + rich(t("dd.desc")) + "</p></header><div class=\"tw\"><table class=\"dtab\"><thead><tr><th>" + esc(t("dd.colIndex")) + "</th><th>" + esc(t("dd.colConst")) + "</th><th>" + esc(t("dd.colName")) + "</th><th>" + esc(t("dd.colStruct")) + "</th><th>" + esc(t("dd.colVA")) + "</th></tr></thead><tbody>" + rows + "</tbody></table></div></section>";
  }

  /* ======================= pages ======================= */
  function pageHead(p) {
    const c = famColor(p.fam);
    return "<header class=\"ph\" style=\"--c:" + c + "\"><div class=\"phl\"><span class=\"dot\"></span><h1>" + esc(p.label) + "</h1>" +
      (p.dd !== undefined ? "<span class=\"ddb\">DataDirectory[" + p.dd + "]</span>" : "") +
      (p.fam ? "<span class=\"fb\">" + FAM[p.fam].label + "</span>" : "") + "</div></header>";
  }
  function pageNav(p) {
    const i = PAGES.indexOf(p);
    const pv = PAGES[i - 1], nx = PAGES[i + 1];
    return "<nav class=\"pn\">" + (pv ? "<a href=\"#" + pv.id + "\">← " + esc(pv.label) + "</a>" : "<span></span>") + (nx ? "<a href=\"#" + nx.id + "\">" + esc(nx.label) + " →</a>" : "<span></span>") + "</nav>";
  }

  function genericPage(p) {
    let h = pageHead(p);
    h += "<p class=\"intro\">" + rich(p.intro) + "</p>";
    if (p.chains) h += "<section class=\"chains\"><h2>" + esc(t("page.chainsTitle")) + "</h2>" + chains(p.chains) + "</section>";
    if (p.hexFams) h += hexView(p.hexFams);
    if (p.notes) h += "<div class=\"callouts\">" + notes(p.notes) + "</div>";
    h += "<h2 class=\"sec\">" + esc(t("page.structuresTitle")) + "</h2>";
    h += p.structs.map(structCard).join("");
    if (p.ddTable) h += ddTable();
    h += pageNav(p);
    return h;
  }

  function overviewPage() {
    const { ntOff, secOff } = getSample();
    const optOff = ntOff + 0x18, optSz = a32() ? 0xE0 : 0xF0, ddOff = optOff + optSz - 128;
    const secs = SAMPLE.sections;
    const nsec = secs.length;
    const hdrEnd = secOff + 40 * nsec;
    const A = (off, rva) => "<div class=\"ma\"><span class=\"mo\">" + (off === null ? "" : hex(off, 1)) + "</span><span class=\"mr\">" + (rva === null || rva === undefined ? "" : hex(rva, 1)) + "</span></div>";
    const blk = (fam, t, sub, go, off, rva, extra) => "<div class=\"mrow\">" + A(off, rva) + "<a class=\"mb\" style=\"--c:" + famColor(fam) + "\" href=\"#" + go + "\"><b>" + t + "</b>" + (sub ? "<small>" + sub + "</small>" : "") + (extra || "") + "</a></div>";
    let m = "<div class=\"mhead\"><span>" + esc(t("overview.colFileOffset")) + "</span><span>" + esc(t("overview.colRVA")) + "</span><span></span></div>";
    m += blk("dos", "IMAGE_DOS_HEADER", t("overview.dosSub"), "dos", 0, 0);
    m += blk("stub", t("overview.stubLabel"), "« This program cannot be run in DOS mode. »", "dos", 0x40, null);
    m += blk("rich", "Rich Header", t("overview.richSub"), "rich", 0x80, null);
    /* NT headers imbriqués */
    m += "<div class=\"mrow\">" + A(ntOff, null) + "<div class=\"mgrp\" style=\"--c:" + FAM.nt.color + "\"><div class=\"mgt\"><b>" + (a32() ? "IMAGE_NT_HEADERS32" : "IMAGE_NT_HEADERS64") + "</b><small>" + esc(t("overview.ntAtOffset")) + "</small></div>" +
      "<a class=\"mb sm\" style=\"--c:" + FAM.nt.color + "\" href=\"#file/f-IMAGE_NT_HEADERS.Signature\"><b>Signature</b><small>« PE\\0\\0 » · " + hex(ntOff, 1) + "</small></a>" +
      "<a class=\"mb sm\" style=\"--c:" + FAM.file.color + "\" href=\"#file/s-IMAGE_FILE_HEADER\"><b>IMAGE_FILE_HEADER</b><small>" + esc(t("overview.fileHeaderSub")) + hex(ntOff + 4, 1) + "</small></a>" +
      "<div class=\"mgrp in\" style=\"--c:" + FAM.opt.color + "\"><a class=\"mgt\" href=\"#optional/s-IMAGE_OPTIONAL_HEADER\"><b>" + (a32() ? "IMAGE_OPTIONAL_HEADER32" : "IMAGE_OPTIONAL_HEADER64") + "</b><small>" + esc(t("overview.optHeaderSub")) + hex(optOff, 1) + "</small></a>" +
      "<a class=\"mb sm\" style=\"--c:" + FAM.dd.color + "\" href=\"#optional/s-DDTABLE\"><b>IMAGE_DATA_DIRECTORY DataDirectory[16]</b><small>" + esc(t("overview.ddSub")) + hex(ddOff, 1) + "</small></a></div></div></div>";
    m += blk("sec", "IMAGE_SECTION_HEADER[" + nsec + "]", tf("overview.sectionsSub", { n: nsec }), "sections", secOff, null);
    m += blk("pad", t("common.padding"), t("overview.paddingSub"), "sections", hdrEnd, null);
    const where = rva => secs.find(s => rva >= s.VirtualAddress && rva < s.VirtualAddress + s.VirtualSize);
    const txt = { ".text": t("overview.secText"), ".rdata": t("overview.secRdata"), ".data": t("overview.secData"), ".pdata": t("overview.secPdata"), ".rsrc": t("overview.secRsrc"), ".reloc": t("overview.secReloc") };
    secs.forEach(sec => {
      const chipsA = [];
      Object.keys(SAMPLE.dirs).forEach(k => {
        const d = DD[+k];
        if (where(SAMPLE.dirs[k][0]) === sec && d[4]) chipsA.push("<a class=\"mchip\" style=\"--c:" + famColor(S[d[3]].fam) + "\" href=\"#" + d[4] + "\" onclick=\"event.stopPropagation()\">DD[" + d[0] + "] " + d[1] + " <i>→ " + hex(SAMPLE.dirs[k][0], 1) + "</i></a>");
      });
      if (where(SAMPLE.entry) === sec) chipsA.unshift("<a class=\"mchip\" style=\"--c:" + FAM.opt.color + "\" href=\"#optional/f-IMAGE_OPTIONAL_HEADER.AddressOfEntryPoint\">AddressOfEntryPoint <i>→ " + hex(SAMPLE.entry, 1) + "</i></a>");
      m += "<div class=\"mrow\">" + A(sec.PointerToRawData, sec.VirtualAddress) + "<div class=\"mb sec\" style=\"--c:#7ee0a6\"><b>" + esc(sec.Name) + "</b><small>" + txt[sec.Name] + " · " + t("overview.rawLabel") + " " + hex(sec.SizeOfRawData, 1) + " → " + t("overview.virtualLabel") + " " + hex(sec.VirtualSize, 1) + "</small>" + (chipsA.length ? "<div class=\"mchips\">" + chipsA.join("") + "</div>" : "") + "</div></div>";
    });
    m += "<div class=\"mrow\">" + A(0x3600, null) + "<a class=\"mb ovl\" style=\"--c:" + FAM.cert.color + "\" href=\"#security\">" + t("overview.overlayDesc") + "</a></div>";

    const legend = Object.keys(FAM).filter(f => f !== "pad" && f !== "stub").map(f => {
      const pg = PAGES.find(p => p.fam === f);
      return "<a class=\"lgc\" style=\"--c:" + famColor(f) + "\" href=\"#" + (pg ? pg.id : "overview") + "\"><i></i>" + FAM[f].label + "</a>";
    }).join("");
    const kleg = Object.keys(KINDS).filter(k => k !== "struct").map(k => "<div class=\"kl\">" + kchip(k) + "<span>" + esc(KINDS[k].help) + "</span></div>").join("");

    const idx = Object.keys(FAM).filter(f => PAGES.some(p => p.structs && p.structs.some(id => S[id].fam === f))).map(f => {
      const list = Object.keys(S).filter(id => S[id].fam === f);
      return "<div class=\"ix\" style=\"--c:" + famColor(f) + "\"><h4>" + FAM[f].label + "</h4>" + list.map(id => "<a href=\"#" + S[id].page + "/s-" + id + "\">" + dispName(id) + "</a>").join("") + "</div>";
    }).join("");

    return "<header class=\"hero\"><h1>" + t("overview.heroTitle") + "</h1>" +
      "<p>" + t("overview.heroDesc") + "</p>" +
      "<div class=\"legend\">" + legend + "</div><p class=\"cta\"><a href=\"#scene3d\">" + esc(t("overview.ctaExplore3D")) + "</a><a href=\"#tree\" class=\"ghost\">" + esc(t("overview.ctaTree")) + "</a></p></header>" +
      "<section class=\"mapwrap\"><h2>" + esc(t("overview.mapTitle")) + "</h2><p class=\"mdesc\">" + t("overview.mapDesc") + "</p><div class=\"map\">" + m + "</div></section>" +
      hexView(null, tf("overview.hexTitle", { size: hex(getSample().regs.reduce((a, r) => Math.max(a, r.off + r.size), 0)) })) +
      "<section class=\"howto\"><h2>" + esc(t("overview.readTablesTitle")) + "</h2><div class=\"kleg\">" + kleg + "</div>" +
      "<p class=\"muted\">" + t("overview.readTablesDesc") + "</p></section>" +
      "<section><h2>" + esc(t("overview.allStructuresTitle")) + "</h2><div class=\"ixg\">" + idx + "</div></section>";
  }

  function conceptsPage(p) {
    const rows = SAMPLE.sections.map((s, i) => "<tr><td><b>" + s.Name + "</b></td>" +
      [s.VirtualAddress, s.VirtualSize, s.PointerToRawData, s.SizeOfRawData].map((v, j) => "<td><input data-s=\"" + i + "\" data-c=\"" + j + "\" value=\"" + hex(v) + "\" spellcheck=\"false\"></td>").join("") + "</tr>").join("");
    return pageHead(p) +
      "<p class=\"intro\">" + rich(t("concepts.intro")) + "</p>" +
      "<div class=\"three\">" +
      "<div class=\"card\" style=\"--c:" + KINDS.off.color + "\"><h3>" + kchip("off") + "</h3><p>" + t("concepts.offDesc") + "</p></div>" +
      "<div class=\"card\" style=\"--c:" + KINDS.rva.color + "\"><h3>" + kchip("rva") + "</h3><p>" + t("concepts.rvaDesc") + "</p></div>" +
      "<div class=\"card\" style=\"--c:" + KINDS.va.color + "\"><h3>" + kchip("va") + "</h3><p>" + t("concepts.vaDesc") + "</p></div></div>" +
      "<div class=\"formulas\"><div><span>" + esc(t("concepts.f1")) + "</span><code>va = base + rva</code></div><div><span>" + esc(t("concepts.f2")) + "</span><code>rva = va − base</code></div><div><span>" + esc(t("concepts.f3")) + "</span><code>off = rva − sec.VirtualAddress + sec.PointerToRawData</code></div><div><span>" + esc(t("concepts.f4")) + "</span><code>rva = off − sec.PointerToRawData + sec.VirtualAddress</code></div><div><span>" + esc(t("concepts.f5")) + "</span><code>align_up(x, a) = (x + a − 1) &amp; ~(a − 1)</code></div></div>" +
      "<section class=\"conv\"><h2>" + esc(t("concepts.converterTitle")) + "</h2><p class=\"mdesc\">" + esc(t("concepts.converterDesc")) + "</p>" +
      "<div class=\"convrow\"><label>" + esc(t("concepts.imageBaseLabel")) + " <input id=\"cb\" value=\"" + hex(SAMPLE.imageBase[ARCH]) + "\" spellcheck=\"false\"></label>" +
      "<label>" + esc(t("concepts.valueLabel")) + " <input id=\"cq\" value=\"0x3290\" spellcheck=\"false\"></label>" +
      "<label>" + esc(t("concepts.isALabel")) + " <select id=\"cm\"><option value=\"rva\">" + esc(t("concepts.optRVA")) + "</option><option value=\"va\">" + esc(t("concepts.optVA")) + "</option><option value=\"off\">" + esc(t("concepts.optOff")) + "</option></select></label></div>" +
      "<div class=\"tw\"><table class=\"stab\"><thead><tr><th>" + esc(t("concepts.colSection")) + "</th><th>VirtualAddress</th><th>VirtualSize</th><th>PointerToRawData</th><th>SizeOfRawData</th></tr></thead><tbody>" + rows + "</tbody></table></div>" +
      "<div id=\"cres\" class=\"cres\"></div></section>" + pageNav(p);
  }
  function runConv() {
    const out = $("#cres");
    if (!out) return;
    const P = s => { try { return BigInt(String(s).trim().replace(/^$/, "0")); } catch (e) { return null; } };
    const base = P($("#cb").value), q = P($("#cq").value), mode = $("#cm").value;
    const secs = [...document.querySelectorAll(".stab tbody tr")].map((tr, i) => {
      const v = [...tr.querySelectorAll("input")].map(x => P(x.value));
      return { n: SAMPLE.sections[i].Name, va: v[0], vs: v[1], rp: v[2], rs: v[3] };
    });
    if (base === null || q === null || secs.some(s => s.va === null || s.vs === null || s.rp === null || s.rs === null)) { out.innerHTML = "<p class=\"bad\">" + esc(t("common.invalidHex")) + "</p>"; return; }
    let rva = null, off = null, sec = null, note = "";
    const first = secs[0];
    if (mode === "rva") rva = q;
    else if (mode === "va") rva = q - base;
    if (mode === "off") {
      sec = secs.find(s => q >= s.rp && q < s.rp + s.rs);
      if (sec) rva = q - sec.rp + sec.va;
      else if (q < first.rp) { rva = q; note = t("convert.inHeadersSame"); }
      else note = t("convert.outsideSection");
      off = q;
    } else {
      sec = secs.find(s => rva >= s.va && rva < s.va + s.vs);
      if (sec) {
        if (rva - sec.va >= sec.rs) note = t("convert.zeroFilled");
        else off = rva - sec.va + sec.rp;
      } else if (rva < first.va) { off = rva; note = t("convert.inHeaders"); }
      else note = t("convert.noSectionRVA");
    }
    const row = (k, v) => "<div class=\"cr\">" + kchip(k) + "<b>" + (v === null ? "—" : hex(v)) + "</b></div>";
    out.innerHTML = "<div class=\"crow2\">" + row("off", off) + row("rva", rva) + row("va", rva === null ? null : rva + base) + "</div>" +
      "<p class=\"cnote\">" + (sec ? tf("convert.sectionPrefix", { name: esc(sec.n) }) : "") + esc(note) + "</p>";
  }

  function constsPage(p) {
    return pageHead(p) +
      "<p class=\"intro\">" + esc(t("consts.intro")) + "</p>" +
      Object.keys(E).map(k => "<section class=\"struct\" id=\"c-" + k + "\" style=\"--c:#fde047\"><header class=\"sh\"><div class=\"sh1\"><h3>" + esc(E[k].title) + "</h3><span class=\"hdr\">" + (E[k].kind === "flags" ? esc(t("consts.kindFlags")) : esc(t("consts.kindEnum"))) + "</span></div></header><div class=\"panel\">" + constBlock(k) + "</div></section>").join("") + pageNav(p);
  }

  /* ======================= navigation ======================= */
  function buildNav() {
    let h = "";
    GROUPS.forEach(g => {
      h += "<div class=\"ng\"><h6>" + g.label + "</h6>";
      PAGES.filter(p => p.grp === g.id).forEach(p => {
        h += "<a class=\"ni\" data-p=\"" + p.id + "\" href=\"#" + p.id + "\" style=\"--c:" + famColor(p.fam || "pad") + "\"><i></i><span>" + esc(p.label) + "</span>" + (p.dd !== undefined ? "<em>" + p.dd + "</em>" : "") + "</a>";
      });
      h += "</div>";
    });
    $("#nav").innerHTML = h;
  }

  function render(id, keep) {
    const p = PAGES.find(x => x.id === id) || PAGES[0];
    const leaving3D = CUR === "scene3d" && p.id !== "scene3d";
    CUR = p.id;
    const y = keep ? window.scrollY : 0;
    if (leaving3D && window.PE3D) window.PE3D.destroy();
    let h;
    if (p.id === "overview") h = overviewPage();
    else if (p.id === "scene3d") h = scene3dPage(p);
    else if (p.id === "tree") h = treePage(p);
    else if (p.id === "concepts") h = conceptsPage(p);
    else if (p.id === "consts") h = constsPage(p);
    else h = genericPage(p);
    main.innerHTML = h;
    document.querySelectorAll(".ni").forEach(a => a.classList.toggle("on", a.dataset.p === p.id));
    document.title = p.label + t("page.titleSuffix");
    document.body.classList.remove("navopen");
    if (p.id === "concepts") runConv();
    if (p.id === "scene3d" && window.PE3D) window.PE3D.mount($("#stage3d"));
    window.scrollTo(0, y);
  }

  function scrollToAnchor(a) {
    const el = document.getElementById(a);
    if (!el) return;
    el.scrollIntoView({ block: "start", behavior: "smooth" });
    el.classList.remove("flash"); void el.offsetWidth; el.classList.add("flash");
    setTimeout(() => el.classList.remove("flash"), 2200);
  }

  function route() {
    const h = decodeURIComponent(location.hash.slice(1)) || "overview";
    const i = h.indexOf("/");
    const pg = i < 0 ? h : h.slice(0, i);
    const anchor = i < 0 ? "" : h.slice(i + 1);
    if (pg === CUR && anchor) { scrollToAnchor(anchor); return; }
    render(pg);
    if (anchor) setTimeout(() => scrollToAnchor(anchor), 30);
  }

  /* ======================= recherche (Ctrl+K) ======================= */
  let INDEX = null;
  function buildIndex() {
    const ix = [];
    PAGES.forEach(p => ix.push({ k: "page", label: p.label, sub: t("search.subPage"), href: "#" + p.id, c: famColor(p.fam || "pad") }));
    Object.keys(S).forEach(id => {
      const s = S[id];
      ix.push({ k: "struct", label: id, sub: tf("search.subStructure", { hdr: s.hdr }), href: "#" + s.page + "/s-" + id, c: famColor(s.fam) });
      if (Array.isArray(s.name)) s.name.forEach(n => ix.push({ k: "struct", label: n, sub: tf("search.subAlias", { id: id }), href: "#" + s.page + "/s-" + id, c: famColor(s.fam) }));
      s.fields.forEach(f => ix.push({ k: "field", label: id + "." + f.n, sub: tf("search.subField", { kind: KINDS[f.k] ? KINDS[f.k].label : "" }), href: "#" + s.page + "/f-" + id + "." + f.n, c: famColor(s.fam), extra: (f.alt || []).join(" ") }));
    });
    Object.keys(E).forEach(k => E[k].items.forEach(it => ix.push({ k: "const", label: E[k].prefix + it[0], sub: tf("search.subConst", { hex: cvHex(it[1]), title: E[k].title }), href: "#consts/c-" + k, c: "#fde047" })));
    DD.forEach(d => ix.push({ k: "const", label: "IMAGE_DIRECTORY_ENTRY_" + d[1], sub: "DataDirectory[" + d[0] + "] · " + d[2], href: d[4] ? "#" + d[4] : "#optional/s-DDTABLE", c: FAM.dd.color }));
    return ix;
  }
  let palSel = 0, palRes = [];
  function palFilter(q) {
    if (!INDEX) INDEX = buildIndex();
    const toks = q.toLowerCase().split(/\s+/).filter(Boolean);
    palRes = (toks.length ? INDEX.filter(x => { const t = (x.label + " " + x.sub + " " + (x.extra || "")).toLowerCase(); return toks.every(k => t.indexOf(k) >= 0); }) : INDEX.filter(x => x.k === "page")).slice(0, 40);
    palSel = 0;
    $("#palres").innerHTML = palRes.map((r, i) => "<a href=\"" + r.href + "\" class=\"pr" + (i === 0 ? " on" : "") + "\" style=\"--c:" + r.c + "\"><i></i><b>" + esc(r.label) + "</b><span>" + esc(r.sub) + "</span></a>").join("") || "<p class=\"muted pad\">" + esc(t("search.noResults")) + "</p>";
  }
  function palOpen() { $("#pal").hidden = false; const i = $("#palin"); i.value = ""; palFilter(""); i.focus(); }
  function palClose() { $("#pal").hidden = true; }
  function palMove(d) {
    const rs = document.querySelectorAll("#palres .pr");
    if (!rs.length) return;
    rs[palSel].classList.remove("on");
    palSel = (palSel + d + rs.length) % rs.length;
    rs[palSel].classList.add("on");
    rs[palSel].scrollIntoView({ block: "nearest" });
  }

  /* ======================= événements ======================= */
  document.addEventListener("click", e => {
    const t = e.target;
    const tb = t.closest("[data-tree]");
    if (tb) {
      const mode = tb.dataset.tree;
      document.querySelectorAll(".treecard details").forEach(d => {
        if (mode === "all") d.open = true;
        else if (mode === "none") d.open = false;
        else { let depth = 0, n = d.parentElement; while (n && !n.classList.contains("root")) { if (n.tagName === "UL") depth++; n = n.parentElement; } d.open = depth < OPEN_DEPTH; }
      });
      return;
    }
    const tab = t.closest(".tabs button");
    if (tab) {
      const card = tab.closest(".struct");
      card.querySelectorAll(".tabs button").forEach(b => b.classList.toggle("on", b === tab));
      $(".panel.tab", card).hidden = tab.dataset.t !== "tab";
      $(".panel.code", card).hidden = tab.dataset.t !== "code";
      return;
    }
    const cp = t.closest(".copy");
    if (cp) {
      const txt = $("pre", cp.parentElement).textContent;
      try { navigator.clipboard.writeText(txt); cp.textContent = t("common.copied"); setTimeout(() => { cp.textContent = t("common.copy"); }, 1400); } catch (err) { cp.textContent = t("common.unavailable"); }
      return;
    }
    const b = t.closest(".hexwrap .b[data-r], .hexwrap .hc span[data-r]");
    if (b) {
      const r = getSample().regs[+b.dataset.r];
      if (r.struct && S[r.struct]) location.hash = "#" + S[r.struct].page + "/f-" + r.struct + "." + r.field;
      return;
    }
    const seg = t.closest(".seg-b");
    if (seg) { scrollToAnchor(seg.dataset.fi); return; }
    const tclear = t.closest("[data-trail-clear]");
    if (tclear) { setTrail([]); render(CUR, true); return; }
    const vlink = t.closest("a[data-via]");
    if (vlink) {
      const srcSection = vlink.closest(".struct");
      const srcId = srcSection ? srcSection.id.replace(/^s-/, "") : null;
      const href = vlink.getAttribute("href") || "";
      const m = href.match(/\/s-([^/?#]+)$/) || href.match(/\/f-([^.]+)\./);
      const targetId = m ? m[1] : null;
      if (srcId && targetId) trailNavigate(srcId, targetId, vlink.dataset.via);
    }
    if (t.closest("#pal") && !t.closest(".palbox")) palClose();
    if (t.closest(".pr")) palClose();
    if (t.closest("#burger")) document.body.classList.toggle("navopen");
    if (t.closest("#search")) palOpen();
  });
  document.addEventListener("mouseover", e => {
    const b = e.target.closest(".hexwrap [data-r]");
    if (b) showInfo(b);
    const fi = e.target.closest("[data-fi]");
    if (fi) {
      const card = fi.closest(".struct");
      if (card) {
        card.querySelectorAll(".hl").forEach(x => x.classList.remove("hl"));
        card.querySelectorAll("[data-fi=\"" + fi.dataset.fi + "\"]").forEach(x => x.classList.add("hl"));
      }
    }
  });
  document.addEventListener("mouseout", e => {
    const fi = e.target.closest("[data-fi]");
    if (!fi) return;
    const card = fi.closest(".struct");
    if (card && (!e.relatedTarget || !card.contains(e.relatedTarget))) card.querySelectorAll(".hl").forEach(x => x.classList.remove("hl"));
  });
  document.addEventListener("input", e => {
    if (e.target.matches(".dec")) decode(e.target);
    else if (e.target.matches("#palin")) palFilter(e.target.value);
    else if (e.target.closest(".conv")) runConv();
  });
  document.addEventListener("change", e => { if (e.target.closest(".conv")) runConv(); });
  document.addEventListener("keydown", e => {
    const typing = /INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName);
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") { e.preventDefault(); palOpen(); return; }
    if (e.key === "/" && !typing) { e.preventDefault(); palOpen(); return; }
    if (!$("#pal").hidden) {
      if (e.key === "Escape") palClose();
      else if (e.key === "ArrowDown") { e.preventDefault(); palMove(1); }
      else if (e.key === "ArrowUp") { e.preventDefault(); palMove(-1); }
      else if (e.key === "Enter" && palRes[palSel]) { location.hash = palRes[palSel].href; palClose(); }
    }
  });

  /* ======================= initialisation ======================= */
  (function injectFamCss() {
    const css = Object.keys(FAM).map(f => ".fam-" + f + "{--c:" + FAM[f].color + "}").join("");
    const st = document.createElement("style");
    st.textContent = css;
    document.head.appendChild(st);
  })();

  (function applyChrome() {
    document.title = t("doc.title");
    const desc = document.querySelector("meta[name=description]");
    if (desc) desc.setAttribute("content", t("doc.description"));
    const arch = $("#arch");
    if (arch) arch.setAttribute("aria-label", t("nav.archLabel"));
    const theme = $("#theme");
    if (theme) {
      theme.setAttribute("aria-label", t("nav.themeLabel"));
      $("[data-th=dark]", theme).textContent = t("nav.themeDark");
      $("[data-th=light]", theme).textContent = t("nav.themeLight");
    }
    const lang = $("#lang");
    if (lang) lang.setAttribute("aria-label", t("nav.langLabel"));
    const nav = $("#nav");
    if (nav) nav.setAttribute("aria-label", t("nav.pagesLabel"));
    const search = $("#search");
    if (search) $("span", search).textContent = t("nav.search");
    const palin = $("#palin");
    if (palin) palin.setAttribute("placeholder", t("nav.searchPlaceholder"));
  })();

  function syncControls() {
    document.querySelectorAll("#arch button").forEach(b => b.classList.toggle("on", +b.dataset.a === ARCH));
    document.querySelectorAll("#theme button").forEach(b => b.classList.toggle("on", b.dataset.th === THEME));
    document.querySelectorAll("#lang button").forEach(b => b.classList.toggle("on", b.dataset.lg === LANG));
  }
  $("#arch").addEventListener("click", e => {
    const b = e.target.closest("button");
    if (!b) return;
    ARCH = +b.dataset.a;
    try { localStorage.setItem("pe-ref-arch", String(ARCH)); } catch (err) { /* ignore */ }
    syncControls();
    render(CUR, true);
  });
  $("#theme").addEventListener("click", e => {
    const b = e.target.closest("button");
    if (!b) return;
    THEME = b.dataset.th;
    if (THEME === "light") document.documentElement.setAttribute("data-theme", "light");
    else document.documentElement.removeAttribute("data-theme");
    try { localStorage.setItem("pe-ref-theme", THEME); } catch (err) { /* ignore */ }
    syncControls();
  });
  $("#lang").addEventListener("click", e => {
    const b = e.target.closest("button");
    if (!b || b.dataset.lg === LANG) return;
    try { localStorage.setItem("pe-ref-lang", b.dataset.lg); } catch (err) { /* ignore */ }
    location.reload();
  });
  buildNav();
  syncControls();
  window.addEventListener("hashchange", route);
  route();
})();
