"use strict";
/* =========================================================================
   Structure tree: who contains / follows / points to what
   Each node: { s: struct | leaf: text, fam, how, via, mult, note, kids, stop, opt }
   how: in (physically inside) · follows (immediately follows) · off (file offset)
        rva · va · idx (index into another table)
   ========================================================================= */
const HOW = {
  in:      { label: "contains",  color: "#e5e7eb", help: "The structure is physically INSIDE its parent (a nested field, or a block placed at this spot)." },
  follows: { label: "follows",   color: "#cbd5e1", help: "Placed right after its parent in the file, with no pointer: its position has to be computed." },
  off:     { label: "→ OFFSET",  color: "#fdba74", help: "The parent holds a file offset (PointerTo… / e_lfanew)." },
  rva:     { label: "→ RVA",     color: "#86efac", help: "The parent holds an RVA (relative to ImageBase once mapped)." },
  va:      { label: "→ VA",      color: "#67e8f9", help: "The parent holds an absolute virtual address (fixed up by relocations)." },
  idx:     { label: "→ INDEX",   color: "#a5b4fc", help: "The parent holds an index into another table." }
};

const DD_MULT = { 1: "×N + null descriptor", 3: "×(Size / 12)", 5: "blocks up to Size bytes", 6: "×(Size / 28)", 11: "×N + null descriptor", 12: "×N + trailing 0", 13: "×N + null descriptor" };

/* Resources: the 3 levels (Type → Name → Language) are unrolled rather than looped */
const RES_TREE = (function () {
  const data = { s: "IMAGE_RESOURCE_DATA_ENTRY", how: "off", via: "OffsetToData (bit 31 = 0)", note: "leaf of the tree",
    kids: [{ leaf: "Resource bytes", fam: "res", how: "rva", via: "OffsetToData (a real RVA!)" }] };
  const entry = (kids, note) => ({ s: "IMAGE_RESOURCE_DIRECTORY_ENTRY", how: "follows", mult: "×(NumberOfNamedEntries + NumberOfIdEntries)", note, kids });
  const name = { s: "IMAGE_RESOURCE_DIR_STRING_U", how: "off", via: "NameOffset (if NameIsString)", note: "UTF-16 name" };
  const l3 = { s: "IMAGE_RESOURCE_DIRECTORY", how: "off", via: "OffsetToDirectory (bit 31 = 1)", note: "level 3 — Language (LANGID)", kids: [entry([name, data], "Id = LANGID")] };
  const l2 = { s: "IMAGE_RESOURCE_DIRECTORY", how: "off", via: "OffsetToDirectory (bit 31 = 1)", note: "level 2 — resource Name or ID", kids: [entry([name, l3], "Id = resource identifier")] };
  return [entry([name, l2], "level 1 — Id = type (RT_ICON, RT_MANIFEST…)")];
})();

const DD_KIDS = DD.filter(d => d[3]).map(d => {
  const k = { s: d[3], how: d[0] === 4 ? "off" : "rva", via: "DataDirectory[" + d[0] + "] " + d[1], mult: DD_MULT[d[0]], note: d[2] };
  if (d[0] === 2) k.kids = RES_TREE;
  if (d[0] === 12) k.stop = true;
  return k;
});

const KIDS = {
  IMAGE_DOS_HEADER: [
    { leaf: "MS-DOS stub (16-bit program)", fam: "stub", how: "follows", note: "replaceable: Windows ignores it" },
    { s: "RICH_HEADER", how: "follows", opt: true, note: "optional" },
    { s: "IMAGE_NT_HEADERS", how: "off", via: "e_lfanew", note: "the DOS header does not CONTAIN the NT header: it points to it" }
  ],
  RICH_HEADER: [{ s: "RICH_ENTRY", how: "in", via: "Entries", mult: "×N" }],
  RICH_ENTRY: [],
  IMAGE_NT_HEADERS: [
    { leaf: "« PE\\0\\0 » signature", fam: "nt", how: "in", via: "Signature", note: "DWORD 0x00004550" },
    { s: "IMAGE_FILE_HEADER", how: "in", via: "FileHeader" },
    { s: "IMAGE_OPTIONAL_HEADER", how: "in", via: "OptionalHeader" },
    { s: "IMAGE_SECTION_HEADER", how: "follows", via: "NumberOfSections", mult: "×NumberOfSections", note: "at OptionalHeader + SizeOfOptionalHeader" }
  ],
  IMAGE_FILE_HEADER: [
    { s: "IMAGE_SYMBOL", how: "off", via: "PointerToSymbolTable", mult: "×NumberOfSymbols", note: "obsolete: 0 in an image" }
  ],
  IMAGE_OPTIONAL_HEADER: [
    { s: "IMAGE_DATA_DIRECTORY", how: "in", via: "DataDirectory", mult: "×16 (NumberOfRvaAndSizes)", kids: DD_KIDS }
  ],
  IMAGE_DATA_DIRECTORY: [],
  IMAGE_SECTION_HEADER: [
    { leaf: "Raw data of the section", fam: "sec", how: "off", via: "PointerToRawData", note: "mapped at base + VirtualAddress (RVA)" },
    { s: "IMAGE_RELOCATION", how: "off", via: "PointerToRelocations", mult: "×NumberOfRelocations", note: "object files only" },
    { s: "IMAGE_LINENUMBER", how: "off", via: "PointerToLinenumbers", mult: "×NumberOfLinenumbers", note: "obsolete" }
  ],

  IMAGE_EXPORT_DIRECTORY: [
    { leaf: "DLL name (ASCIIZ)", fam: "exp", how: "rva", via: "Name" },
    { leaf: "Export Address Table — DWORD[NumberOfFunctions]", fam: "exp", how: "rva", via: "AddressOfFunctions", kids: [
      { leaf: "Exported code / data", fam: "exp", how: "rva", via: "RVA of the slot" },
      { leaf: "« DLL.Function » forwarder (ASCIIZ)", fam: "exp", how: "rva", via: "if the RVA falls inside the export dir's range" } ] },
    { leaf: "Name Pointer Table — DWORD[NumberOfNames]", fam: "exp", how: "rva", via: "AddressOfNames", kids: [
      { leaf: "Export names (ASCIIZ, sorted)", fam: "exp", how: "rva", via: "RVA of each name" } ] },
    { leaf: "Ordinal Table — WORD[NumberOfNames]", fam: "exp", how: "rva", via: "AddressOfNameOrdinals", kids: [
      { leaf: "index into the Export Address Table (without Base)", fam: "exp", how: "idx", via: "ordinal[i]" } ] }
  ],

  IMAGE_IMPORT_DESCRIPTOR: [
    { leaf: "DLL name (ASCIIZ)", fam: "imp", how: "rva", via: "Name", note: "→ recursive LoadLibrary" },
    { s: "IMAGE_THUNK_DATA", how: "rva", via: "OriginalFirstThunk", mult: "×N + trailing 0", note: "INT — Import Name Table (never modified)" },
    { s: "IMAGE_THUNK_DATA", how: "rva", via: "FirstThunk", mult: "×N + trailing 0", note: "IAT — same layout; the loader writes the addresses here", stop: true }
  ],
  IMAGE_THUNK_DATA: [
    { s: "IMAGE_IMPORT_BY_NAME", how: "rva", via: "AddressOfData (high bit = 0)", note: "import by name" },
    { leaf: "16-bit ordinal", fam: "imp", how: "in", via: "Ordinal (high bit = 1)", note: "import by ordinal: no further structure" }
  ],
  IMAGE_IMPORT_BY_NAME: [],
  IMAGE_BOUND_IMPORT_DESCRIPTOR: [
    { s: "IMAGE_BOUND_FORWARDER_REF", how: "follows", via: "NumberOfModuleForwarderRefs", mult: "×n" },
    { leaf: "Module name (ASCIIZ)", fam: "imp", how: "off", via: "OffsetModuleName", note: "relative to the start of the Bound Import Directory" }
  ],
  IMAGE_BOUND_FORWARDER_REF: [],
  IMAGE_DELAYLOAD_DESCRIPTOR: [
    { leaf: "DLL name (ASCIIZ)", fam: "imp", how: "rva", via: "DllNameRVA" },
    { leaf: "HMODULE slot", fam: "imp", how: "rva", via: "ModuleHandleRVA", note: "written by the delay-load helper" },
    { s: "IMAGE_THUNK_DATA", how: "rva", via: "ImportNameTableRVA", mult: "×N + trailing 0", note: "delay-load INT" },
    { s: "IMAGE_THUNK_DATA", how: "rva", via: "ImportAddressTableRVA", mult: "×N + trailing 0", note: "delay-load IAT (initially points to stubs)", stop: true },
    { s: "IMAGE_THUNK_DATA", how: "rva", via: "BoundImportAddressTableRVA", note: "optional", stop: true },
    { s: "IMAGE_THUNK_DATA", how: "rva", via: "UnloadInformationTableRVA", note: "copy of the IAT, optional", stop: true }
  ],

  IMAGE_RESOURCE_DIRECTORY: [
    { s: "IMAGE_RESOURCE_DIRECTORY_ENTRY", how: "follows", mult: "×(NumberOfNamedEntries + NumberOfIdEntries)" }
  ],
  IMAGE_RESOURCE_DIRECTORY_ENTRY: [
    { s: "IMAGE_RESOURCE_DIR_STRING_U", how: "off", via: "NameOffset (if NameIsString)" },
    { s: "IMAGE_RESOURCE_DIRECTORY", how: "off", via: "OffsetToDirectory (if DataIsDirectory)", note: "next level" },
    { s: "IMAGE_RESOURCE_DATA_ENTRY", how: "off", via: "OffsetToData (otherwise)" }
  ],
  IMAGE_RESOURCE_DIR_STRING_U: [],
  IMAGE_RESOURCE_DATA_ENTRY: [{ leaf: "Resource bytes", fam: "res", how: "rva", via: "OffsetToData" }],

  IMAGE_RUNTIME_FUNCTION_ENTRY: [{ s: "UNWIND_INFO", how: "rva", via: "UnwindInfoAddress" }],
  UNWIND_INFO: [
    { leaf: "UNWIND_CODE[CountOfCodes]", fam: "exc", how: "follows", note: "2 bytes each" },
    { leaf: "Exception handler (RVA) + data", fam: "exc", how: "follows", note: "if Flags & (EHANDLER | UHANDLER)" },
    { s: "IMAGE_RUNTIME_FUNCTION_ENTRY", how: "follows", via: "Flags & CHAININFO", note: "chained parent entry" }
  ],

  WIN_CERTIFICATE: [{ leaf: "PKCS#7 SignedData (Authenticode signature)", fam: "cert", how: "in", via: "bCertificate" }],

  IMAGE_BASE_RELOCATION: [
    { leaf: "WORD TypeOffset[] — type (4 bits) | offset (12 bits)", fam: "reloc", how: "follows", mult: "×((SizeOfBlock − 8) / 2)" },
    { s: "IMAGE_BASE_RELOCATION", how: "follows", via: "+ SizeOfBlock", note: "next block" }
  ],

  IMAGE_DEBUG_DIRECTORY: [
    { s: "CV_INFO_PDB70", how: "off", via: "PointerToRawData", note: "if Type = CODEVIEW" },
    { s: "FPO_DATA", how: "off", via: "PointerToRawData", mult: "×N", note: "if Type = FPO" },
    { leaf: "Other data (REPRO, EX_DLLCHARACTERISTICS, POGO…)", fam: "debug", how: "off", via: "PointerToRawData" }
  ],
  CV_INFO_PDB70: [{ s: "GUID", how: "in", via: "Signature" }],
  GUID: [],
  FPO_DATA: [],

  IMAGE_TLS_DIRECTORY: [
    { leaf: "TLS data template", fam: "tls", how: "va", via: "StartAddressOfRawData → EndAddressOfRawData", note: "copied for every new thread" },
    { leaf: "DWORD TLS index", fam: "tls", how: "va", via: "AddressOfIndex", note: "written by the loader" },
    { leaf: "PIMAGE_TLS_CALLBACK[] terminated by NULL", fam: "tls", how: "va", via: "AddressOfCallBacks", kids: [
      { leaf: "VOID NTAPI callback(PVOID DllHandle, DWORD Reason, PVOID Reserved)", fam: "tls", how: "va", via: "each pointer", note: "run before the entry point" } ] }
  ],

  IMAGE_LOAD_CONFIG_DIRECTORY: [
    { leaf: "/GS cookie (__security_cookie)", fam: "cfg", how: "va", via: "SecurityCookie" },
    { leaf: "SafeSEH table — sorted RVA[] (x86)", fam: "cfg", how: "va", via: "SEHandlerTable", mult: "×SEHandlerCount" },
    { leaf: "CFG table — valid call targets (RVA[])", fam: "cfg", how: "va", via: "GuardCFFunctionTable", mult: "×GuardCFFunctionCount" },
    { s: "IMAGE_LOAD_CONFIG_CODE_INTEGRITY", how: "in", via: "CodeIntegrity" }
  ],
  IMAGE_LOAD_CONFIG_CODE_INTEGRITY: [],

  IMAGE_COR20_HEADER: [
    { leaf: "Metadata — « BSJB » root + #~ #Strings #US #GUID #Blob streams", fam: "clr", how: "rva", via: "MetaData" },
    { leaf: "Managed resources", fam: "clr", how: "rva", via: "Resources" },
    { leaf: "Strong-name signature", fam: "clr", how: "rva", via: "StrongNameSignature" },
    { leaf: "VTable fixups (C++/CLI)", fam: "clr", how: "rva", via: "VTableFixups" },
    { leaf: "Precompiled native image (NGEN / R2R)", fam: "clr", how: "rva", via: "ManagedNativeHeader" }
  ],

  /* COFF */
  IMAGE_SYMBOL: [
    { leaf: "Long name in the COFF string table", fam: "coff", how: "off", via: "N.Name.Long (if Short = 0)", note: "relative to the start of the string table" },
    { s: "AUX_FUNCTION_DEF", how: "follows", via: "NumberOfAuxSymbols", note: "EXTERNAL + function" },
    { s: "AUX_BF_EF", how: "follows", via: "NumberOfAuxSymbols", note: "« .bf » / « .ef »" },
    { s: "AUX_WEAK_EXTERNAL", how: "follows", via: "NumberOfAuxSymbols", note: "WEAK_EXTERNAL" },
    { s: "AUX_FILE", how: "follows", via: "NumberOfAuxSymbols", note: "FILE (« .file »)" },
    { s: "AUX_SECTION_DEF", how: "follows", via: "NumberOfAuxSymbols", note: "STATIC + section name" },
    { s: "AUX_CLR_TOKEN", how: "follows", via: "NumberOfAuxSymbols", note: "CLR_TOKEN" }
  ],
  AUX_FUNCTION_DEF: [{ s: "IMAGE_LINENUMBER", how: "off", via: "PointerToLinenumber", mult: "×N" }, { s: "IMAGE_SYMBOL", how: "idx", via: "TagIndex → « .bf » symbol", stop: true }],
  AUX_BF_EF: [],
  AUX_WEAK_EXTERNAL: [{ s: "IMAGE_SYMBOL", how: "idx", via: "TagIndex → sym2 (fallback)", stop: true }],
  AUX_FILE: [],
  AUX_SECTION_DEF: [],
  AUX_CLR_TOKEN: [{ s: "IMAGE_SYMBOL", how: "idx", via: "SymbolTableIndex", stop: true }],
  IMAGE_RELOCATION: [{ s: "IMAGE_SYMBOL", how: "idx", via: "SymbolTableIndex", stop: true }],
  IMAGE_LINENUMBER: [{ s: "IMAGE_SYMBOL", how: "idx", via: "SymbolTableIndex (if Linenumber = 0)", stop: true }],

  /* Archives */
  IMAGE_ARCHIVE_MEMBER_HEADER: [],
  ARCHIVE_FIRST_LINKER_MEMBER: [],
  ARCHIVE_SECOND_LINKER_MEMBER: [],
  IMPORT_OBJECT_HEADER: []
};

/* COFF object file: also reused as an archive member */
const OBJ_FILE = { s: "IMAGE_FILE_HEADER", how: "in", via: "offset 0", note: "SizeOfOptionalHeader = 0: no Optional Header", kids: [
  { s: "IMAGE_SECTION_HEADER", how: "follows", via: "NumberOfSections", mult: "×NumberOfSections" },
  { s: "IMAGE_SYMBOL", how: "off", via: "PointerToSymbolTable", mult: "×NumberOfSymbols" },
  { leaf: "COFF string table — DWORD size + ASCIIZ strings", fam: "coff", how: "follows", note: "right after the symbols" }
] };

const ROOTS = [
  { id: "pe", title: "PE image — .exe / .dll / .sys", fam: "dos",
    desc: "The order below is the file's own order. The DOS header does not physically contain any other header: it is followed by the stub and the Rich header, then POINTS to the NT headers via `e_lfanew`. Everything else is then reached through RVAs, VAs, or offsets read from fields.",
    kids: [
      { s: "IMAGE_DOS_HEADER", how: "in", via: "offset 0", note: "64 bytes" },
      { leaf: "Overlay — bytes after the last section", fam: "cert", how: "follows", note: "may hold the certificate table (DataDirectory[4])" }
    ] },
  { id: "obj", title: "COFF object file — .obj", fam: "coff",
    desc: "No DOS header, no PE signature, no Optional Header: the file starts directly with the File Header. Relocations (per section) and the symbol table are essential here.",
    kids: [OBJ_FILE] },
  { id: "lib", title: "Archive / library — .lib", fam: "lib",
    desc: "An archive is a sequence of members, each preceded by a 60-byte header. Members are either COFF objects or « short » imports.",
    kids: [
      { leaf: "« !<arch>\\n » signature (IMAGE_ARCHIVE_START, 8 bytes)", fam: "lib", how: "in", via: "offset 0" },
      { s: "IMAGE_ARCHIVE_MEMBER_HEADER", how: "follows", mult: "×n members", note: "every member starts at an even address", kids: [
        { s: "ARCHIVE_FIRST_LINKER_MEMBER", how: "in", note: "Name = « / » (1st) — big-endian" },
        { s: "ARCHIVE_SECOND_LINKER_MEMBER", how: "in", note: "Name = « / » (2nd) — little-endian" },
        { leaf: "Longnames member — ASCIIZ strings of the long names", fam: "lib", how: "in", note: "Name = « // », optional" },
        Object.assign({}, OBJ_FILE, { note: "a COFF object-file member" }),
        { s: "IMPORT_OBJECT_HEADER", how: "in", note: "short import member (+ 2 ASCIIZ strings: symbol, DLL)" }
      ] }
    ] }
];
