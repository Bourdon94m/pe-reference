"use strict";
/* =========================================================================
   Orchestrateur de la page « Vue 3D » : chrome, chargement paresseux du
   module Three.js (scene-core.js), et messages de repli. Script classique
   (pas un module) pour rester visible du reste du site ; le vrai travail
   WebGL est dans scene-core.js, importé dynamiquement seulement quand on
   ouvre la page, pour ne jamais peser sur le reste du site.
   ========================================================================= */
window.PE3D = (function () {
  /* capturé de façon synchrone : seul moyen fiable de connaître l'URL de
     CE script pour résoudre l'import relatif vers scene-core.js, qu'il
     soit servi à la racine ou dans un sous-dossier (GitHub Pages…). */
  const SELF_URL = document.currentScript && document.currentScript.src;

  let active = null;
  let token = 0;

  function notice(host, title, body, mono) {
    host.innerHTML =
      "<div class=\"s3-notice\"><h4>" + title + "</h4><div class=\"s3-notice-b\">" + body + "</div></div>";
  }

  function fileProtocolNotice(host) {
    notice(host, t("scene3d.fileProtocolTitle"), t("scene3d.fileProtocolBody"));
  }

  function errorNotice(host, err) {
    notice(host, t("scene3d.errorTitle"),
      "<p>" + (err && err.message ? err.message.replace(/[<>]/g, "") : t("common.unknownError")) + "</p>" +
      t("scene3d.errorBody"));
  }

  async function mount(stage) {
    destroy();
    const myToken = ++token;
    const host = stage.querySelector(".stage3d-canvas");
    const panel = stage.querySelector(".stage3d-panel");
    const legend = stage.querySelector(".stage3d-legend");
    const resetBtn = stage.querySelector("[data-s3=\"reset\"]");
    const labelsChk = stage.querySelector("[data-s3=\"labels\"]");
    const dissectChk = stage.querySelector("[data-s3=\"dissect\"]");

    if (location.protocol === "file:") { fileProtocolNotice(host); return; }
    if (!SELF_URL) { errorNotice(host, new Error(t("scene3d.modulePathError"))); return; }

    host.innerHTML = "<div class=\"s3-loading\"><span class=\"s3-spin\"></span>" + t("scene3d.preparing") + "</div>";
    let mod;
    try {
      mod = await import(new URL("scene-core.js", SELF_URL).href);
    } catch (err) {
      if (myToken !== token) return;
      errorNotice(host, err);
      return;
    }
    if (myToken !== token) return; /* la page a changé entre-temps */
    host.innerHTML = "";

    let inst;
    try {
      inst = mod.createScene(host, { panelEl: panel, legendEl: legend });
    } catch (err) {
      errorNotice(host, err);
      return;
    }
    active = inst;

    resetBtn.addEventListener("click", () => inst && inst.resetCamera());
    labelsChk.addEventListener("change", () => inst && inst.setLabels(labelsChk.checked));
    if (dissectChk) dissectChk.addEventListener("change", () => inst && inst.setDissect(dissectChk.checked));
  }

  function destroy() {
    token++;
    if (active) { try { active.destroy(); } catch (e) { /* ignore */ } active = null; }
  }

  return { mount, destroy };
})();
