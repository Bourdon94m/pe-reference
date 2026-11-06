"use strict";
/* =========================================================================
   Arbre des structures : qui contient / suit / pointe vers quoi
   Chaque nœud : { s: struct | leaf: texte, fam, how, via, mult, note, kids, stop, opt }
   how : in (physiquement dedans) · follows (suit immédiatement) · off (offset fichier)
         rva · va · idx (indice dans une autre table)
   ========================================================================= */
const HOW = {
  in:      { label: "contient",  color: "#e5e7eb", help: "La structure est physiquement DANS son parent (champ imbriqué ou bloc placé à cet endroit)." },
  follows: { label: "suivi de",  color: "#cbd5e1", help: "Placée juste après son parent dans le fichier, sans pointeur : il faut calculer sa position." },
  off:     { label: "→ OFFSET",  color: "#fdba74", help: "Le parent contient un offset fichier (PointerTo… / e_lfanew)." },
  rva:     { label: "→ RVA",     color: "#86efac", help: "Le parent contient une RVA (relative à l’ImageBase une fois mappée)." },
  va:      { label: "→ VA",      color: "#67e8f9", help: "Le parent contient une adresse virtuelle absolue (corrigée par les relocations)." },
  idx:     { label: "→ INDEX",   color: "#a5b4fc", help: "Le parent contient un indice dans une autre table." }
};

const DD_MULT = { 1: "×N + descripteur nul", 3: "×(Size / 12)", 5: "blocs jusqu’à Size octets", 6: "×(Size / 28)", 11: "×N + descripteur nul", 12: "×N + 0 final", 13: "×N + descripteur nul" };

/* Ressources : on déroule les 3 niveaux (Type → Nom → Langue) au lieu de boucler */
const RES_TREE = (function () {
  const data = { s: "IMAGE_RESOURCE_DATA_ENTRY", how: "off", via: "OffsetToData (bit 31 = 0)", note: "feuille de l’arbre",
    kids: [{ leaf: "Octets de la ressource", fam: "res", how: "rva", via: "OffsetToData (une vraie RVA !)" }] };
  const entry = (kids, note) => ({ s: "IMAGE_RESOURCE_DIRECTORY_ENTRY", how: "follows", mult: "×(NumberOfNamedEntries + NumberOfIdEntries)", note, kids });
  const name = { s: "IMAGE_RESOURCE_DIR_STRING_U", how: "off", via: "NameOffset (si NameIsString)", note: "nom UTF-16" };
  const l3 = { s: "IMAGE_RESOURCE_DIRECTORY", how: "off", via: "OffsetToDirectory (bit 31 = 1)", note: "niveau 3 — Langue (LANGID)", kids: [entry([name, data], "Id = LANGID")] };
  const l2 = { s: "IMAGE_RESOURCE_DIRECTORY", how: "off", via: "OffsetToDirectory (bit 31 = 1)", note: "niveau 2 — Nom ou ID de la ressource", kids: [entry([name, l3], "Id = identifiant de ressource")] };
  return [entry([name, l2], "niveau 1 — Id = type (RT_ICON, RT_MANIFEST…)")];
})();

const DD_KIDS = DD.filter(d => d[3]).map(d => {
  const k = { s: d[3], how: d[0] === 4 ? "off" : "rva", via: "DataDirectory[" + d[0] + "] " + d[1], mult: DD_MULT[d[0]], note: d[2] };
  if (d[0] === 2) k.kids = RES_TREE;
  if (d[0] === 12) k.stop = true;
  return k;
});

const KIDS = {
  IMAGE_DOS_HEADER: [
    { leaf: "Stub MS-DOS (programme 16 bits)", fam: "stub", how: "follows", note: "remplaçable : Windows l’ignore" },
    { s: "RICH_HEADER", how: "follows", opt: true, note: "facultatif" },
    { s: "IMAGE_NT_HEADERS", how: "off", via: "e_lfanew", note: "le DOS header ne CONTIENT pas le NT header : il pointe vers lui" }
  ],
  RICH_HEADER: [{ s: "RICH_ENTRY", how: "in", via: "Entries", mult: "×N" }],
  RICH_ENTRY: [],
  IMAGE_NT_HEADERS: [
    { leaf: "Signature « PE\\0\\0 »", fam: "nt", how: "in", via: "Signature", note: "DWORD 0x00004550" },
    { s: "IMAGE_FILE_HEADER", how: "in", via: "FileHeader" },
    { s: "IMAGE_OPTIONAL_HEADER", how: "in", via: "OptionalHeader" },
    { s: "IMAGE_SECTION_HEADER", how: "follows", via: "NumberOfSections", mult: "×NumberOfSections", note: "à OptionalHeader + SizeOfOptionalHeader" }
  ],
  IMAGE_FILE_HEADER: [
    { s: "IMAGE_SYMBOL", how: "off", via: "PointerToSymbolTable", mult: "×NumberOfSymbols", note: "obsolète : 0 dans une image" }
  ],
  IMAGE_OPTIONAL_HEADER: [
    { s: "IMAGE_DATA_DIRECTORY", how: "in", via: "DataDirectory", mult: "×16 (NumberOfRvaAndSizes)", kids: DD_KIDS }
  ],
  IMAGE_DATA_DIRECTORY: [],
  IMAGE_SECTION_HEADER: [
    { leaf: "Données brutes de la section", fam: "sec", how: "off", via: "PointerToRawData", note: "mappées à base + VirtualAddress (RVA)" },
    { s: "IMAGE_RELOCATION", how: "off", via: "PointerToRelocations", mult: "×NumberOfRelocations", note: "objets uniquement" },
    { s: "IMAGE_LINENUMBER", how: "off", via: "PointerToLinenumbers", mult: "×NumberOfLinenumbers", note: "obsolète" }
  ],

  IMAGE_EXPORT_DIRECTORY: [
    { leaf: "Nom de la DLL (ASCIIZ)", fam: "exp", how: "rva", via: "Name" },
    { leaf: "Export Address Table — DWORD[NumberOfFunctions]", fam: "exp", how: "rva", via: "AddressOfFunctions", kids: [
      { leaf: "Code / données exportés", fam: "exp", how: "rva", via: "RVA de la case" },
      { leaf: "Forwarder « DLL.Fonction » (ASCIIZ)", fam: "exp", how: "rva", via: "si la RVA est dans la plage de l’export dir" } ] },
    { leaf: "Name Pointer Table — DWORD[NumberOfNames]", fam: "exp", how: "rva", via: "AddressOfNames", kids: [
      { leaf: "Noms d’exports (ASCIIZ, triés)", fam: "exp", how: "rva", via: "RVA de chaque nom" } ] },
    { leaf: "Ordinal Table — WORD[NumberOfNames]", fam: "exp", how: "rva", via: "AddressOfNameOrdinals", kids: [
      { leaf: "indice dans l’Export Address Table (sans Base)", fam: "exp", how: "idx", via: "ordinal[i]" } ] }
  ],

  IMAGE_IMPORT_DESCRIPTOR: [
    { leaf: "Nom de la DLL (ASCIIZ)", fam: "imp", how: "rva", via: "Name", note: "→ LoadLibrary récursif" },
    { s: "IMAGE_THUNK_DATA", how: "rva", via: "OriginalFirstThunk", mult: "×N + 0 final", note: "INT — Import Name Table (jamais modifiée)" },
    { s: "IMAGE_THUNK_DATA", how: "rva", via: "FirstThunk", mult: "×N + 0 final", note: "IAT — même format ; le loader y écrit les adresses", stop: true }
  ],
  IMAGE_THUNK_DATA: [
    { s: "IMAGE_IMPORT_BY_NAME", how: "rva", via: "AddressOfData (bit fort = 0)", note: "import par nom" },
    { leaf: "Ordinal 16 bits", fam: "imp", how: "in", via: "Ordinal (bit fort = 1)", note: "import par ordinal : pas d’autre structure" }
  ],
  IMAGE_IMPORT_BY_NAME: [],
  IMAGE_BOUND_IMPORT_DESCRIPTOR: [
    { s: "IMAGE_BOUND_FORWARDER_REF", how: "follows", via: "NumberOfModuleForwarderRefs", mult: "×n" },
    { leaf: "Nom du module (ASCIIZ)", fam: "imp", how: "off", via: "OffsetModuleName", note: "relatif au début du Bound Import Directory" }
  ],
  IMAGE_BOUND_FORWARDER_REF: [],
  IMAGE_DELAYLOAD_DESCRIPTOR: [
    { leaf: "Nom de la DLL (ASCIIZ)", fam: "imp", how: "rva", via: "DllNameRVA" },
    { leaf: "Emplacement du HMODULE", fam: "imp", how: "rva", via: "ModuleHandleRVA", note: "écrit par le delay-load helper" },
    { s: "IMAGE_THUNK_DATA", how: "rva", via: "ImportNameTableRVA", mult: "×N + 0 final", note: "INT différée" },
    { s: "IMAGE_THUNK_DATA", how: "rva", via: "ImportAddressTableRVA", mult: "×N + 0 final", note: "IAT différée (pointe d’abord vers des stubs)", stop: true },
    { s: "IMAGE_THUNK_DATA", how: "rva", via: "BoundImportAddressTableRVA", note: "optionnelle", stop: true },
    { s: "IMAGE_THUNK_DATA", how: "rva", via: "UnloadInformationTableRVA", note: "copie de l’IAT, optionnelle", stop: true }
  ],

  IMAGE_RESOURCE_DIRECTORY: [
    { s: "IMAGE_RESOURCE_DIRECTORY_ENTRY", how: "follows", mult: "×(NumberOfNamedEntries + NumberOfIdEntries)" }
  ],
  IMAGE_RESOURCE_DIRECTORY_ENTRY: [
    { s: "IMAGE_RESOURCE_DIR_STRING_U", how: "off", via: "NameOffset (si NameIsString)" },
    { s: "IMAGE_RESOURCE_DIRECTORY", how: "off", via: "OffsetToDirectory (si DataIsDirectory)", note: "niveau suivant" },
    { s: "IMAGE_RESOURCE_DATA_ENTRY", how: "off", via: "OffsetToData (sinon)" }
  ],
  IMAGE_RESOURCE_DIR_STRING_U: [],
  IMAGE_RESOURCE_DATA_ENTRY: [{ leaf: "Octets de la ressource", fam: "res", how: "rva", via: "OffsetToData" }],

  IMAGE_RUNTIME_FUNCTION_ENTRY: [{ s: "UNWIND_INFO", how: "rva", via: "UnwindInfoAddress" }],
  UNWIND_INFO: [
    { leaf: "UNWIND_CODE[CountOfCodes]", fam: "exc", how: "follows", note: "2 octets chacun" },
    { leaf: "Handler d’exception (RVA) + données", fam: "exc", how: "follows", note: "si Flags & (EHANDLER | UHANDLER)" },
    { s: "IMAGE_RUNTIME_FUNCTION_ENTRY", how: "follows", via: "Flags & CHAININFO", note: "entrée parente chaînée" }
  ],

  WIN_CERTIFICATE: [{ leaf: "PKCS#7 SignedData (signature Authenticode)", fam: "cert", how: "in", via: "bCertificate" }],

  IMAGE_BASE_RELOCATION: [
    { leaf: "WORD TypeOffset[] — type (4 bits) | offset (12 bits)", fam: "reloc", how: "follows", mult: "×((SizeOfBlock − 8) / 2)" },
    { s: "IMAGE_BASE_RELOCATION", how: "follows", via: "+ SizeOfBlock", note: "bloc suivant" }
  ],

  IMAGE_DEBUG_DIRECTORY: [
    { s: "CV_INFO_PDB70", how: "off", via: "PointerToRawData", note: "si Type = CODEVIEW" },
    { s: "FPO_DATA", how: "off", via: "PointerToRawData", mult: "×N", note: "si Type = FPO" },
    { leaf: "Autres données (REPRO, EX_DLLCHARACTERISTICS, POGO…)", fam: "debug", how: "off", via: "PointerToRawData" }
  ],
  CV_INFO_PDB70: [{ s: "GUID", how: "in", via: "Signature" }],
  GUID: [],
  FPO_DATA: [],

  IMAGE_TLS_DIRECTORY: [
    { leaf: "Modèle des données TLS", fam: "tls", how: "va", via: "StartAddressOfRawData → EndAddressOfRawData", note: "copié à chaque nouveau thread" },
    { leaf: "DWORD index TLS", fam: "tls", how: "va", via: "AddressOfIndex", note: "écrit par le loader" },
    { leaf: "PIMAGE_TLS_CALLBACK[] terminé par NULL", fam: "tls", how: "va", via: "AddressOfCallBacks", kids: [
      { leaf: "VOID NTAPI callback(PVOID DllHandle, DWORD Reason, PVOID Reserved)", fam: "tls", how: "va", via: "chaque pointeur", note: "exécuté avant l’entry point" } ] }
  ],

  IMAGE_LOAD_CONFIG_DIRECTORY: [
    { leaf: "Cookie /GS (__security_cookie)", fam: "cfg", how: "va", via: "SecurityCookie" },
    { leaf: "Table SafeSEH — RVA[] triées (x86)", fam: "cfg", how: "va", via: "SEHandlerTable", mult: "×SEHandlerCount" },
    { leaf: "Table CFG — cibles d’appel valides (RVA[])", fam: "cfg", how: "va", via: "GuardCFFunctionTable", mult: "×GuardCFFunctionCount" },
    { s: "IMAGE_LOAD_CONFIG_CODE_INTEGRITY", how: "in", via: "CodeIntegrity" }
  ],
  IMAGE_LOAD_CONFIG_CODE_INTEGRITY: [],

  IMAGE_COR20_HEADER: [
    { leaf: "Métadonnées — racine « BSJB » + streams #~ #Strings #US #GUID #Blob", fam: "clr", how: "rva", via: "MetaData" },
    { leaf: "Ressources managées", fam: "clr", how: "rva", via: "Resources" },
    { leaf: "Signature de nom fort", fam: "clr", how: "rva", via: "StrongNameSignature" },
    { leaf: "VTable fixups (C++/CLI)", fam: "clr", how: "rva", via: "VTableFixups" },
    { leaf: "Image native précompilée (NGEN / R2R)", fam: "clr", how: "rva", via: "ManagedNativeHeader" }
  ],

  /* COFF */
  IMAGE_SYMBOL: [
    { leaf: "Nom long dans la table de chaînes COFF", fam: "coff", how: "off", via: "N.Name.Long (si Short = 0)", note: "relatif au début de la table de chaînes" },
    { s: "AUX_FUNCTION_DEF", how: "follows", via: "NumberOfAuxSymbols", note: "EXTERNAL + fonction" },
    { s: "AUX_BF_EF", how: "follows", via: "NumberOfAuxSymbols", note: "« .bf » / « .ef »" },
    { s: "AUX_WEAK_EXTERNAL", how: "follows", via: "NumberOfAuxSymbols", note: "WEAK_EXTERNAL" },
    { s: "AUX_FILE", how: "follows", via: "NumberOfAuxSymbols", note: "FILE (« .file »)" },
    { s: "AUX_SECTION_DEF", how: "follows", via: "NumberOfAuxSymbols", note: "STATIC + nom de section" },
    { s: "AUX_CLR_TOKEN", how: "follows", via: "NumberOfAuxSymbols", note: "CLR_TOKEN" }
  ],
  AUX_FUNCTION_DEF: [{ s: "IMAGE_LINENUMBER", how: "off", via: "PointerToLinenumber", mult: "×N" }, { s: "IMAGE_SYMBOL", how: "idx", via: "TagIndex → symbole « .bf »", stop: true }],
  AUX_BF_EF: [],
  AUX_WEAK_EXTERNAL: [{ s: "IMAGE_SYMBOL", how: "idx", via: "TagIndex → sym2 (repli)", stop: true }],
  AUX_FILE: [],
  AUX_SECTION_DEF: [],
  AUX_CLR_TOKEN: [{ s: "IMAGE_SYMBOL", how: "idx", via: "SymbolTableIndex", stop: true }],
  IMAGE_RELOCATION: [{ s: "IMAGE_SYMBOL", how: "idx", via: "SymbolTableIndex", stop: true }],
  IMAGE_LINENUMBER: [{ s: "IMAGE_SYMBOL", how: "idx", via: "SymbolTableIndex (si Linenumber = 0)", stop: true }],

  /* Archives */
  IMAGE_ARCHIVE_MEMBER_HEADER: [],
  ARCHIVE_FIRST_LINKER_MEMBER: [],
  ARCHIVE_SECOND_LINKER_MEMBER: [],
  IMPORT_OBJECT_HEADER: []
};

/* Fichier objet COFF : aussi réutilisé comme membre d’archive */
const OBJ_FILE = { s: "IMAGE_FILE_HEADER", how: "in", via: "offset 0", note: "SizeOfOptionalHeader = 0 : pas d’Optional Header", kids: [
  { s: "IMAGE_SECTION_HEADER", how: "follows", via: "NumberOfSections", mult: "×NumberOfSections" },
  { s: "IMAGE_SYMBOL", how: "off", via: "PointerToSymbolTable", mult: "×NumberOfSymbols" },
  { leaf: "Table de chaînes COFF — DWORD taille + chaînes ASCIIZ", fam: "coff", how: "follows", note: "juste après les symboles" }
] };

const ROOTS = [
  { id: "pe", title: "Image PE — .exe / .dll / .sys", fam: "dos",
    desc: "L’ordre ci-dessous est celui du fichier. Le DOS header ne contient pas physiquement d’autre en-tête : il est suivi du stub et du Rich header, puis POINTE vers les NT headers par `e_lfanew`. Tout le reste est ensuite atteint par des RVA, VA ou offsets lus dans les champs.",
    kids: [
      { s: "IMAGE_DOS_HEADER", how: "in", via: "offset 0", note: "64 octets" },
      { leaf: "Overlay — octets après la dernière section", fam: "cert", how: "follows", note: "peut contenir la table de certificats (DataDirectory[4])" }
    ] },
  { id: "obj", title: "Fichier objet COFF — .obj", fam: "coff",
    desc: "Pas de DOS header, pas de signature PE, pas d’Optional Header : le fichier commence directement par le File Header. Les relocations (par section) et la table de symboles y sont essentielles.",
    kids: [OBJ_FILE] },
  { id: "lib", title: "Archive / bibliothèque — .lib", fam: "lib",
    desc: "Une archive est une suite de membres précédés d’un en-tête de 60 octets. Les membres sont soit des objets COFF, soit des imports « courts ».",
    kids: [
      { leaf: "Signature « !<arch>\\n » (IMAGE_ARCHIVE_START, 8 octets)", fam: "lib", how: "in", via: "offset 0" },
      { s: "IMAGE_ARCHIVE_MEMBER_HEADER", how: "follows", mult: "×n membres", note: "chaque membre commence à une adresse paire", kids: [
        { s: "ARCHIVE_FIRST_LINKER_MEMBER", how: "in", note: "Name = « / » (1er) — big-endian" },
        { s: "ARCHIVE_SECOND_LINKER_MEMBER", how: "in", note: "Name = « / » (2e) — little-endian" },
        { leaf: "Longnames member — chaînes ASCIIZ des noms longs", fam: "lib", how: "in", note: "Name = « // », optionnel" },
        Object.assign({}, OBJ_FILE, { note: "membre de type fichier objet COFF" }),
        { s: "IMPORT_OBJECT_HEADER", how: "in", note: "membre d’import court (+ 2 chaînes ASCIIZ : symbole, DLL)" }
      ] }
    ] }
];
