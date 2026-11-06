"use strict";
/* =========================================================================
   Bilingual dictionary for every piece of UI chrome text (labels, buttons,
   hints, prose) in app.js / scene-ui.js / scene-core.js. Structure/constant
   data itself lives in data.<lang>.js / tree-data.<lang>.js, not here.

   t(key)            -> string for the active language (falls back to en)
   tf(key, {a:1})     -> same, replacing {a} placeholders in the string
   ========================================================================= */
var UI_STR = {
  /* ---- top bar / nav ---- */
  "nav.menu": { en: "Menu", fr: "Menu" },
  "nav.archLabel": { en: "Architecture", fr: "Architecture" },
  "nav.themeLabel": { en: "Theme", fr: "Thème" },
  "nav.themeDark": { en: "Dark", fr: "Sombre" },
  "nav.themeLight": { en: "Light", fr: "Clair" },
  "nav.langLabel": { en: "Language", fr: "Langue" },
  "nav.search": { en: "Search", fr: "Rechercher" },
  "nav.pagesLabel": { en: "Pages", fr: "Pages" },
  "nav.searchPlaceholder": { en: "Structure, field, constant… (e.g. e_lfanew, IMAGE_SCN, 0x20B)", fr: "Structure, champ, constante… (ex. e_lfanew, IMAGE_SCN, 0x20B)" },
  "doc.title": { en: "PE Reference · structures of the PE format", fr: "PE Reference · structures du format PE" },
  "doc.description": { en: "Visual reference for the structures of the PE format (winnt.h): IMAGE_DOS_HEADER, IMAGE_NT_HEADERS, sections, imports, exports, relocations… with offsets and color coding.", fr: "Référence visuelle des structures du format PE (winnt.h) : IMAGE_DOS_HEADER, IMAGE_NT_HEADERS, sections, imports, exports, relocations… avec offsets et codes couleur." },

  /* ---- generic / shared words ---- */
  "common.copy": { en: "Copy", fr: "Copier" },
  "common.copied": { en: "Copied ✓", fr: "Copié ✓" },
  "common.unavailable": { en: "Unavailable", fr: "Indisponible" },
  "common.loading": { en: "Loading…", fr: "Chargement…" },
  "common.optional": { en: "optional", fr: "facultatif" },
  "common.padding": { en: "Padding", fr: "Bourrage" },
  "common.invalidHex": { en: "Invalid hexadecimal value.", fr: "Valeur hexadécimale invalide." },
  "common.unknownError": { en: "Unknown error", fr: "Erreur inconnue" },
  "common.byte": { en: "byte", fr: "octet" },
  "common.bytes": { en: "bytes", fr: "octets" },
  "common.byteAbbr": { en: "B", fr: "o" },
  "common.varAbbr": { en: "var", fr: "var" },

  /* ---- constant blocks (decode input) ---- */
  "decode.label": { en: "Decode a value", fr: "Décoder une valeur" },
  "decode.placeholder": { en: "0x…", fr: "0x…" },
  "decode.invalidValue": { en: "invalid value", fr: "valeur invalide" },
  "decode.unknownValue": { en: "unknown value", fr: "valeur inconnue" },
  "decode.activeFlags": { en: "flag(s) active", fr: "flag(s) actif(s)" },
  "decode.unknownBits": { en: "unknown bits", fr: "bits inconnus" },

  /* ---- sample PE / rich header (hardcoded sample data prose) ---- */
  "sample.stubDesc": { en: "16-bit DOS program run if the file is launched under DOS: prints “This program cannot be run in DOS mode”. Ignored by Windows.", fr: "Programme DOS 16 bits exécuté si on lance le fichier sous DOS : affiche « This program cannot be run in DOS mode ». Ignoré par Windows." },
  "sample.stubNote": { en: "DOS stub", fr: "stub DOS" },
  "sample.stubPath": { en: "MS-DOS stub", fr: "MS-DOS stub" },
  "sample.paddingPath": { en: "padding", fr: "bourrage" },
  "sample.richNoteDanS": { en: "“DanS” ⊕ XorKey", fr: "« DanS » ⊕ XorKey" },
  "sample.richNotePadding": { en: "3 × (0 ⊕ XorKey)", fr: "3 × (0 ⊕ XorKey)" },
  "sample.richEntryDesc": { en: "@comp.id ProdId={p} · Build={b} · Count={c} (each DWORD XORed with XorKey).", fr: "@comp.id ProdId={p} · Build={b} · Count={c} (chaque DWORD XORé avec XorKey)." },
  "sample.richEntryNote": { en: "prod {p} build {b} ×{c}", fr: "prod {p} build {b} ×{c}" },
  "sample.richNoteRichTag": { en: "“Rich” in clear text", fr: "« Rich » en clair" },
  "sample.richNoteXorKey": { en: "XOR key = {key}", fr: "clé XOR = {key}" },
  "sample.headerPaddingDesc": { en: "Zeros up to SizeOfHeaders (here 0x400, aligned on FileAlignment): the first byte of the 1st section is at PointerToRawData.", fr: "Zéros jusqu’à SizeOfHeaders (ici 0x400, aligné sur FileAlignment) : le premier octet de la 1re section est à PointerToRawData." },

  /* ---- hexdump ---- */
  "hex.defaultTitle": { en: "Hexadecimal example", fr: "Exemple en hexadécimal" },
  "hex.hint": { en: "Hover a byte to see which field it belongs to — click to open its definition. Realistic sample of a fictional {arch} EXE (the values are plausible, not taken from a real binary).", fr: "Survolez un octet pour voir à quel champ il appartient — cliquez pour ouvrir sa définition. Exemple réel d’un EXE {arch} fictif (les valeurs sont plausibles, pas issues d’un vrai binaire)." },
  "hex.offsetLabel": { en: "offset", fr: "offset" },
  "hex.valueLabel": { en: "value", fr: "valeur" },

  /* ---- struct card ---- */
  "struct.valuesPrefix": { en: "Values: ", fr: "Valeurs : " },
  "struct.onlyBitsTitle": { en: "Present only in the {bits}-bit version", fr: "Présent uniquement dans la version {bits} bits" },
  "struct.only32": { en: "PE32 only", fr: "PE32 seul" },
  "struct.only64": { en: "PE32+ only", fr: "PE32+ seul" },
  "struct.diffSizeTitle": { en: "Different size between PE32 and PE32+", fr: "Taille différente entre PE32 et PE32+" },
  "struct.diffSizeChip": { en: "≠ 32/64", fr: "≠ 32/64" },
  "struct.colOffset": { en: "Offset", fr: "Offset" },
  "struct.colType": { en: "Type", fr: "Type" },
  "struct.colField": { en: "Field", fr: "Champ" },
  "struct.colNature": { en: "Nature", fr: "Nature" },
  "struct.colRole": { en: "Role", fr: "Rôle" },
  "struct.tabTable": { en: "Table", fr: "Tableau" },
  "struct.tabCode": { en: "C code", fr: "Code C" },
  "struct.aliasPrefix": { en: "alias: ", fr: "alias : " },
  "struct.sizeLabel": { en: "size ", fr: "taille " },
  "struct.locationLabel": { en: "location: ", fr: "emplacement : " },
  "struct.sizeOctets": { en: "{size} ({n} bytes)", fr: "{size} ({n} octets)" },
  "struct.sizePlusVariable": { en: "{size} + variable", fr: "{size} + variable" },
  "struct.variableSize": { en: "variable", fr: "variable" },

  /* ---- parent / child relation block ---- */
  "rel.parentsTitle": { en: "▲ Parents", fr: "▲ Parents" },
  "rel.parentsSub": { en: "(what contains or references it)", fr: "(qui la contient ou la référence)" },
  "rel.childrenTitle": { en: "▼ Children", fr: "▼ Enfants" },
  "rel.childrenSub": { en: "(what it contains or references)", fr: "(ce qu’elle contient ou référence)" },
  "rel.noneRoot": { en: "none: root of the file", fr: "aucun : racine du fichier" },
  "rel.noneLeaf": { en: "none: terminal structure", fr: "aucun : structure terminale" },
  "rel.seeTree": { en: "See in the full tree →", fr: "Voir dans l’arbre complet →" },

  /* ---- navigation breadcrumb (path you followed to reach this structure) ---- */
  "trail.label": { en: "Your path:", fr: "Votre parcours :" },
  "trail.clear": { en: "Clear path", fr: "Effacer le parcours" },

  /* ---- structure tree ---- */
  "tree.via": { en: "via ", fr: "via " },
  "tree.recursiveNote": { en: "↻ recursive: same structure as above", fr: "↻ récursif : même structure qu’au-dessus" },
  "tree.sameFormatNote": { en: "same format, not expanded again", fr: "même format, non redéveloppé" },
  "tree.intro": { en: "All PE structures laid out as a **recursive tree**: each node is the parent of what it contains, what follows it, or what it points to. The **badge** in front of a node says *how* you reach it — that's where the real difficulty of the format lies: only a few structures are truly “inside” another, most are reached through a pointer (RVA, VA or offset).", fr: "Toutes les structures PE rangées en **arbre récursif** : chaque nœud est le parent de ce qu’il contient, de ce qui le suit, ou de ce vers quoi il pointe. Le **badge** devant un nœud dit *comment* on y arrive — c’est là que se cache la vraie difficulté du format : seules quelques structures sont réellement « dans » une autre, la plupart sont atteintes par un pointeur (RVA, VA ou offset)." },
  "tree.expandAll": { en: "Expand all", fr: "Tout déplier" },
  "tree.collapseAll": { en: "Collapse all", fr: "Tout replier" },
  "tree.resetDepth": { en: "Default depth", fr: "Niveau par défaut" },

  /* ---- 3D view page ---- */
  "scene3d.intro": { en: "The same site data, but in 3D: the PE's memory image, rendered as a **RAM stick**. Each chip is one structure or section, placed where it actually sits once loaded. Toggle **Dissect** to lift the chips off the board and inspect them one by one. Hovering shows the detail in the right-hand panel; the link that appears there opens the full page.", fr: "Les mêmes données du site, mais en 3D : l'image mémoire du PE, rendue comme une **barrette de RAM**. Chaque puce est une structure ou une section, placée là où elle se trouve réellement une fois chargée. Activez **Disséquer** pour décoller les puces de la carte et les inspecter une par une. Survoler affiche le détail dans le panneau de droite ; le lien qui y apparaît ouvre la fiche complète." },
  "scene3d.dissectToggle": { en: "Dissect", fr: "Disséquer" },
  "scene3d.labelsToggle": { en: "Labels", fr: "Étiquettes" },
  "scene3d.resetCamera": { en: "Recenter", fr: "Recentrer" },
  "scene3d.hint": { en: "Drag to rotate · wheel to zoom · right-click to pan the camera. Click a chip to open its page. Toggle “Dissect” to pull the chips off the board one by one.", fr: "Glisser pour tourner · molette pour zoomer · clic droit pour déplacer la caméra. Cliquez une puce pour ouvrir sa fiche. Activez « Disséquer » pour décoller les puces de la carte une par une." },
  "scene3d.fileProtocolTitle": { en: "3D view unavailable from a local file", fr: "Vue 3D indisponible en fichier local" },
  "scene3d.fileProtocolBody": { en: "<p>The 3D view loads Three.js as a JavaScript module, which browsers block when the page is opened directly from disk (<code>file://</code>). Serve the folder with a small local server, then reopen the page:</p><pre>python -m http.server 8765</pre><p>then <code>http://localhost:8765</code>.</p><p>The rest of the site (every structure page) works normally when run locally.</p>", fr: "<p>La vue 3D charge Three.js comme module JavaScript, ce que les navigateurs bloquent quand la page est ouverte directement depuis le disque (<code>file://</code>). Servez le dossier avec un petit serveur local, puis rouvrez la page :</p><pre>python -m http.server 8765</pre><p>puis <code>http://localhost:8765</code>.</p><p>Le reste du site (toutes les fiches de structures) fonctionne normalement en local.</p>" },
  "scene3d.errorTitle": { en: "The 3D scene could not load", fr: "La scène 3D n’a pas pu se charger" },
  "scene3d.errorBody": { en: "<p>WebGL may be disabled in this browser, or the Three.js CDN is blocked by the network. The site's structure pages remain reachable from the menu.</p>", fr: "<p>WebGL est peut-être désactivé dans ce navigateur, ou le CDN de Three.js est bloqué par le réseau. Les fiches de structures du site restent accessibles depuis le menu.</p>" },
  "scene3d.modulePathError": { en: "Could not resolve the 3D module's path.", fr: "Impossible de résoudre le chemin du module 3D." },
  "scene3d.preparing": { en: "Preparing the 3D scene…", fr: "Préparation de la scène 3D…" },
  "scene3d.webglUnavailable": { en: "WebGL unavailable in this browser.", fr: "WebGL indisponible dans ce navigateur." },
  "scene3d.alsoFileOffset": { en: "file {off}", fr: "fichier {off}" },
  "scene3d.hoverHint": { en: "Hover a chip to see its detail — click to open its page.", fr: "Survolez une puce pour voir son détail — cliquez pour ouvrir sa fiche." },
  "scene3d.openSheet": { en: "Open page →", fr: "Ouvrir la fiche →" },
  "scene3d.visualMarkerNoSheet": { en: "Visual marker, no dedicated page", fr: "Repère visuel, pas de fiche dédiée" },

  /* ---- data directory table ---- */
  "dd.title": { en: "The 16 Data Directories", fr: "Les 16 Data Directories" },
  "dd.desc": { en: "Each slot of `DataDirectory` is an {{IMAGE_DATA_DIRECTORY}}; its **index** determines which structure sits at the given address.", fr: "Chaque case de `DataDirectory` est une {{IMAGE_DATA_DIRECTORY}} ; son **index** détermine la structure qui se trouve à l’adresse indiquée." },
  "dd.colIndex": { en: "#", fr: "#" },
  "dd.colConst": { en: "Constant", fr: "Constante" },
  "dd.colName": { en: "Name", fr: "Nom" },
  "dd.colStruct": { en: "Structure", fr: "Structure" },
  "dd.colVA": { en: "VirtualAddress =", fr: "VirtualAddress =" },

  /* ---- generic page ---- */
  "page.chainsTitle": { en: "How the structures chain together", fr: "Comment les structures s’enchaînent" },
  "page.structuresTitle": { en: "Structures", fr: "Structures" },

  /* ---- overview page ---- */
  "overview.colFileOffset": { en: "File offset", fr: "Offset fichier" },
  "overview.colRVA": { en: "RVA", fr: "RVA" },
  "overview.dosSub": { en: "e_magic = “MZ” · e_lfanew → NT headers", fr: "e_magic = « MZ » · e_lfanew → NT headers" },
  "overview.stubLabel": { en: "MS-DOS stub", fr: "Stub MS-DOS" },
  "overview.richSub": { en: "optional · undocumented · XORed", fr: "facultatif · non documenté · XORé" },
  "overview.ntAtOffset": { en: "at offset e_lfanew", fr: "à l’offset e_lfanew" },
  "overview.fileHeaderSub": { en: "Machine · NumberOfSections · ", fr: "Machine · NumberOfSections · " },
  "overview.optHeaderSub": { en: "EntryPoint · ImageBase · SizeOfImage… · ", fr: "EntryPoint · ImageBase · SizeOfImage… · " },
  "overview.ddSub": { en: "pointers to imports, exports, resources… · ", fr: "pointeurs vers imports, exports, ressources… · " },
  "overview.sectionsSub": { en: "{n} × 40 bytes · at OptionalHeader + SizeOfOptionalHeader", fr: "{n} × 40 octets · à OptionalHeader + SizeOfOptionalHeader" },
  "overview.paddingSub": { en: "zeros up to SizeOfHeaders = 0x400", fr: "zéros jusqu’à SizeOfHeaders = 0x400" },
  "overview.secText": { en: "executable code", fr: "code exécutable" },
  "overview.secRdata": { en: "constants, import/debug tables", fr: "constantes, tables d’import/debug" },
  "overview.secData": { en: "global variables", fr: "variables globales" },
  "overview.secPdata": { en: "x64 exception tables", fr: "tables d’exceptions x64" },
  "overview.secRsrc": { en: "resources", fr: "ressources" },
  "overview.secReloc": { en: "relocations", fr: "relocations" },
  "overview.rawLabel": { en: "raw", fr: "raw" },
  "overview.virtualLabel": { en: "virtual", fr: "virtual" },
  "overview.overlayDesc": { en: "<b>Overlay</b><small>data after the last section · e.g. WIN_CERTIFICATE (DD[4] SECURITY — file offset, never mapped)</small>", fr: "<b>Overlay</b><small>données après la dernière section · ex. WIN_CERTIFICATE (DD[4] SECURITY — offset fichier, jamais mappé)</small>" },
  "overview.heroTitle": { en: "The <em>PE</em> format, structure by structure", fr: "Le format <em>PE</em>, structure par structure" },
  "overview.heroDesc": { en: "Visual reference for the structures of <code>winnt.h</code>. Every structure keeps its real Windows name, every field shows its <b>offset</b> and its <b>nature</b> (RVA, VA, file offset…).", fr: "Référence visuelle des structures de <code>winnt.h</code>. Chaque structure garde son vrai nom Windows, chaque champ indique son <b>offset</b> et sa <b>nature</b> (RVA, VA, offset fichier…)." },
  "overview.ctaExplore3D": { en: "Explore in 3D →", fr: "Explorer en 3D →" },
  "overview.ctaTree": { en: "Parent → child tree →", fr: "Arbre parents → enfants →" },
  "overview.mapTitle": { en: "The map of a PE file", fr: "La carte d’un fichier PE" },
  "overview.mapDesc": { en: "A PE is a stack of blocks. On the left, addresses <b>in the file</b>; on the right, addresses <b>in memory</b> once loaded (aligned on 0x1000). The chips on sections show which Data Directory points into them. Click a block to open its page.", fr: "Un PE est un empilement de blocs. À gauche les adresses <b>dans le fichier</b>, à droite les adresses <b>en mémoire</b> une fois chargé (alignées sur 0x1000). Les puces sur les sections indiquent quelle Data Directory pointe dedans. Cliquez sur un bloc pour ouvrir sa page." },
  "overview.hexTitle": { en: "The first {size} bytes of a PE, colored by structure", fr: "Les {size} premiers octets d’un PE, colorés par structure" },
  "overview.readTablesTitle": { en: "Reading the field tables", fr: "Lire les tableaux de champs" },
  "overview.readTablesDesc": { en: "Rows marked <b>≠</b> don't have the same size/offset between PE32 and PE32+.", fr: "Les lignes marquées <b>≠</b> n’ont pas la même taille/offset entre PE32 et PE32+." },
  "overview.allStructuresTitle": { en: "All structures", fr: "Toutes les structures" },

  /* ---- concepts / converter page ---- */
  "concepts.intro": { en: "The main source of confusion in the PE format: **three ways to express an address**. Remember each dot's color — it's the same across every table on the site.", fr: "La principale source de confusion dans le format PE : **trois façons d’exprimer une adresse**. Retenez la couleur de chaque pastille — elle est la même dans tous les tableaux du site." },
  "concepts.offDesc": { en: "Position in bytes <b>within the file</b> on disk. Used by <code>PointerToRawData</code>, <code>e_lfanew</code>, <code>IMAGE_DEBUG_DIRECTORY.PointerToRawData</code> and the SECURITY entry.", fr: "Position en octets <b>dans le fichier</b> sur disque. Utilisée par <code>PointerToRawData</code>, <code>e_lfanew</code>, <code>IMAGE_DEBUG_DIRECTORY.PointerToRawData</code> et l’entrée SECURITY." },
  "concepts.rvaDesc": { en: "Position <b>in memory, relative to the base</b> of the image. It's the unit of almost every pointer in the PE: <code>AddressOfEntryPoint</code>, <code>VirtualAddress</code>, import/export tables…", fr: "Position <b>en mémoire relative à la base</b> de l’image. C’est l’unité de presque tous les pointeurs du PE : <code>AddressOfEntryPoint</code>, <code>VirtualAddress</code>, tables d’imports/exports…" },
  "concepts.vaDesc": { en: "<b>Absolute</b> address = <code>ImageBase + RVA</code>. Rare: <code>ImageBase</code>, TLS, LoadConfig. These values change if the image is relocated, hence the relocation table.", fr: "Adresse <b>absolue</b> = <code>ImageBase + RVA</code>. Rare : <code>ImageBase</code>, TLS, LoadConfig. Ces valeurs changent si l’image est relogée, d’où la table de relocations." },
  "concepts.f1": { en: "RVA → VA", fr: "RVA → VA" },
  "concepts.f2": { en: "VA → RVA", fr: "VA → RVA" },
  "concepts.f3": { en: "RVA → file offset", fr: "RVA → offset fichier" },
  "concepts.f4": { en: "offset → RVA", fr: "offset → RVA" },
  "concepts.f5": { en: "round up to alignment", fr: "arrondi à l’alignement" },
  "concepts.converterTitle": { en: "Converter", fr: "Convertisseur" },
  "concepts.converterDesc": { en: "The sections below are the sample's (editable). Enter a hexadecimal address and choose what it represents.", fr: "Les sections ci-dessous sont celles de l’exemple (modifiables). Entrez une adresse en hexadécimal et choisissez ce qu’elle représente." },
  "concepts.imageBaseLabel": { en: "ImageBase", fr: "ImageBase" },
  "concepts.valueLabel": { en: "Value", fr: "Valeur" },
  "concepts.isALabel": { en: "is a", fr: "est un(e)" },
  "concepts.optRVA": { en: "RVA", fr: "RVA" },
  "concepts.optVA": { en: "VA", fr: "VA" },
  "concepts.optOff": { en: "File offset", fr: "Offset fichier" },
  "concepts.colSection": { en: "Section", fr: "Section" },

  /* ---- converter results ---- */
  "convert.inHeadersSame": { en: "in the headers (identical in memory)", fr: "dans les en-têtes (identique en mémoire)" },
  "convert.outsideSection": { en: "outside any section (overlay): doesn't exist in memory", fr: "hors de toute section (overlay) : n’existe pas en mémoire" },
  "convert.zeroFilled": { en: "zero-filled zone (VirtualSize > SizeOfRawData): absent from the file", fr: "zone zéro-remplie (VirtualSize > SizeOfRawData) : absente du fichier" },
  "convert.inHeaders": { en: "in the headers", fr: "dans les en-têtes" },
  "convert.noSectionRVA": { en: "no section contains this RVA", fr: "aucune section ne contient cette RVA" },
  "convert.sectionPrefix": { en: "Section: <b>{name}</b>. ", fr: "Section : <b>{name}</b>. " },

  /* ---- constants page ---- */
  "consts.intro": { en: "Every constant on the site in one place. Type a value read from a hexdump into the “Decode” field: the active flags light up.", fr: "Toutes les constantes du site au même endroit. Saisissez une valeur lue dans un hexdump dans le champ « Décoder » : les flags actifs s’allument." },
  "consts.kindFlags": { en: "flags (OR)", fr: "flags (OR)" },
  "consts.kindEnum": { en: "enum", fr: "enum" },

  /* ---- search / command palette ---- */
  "search.subPage": { en: "page", fr: "page" },
  "search.subStructure": { en: "structure · {hdr}", fr: "structure · {hdr}" },
  "search.subAlias": { en: "structure · alias of {id}", fr: "structure · alias de {id}" },
  "search.subField": { en: "field · {kind}", fr: "champ · {kind}" },
  "search.subConst": { en: "constant {hex} · {title}", fr: "constante {hex} · {title}" },
  "search.noResults": { en: "No results.", fr: "Aucun résultat." },

  /* ---- page footer brand suffix ---- */
  "page.titleSuffix": { en: " · PE Reference", fr: " · PE Reference" }
};

function t(key) {
  var e = UI_STR[key];
  if (!e) return key;
  var lang = (typeof LANG !== "undefined" && e[LANG]) ? LANG : "en";
  return e[lang] !== undefined ? e[lang] : e.en;
}
function tf(key, repl) {
  var s = t(key);
  return s.replace(/\{(\w+)\}/g, function (m, k) { return (repl && repl[k] !== undefined) ? repl[k] : m; });
}
