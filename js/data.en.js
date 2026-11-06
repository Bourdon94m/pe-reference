"use strict";
/* =========================================================================
   PE format data — exact names taken from winnt.h (and corhdr.h / guiddef.h)
   Each structure: fam (color), page (tab), fields[] with
     n name · t type (or [t32,t64]) · c element count · k kind · d description
     v related constants · s sample value · only 32|64
   ========================================================================= */

/* ---------- Structure families = primary color code ---------- */
const FAM = {
  dos:   { label: "DOS Header",      color: "#fbbf24" },
  stub:  { label: "DOS Stub",        color: "#8b8680" },
  rich:  { label: "Rich Header",     color: "#d2a679" },
  nt:    { label: "NT Signature",    color: "#fb7185" },
  file:  { label: "File Header",     color: "#60a5fa" },
  opt:   { label: "Optional Header", color: "#a78bfa" },
  dd:    { label: "Data Directory",  color: "#f472b6" },
  sec:   { label: "Section Header",  color: "#4ade80" },
  exp:   { label: "Exports",         color: "#2dd4bf" },
  imp:   { label: "Imports",         color: "#22d3ee" },
  res:   { label: "Resources",       color: "#fb923c" },
  exc:   { label: "Exception",       color: "#a3e635" },
  cert:  { label: "Security",        color: "#f87171" },
  reloc: { label: "BaseReloc",       color: "#facc15" },
  debug: { label: "Debug",           color: "#94a3b8" },
  tls:   { label: "TLS",             color: "#818cf8" },
  cfg:   { label: "Load Config",     color: "#e879f9" },
  clr:   { label: ".NET (COM)",      color: "#e5e7eb" },
  coff:  { label: "COFF (objects)",  color: "#c9b458" },
  lib:   { label: "Libraries",       color: "#8fb8a8" },
  pad:   { label: "Padding",         color: "#4b5563" }
};

/* ---------- Field "nature" = secondary color code (pills) ---------- */
const KINDS = {
  magic:  { label: "Magic",        color: "#fca5a5", help: "Fixed signature used to validate the structure." },
  rva:    { label: "RVA",          color: "#86efac", help: "Relative Virtual Address: offset from ImageBase, once the image is mapped." },
  va:     { label: "VA",           color: "#67e8f9", help: "Absolute Virtual Address (ImageBase included) — fixed up by relocations." },
  off:    { label: "File offset",  color: "#fdba74", help: "Position in bytes within the file on disk (PointerTo…)." },
  size:   { label: "Size",         color: "#cbd5e1", help: "Size in bytes." },
  count:  { label: "Count",        color: "#a5b4fc", help: "Number of elements." },
  flags:  { label: "Flags",        color: "#f0abfc", help: "Bitmask: several values combined with OR." },
  enum:   { label: "Enum",         color: "#fde047", help: "A single value from a list." },
  time:   { label: "Timestamp",    color: "#d8b4fe", help: "Seconds since January 1st 1970 UTC." },
  align:  { label: "Alignment",    color: "#bef264", help: "Required multiple for addresses/sizes." },
  ver:    { label: "Version",      color: "#94a3b8", help: "Version number, purely informational." },
  chk:    { label: "Checksum",     color: "#94a3b8", help: "Checksum value." },
  res:    { label: "Reserved",     color: "#6b7280", help: "Reserved / obsolete — 0 in practice." },
  str:    { label: "String",       color: "#fcd34d", help: "Text data." },
  struct: { label: "Substructure", color: "#e5e7eb", help: "Field that holds another structure." },
  misc:   { label: "Misc",         color: "#7c93ad", help: "Implementation detail with no notable role for LoadLibrary (register, overlay, OEM…)." }
};

/* ---------- Sample PE (used for the colored hexdump and the file map) ---------- */
const SAMPLE = {
  sections: [
    { Name: ".text",  VirtualSize: 0x1A3C, VirtualAddress: 0x1000, SizeOfRawData: 0x1C00, PointerToRawData: 0x0400, Characteristics: 0x60000020 },
    { Name: ".rdata", VirtualSize: 0x0D42, VirtualAddress: 0x3000, SizeOfRawData: 0x0E00, PointerToRawData: 0x2000, Characteristics: 0x40000040 },
    { Name: ".data",  VirtualSize: 0x05F0, VirtualAddress: 0x4000, SizeOfRawData: 0x0200, PointerToRawData: 0x2E00, Characteristics: 0xC0000040 },
    { Name: ".pdata", VirtualSize: 0x00CC, VirtualAddress: 0x5000, SizeOfRawData: 0x0200, PointerToRawData: 0x3000, Characteristics: 0x40000040 },
    { Name: ".rsrc",  VirtualSize: 0x01E0, VirtualAddress: 0x6000, SizeOfRawData: 0x0200, PointerToRawData: 0x3200, Characteristics: 0x40000040 },
    { Name: ".reloc", VirtualSize: 0x0028, VirtualAddress: 0x7000, SizeOfRawData: 0x0200, PointerToRawData: 0x3400, Characteristics: 0x42000040 }
  ],
  /* DataDirectory index -> [RVA, Size] */
  dirs: { 1: [0x3290, 0x78], 2: [0x6000, 0x1E0], 3: [0x5000, 0xCC], 5: [0x7000, 0x28], 6: [0x3100, 0x38], 10: [0x3140, 0x140], 12: [0x3000, 0x58] },
  imageBase: { 32: 0x400000, 64: 0x140000000 },
  entry: 0x1140,
  richKey: 0x7A1C4E93,
  rich: [ [0x0103, 0x7A9F, 12], [0x0102, 0x7A9F, 3], [0x00FF, 0x7A9F, 1] ]   /* [ProdId, Build, Count] */
};

/* ---------- Constants (enums & flags) ---------- */
const E = {
  machine: { title: "Machine", kind: "enum", prefix: "IMAGE_FILE_MACHINE_", items: [
    ["UNKNOWN", 0x0, "Applicable to any machine type"], ["ALPHA", 0x184, "Alpha AXP, 32-bit"], ["ALPHA64 / AXP64", 0x284, "Alpha 64-bit"],
    ["AM33", 0x1D3, "Matsushita AM33"], ["AMD64", 0x8664, "x64 (AMD64 / Intel 64)"], ["ARM", 0x1C0, "ARM little endian"],
    ["ARM64", 0xAA64, "ARM64 little endian"], ["ARM64EC", 0xA641, "ABI enabling interoperability between native ARM64 and emulated x64"],
    ["ARM64X", 0xA64E, "Binary where native ARM64 and ARM64EC code coexist"], ["ARMNT", 0x1C4, "ARM Thumb-2 little endian"],
    ["EBC", 0xEBC, "EFI byte code"], ["I386", 0x14C, "Intel 386 and compatibles (x86)"], ["IA64", 0x200, "Intel Itanium family"],
    ["LOONGARCH32", 0x6232, "LoongArch 32-bit"], ["LOONGARCH64", 0x6264, "LoongArch 64-bit"], ["M32R", 0x9041, "Mitsubishi M32R little endian"],
    ["MIPS16", 0x266, "MIPS16"], ["MIPSFPU", 0x366, "MIPS with FPU"], ["MIPSFPU16", 0x466, "MIPS16 with FPU"],
    ["POWERPC", 0x1F0, "Power PC little endian"], ["POWERPCFP", 0x1F1, "Power PC with floating point"],
    ["R3000BE", 0x160, "MIPS I 32-bit big endian"], ["R3000", 0x162, "MIPS I 32-bit little endian"],
    ["R4000", 0x166, "MIPS III 64-bit little endian"], ["R10000", 0x168, "MIPS IV 64-bit little endian"],
    ["RISCV32", 0x5032, "RISC-V 32-bit"], ["RISCV64", 0x5064, "RISC-V 64-bit"], ["RISCV128", 0x5128, "RISC-V 128-bit"],
    ["SH3", 0x1A2, "Hitachi SH3"], ["SH3DSP", 0x1A3, "Hitachi SH3 DSP"], ["SH4", 0x1A6, "Hitachi SH4"], ["SH5", 0x1A8, "Hitachi SH5"],
    ["THUMB", 0x1C2, "Thumb"], ["WCEMIPSV2", 0x169, "MIPS little endian WCE v2"] ] },

  fileChars: { title: "FileHeader.Characteristics", kind: "flags", prefix: "IMAGE_FILE_", items: [
    ["RELOCS_STRIPPED", 0x0001, "No relocations: the image must be loaded at its ImageBase"],
    ["EXECUTABLE_IMAGE", 0x0002, "Valid image (executable or DLL), no link error"],
    ["LINE_NUMS_STRIPPED", 0x0004, "COFF line numbers removed (obsolete)"],
    ["LOCAL_SYMS_STRIPPED", 0x0008, "COFF local symbols removed (obsolete)"],
    ["AGGRESIVE_WS_TRIM", 0x0010, "Obsolete, must be 0 (winnt.h spells it « AGGRESIVE »; the MS docs spell it AGGRESSIVE)"],
    ["LARGE_ADDRESS_AWARE", 0x0020, "Can handle addresses > 2 GB (32-bit)"],
    ["BYTES_REVERSED_LO", 0x0080, "Obsolete: little-endian bytes reversed"],
    ["32BIT_MACHINE", 0x0100, "32-bit word machine"],
    ["DEBUG_STRIPPED", 0x0200, "Debug info removed from the file"],
    ["REMOVABLE_RUN_FROM_SWAP", 0x0400, "If on removable media: copy to swap then run"],
    ["NET_RUN_FROM_SWAP", 0x0800, "If on network media: copy to swap then run"],
    ["SYSTEM", 0x1000, "System file (driver)"],
    ["DLL", 0x2000, "This is a DLL"],
    ["UP_SYSTEM_ONLY", 0x4000, "Uniprocessor only"],
    ["BYTES_REVERSED_HI", 0x8000, "Obsolete"] ] },

  optMagic: { title: "OptionalHeader.Magic", kind: "enum", prefix: "", items: [
    ["IMAGE_NT_OPTIONAL_HDR32_MAGIC", 0x10B, "PE32 → IMAGE_OPTIONAL_HEADER32"],
    ["IMAGE_NT_OPTIONAL_HDR64_MAGIC", 0x20B, "PE32+ → IMAGE_OPTIONAL_HEADER64"],
    ["IMAGE_ROM_OPTIONAL_HDR_MAGIC", 0x107, "ROM image"] ] },

  subsystem: { title: "OptionalHeader.Subsystem", kind: "enum", prefix: "IMAGE_SUBSYSTEM_", items: [
    ["UNKNOWN", 0, "Unknown"], ["NATIVE", 1, "Native drivers and processes (no Win32 subsystem)"],
    ["WINDOWS_GUI", 2, "Windows graphical application"], ["WINDOWS_CUI", 3, "Windows console application"],
    ["OS2_CUI", 5, "OS/2 console"], ["POSIX_CUI", 7, "POSIX console"], ["NATIVE_WINDOWS", 8, "Native Win9x driver"], ["WINDOWS_CE_GUI", 9, "Windows CE"],
    ["EFI_APPLICATION", 10, "EFI application"], ["EFI_BOOT_SERVICE_DRIVER", 11, "EFI driver (boot services)"],
    ["EFI_RUNTIME_DRIVER", 12, "EFI driver (runtime)"], ["EFI_ROM", 13, "EFI ROM"], ["XBOX", 14, "Xbox"],
    ["WINDOWS_BOOT_APPLICATION", 16, "Windows boot application"] ] },

  dllChars: { title: "OptionalHeader.DllCharacteristics", kind: "flags", prefix: "IMAGE_DLLCHARACTERISTICS_", items: [
    ["HIGH_ENTROPY_VA", 0x0020, "High-entropy 64-bit ASLR (VA > 4 GB)"],
    ["DYNAMIC_BASE", 0x0040, "ASLR: the image can be relocated to another base"],
    ["FORCE_INTEGRITY", 0x0080, "Signature integrity check enforced"],
    ["NX_COMPAT", 0x0100, "DEP compatible (No eXecute)"],
    ["NO_ISOLATION", 0x0200, "Isolation (manifest) ignored"],
    ["NO_SEH", 0x0400, "No SEH in this image"],
    ["NO_BIND", 0x0800, "Do not bind the image"],
    ["APPCONTAINER", 0x1000, "Must run inside an AppContainer"],
    ["WDM_DRIVER", 0x2000, "WDM driver"],
    ["GUARD_CF", 0x4000, "Control Flow Guard"],
    ["TERMINAL_SERVER_AWARE", 0x8000, "Terminal Server aware"] ] },

  secChars: { title: "SectionHeader.Characteristics", kind: "flags", prefix: "IMAGE_SCN_", items: [
    ["TYPE_NO_PAD", 0x00000008, "Obsolete"],
    ["CNT_CODE", 0x00000020, "Contains executable code"],
    ["CNT_INITIALIZED_DATA", 0x00000040, "Contains initialized data"],
    ["CNT_UNINITIALIZED_DATA", 0x00000080, "Contains uninitialized data (.bss)"],
    ["LNK_OTHER", 0x00000100, "Reserved"],
    ["LNK_INFO", 0x00000200, "Comments / info (object files only)"],
    ["LNK_REMOVE", 0x00000800, "Not to be included in the image (object files only)"],
    ["LNK_COMDAT", 0x00001000, "COMDAT data (object files only)"],
    ["GPREL", 0x00008000, "Data referenced through the global pointer"],
    ["MEM_16BIT / MEM_PURGEABLE", 0x00020000, "Reserved"],
    ["MEM_LOCKED", 0x00040000, "Reserved"],
    ["MEM_PRELOAD", 0x00080000, "Reserved"],
    ["ALIGN_*", 0x00F00000, "4-bit alignment field: ALIGN_1BYTES = 0x100000, 2 = 0x200000, 4 = 0x300000 … 4096 = 0xD00000, 8192 = 0xE00000. Object files only"],
    ["LNK_NRELOC_OVFL", 0x01000000, "More than 0xFFFF relocations: the real count is in the 1st one"],
    ["MEM_DISCARDABLE", 0x02000000, "Can be discarded after loading (e.g. .reloc)"],
    ["MEM_NOT_CACHED", 0x04000000, "Not cacheable"],
    ["MEM_NOT_PAGED", 0x08000000, "Not pageable"],
    ["MEM_SHARED", 0x10000000, "Shared across processes"],
    ["MEM_EXECUTE", 0x20000000, "Executable → PAGE_EXECUTE_*"],
    ["MEM_READ", 0x40000000, "Readable → PAGE_READONLY / READWRITE"],
    ["MEM_WRITE", 0x80000000, "Writable → PAGE_READWRITE"] ] },

  ddIndex: { title: "DataDirectory[] index", kind: "enum", prefix: "IMAGE_DIRECTORY_ENTRY_", items: [
    ["EXPORT", 0, "Export table"], ["IMPORT", 1, "Import table"], ["RESOURCE", 2, "Resources"],
    ["EXCEPTION", 3, "Exception table (x64: .pdata)"], ["SECURITY", 4, "Authenticode certificates — VirtualAddress = FILE OFFSET"],
    ["BASERELOC", 5, "Relocations"], ["DEBUG", 6, "Debug directory"], ["ARCHITECTURE", 7, "Reserved"],
    ["GLOBALPTR", 8, "RVA of the global pointer (IA64)"], ["TLS", 9, "Thread Local Storage"],
    ["LOAD_CONFIG", 10, "Load configuration (cookie, CFG…)"], ["BOUND_IMPORT", 11, "Bound imports"],
    ["IAT", 12, "Import Address Table"], ["DELAY_IMPORT", 13, "Delay-load imports"], ["COM_DESCRIPTOR", 14, "CLR header (.NET)"] ] },

  relocType: { title: "Base relocation entry type", kind: "enum", prefix: "IMAGE_REL_BASED_", items: [
    ["ABSOLUTE", 0, "Ignored — used as padding to align the block"],
    ["HIGH", 1, "High 16 bits of the delta, applied to a WORD"],
    ["LOW", 2, "Low 16 bits of the delta, applied to a WORD"],
    ["HIGHLOW", 3, "32-bit delta added to a DWORD (PE32)"],
    ["HIGHADJ", 4, "Reserved: takes up 2 entries"],
    ["MIPS_JMPADDR / ARM_MOV32 / RISCV_HIGH20", 5, "Machine-dependent: MIPS jump · ARM MOVW/MOVT pair · RISC-V high 20 bits"],
    ["(reserved)", 6, "Must be 0"],
    ["THUMB_MOV32 / RISCV_LOW12I", 7, "Thumb MOVW/MOVT pair · RISC-V low 12 bits (I-type)"],
    ["RISCV_LOW12S / LOONGARCH32_MARK_LA / LOONGARCH64_MARK_LA", 8, "RISC-V low 12 bits (S-type) · LoongArch address across 2 or 4 instructions"],
    ["MIPS_JMPADDR16", 9, "MIPS16 jump"],
    ["DIR64", 10, "64-bit delta added to a ULONGLONG (PE32+)"] ] },

  debugType: { title: "IMAGE_DEBUG_DIRECTORY.Type", kind: "enum", prefix: "IMAGE_DEBUG_TYPE_", items: [
    ["UNKNOWN", 0], ["COFF", 1, "COFF debug info"], ["CODEVIEW", 2, "CodeView → path to the PDB (RSDS)"], ["FPO", 3, "Frame Pointer Omission"],
    ["MISC", 4, ".dbg path"], ["EXCEPTION", 5], ["FIXUP", 6], ["OMAP_TO_SRC", 7], ["OMAP_FROM_SRC", 8], ["BORLAND", 9],
    ["RESERVED10", 10], ["CLSID", 11], ["VC_FEATURE", 12, "VC++ build info"], ["POGO", 13, "Profile Guided Optimization"],
    ["ILTCG", 14], ["MPX", 15], ["REPRO", 16, "Reproducible build: timestamps replaced by a content hash"],
    ["(unnamed)", 17, "Debug info embedded in the PE at PointerToRawData"],
    ["(unnamed)", 19, "Cryptographic hash of the symbol file used for the build"],
    ["EX_DLLCHARACTERISTICS", 20, "Extended DllCharacteristics (CET…)"] ] },

  resType: { title: "Resource types (level 1)", kind: "enum", prefix: "RT_", items: [
    ["CURSOR", 1], ["BITMAP", 2], ["ICON", 3], ["MENU", 4], ["DIALOG", 5], ["STRING", 6], ["FONTDIR", 7], ["FONT", 8],
    ["ACCELERATOR", 9], ["RCDATA", 10], ["MESSAGETABLE", 11], ["GROUP_CURSOR", 12], ["GROUP_ICON", 14], ["VERSION", 16],
    ["DLGINCLUDE", 17], ["PLUGPLAY", 19], ["VXD", 20], ["ANICURSOR", 21], ["ANIICON", 22], ["HTML", 23], ["MANIFEST", 24] ] },

  certRev: { title: "WIN_CERTIFICATE.wRevision", kind: "enum", prefix: "WIN_CERT_REVISION_", items: [
    ["1_0", 0x0100, "Legacy version"], ["2_0", 0x0200, "Current version"] ] },
  certType: { title: "WIN_CERTIFICATE.wCertificateType", kind: "enum", prefix: "WIN_CERT_TYPE_", items: [
    ["X509", 0x0001, "X.509 certificate"], ["PKCS_SIGNED_DATA", 0x0002, "PKCS#7 SignedData (Authenticode)"],
    ["RESERVED_1", 0x0003, "Reserved"], ["TS_STACK_SIGNED", 0x0004, "Terminal Server Protocol Stack"] ] },

  ordFlag: { title: "Import by ordinal (IMAGE_THUNK_DATA)", kind: "flags", prefix: "", items: [
    ["IMAGE_ORDINAL_FLAG32", 0x80000000, "Bit 31: if 1, import by ordinal (PE32)"],
    ["IMAGE_ORDINAL_FLAG64", "0x8000000000000000", "Bit 63: if 1, import by ordinal (PE32+)"] ] },

  unwindFlags: { title: "UNWIND_INFO.Flags", kind: "flags", prefix: "UNW_FLAG_", items: [
    ["EHANDLER", 1, "An exception handler function is present"], ["UHANDLER", 2, "A termination (unwind) handler is present"],
    ["CHAININFO", 4, "This UNWIND_INFO is chained to a parent RUNTIME_FUNCTION"] ] },

  guardFlags: { title: "LoadConfig.GuardFlags", kind: "flags", prefix: "IMAGE_GUARD_", items: [
    ["CF_INSTRUMENTED", 0x100, "CFG: the module checks indirect calls"], ["CFW_INSTRUMENTED", 0x200, "CFG with write checks"],
    ["CF_FUNCTION_TABLE_PRESENT", 0x400, "GuardCFFunctionTable is valid"], ["SECURITY_COOKIE_UNUSED", 0x800, "No /GS cookie"],
    ["PROTECT_DELAYLOAD_IAT", 0x1000, "Delay-load IAT protected"], ["DELAYLOAD_IAT_IN_ITS_OWN_SECTION", 0x2000, "…in its own section"],
    ["CF_EXPORT_SUPPRESSION_INFO_PRESENT", 0x4000, "Export suppression info present"], ["CF_ENABLE_EXPORT_SUPPRESSION", 0x8000, "Export suppression enabled"],
    ["CF_LONGJUMP_TABLE_PRESENT", 0x10000, "Valid longjmp target table"],
    ["CF_FUNCTION_TABLE_SIZE_MASK", 0xF0000000, "4-bit subfield: extra bytes per GuardCFFunctionTable entry (shift of 28: IMAGE_GUARD_CF_FUNCTION_TABLE_SIZE_SHIFT)"] ] },

  corFlags: { title: "IMAGE_COR20_HEADER.Flags", kind: "flags", prefix: "COMIMAGE_FLAGS_", items: [
    ["ILONLY", 0x1, "Pure IL code (no native code)"], ["32BITREQUIRED", 0x2, "Requires a 32-bit process"], ["IL_LIBRARY", 0x4, "IL library"],
    ["STRONGNAMESIGNED", 0x8, "Strong-name signed"], ["NATIVE_ENTRYPOINT", 0x10, "EntryPointRVA points to native code"],
    ["TRACKDEBUGDATA", 0x10000, "Track debug data"], ["32BITPREFERRED", 0x20000, "Prefers 32-bit (AnyCPU 32-bit preferred)"] ] }
};

Object.assign(E, {
  dllCharsEx: { title: "Extended DLL Characteristics (debug type 20)", kind: "flags", prefix: "IMAGE_DLLCHARACTERISTICS_EX_", items: [
    ["CET_COMPAT", 0x0001, "Shadow Stack CET compatible (Control-flow Enforcement Technology)"],
    ["FORWARD_CFI_COMPAT", 0x0040, "Every branch target carries a guard instruction (CET-IBT, ARM BTI). Not used by Windows"] ] },

  tlsReason: { title: "Reason for TLS callbacks (and DllMain)", kind: "enum", prefix: "DLL_", items: [
    ["PROCESS_DETACH", 0, "The process is about to terminate"], ["PROCESS_ATTACH", 1, "New process (including the first thread)"],
    ["THREAD_ATTACH", 2, "New thread (except the first)"], ["THREAD_DETACH", 3, "A thread is about to terminate (except the last)"] ] },

  comdat: { title: "COMDAT: Selection field (section aux record)", kind: "enum", prefix: "IMAGE_COMDAT_SELECT_", items: [
    ["NODUPLICATES", 1, "« multiply defined symbol » error if already defined"], ["ANY", 2, "Any section defining the symbol can be kept, the rest are discarded"],
    ["SAME_SIZE", 3, "One is picked; error if sizes differ"], ["EXACT_MATCH", 4, "One is picked; error if contents differ"],
    ["ASSOCIATIVE", 5, "Linked if another COMDAT section (Number field) is linked"], ["LARGEST", 6, "The largest definition is chosen"] ] },

  symSection: { title: "IMAGE_SYMBOL.SectionNumber (values < 1)", kind: "enum", prefix: "IMAGE_SYM_", items: [
    ["UNDEFINED", 0, "No section yet: Value = 0 → external symbol; Value ≠ 0 → common symbol (size)"],
    ["ABSOLUTE (−1)", 0xFFFF, "Absolute value, not an address (signed SHORT −1)"], ["DEBUG (−2)", 0xFFFE, "Type/debug info with no section: .file records (signed SHORT −2)"] ] },

  symType: { title: "IMAGE_SYMBOL.Type — base type (low byte)", kind: "enum", prefix: "IMAGE_SYM_TYPE_", items: [
    ["NULL", 0, "No info / unknown (Microsoft tools)"], ["VOID", 1], ["CHAR", 2], ["SHORT", 3], ["INT", 4], ["LONG", 5], ["FLOAT", 6], ["DOUBLE", 7],
    ["STRUCT", 8], ["UNION", 9], ["ENUM", 10], ["MOE", 11, "Member of enumeration"], ["BYTE", 12], ["WORD", 13], ["UINT", 14], ["DWORD", 15] ] },

  symDType: { title: "IMAGE_SYMBOL.Type — derived type (high byte)", kind: "enum", prefix: "IMAGE_SYM_DTYPE_", items: [
    ["NULL", 0, "Scalar variable"], ["POINTER", 1, "Pointer"], ["FUNCTION", 2, "Function (MS tools only ever set 0x00 or 0x20 in Type)"], ["ARRAY", 3, "Array"] ] },

  symClass: { title: "IMAGE_SYMBOL.StorageClass", kind: "enum", prefix: "IMAGE_SYM_CLASS_", items: [
    ["END_OF_FUNCTION", 0xFF, "End of function (debug)"], ["NULL", 0], ["AUTOMATIC", 1, "Stack variable (Value = offset)"],
    ["EXTERNAL", 2, "External symbol (Microsoft usage)"], ["STATIC", 3, "Offset within the section; Value = 0 → section name"],
    ["REGISTER", 4], ["EXTERNAL_DEF", 5], ["LABEL", 6], ["UNDEFINED_LABEL", 7], ["MEMBER_OF_STRUCT", 8], ["ARGUMENT", 9], ["STRUCT_TAG", 10],
    ["MEMBER_OF_UNION", 11], ["UNION_TAG", 12], ["TYPE_DEFINITION", 13], ["UNDEFINED_STATIC", 14], ["ENUM_TAG", 15], ["MEMBER_OF_ENUM", 16],
    ["REGISTER_PARAM", 17], ["BIT_FIELD", 18], ["BLOCK", 100, ".bb / .eb records"], ["FUNCTION", 101, ".bf / .lf / .ef records"],
    ["END_OF_STRUCT", 102], ["FILE", 103, "Source file name (followed by a « File » aux record)"], ["SECTION", 104],
    ["WEAK_EXTERNAL", 105, "Weak symbol (followed by a « Weak External » aux record)"], ["CLR_TOKEN", 107, "CLR token"] ] },

  weakExt: { title: "Weak External: Characteristics", kind: "enum", prefix: "IMAGE_WEAK_EXTERN_SEARCH_", items: [
    ["NOLIBRARY", 1, "Do not search libraries for sym1"], ["LIBRARY", 2, "Search libraries for sym1"], ["ALIAS", 3, "sym1 is an alias for sym2"] ] },

  coffRelAmd64: { title: "IMAGE_RELOCATION.Type — x64", kind: "enum", prefix: "IMAGE_REL_AMD64_", items: [
    ["ABSOLUTE", 0x0, "Ignored"], ["ADDR64", 0x1, "64-bit VA of the target"], ["ADDR32", 0x2, "32-bit VA of the target"], ["ADDR32NB", 0x3, "32-bit address without base (RVA)"],
    ["REL32", 0x4, "32-bit relative to the byte following the relocation"], ["REL32_1", 0x5, "Relative to +1"], ["REL32_2", 0x6, "Relative to +2"],
    ["REL32_3", 0x7, "Relative to +3"], ["REL32_4", 0x8, "Relative to +4"], ["REL32_5", 0x9, "Relative to +5"],
    ["SECTION", 0xA, "16-bit section index of the target (debug)"], ["SECREL", 0xB, "32-bit offset from the start of the section (debug, TLS)"],
    ["SECREL7", 0xC, "7-bit unsigned offset from the section"], ["TOKEN", 0xD, "CLR token"],
    ["SREL32", 0xE, "32-bit signed span-dependent value"], ["PAIR", 0xF, "Must follow every span-dependent value"], ["SSPAN32", 0x10, "32-bit signed span-dependent value applied at link time"] ] },

  coffRelI386: { title: "IMAGE_RELOCATION.Type — i386", kind: "enum", prefix: "IMAGE_REL_I386_", items: [
    ["ABSOLUTE", 0x0, "Ignored"], ["DIR16", 0x1, "Not supported"], ["REL16", 0x2, "Not supported"], ["DIR32", 0x6, "32-bit VA of the target"],
    ["DIR32NB", 0x7, "32-bit RVA of the target"], ["SEG12", 0x9, "Not supported"], ["SECTION", 0xA, "16-bit section index (debug)"],
    ["SECREL", 0xB, "32-bit offset from the section"], ["TOKEN", 0xC, "CLR token"], ["SECREL7", 0xD, "7-bit offset from the section"],
    ["REL32", 0x14, "32-bit relative displacement (x86 call / jmp)"] ] },

  importType: { title: "IMPORT_OBJECT_HEADER.Type", kind: "enum", prefix: "IMPORT_OBJECT_", items: [
    ["CODE", 0, "Executable code"], ["DATA", 1, "Data"], ["CONST", 2, "CONST in the .def file"] ] },

  importNameType: { title: "IMPORT_OBJECT_HEADER.NameType", kind: "enum", prefix: "IMPORT_OBJECT_", items: [
    ["ORDINAL", 0, "Import by ordinal (Ordinal/Hint = ordinal); otherwise it's a hint"], ["NAME", 1, "Name = public symbol"],
    ["NAME_NOPREFIX", 2, "Public name without the leading « ? », « @ » or « _ »"], ["NAME_UNDECORATE", 3, "Like NOPREFIX, truncated at the first « @ »"] ] }
});

/* ---------- Base type sizes ---------- */
const BASE = { BYTE: 1, CHAR: 1, WORD: 2, WCHAR: 2, SHORT: 2, DWORD: 4, LONG: 4, ULONGLONG: 8 };

const F = (n, t, k, d, o) => Object.assign({ n, t, k, d }, o || {});
const PTR = ["DWORD", "ULONGLONG"];

/* =========================================================================
   Structures
   ========================================================================= */
const S = {};

/* ---------- DOS ---------- */
S.IMAGE_DOS_HEADER = {
  fam: "dos", page: "dos", hdr: "winnt.h",
  desc: "Legacy MS-DOS header, always 64 bytes long. Windows only looks at two fields: e_magic and e_lfanew.",
  loc: "File offset 0x00.",
  fields: [
    F("e_magic", "WORD", "magic", "« MZ » signature (0x5A4D = IMAGE_DOS_SIGNATURE), Mark Zbikowski's initials.", { s: 0x5A4D }),
    F("e_cblp", "WORD", "size", "Bytes used in the last 512-byte page of the DOS file.", { s: 0x90 }),
    F("e_cp", "WORD", "count", "Number of 512-byte pages in the DOS file.", { s: 3 }),
    F("e_crlc", "WORD", "count", "Number of entries in the DOS relocation table.", { s: 0 }),
    F("e_cparhdr", "WORD", "size", "Size of the DOS header in paragraphs (1 paragraph = 16 bytes).", { s: 4 }),
    F("e_minalloc", "WORD", "size", "Minimum paragraphs to allocate above the program.", { s: 0 }),
    F("e_maxalloc", "WORD", "size", "Maximum paragraphs to allocate (0xFFFF = whatever is available).", { s: 0xFFFF }),
    F("e_ss", "WORD", "misc", "Initial (relative) value of SS.", { s: 0 }),
    F("e_sp", "WORD", "misc", "Initial value of SP.", { s: 0xB8 }),
    F("e_csum", "WORD", "chk", "DOS checksum (ignored).", { s: 0 }),
    F("e_ip", "WORD", "misc", "Initial value of IP.", { s: 0 }),
    F("e_cs", "WORD", "misc", "Initial (relative) value of CS.", { s: 0 }),
    F("e_lfarlc", "WORD", "off", "Offset of the DOS relocation table. 0x40 (right after the header) signals a « new-style » executable (NE/PE).", { s: 0x40 }),
    F("e_ovno", "WORD", "misc", "Overlay number.", { s: 0 }),
    F("e_res", "WORD", "res", "Reserved.", { c: 4 }),
    F("e_oemid", "WORD", "misc", "OEM identifier (used by e_oeminfo).", { s: 0 }),
    F("e_oeminfo", "WORD", "misc", "OEM info.", { s: 0 }),
    F("e_res2", "WORD", "res", "Reserved.", { c: 10 }),
    F("e_lfanew", "LONG", "off", "File offset of the IMAGE_NT_HEADERS (« PE\\0\\0 » signature). This is the field that lets you skip the DOS stub.",
      { s: 0xB0, to: "IMAGE_NT_HEADERS" })
  ]
};

/* ---------- Rich header (undocumented) ---------- */
S.RICH_ENTRY = {
  fam: "rich", page: "rich", hdr: "undocumented — absent from windows.h",
  desc: "An « @comp.id » entry: a tool (compiler, linker, assembler…) used to produce the binary, and the number of objects it contributed.",
  fields: [
    F("wBuild", "WORD", "ver", "Build number of the tool (e.g. 31391 for VC++ 2022). Low part of @comp.id."),
    F("wProdId", "WORD", "enum", "Product/tool identifier (cl, link, masm, cvtres…). High part of @comp.id."),
    F("dwCount", "DWORD", "count", "Number of times this tool/build was used (number of objects).")
  ]
};
S.RICH_HEADER = {
  fam: "rich", page: "rich", hdr: "undocumented — absent from windows.h", noEncode: true,
  desc: "Optional block inserted by the Microsoft linker between the DOS stub and the PE signature. Everything except the « Rich » string and the key is XORed with that key. Never read by the loader or by LoadLibrary.",
  loc: "Between the end of the DOS stub and e_lfanew (typically 8-byte aligned); identified by searching for « Rich » backward from e_lfanew.",
  fields: [
    F("DanS", "DWORD", "magic", "« DanS » (0x536E6144) XORed with XorKey. Start of the block.", { s: 0 }),
    F("Padding", "DWORD", "res", "3 DWORDs at 0 before XOR (so equal to XorKey on disk).", { c: 3 }),
    F("Entries", "RICH_ENTRY", "struct", "Array of @comp.id entries (8 bytes each), each DWORD XORed with XorKey.", { c: 1, vs: true }),
    F("Rich", "DWORD", "magic", "« Rich » (0x68636952), in plain: marks the end of the block.", { s: 0 }),
    F("XorKey", "DWORD", "chk", "XOR key = checksum of the bytes before « DanS » (ignoring e_lfanew) combined with the entries.", { s: 0 })
  ]
};

/* ---------- NT headers ---------- */
S.IMAGE_NT_HEADERS = {
  name: ["IMAGE_NT_HEADERS32", "IMAGE_NT_HEADERS64"], fam: "nt", page: "file", hdr: "winnt.h",
  desc: "Root of the PE format: signature + File Header + Optional Header. IMAGE_NT_HEADERS is an alias for the 32- or 64-bit version depending on _WIN64.",
  loc: "File offset = IMAGE_DOS_HEADER.e_lfanew.",
  fields: [
    F("Signature", "DWORD", "magic", "« PE\\0\\0 » (0x00004550 = IMAGE_NT_SIGNATURE).", { s: 0x4550 }),
    F("FileHeader", "IMAGE_FILE_HEADER", "struct", "COFF header: architecture, number of sections…"),
    F("OptionalHeader", "IMAGE_OPTIONAL_HEADER", "struct", "The « optional » header (mandatory for an image): addresses, sizes, alignments, Data Directories.")
  ]
};

S.IMAGE_FILE_HEADER = {
  fam: "file", page: "file", hdr: "winnt.h",
  desc: "COFF header, inherited from object files. Gives the architecture, the number of sections, and the size of the Optional Header.",
  loc: "IMAGE_NT_HEADERS + 0x04.",
  fields: [
    F("Machine", "WORD", "enum", "Target CPU architecture.", { v: "machine", s: { 32: 0x14C, 64: 0x8664 } }),
    F("NumberOfSections", "WORD", "count", "Number of entries in the section table (the Windows loader accepts at most 96).", { s: 6 }),
    F("TimeDateStamp", "DWORD", "time", "Creation date of the image. With /Brepro, this is a hash instead of a date.", { s: 0x6652F1A0 }),
    F("PointerToSymbolTable", "DWORD", "off", "Offset of the COFF symbol table — 0 in an image (obsolete).", { s: 0 }),
    F("NumberOfSymbols", "DWORD", "count", "Number of COFF symbols — 0 in an image.", { s: 0 }),
    F("SizeOfOptionalHeader", "WORD", "size", "Size of the Optional Header: 0xE0 for PE32, 0xF0 for PE32+ (with 16 data directories).", { s: { 32: 0xE0, 64: 0xF0 } }),
    F("Characteristics", "WORD", "flags", "File attributes (EXE/DLL, relocations stripped…).", { v: "fileChars", s: { 32: 0x0102, 64: 0x0022 } })
  ]
};

S.IMAGE_OPTIONAL_HEADER = {
  name: ["IMAGE_OPTIONAL_HEADER32", "IMAGE_OPTIONAL_HEADER64"], fam: "opt", page: "optional", hdr: "winnt.h",
  desc: "Despite its name it is mandatory in an image. Holds the entry point, ImageBase, alignments, image size, and the Data Directories. Its layout changes between PE32 and PE32+ (BaseOfData disappears, ImageBase and the stack/heap sizes become 64-bit).",
  loc: "IMAGE_NT_HEADERS + 0x18.",
  fields: [
    F("Magic", "WORD", "enum", "Image type: 0x10B = PE32, 0x20B = PE32+. This field — not Machine — decides the layout of everything that follows.", { v: "optMagic", s: { 32: 0x10B, 64: 0x20B } }),
    F("MajorLinkerVersion", "BYTE", "ver", "Linker major version.", { s: 14 }),
    F("MinorLinkerVersion", "BYTE", "ver", "Linker minor version.", { s: 36 }),
    F("SizeOfCode", "DWORD", "size", "Sum of the raw sizes of the code sections.", { s: 0x1C00 }),
    F("SizeOfInitializedData", "DWORD", "size", "Sum of the raw sizes of the initialized-data sections.", { s: 0x1600 }),
    F("SizeOfUninitializedData", "DWORD", "size", "Sum of the sizes of the uninitialized-data sections (.bss).", { s: 0 }),
    F("AddressOfEntryPoint", "DWORD", "rva", "RVA of the entry point: CRT startup for an EXE, a DllMain wrapper for a DLL, DriverEntry for a driver. 0 = none.",
      { s: 0x1140 }),
    F("BaseOfCode", "DWORD", "rva", "RVA of the start of the code section (informational).", { s: 0x1000 }),
    F("BaseOfData", "DWORD", "rva", "RVA of the start of the data. PE32 only: in PE32+ this field no longer exists and ImageBase becomes 8 bytes.", { only: 32, s: 0x3000 }),
    F("ImageBase", PTR, "va", "Preferred load virtual address (multiple of 64 KB). If the address is unavailable or with ASLR, the loader relocates the image.",
      { s: { 32: 0x400000, 64: 0x140000000 } }),
    F("SectionAlignment", "DWORD", "align", "Section alignment in memory (their VirtualAddress). ≥ FileAlignment; 0x1000 = page size.", { s: 0x1000 }),
    F("FileAlignment", "DWORD", "align", "Alignment of raw data in the file: a power of 2 between 0x200 and 0x10000.", { s: 0x200 }),
    F("MajorOperatingSystemVersion", "WORD", "ver", "Required OS major version (informational).", { s: 6 }),
    F("MinorOperatingSystemVersion", "WORD", "ver", "Required OS minor version.", { s: 0 }),
    F("MajorImageVersion", "WORD", "ver", "Image major version (/VERSION option).", { s: 0 }),
    F("MinorImageVersion", "WORD", "ver", "Image minor version.", { s: 0 }),
    F("MajorSubsystemVersion", "WORD", "ver", "Minimum subsystem major version.", { s: 6 }),
    F("MinorSubsystemVersion", "WORD", "ver", "Minimum subsystem minor version.", { s: 0 }),
    F("Win32VersionValue", "DWORD", "res", "Reserved, must be 0.", { s: 0 }),
    F("SizeOfImage", "DWORD", "size", "Total size of the image in memory, headers included, a multiple of SectionAlignment.", { s: 0x8000 }),
    F("SizeOfHeaders", "DWORD", "size", "Combined size of the DOS header + stub + NT headers + section headers, rounded up to FileAlignment. Equal to the smallest PointerToRawData.", { s: 0x400 }),
    F("CheckSum", "DWORD", "chk", "Image checksum. Ignored, except for drivers, system DLLs, and services started at boot.", { s: 0 }),
    F("Subsystem", "WORD", "enum", "Required subsystem (GUI, console, native, EFI…).", { v: "subsystem", s: 3 }),
    F("DllCharacteristics", "WORD", "flags", "Loading and security attributes (historical name: also applies to EXEs). DYNAMIC_BASE = ASLR, NX_COMPAT = DEP, GUARD_CF = CFG.",
      { v: "dllChars", s: { 32: 0x8140, 64: 0x8160 } }),
    F("SizeOfStackReserve", PTR, "size", "Main thread stack: reserved memory.", { s: 0x100000 }),
    F("SizeOfStackCommit", PTR, "size", "Main thread stack: memory committed up front.", { s: 0x1000 }),
    F("SizeOfHeapReserve", PTR, "size", "Default process heap: reserved memory.", { s: 0x100000 }),
    F("SizeOfHeapCommit", PTR, "size", "Default heap: memory committed up front.", { s: 0x1000 }),
    F("LoaderFlags", "DWORD", "res", "Obsolete, 0.", { s: 0 }),
    F("NumberOfRvaAndSizes", "DWORD", "count", "Number of valid DataDirectory entries (IMAGE_NUMBEROF_DIRECTORY_ENTRIES = 16). Can be smaller.", { s: 16 }),
    F("DataDirectory", "IMAGE_DATA_DIRECTORY", "struct", "16 pointers (RVA + size) to the PE tables: imports, exports, resources, relocations…", { c: 16, v: "ddIndex", s: Array.from({ length: 16 }, (_, i) => SAMPLE.dirs[i] || [0, 0]) })
  ]
};

S.IMAGE_DATA_DIRECTORY = {
  fam: "dd", page: "optional", hdr: "winnt.h",
  desc: "One entry of the Data Directory table: pointer + size to a PE table. The index (IMAGE_DIRECTORY_ENTRY_*) says which structure is there.",
  loc: "OptionalHeader.DataDirectory[index].",
  fields: [
    F("VirtualAddress", "DWORD", "rva", "RVA of the table. ⚠ Exception: for IMAGE_DIRECTORY_ENTRY_SECURITY this is a FILE OFFSET (the certificate isn't mapped into memory)."),
    F("Size", "DWORD", "size", "Size of the table in bytes.")
  ]
};

/* ---------- Sections ---------- */
S.IMAGE_SECTION_HEADER = {
  fam: "sec", page: "sections", hdr: "winnt.h",
  desc: "Describes a section: where its bytes are in the file (PointerToRawData / SizeOfRawData) and where they go in memory (VirtualAddress / VirtualSize), with its access rights (Characteristics). The section table is an array of these 40-byte structures.",
  loc: "Right after the Optional Header: IMAGE_FIRST_SECTION(nt) = OptionalHeader + SizeOfOptionalHeader. NumberOfSections entries.",
  fields: [
    F("Name", "BYTE", "str", "8-byte, null-padded UTF-8 name; no trailing null if it is exactly 8 characters long. In an object file, « /n » refers to the COFF string table; an image does not support longer names. Conventions: .text .rdata .data .rsrc .reloc .pdata.", { c: 8, s: ".text" }),
    F("VirtualSize", "DWORD", "size", "Size of the section in memory (before alignment). If > SizeOfRawData, the remainder is zero-filled (.bss). Union with PhysicalAddress (object files).",
      { u: "Misc", alt: ["PhysicalAddress"] }),
    F("VirtualAddress", "DWORD", "rva", "RVA of the start of the section in memory. A multiple of SectionAlignment, increasing from one section to the next."),
    F("SizeOfRawData", "DWORD", "size", "Size of the data in the file, a multiple of FileAlignment. Can be 0 (a pure .bss section)."),
    F("PointerToRawData", "DWORD", "off", "File offset of the start of the section's data."),
    F("PointerToRelocations", "DWORD", "off", "Offset of COFF relocations — 0 in an image (PE relocations live in BaseReloc).", { s: 0 }),
    F("PointerToLinenumbers", "DWORD", "off", "Offset of COFF line numbers — 0 in an image.", { s: 0 }),
    F("NumberOfRelocations", "WORD", "count", "Number of COFF relocations — 0 in an image.", { s: 0 }),
    F("NumberOfLinenumbers", "WORD", "count", "Number of COFF line numbers — 0 in an image.", { s: 0 }),
    F("Characteristics", "DWORD", "flags", "Content and access rights: CNT_CODE, MEM_READ, MEM_WRITE, MEM_EXECUTE…", { v: "secChars" })
  ]
};

/* ---------- Exports ---------- */
S.IMAGE_EXPORT_DIRECTORY = {
  fam: "exp", page: "exports", hdr: "winnt.h",
  desc: "Header of the export table. Three arrays work together: names (sorted), their associated ordinals, and function addresses (EAT).",
  loc: "DataDirectory[IMAGE_DIRECTORY_ENTRY_EXPORT] (RVA).",
  fields: [
    F("Characteristics", "DWORD", "res", "Reserved, 0."),
    F("TimeDateStamp", "DWORD", "time", "Creation date of the export table."),
    F("MajorVersion", "WORD", "ver", "Major version (user-defined, rarely used)."),
    F("MinorVersion", "WORD", "ver", "Minor version."),
    F("Name", "DWORD", "rva", "RVA of the DLL name (ASCIIZ), e.g. « KERNEL32.dll ».", { to: "ASCIIZ" }),
    F("Base", "DWORD", "count", "Starting ordinal: an export's ordinal = index in AddressOfFunctions + Base (often 1)."),
    F("NumberOfFunctions", "DWORD", "count", "Size of the AddressOfFunctions array (some entries can be 0)."),
    F("NumberOfNames", "DWORD", "count", "Number of named exports (≤ NumberOfFunctions). Size of AddressOfNames and AddressOfNameOrdinals."),
    F("AddressOfFunctions", "DWORD", "rva", "RVA of a DWORD[NumberOfFunctions] array: RVA of each function (EAT)."),
    F("AddressOfNames", "DWORD", "rva", "RVA of a DWORD[NumberOfNames] array: RVAs of the names (ASCIIZ), sorted alphabetically."),
    F("AddressOfNameOrdinals", "DWORD", "rva", "RVA of a WORD[NumberOfNames] array: for each name, the matching index into AddressOfFunctions (WITHOUT adding Base).")
  ]
};

/* ---------- Imports ---------- */
S.IMAGE_IMPORT_DESCRIPTOR = {
  fam: "imp", page: "imports", hdr: "winnt.h",
  desc: "Describes the imports of ONE DLL. The descriptor array ends with an all-zero descriptor.",
  loc: "DataDirectory[IMAGE_DIRECTORY_ENTRY_IMPORT] (RVA), array of descriptors.",
  fields: [
    F("OriginalFirstThunk", "DWORD", "rva", "RVA of the INT (Import Name Table): an array of IMAGE_THUNK_DATA ending with 0, that is never modified. Union with Characteristics (0 = end descriptor).",
      { alt: ["Characteristics"], to: "IMAGE_THUNK_DATA" }),
    F("TimeDateStamp", "DWORD", "time", "0 = not bound; −1 = bound via Bound Import; otherwise the DLL's date at bind time."),
    F("ForwarderChain", "DWORD", "misc", "Index of the first forwarder (legacy binding), −1 if none."),
    F("Name", "DWORD", "rva", "RVA of the DLL name (ASCIIZ).", { to: "ASCIIZ" }),
    F("FirstThunk", "DWORD", "rva", "RVA of this DLL's IAT (Import Address Table). On disk: a copy of the INT; in memory: the real function addresses.", { to: "IMAGE_THUNK_DATA" })
  ]
};

S.IMAGE_THUNK_DATA = {
  name: ["IMAGE_THUNK_DATA32", "IMAGE_THUNK_DATA64"], fam: "imp", page: "imports", hdr: "winnt.h", union: true, wrapper: "u1",
  desc: "One slot of the INT or the IAT: it's a union, a single word (32 or 64 bits) interpreted differently depending on state. The arrays end with a zero slot.",
  fields: [
    F("ForwarderString", PTR, "rva", "RVA of a forwarder string (obsolete usage)."),
    F("Function", PTR, "va", "Once loaded, in the IAT: virtual address of the imported function."),
    F("Ordinal", PTR, "enum", "If the high bit is set (IMAGE_ORDINAL_FLAG), import by ordinal: the low 16 bits are the ordinal (bits 30–15 or 62–15 must be 0).", { v: "ordFlag", bits: [["Ordinal", "bits 0–15"], ["Ordinal/Name Flag", "bit 31 (PE32) · bit 63 (PE32+)"]] }),
    F("AddressOfData", PTR, "rva", "Otherwise (high bit = 0): RVA of an IMAGE_IMPORT_BY_NAME (Hint + name). Only 31 bits are used; in PE32+ bits 62–31 must be 0.", { to: "IMAGE_IMPORT_BY_NAME", bits: [["Hint/Name Table RVA", "bits 0–30"]] })
  ]
};

S.IMAGE_IMPORT_BY_NAME = {
  fam: "imp", page: "imports", hdr: "winnt.h",
  desc: "Hint + name of a function imported by name. Must be 2-byte aligned.",
  fields: [
    F("Hint", "WORD", "misc", "A « suggested » index into the DLL's export name table — speeds up the lookup, not guaranteed."),
    F("Name", "CHAR", "str", "Function name, variable-length ASCIIZ.", { c: 1, vs: true })
  ]
};

S.IMAGE_BOUND_IMPORT_DESCRIPTOR = {
  fam: "imp", page: "imports", hdr: "winnt.h",
  desc: "Entry of the Bound Import Directory: DLLs the IAT was pre-resolved against (an old optimization, abandoned once ASLR arrived).",
  loc: "DataDirectory[IMAGE_DIRECTORY_ENTRY_BOUND_IMPORT]. Ends with a null descriptor.",
  fields: [
    F("TimeDateStamp", "DWORD", "time", "TimeDateStamp of the DLL at bind time."),
    F("OffsetModuleName", "WORD", "off", "Offset of the DLL name, RELATIVE to the start of the Bound Import Directory."),
    F("NumberOfModuleForwarderRefs", "WORD", "count", "Number of IMAGE_BOUND_FORWARDER_REF entries that immediately follow.")
  ]
};
S.IMAGE_BOUND_FORWARDER_REF = {
  fam: "imp", page: "imports", hdr: "winnt.h",
  desc: "Bound forwarder reference, right after an IMAGE_BOUND_IMPORT_DESCRIPTOR.",
  fields: [
    F("TimeDateStamp", "DWORD", "time", "Date of the forwarder's destination DLL."),
    F("OffsetModuleName", "WORD", "off", "Offset of the name, relative to the Bound Import Directory."),
    F("Reserved", "WORD", "res", "Reserved.")
  ]
};

/* ---------- Delay imports ---------- */
S.IMAGE_DELAYLOAD_DESCRIPTOR = {
  fam: "imp", page: "delay", hdr: "winnt.h",
  desc: "Delay-load imports: the IAT is only filled in on the first call to the function, through a CRT stub (__delayLoadHelper2). Not processed by the loader at load time.",
  loc: "DataDirectory[IMAGE_DIRECTORY_ENTRY_DELAY_IMPORT]. Ends with a null descriptor.",
  fields: [
    F("Attributes", "DWORD", "flags", "Bit 0 = RvaBased (dlattrRva in delayimp.h): 1 ⇒ every field below is an RVA (Visual C++ 7.0+ format); 0 ⇒ they are VAs (legacy format). The MS spec's table says « must be 0 », the SDK defines this bit: read it.", { u: "Attributes", bits: [["RvaBased", "bit 0"], ["ReservedAttributes", "bits 1–31"]],
      cRaw: "union {\n        DWORD AllAttributes;\n        struct {\n            DWORD RvaBased : 1;\n            DWORD ReservedAttributes : 31;\n        } DUMMYSTRUCTNAME;\n    } Attributes;" }),
    F("DllNameRVA", "DWORD", "rva", "RVA of the DLL name (ASCIIZ)."),
    F("ModuleHandleRVA", "DWORD", "rva", "RVA of a slot to store the HMODULE once the DLL is loaded."),
    F("ImportAddressTableRVA", "DWORD", "rva", "RVA of the delay-load IAT (initially points to stubs)."),
    F("ImportNameTableRVA", "DWORD", "rva", "RVA of the delay-load INT (IMAGE_THUNK_DATA), like OriginalFirstThunk."),
    F("BoundImportAddressTableRVA", "DWORD", "rva", "RVA of the bound address table (optional, 0 if absent)."),
    F("UnloadInformationTableRVA", "DWORD", "rva", "RVA of a copy of the IAT, kept to allow unloading the DLL (optional)."),
    F("TimeDateStamp", "DWORD", "time", "Date of the bound DLL, 0 if not bound.")
  ]
};

/* ---------- Resources ---------- */
S.IMAGE_RESOURCE_DIRECTORY = {
  fam: "res", page: "resources", hdr: "winnt.h",
  desc: "A node of a 3-level resource tree (Type → Name/ID → Language). Immediately followed by (NumberOfNamedEntries + NumberOfIdEntries) IMAGE_RESOURCE_DIRECTORY_ENTRY records.",
  loc: "DataDirectory[IMAGE_DIRECTORY_ENTRY_RESOURCE] for the root; every internal offset is relative to that start.",
  fields: [
    F("Characteristics", "DWORD", "res", "Reserved, 0."),
    F("TimeDateStamp", "DWORD", "time", "Creation date of the resource."),
    F("MajorVersion", "WORD", "ver", "Major version."),
    F("MinorVersion", "WORD", "ver", "Minor version."),
    F("NumberOfNamedEntries", "WORD", "count", "Entries identified by a name: they come first, sorted alphabetically."),
    F("NumberOfIdEntries", "WORD", "count", "Entries identified by a numeric ID: they follow, sorted by ID.")
  ]
};
S.IMAGE_RESOURCE_DIRECTORY_ENTRY = {
  fam: "res", page: "resources", hdr: "winnt.h",
  desc: "An entry in a node: identifies a resource (by name or ID) and points to a sub-node or to the data.",
  fields: [
    F("Name", "DWORD", "enum", "Bit 31 = NameIsString: if 1, NameOffset (bits 0–30) is the offset of an IMAGE_RESOURCE_DIR_STRING_U; otherwise the Id (low WORD) is numeric (RT_*, resource ID, or LANGID at level 3).",
      { bits: [["NameOffset", "bits 0–30"], ["NameIsString", "bit 31"], ["Id", "low WORD"]], v: "resType",
        cRaw: "union {\n        struct {\n            DWORD NameOffset : 31;\n            DWORD NameIsString : 1;\n        } DUMMYSTRUCTNAME;\n        DWORD Name;\n        WORD  Id;\n    } DUMMYUNIONNAME;" }),
    F("OffsetToData", "DWORD", "off", "Bit 31 = DataIsDirectory: if 1, OffsetToDirectory (bits 0–30) = offset of a sub-node; otherwise the offset of an IMAGE_RESOURCE_DATA_ENTRY. Offsets are relative to the start of the resource directory.",
      { bits: [["OffsetToDirectory", "bits 0–30"], ["DataIsDirectory", "bit 31"]],
        cRaw: "union {\n        DWORD OffsetToData;\n        struct {\n            DWORD OffsetToDirectory : 31;\n            DWORD DataIsDirectory : 1;\n        } DUMMYSTRUCTNAME2;\n    } DUMMYUNIONNAME2;" })
  ]
};
S.IMAGE_RESOURCE_DIR_STRING_U = {
  fam: "res", page: "resources", hdr: "winnt.h",
  desc: "Name of a resource, UTF-16, not null-terminated.",
  fields: [
    F("Length", "WORD", "count", "Number of characters (WCHAR), not bytes."),
    F("NameString", "WCHAR", "str", "The UTF-16 characters.", { c: 1, vs: true })
  ]
};
S.IMAGE_RESOURCE_DATA_ENTRY = {
  fam: "res", page: "resources", hdr: "winnt.h",
  desc: "Leaf of the tree: locates the resource's bytes.",
  fields: [
    F("OffsetToData", "DWORD", "rva", "⚠ A real RVA (not an offset relative to the resource section, unlike directory entries)."),
    F("Size", "DWORD", "size", "Size of the data."),
    F("CodePage", "DWORD", "misc", "Code page used to decode the data (often 0)."),
    F("Reserved", "DWORD", "res", "Reserved, 0.")
  ]
};

/* ---------- Exceptions (x64) ---------- */
S.IMAGE_RUNTIME_FUNCTION_ENTRY = {
  fam: "exc", page: "exception", hdr: "winnt.h (x64)",
  desc: "Entry of the x64 exception table (.pdata): one per function, sorted by BeginAddress. Lets the stack be unwound without a frame pointer. PE32 (x86) has none: its SEH is stack-based.",
  loc: "DataDirectory[IMAGE_DIRECTORY_ENTRY_EXCEPTION]: an array of Size/12 entries.",
  fields: [
    F("BeginAddress", "DWORD", "rva", "RVA of the start of the function."),
    F("EndAddress", "DWORD", "rva", "RVA of the end of the function."),
    F("UnwindInfoAddress", "DWORD", "rva", "RVA of an UNWIND_INFO structure. Union with UnwindData.", { alt: ["UnwindData"], to: "UNWIND_INFO" })
  ]
};
S.UNWIND_INFO = {
  fam: "exc", page: "exception", hdr: "winnt.h (x64)",
  desc: "Unwind info for a function (prolog size, saved registers…). Followed by the UNWIND_CODE array and, depending on Flags, the address of an exception handler.",
  fields: [
    F("Version", "BYTE", "ver", "Bits 0–2: version (1 or 2).", { bits: [["Version", "bits 0–2"], ["Flags", "bits 3–7"]], v: "unwindFlags",
      cRaw: "BYTE Version : 3;\n    BYTE Flags : 5;" }),
    F("SizeOfProlog", "BYTE", "size", "Prolog size in bytes."),
    F("CountOfCodes", "BYTE", "count", "Number of UNWIND_CODE entries (2 bytes each) that follow."),
    F("FrameRegister", "BYTE", "misc", "Bits 0–3: frame register (0 = none); bits 4–7: FrameOffset (×16).", { bits: [["FrameRegister", "bits 0–3"], ["FrameOffset", "bits 4–7"]],
      cRaw: "BYTE FrameRegister : 4;\n    BYTE FrameOffset : 4;" }),
    F("UnwindCode", "WORD", "misc", "UNWIND_CODE[CountOfCodes]: operations to replay backward (push register, allocate stack…).", { c: 1, vs: true })
  ]
};

/* ---------- Security ---------- */
S.WIN_CERTIFICATE = {
  fam: "cert", page: "security", hdr: "WinTrust.h / winnt.h",
  desc: "Wrapper for an Authenticode signature (or a certificate). Stored after the sections (overlay): the loader does not map it into memory.",
  loc: "DataDirectory[IMAGE_DIRECTORY_ENTRY_SECURITY] — VirtualAddress is a FILE OFFSET. Each certificate is 8-byte aligned.",
  fields: [
    F("dwLength", "DWORD", "size", "Size of the whole entry (8-byte header + certificate), excluding alignment padding."),
    F("wRevision", "WORD", "enum", "Structure version (0x0200 in practice).", { v: "certRev" }),
    F("wCertificateType", "WORD", "enum", "Certificate type (0x0002 = PKCS#7 SignedData for Authenticode).", { v: "certType" }),
    F("bCertificate", "BYTE", "misc", "The certificate itself (DER), variable length.", { c: 1, vs: true })
  ]
};

/* ---------- Relocations ---------- */
S.IMAGE_BASE_RELOCATION = {
  fam: "reloc", page: "reloc", hdr: "winnt.h",
  desc: "Header of a relocation block: covers one 4 KB page. Followed by (SizeOfBlock − 8) / 2 16-bit entries: 4 bits of type + 12 bits of offset within the page.",
  loc: "DataDirectory[IMAGE_DIRECTORY_ENTRY_BASERELOC]: a chain of blocks, ending once Size bytes have been consumed.",
  fields: [
    F("VirtualAddress", "DWORD", "rva", "RVA of the page in question (a multiple of 0x1000)."),
    F("SizeOfBlock", "DWORD", "size", "Size of the block, header (8 bytes) included (and 4-byte aligned)."),
    F("TypeOffset", "WORD", "enum", "16-bit entries: bits 12–15 = type (IMAGE_REL_BASED_*), bits 0–11 = offset within the page.", { c: 1, vs: true, v: "relocType",
      bits: [["Type", "bits 12–15"], ["Offset", "bits 0–11"]] })
  ]
};

/* ---------- Debug ---------- */
S.IMAGE_DEBUG_DIRECTORY = {
  fam: "debug", page: "debug", hdr: "winnt.h",
  desc: "Entry of the debug directory. An array of Size/28 entries. The most useful one: CODEVIEW, which gives the GUID and the path of the .pdb.",
  loc: "DataDirectory[IMAGE_DIRECTORY_ENTRY_DEBUG] (RVA).",
  fields: [
    F("Characteristics", "DWORD", "res", "Reserved, 0."),
    F("TimeDateStamp", "DWORD", "time", "Creation date of the debug info."),
    F("MajorVersion", "WORD", "ver", "Format major version."),
    F("MinorVersion", "WORD", "ver", "Format minor version."),
    F("Type", "DWORD", "enum", "Type of debug information.", { v: "debugType" }),
    F("SizeOfData", "DWORD", "size", "Size of the debug data."),
    F("AddressOfRawData", "DWORD", "rva", "RVA of the data once mapped into memory (0 otherwise)."),
    F("PointerToRawData", "DWORD", "off", "FILE OFFSET of the data (always set).")
  ]
};
S.GUID = {
  fam: "debug", page: "debug", hdr: "guiddef.h",
  desc: "128-bit identifier. In a CodeView PDB70 entry it uniquely identifies the associated .pdb version.",
  fields: [
    F("Data1", "DWORD", "misc", "First 32 bits."), F("Data2", "WORD", "misc", "Next 16 bits."),
    F("Data3", "WORD", "misc", "Next 16 bits."), F("Data4", "BYTE", "misc", "Last 8 bytes.", { c: 8 })
  ]
};
S.CV_INFO_PDB70 = {
  fam: "debug", page: "debug", hdr: "cvinfo.h (outside windows.h)",
  desc: "Contents of a CODEVIEW-type debug entry (PDB 7.0): what's needed to find the .pdb on a symbol server (GUID + Age).",
  fields: [
    F("CvSignature", "DWORD", "magic", "« RSDS » (0x53445352)."),
    F("Signature", "GUID", "struct", "GUID of the PDB."),
    F("Age", "DWORD", "count", "Incremented every time the PDB is updated."),
    F("PdbFileName", "CHAR", "str", "Path to the .pdb, UTF-8 ASCIIZ.", { c: 1, vs: true })
  ]
};

/* ---------- TLS ---------- */
S.IMAGE_TLS_DIRECTORY = {
  name: ["IMAGE_TLS_DIRECTORY32", "IMAGE_TLS_DIRECTORY64"], fam: "tls", page: "tls", hdr: "winnt.h",
  desc: "Static Thread Local Storage (__declspec(thread)). ⚠ The first four fields are VAs (not RVAs): they are fixed up by relocations.",
  loc: "DataDirectory[IMAGE_DIRECTORY_ENTRY_TLS].",
  fields: [
    F("StartAddressOfRawData", PTR, "va", "VA of the start of the TLS data template, copied for every thread."),
    F("EndAddressOfRawData", PTR, "va", "VA of the end of the template."),
    F("AddressOfIndex", PTR, "va", "VA of a DWORD where the loader writes this module's TLS index."),
    F("AddressOfCallBacks", PTR, "va", "VA of a NULL-terminated array of PIMAGE_TLS_CALLBACK (no callback: points to a single word set to 0): run BEFORE the entry point. Reason = DLL_PROCESS_ATTACH, THREAD_ATTACH…", { v: "tlsReason" }),
    F("SizeOfZeroFill", "DWORD", "size", "Zero bytes to add after the template."),
    F("Characteristics", "DWORD", "flags", "In practice holds the alignment (IMAGE_SCN_ALIGN_*) in bits 20–23.")
  ]
};

/* ---------- Load config ---------- */
S.IMAGE_LOAD_CONFIG_DIRECTORY = {
  name: ["IMAGE_LOAD_CONFIG_DIRECTORY32", "IMAGE_LOAD_CONFIG_DIRECTORY64"], fam: "cfg", page: "loadcfg", hdr: "winnt.h",
  desc: "Security and loading settings: /GS cookie, SafeSEH (x86), Control Flow Guard… The structure grows with every Windows version: Size tells you what's present. Shown here: the fields up to GuardLongJumpTargetCount, as in the Microsoft docs (newer SDKs add more: CHPE, DynamicValueRelocTable, XFG…).",
  loc: "DataDirectory[IMAGE_DIRECTORY_ENTRY_LOAD_CONFIG]. Expected size of 64 bytes on x86 for compatibility with Windows XP (legacy version).",
  fields: [
    F("Size", "DWORD", "size", "Size of the structure as written by the linker (named Characteristics, « unused », in the MS spec: same position)."),
    F("TimeDateStamp", "DWORD", "time", "Date."),
    F("MajorVersion", "WORD", "ver", "Major version."),
    F("MinorVersion", "WORD", "ver", "Minor version."),
    F("GlobalFlagsClear", "DWORD", "flags", "Global flags (NtGlobalFlag) to clear."),
    F("GlobalFlagsSet", "DWORD", "flags", "Global flags to set."),
    F("CriticalSectionDefaultTimeout", "DWORD", "misc", "Default timeout for critical sections."),
    F("DeCommitFreeBlockThreshold", PTR, "size", "Decommit threshold for free heap blocks."),
    F("DeCommitTotalFreeThreshold", PTR, "size", "Total free-heap decommit threshold."),
    F("LockPrefixTable", PTR, "va", "VA of the table of LOCK-prefix addresses (x86 only, obsolete)."),
    F("MaximumAllocationSize", PTR, "size", "Maximum allocation size."),
    F("VirtualMemoryThreshold", PTR, "size", "Virtual memory threshold."),
    F("ProcessAffinityMask", PTR, "flags", "Default process affinity mask."),
    F("ProcessHeapFlags", "DWORD", "flags", "Process heap flags."),
    F("CSDVersion", "WORD", "ver", "Service pack."),
    F("DependentLoadFlags", "WORD", "flags", "LoadLibraryEx flags used for dependencies."),
    F("EditList", PTR, "va", "Reserved."),
    F("SecurityCookie", PTR, "va", "VA of the /GS cookie (__security_cookie)."),
    F("SEHandlerTable", PTR, "va", "VA of the SafeSEH table (x86 only)."),
    F("SEHandlerCount", PTR, "count", "Number of SafeSEH handlers."),
    F("GuardCFCheckFunctionPointer", PTR, "va", "VA of the CFG check-function pointer."),
    F("GuardCFDispatchFunctionPointer", PTR, "va", "VA of the CFG dispatch-function pointer."),
    F("GuardCFFunctionTable", PTR, "va", "VA of the table of valid indirect-call targets (sorted RVAs)."),
    F("GuardCFFunctionCount", PTR, "count", "Number of entries in GuardCFFunctionTable."),
    F("GuardFlags", "DWORD", "flags", "CFG options.", { v: "guardFlags" }),
    F("CodeIntegrity", "IMAGE_LOAD_CONFIG_CODE_INTEGRITY", "struct", "Code integrity information (12 bytes)."),
    F("GuardAddressTakenIatEntryTable", PTR, "va", "VA of the CFG table of IAT entries whose address is taken."),
    F("GuardAddressTakenIatEntryCount", PTR, "count", "Number of unique RVAs in that table."),
    F("GuardLongJumpTargetTable", PTR, "va", "VA of the CFG table of longjmp targets."),
    F("GuardLongJumpTargetCount", PTR, "count", "Number of unique RVAs in that table.")
  ]
};
S.IMAGE_LOAD_CONFIG_CODE_INTEGRITY = {
  fam: "cfg", page: "loadcfg", hdr: "winnt.h",
  desc: "12-byte substructure of the Load Config: links to signature catalogs.",
  fields: [
    F("Flags", "WORD", "flags", "Code integrity flags."),
    F("Catalog", "WORD", "misc", "Index of the signature catalog."),
    F("CatalogOffset", "DWORD", "off", "Offset of the catalog."),
    F("Reserved", "DWORD", "res", "Reserved.")
  ]
};

/* ---------- .NET ---------- */
S.IMAGE_COR20_HEADER = {
  fam: "clr", page: "clr", hdr: "corhdr.h",
  desc: "CLR header of a .NET assembly. Points to the metadata (« BSJB » root) and gives the managed entry point. A .NET binary is still a valid PE with a small native stub.",
  loc: "DataDirectory[IMAGE_DIRECTORY_ENTRY_COM_DESCRIPTOR].",
  fields: [
    F("cb", "DWORD", "size", "Size of the structure (0x48)."),
    F("MajorRuntimeVersion", "WORD", "ver", "Minimum required CLR version (major)."),
    F("MinorRuntimeVersion", "WORD", "ver", "Minimum required CLR version (minor)."),
    F("MetaData", "IMAGE_DATA_DIRECTORY", "struct", "Metadata (tables, streams #~ #Strings #US #GUID #Blob)."),
    F("Flags", "DWORD", "flags", "ILONLY, 32BITREQUIRED, STRONGNAMESIGNED…", { v: "corFlags" }),
    F("EntryPointToken", "DWORD", "misc", "Token of the managed entry-point method (or an RVA if NATIVE_ENTRYPOINT). Union with EntryPointRVA.", { alt: ["EntryPointRVA"] }),
    F("Resources", "IMAGE_DATA_DIRECTORY", "struct", "Managed resources."),
    F("StrongNameSignature", "IMAGE_DATA_DIRECTORY", "struct", "Strong-name signature."),
    F("CodeManagerTable", "IMAGE_DATA_DIRECTORY", "struct", "Reserved."),
    F("VTableFixups", "IMAGE_DATA_DIRECTORY", "struct", "VTable fixups (C++/CLI)."),
    F("ExportAddressTableJumps", "IMAGE_DATA_DIRECTORY", "struct", "Export jumps (reserved)."),
    F("ManagedNativeHeader", "IMAGE_DATA_DIRECTORY", "struct", "Header of a precompiled native image (NGEN/R2R).")
  ]
};

/* ---------- Debug: FPO ---------- */
S.FPO_DATA = {
  fam: "debug", page: "debug", hdr: "winnt.h",
  desc: "FPO (Frame Pointer Omission) entry: one array entry per function, when IMAGE_DEBUG_DIRECTORY.Type = FPO. Functions with no entry are assumed to have a standard frame.",
  fields: [
    F("ulOffStart", "DWORD", "off", "Offset of the function's first byte."),
    F("cbProcSize", "DWORD", "size", "Size of the function in bytes."),
    F("cdwLocals", "DWORD", "size", "Size of local variables, in DWORDs (bytes / 4)."),
    F("cdwParams", "WORD", "size", "Size of parameters, in DWORDs (bytes / 4)."),
    F("cbProlog", "WORD", "flags", "Bitfield word: prolog size, saved registers, SEH, EBP used, frame type (FRAME_FPO 0, FRAME_TRAP 1, FRAME_TSS 2).",
      { bits: [["cbProlog", "bits 0–7"], ["cbRegs", "bits 8–10"], ["fHasSEH", "bit 11"], ["fUseBP", "bit 12"], ["reserved", "bit 13"], ["cbFrame", "bits 14–15"]],
        cRaw: "WORD cbProlog : 8;\n    WORD cbRegs : 3;\n    WORD fHasSEH : 1;\n    WORD fUseBP : 1;\n    WORD reserved : 1;\n    WORD cbFrame : 2;" })
  ]
};

/* ---------- COFF: relocations, line numbers, symbols ---------- */
S.IMAGE_RELOCATION = {
  fam: "coff", page: "coffreloc", hdr: "winnt.h", pack: 2,
  desc: "COFF relocation of an object file: tells the linker how to patch a section's bytes once it's placed. Images have none (they have the BaseReloc table instead). Packed structure, 2-byte alignment: 10 bytes.",
  loc: "Array of NumberOfRelocations entries at PointerToRelocations (section header).",
  fields: [
    F("VirtualAddress", "DWORD", "rva", "Address of the item to patch: offset within the section + section RVA (0 for compilers). Union with RelocCount (if IMAGE_SCN_LNK_NRELOC_OVFL).", { alt: ["RelocCount"] }),
    F("SymbolTableIndex", "DWORD", "count", "Zero-based index of the symbol whose address is used for the relocation.", { to: "IMAGE_SYMBOL" }),
    F("Type", "WORD", "enum", "Relocation type — depends on the machine (see the Constants page: x64 and i386).", { v: "coffRelAmd64" })
  ]
};
S.IMAGE_LINENUMBER = {
  fam: "coff", page: "coffreloc", hdr: "winnt.h", pack: 2,
  desc: "COFF line number (obsolete, no longer produced). A record with Linenumber = 0 names a function (symbol index); the following ones give (address, line number).",
  loc: "Array of NumberOfLinenumbers entries at PointerToLinenumbers.",
  fields: [
    F("VirtualAddress", "DWORD", "rva", "If Linenumber ≠ 0: RVA of the line's code (offset within the section for an object file). If Linenumber = 0: the function's symbol index (SymbolTableIndex).", { u: "Type", alt: ["SymbolTableIndex"] }),
    F("Linenumber", "WORD", "count", "Line number (1-based, relative to the start of the function); 0 = the union names a function.")
  ]
};
S.IMAGE_SYMBOL = {
  fam: "coff", page: "coffsym", hdr: "winnt.h", pack: 2,
  desc: "Entry of the COFF symbol table (18 bytes, 2-byte packed). The table is an array of these records; each can be followed by NumberOfAuxSymbols « auxiliary » records of the same size. The string table comes right after.",
  loc: "PointerToSymbolTable (File Header): NumberOfSymbols entries; the string table starts at PointerToSymbolTable + NumberOfSymbols × 18.",
  fields: [
    F("ShortName", "BYTE", "str", "Symbol name: 8 ASCII/UTF-8 bytes, zero-padded if 8 characters or fewer. Otherwise the first 4 bytes (Short) are 0 and the next 4 (Long) are an offset into the string table.",
      { c: 8, bits: [["ShortName[8]", "short name"], ["Short = 0 · Long", "string table offset"], ["LongName[2]", "DWORD[2] variant"]],
        cRaw: "union {\n        BYTE  ShortName[8];\n        struct {\n            DWORD Short;\n            DWORD Long;\n        } Name;\n        DWORD LongName[2];\n    } N;" }),
    F("Value", "DWORD", "misc", "Associated value: depends on SectionNumber and StorageClass (typically a relocatable address)."),
    F("SectionNumber", "SHORT", "enum", "One-based index into the section table, or a special value ≤ 0.", { v: "symSection" }),
    F("Type", "WORD", "enum", "Low byte = base type; high byte = derived type. Microsoft tools only ever set 0x20 (function) or 0x0.", { v: "symType" }),
    F("StorageClass", "BYTE", "enum", "Storage class. Microsoft tools only use EXTERNAL (2), STATIC (3), FUNCTION (101) and FILE (103).", { v: "symClass" }),
    F("NumberOfAuxSymbols", "BYTE", "count", "Number of auxiliary records that immediately follow.")
  ]
};
const AUXH = "winnt.h — variant of the IMAGE_AUX_SYMBOL union";
S.AUX_FUNCTION_DEF = {
  fam: "coff", page: "coffsym", hdr: AUXH, pack: 2,
  desc: "Aux format 1 — Function definition. Follows an EXTERNAL symbol, Type = 0x20 (function), SectionNumber > 0.",
  fields: [
    F("TagIndex", "DWORD", "count", "Index of the matching « .bf » (begin function) symbol."),
    F("TotalSize", "DWORD", "size", "Size of the function's code."),
    F("PointerToLinenumber", "DWORD", "off", "File offset of the function's first IMAGE_LINENUMBER (0 if none).", { to: "IMAGE_LINENUMBER" }),
    F("PointerToNextFunction", "DWORD", "count", "Index of the next function's symbol (0 if last)."),
    F("Unused", "WORD", "res", "Unused.")
  ]
};
S.AUX_BF_EF = {
  fam: "coff", page: "coffsym", hdr: AUXH, pack: 2,
  desc: "Aux format 2 — « .bf » and « .ef » symbols (function begin/end, class FUNCTION). Not for « .lf ».",
  fields: [
    F("Unused", "DWORD", "res", "Unused."),
    F("Linenumber", "WORD", "count", "Source line number (1, 2, 3…) matching the .bf or .ef."),
    F("Unused2", "BYTE", "res", "Unused.", { c: 6 }),
    F("PointerToNextFunction", "DWORD", "count", "(.bf only) Index of the next .bf symbol, 0 if last."),
    F("Unused3", "WORD", "res", "Unused.")
  ]
};
S.AUX_WEAK_EXTERNAL = {
  fam: "coff", page: "coffsym", hdr: AUXH, pack: 2,
  desc: "Aux format 3 — Weak external: if sym1 is undefined at link time, references go to sym2 instead. Follows an EXTERNAL / UNDEF symbol with Value = 0.",
  fields: [
    F("TagIndex", "DWORD", "count", "Index of sym2, the fallback symbol."),
    F("Characteristics", "DWORD", "enum", "Search behavior (NOLIBRARY / LIBRARY / ALIAS). Absent from winnt.h, which puts TotalSize there instead.", { v: "weakExt" }),
    F("Unused", "BYTE", "res", "Unused.", { c: 10 })
  ]
};
S.AUX_FILE = {
  fam: "coff", page: "coffsym", hdr: AUXH, pack: 2,
  desc: "Aux format 4 — Source file. Follows a « .file » symbol of class FILE (103). A name longer than 18 bytes spans several records.",
  fields: [ F("Name", "CHAR", "str", "Source file name (ANSI), zero-padded.", { c: 18 }) ]
};
S.AUX_SECTION_DEF = {
  fam: "coff", page: "coffsym", hdr: AUXH, pack: 2,
  desc: "Aux format 5 — Section definition. Follows a symbol named after a section (.text…) of class STATIC; mirrors part of the section header.",
  fields: [
    F("Length", "DWORD", "size", "Size of the data (= SizeOfRawData)."),
    F("NumberOfRelocations", "WORD", "count", "Number of relocations in the section."),
    F("NumberOfLinenumbers", "WORD", "count", "Number of line numbers."),
    F("CheckSum", "DWORD", "chk", "Checksum of the communal data (if IMAGE_SCN_LNK_COMDAT is set)."),
    F("Number", "WORD", "count", "One-based index of the associated section — used when Selection = ASSOCIATIVE."),
    F("Selection", "BYTE", "enum", "COMDAT resolution rule.", { v: "comdat" }),
    F("Unused", "BYTE", "res", "Unused.", { c: 3 })
  ]
};
S.AUX_CLR_TOKEN = {
  fam: "coff", page: "coffsym", hdr: AUXH, pack: 2,
  desc: "CLR token definition (.NET objects). Follows a symbol of class CLR_TOKEN (107).",
  fields: [
    F("bAuxType", "BYTE", "enum", "Must be IMAGE_AUX_SYMBOL_TYPE_TOKEN_DEF (1)."),
    F("bReserved", "BYTE", "res", "Reserved, 0."),
    F("SymbolTableIndex", "DWORD", "count", "Index of the COFF symbol this token refers to."),
    F("Reserved", "BYTE", "res", "Reserved, 0.", { c: 12 })
  ]
};

/* ---------- .lib archives ---------- */
S.IMAGE_ARCHIVE_MEMBER_HEADER = {
  fam: "lib", page: "archive", hdr: "winnt.h",
  desc: "Header preceding every member of a .lib archive (60 bytes, all ASCII text padded with spaces, no trailing null). Every header starts at an even address (a padding « \\n » may be inserted).",
  loc: "After the « !<arch>\\n » signature (IMAGE_ARCHIVE_START, 8 bytes), then after every member.",
  fields: [
    F("Name", "BYTE", "str", "Member name terminated by « / ». « / » = linker member, « // » = longnames member, « /n » = name at decimal offset n in longnames.", { c: 16 }),
    F("Date", "BYTE", "time", "Creation date: seconds since 1970, decimal ASCII.", { c: 12 }),
    F("UserID", "BYTE", "res", "Decimal user ID — blank with Microsoft tools.", { c: 6 }),
    F("GroupID", "BYTE", "res", "Decimal group ID — blank with Microsoft tools.", { c: 6 }),
    F("Mode", "BYTE", "flags", "File mode in octal ASCII (st_mode from _wstat).", { c: 8 }),
    F("Size", "BYTE", "size", "Size of the member in decimal ASCII, header excluded.", { c: 10 }),
    F("EndHeader", "BYTE", "magic", "« `\\n » = 0x60 0x0A (IMAGE_ARCHIVE_END).", { c: 2 })
  ]
};
S.ARCHIVE_FIRST_LINKER_MEMBER = {
  fam: "lib", page: "archive", hdr: "not documented in winnt.h — specified in the PE spec", noEncode: true,
  desc: "First linker member (Name = « / »). Kept for compatibility, unused by current linkers, but must still be correct. Numbers here are BIG-ENDIAN.",
  fields: [
    F("NumberOfSymbols", "DWORD", "count", "Number of indexed symbols (big-endian)."),
    F("Offsets", "DWORD", "off", "For each symbol: file offset of the header of the member that defines it, in ascending order (big-endian).", { c: 1, vs: true }),
    F("StringTable", "CHAR", "str", "Symbol names: consecutive ASCIIZ strings, in the same order.", { c: 1, vs: true })
  ]
};
S.ARCHIVE_SECOND_LINKER_MEMBER = {
  fam: "lib", page: "archive", hdr: "not documented in winnt.h — specified in the PE spec", noEncode: true,
  desc: "Second linker member (Name = « / »), the one linkers actually use: symbols sorted lexically, little-endian numbers.",
  fields: [
    F("NumberOfMembers", "DWORD", "count", "Number of members in the archive."),
    F("Offsets", "DWORD", "off", "File offsets of the member headers, ascending (m entries).", { c: 1, vs: true }),
    F("NumberOfSymbols", "DWORD", "count", "Number of indexed symbols."),
    F("Indices", "WORD", "count", "For each symbol: one-based index into Offsets of the member that contains it.", { c: 1, vs: true }),
    F("StringTable", "CHAR", "str", "Symbol names, ASCIIZ, in ascending lexical order.", { c: 1, vs: true })
  ]
};
S.IMPORT_OBJECT_HEADER = {
  fam: "lib", page: "archive", hdr: "winnt.h",
  desc: "Header of a « short » import member of an import library (a DLL's .lib). Followed by two ASCIIZ strings: the imported symbol's name, then the DLL's name. Enough to rebuild the .idata section.",
  fields: [
    F("Sig1", "WORD", "magic", "Must be IMAGE_FILE_MACHINE_UNKNOWN (0).", { s: 0 }),
    F("Sig2", "WORD", "magic", "Must be 0xFFFF (IMPORT_OBJECT_HDR_SIG2).", { s: 0xFFFF }),
    F("Version", "WORD", "ver", "Structure version."),
    F("Machine", "WORD", "enum", "Target architecture.", { v: "machine" }),
    F("TimeDateStamp", "DWORD", "time", "Creation date."),
    F("SizeOfData", "DWORD", "size", "Size of the strings that follow the header."),
    F("Hint", "WORD", "misc", "Ordinal or hint of the import, depending on NameType (ORDINAL ⇒ ordinal; otherwise a hint). Union with Ordinal.", { u: "DUMMYUNIONNAME", alt: ["Ordinal"] }),
    F("Type", "WORD", "enum", "Bitfield word: Type (2 bits: CODE / DATA / CONST), NameType (3 bits: ORDINAL / NAME / NAME_NOPREFIX / NAME_UNDECORATE), Reserved (11 bits, 0).",
      { v: "importType", bits: [["Type", "bits 0–1"], ["NameType", "bits 2–4 (importNameType)"], ["Reserved", "bits 5–15"]],
        cRaw: "WORD Type : 2;\n    WORD NameType : 3;\n    WORD Reserved : 11;" })
  ]
};

/* =========================================================================
   Data Directory table: index -> structure -> page
   ========================================================================= */
const DD = [
  [0,  "EXPORT",         "Export Directory",     "IMAGE_EXPORT_DIRECTORY",       "exports",   "RVA"],
  [1,  "IMPORT",         "Import Directory",     "IMAGE_IMPORT_DESCRIPTOR",      "imports",   "RVA"],
  [2,  "RESOURCE",       "Resource Directory",   "IMAGE_RESOURCE_DIRECTORY",     "resources", "RVA"],
  [3,  "EXCEPTION",      "Exception Directory",  "IMAGE_RUNTIME_FUNCTION_ENTRY", "exception", "RVA"],
  [4,  "SECURITY",       "Certificate Table",    "WIN_CERTIFICATE",              "security",  "FILE OFFSET"],
  [5,  "BASERELOC",      "Base Relocation Table","IMAGE_BASE_RELOCATION",        "reloc",     "RVA"],
  [6,  "DEBUG",          "Debug Directory",      "IMAGE_DEBUG_DIRECTORY",        "debug",     "RVA"],
  [7,  "ARCHITECTURE",   "Architecture",         null,                           null,        "reserved, 0"],
  [8,  "GLOBALPTR",      "Global Pointer",       null,                           null,        "RVA (IA64), Size = 0"],
  [9,  "TLS",            "TLS Directory",        "IMAGE_TLS_DIRECTORY",          "tls",       "RVA"],
  [10, "LOAD_CONFIG",    "Load Config Directory","IMAGE_LOAD_CONFIG_DIRECTORY",  "loadcfg",   "RVA"],
  [11, "BOUND_IMPORT",   "Bound Import",         "IMAGE_BOUND_IMPORT_DESCRIPTOR","imports",   "RVA"],
  [12, "IAT",            "Import Address Table", "IMAGE_THUNK_DATA",             "imports",   "RVA"],
  [13, "DELAY_IMPORT",   "Delay Import Descriptor","IMAGE_DELAYLOAD_DESCRIPTOR", "delay",     "RVA"],
  [14, "COM_DESCRIPTOR", "CLR Runtime Header",   "IMAGE_COR20_HEADER",           "clr",       "RVA"],
  [15, "(reserved)",     "Reserved",             null,                           null,        "must be 0"]
];

/* =========================================================================
   Pages (tabs). Text syntax: `code` · **bold** · {{STRUCT}} · {{STRUCT.field}}
   ========================================================================= */
const GROUPS = [
  { id: "start",   label: "Start" },
  { id: "headers", label: "Headers" },
  { id: "dirs",    label: "Data Directories" },
  { id: "coff",    label: "COFF & libraries" },
  { id: "ref",     label: "Reference" }
];

const PAGES = [
  { id: "overview", grp: "start", label: "Overview", fam: null },
  { id: "scene3d", grp: "start", label: "3D View", fam: null },
  { id: "tree", grp: "start", label: "Structure Tree", fam: null },
  { id: "concepts", grp: "start", label: "RVA · VA · Offset", fam: null },

  { id: "dos", grp: "headers", label: "DOS Hdr", fam: "dos", structs: ["IMAGE_DOS_HEADER"], hexFams: ["dos", "stub"],
    intro: "The very first block of a PE is a 64-byte **MS-DOS** header, followed by a small DOS program (the *stub*) that prints « This program cannot be run in DOS mode ». Windows ignores almost all of it: it reads `e_magic` to recognize the file, then follows `e_lfanew` to find {{IMAGE_NT_HEADERS}}.",
    notes: [
      { t: "tip", h: "Key takeaway", b: "Out of **64 bytes**, only **2 fields** matter: `e_magic` (offset 0x00) and `e_lfanew` (offset 0x3C). The DOS stub can be wiped or replaced without Windows ever noticing." }
    ] },

  { id: "rich", grp: "headers", label: "Rich Hdr", fam: "rich", structs: ["RICH_HEADER", "RICH_ENTRY"], hexFams: ["rich"],
    intro: "The **Rich Header** isn't defined in `windows.h`: it's an undocumented structure written by the Microsoft linker between the DOS stub and the PE signature. It lists the build tools that were used. Useful for analysis (toolchain fingerprinting) but **never read by the loader**.",
    notes: [
      { t: "info", h: "How the XOR key is computed", b: "`key = offset of « DanS »` · for each byte `b` at index `i` before « DanS » (ignoring the 4 bytes of `e_lfanew`): `key += ROL8(b, i)` · then for each entry: `key += ROL32(comp.id, count)`. The DWORDs between « DanS » and « Rich » are then XORed with `key`." },
      { t: "tip", h: "How to find it", b: "Search for the string « Rich » going backward from `e_lfanew`; the DWORD that follows it is the key. XOR backward until you hit « DanS »." }
    ] },

  { id: "file", grp: "headers", label: "File Hdr", fam: "file", structs: ["IMAGE_NT_HEADERS", "IMAGE_FILE_HEADER"], hexFams: ["nt", "file"],
    intro: "{{IMAGE_NT_HEADERS}} begins at offset `e_lfanew`: the `PE\\0\\0` signature, then {{IMAGE_FILE_HEADER}} (architecture, number of sections), and finally {{IMAGE_OPTIONAL_HEADER}}. This is where the PE format really begins.",
    notes: [
      { t: "tip", h: "Finding the section table", b: "It starts **after** the Optional Header, whose size is given by `SizeOfOptionalHeader` — not a constant:\n`IMAGE_FIRST_SECTION(nt)` = `(BYTE*)&nt->OptionalHeader + nt->FileHeader.SizeOfOptionalHeader`." },
      { t: "warn", h: "Gotcha", b: "`IMAGE_NT_HEADERS` is only an **alias**: `IMAGE_NT_HEADERS32` or `IMAGE_NT_HEADERS64` depending on the build (`_WIN64`). Read `OptionalHeader.Magic` to know what the file *actually* contains." }
    ] },

  { id: "optional", grp: "headers", label: "Optional Hdr", fam: "opt", structs: ["IMAGE_OPTIONAL_HEADER", "IMAGE_DATA_DIRECTORY"], hexFams: ["opt", "dd"], ddTable: true,
    intro: "The **Optional Header** is mandatory for every image. It holds everything the loader needs: image size, alignments, entry point, ImageBase… and at the end, the **Data Directory** table that leads to every other table (imports, exports, relocations…).",
    notes: [
      { t: "warn", h: "PE32 vs PE32+", b: "Use the **PE32 / PE32+** switch at the top: offsets, types, and whether `BaseOfData` exists all change. Rows that differ are marked **≠**." },
      { t: "tip", h: "Common values", b: "`ImageBase`: 0x400000 (x86 EXE), 0x10000000 (x86 DLL), 0x140000000 (x64 EXE), 0x180000000 (x64 DLL). `SectionAlignment` 0x1000, `FileAlignment` 0x200." },
      { t: "warn", h: "Validate before reading", b: "The Optional Header's size isn't fixed: use `SizeOfOptionalHeader` to check that a DataDirectory entry fits **entirely** inside it, and `NumberOfRvaAndSizes` to check the requested index. Also don't assume a directory's RVA points to the start of a section, or that the section has any particular name. PE32+ caps the image at 2 GB." }
    ] },

  { id: "sections", grp: "headers", label: "Section Hdrs", fam: "sec", structs: ["IMAGE_SECTION_HEADER"], hexFams: ["sec"],
    intro: "The **section table** is an array of {{IMAGE_SECTION_HEADER}}, a 40-byte entry per section. Each entry links two worlds: where the bytes live **in the file** (`PointerToRawData`, `SizeOfRawData`) and where they live **in memory** (`VirtualAddress`, `VirtualSize`).",
    notes: [
      { t: "tip", h: "Converting RVA → file offset", b: "Find the section such that `VirtualAddress ≤ rva < VirtualAddress + VirtualSize`, then:\n`offset = rva − VirtualAddress + PointerToRawData`. See the « RVA · VA · Offset » page for an interactive converter." },
      { t: "info", h: "Page permissions", b: "`MEM_READ` / `MEM_WRITE` / `MEM_EXECUTE` in `Characteristics` become the section's page protection (e.g. `.text` = RX, `.rdata` = R, `.data` = RW)." }
    ] },

  { id: "exports", grp: "dirs", dd: 0, label: "Exports", fam: "exp", structs: ["IMAGE_EXPORT_DIRECTORY"],
    intro: "A DLL publishes its functions through {{IMAGE_EXPORT_DIRECTORY}}. This is what **GetProcAddress** reads. Exports are spread across **three parallel arrays** that you need to know how to chain together.",
    chains: [
      { title: "Resolving by name — GetProcAddress(hMod, \"CreateFileW\")", items: [
        { s: "IMAGE_EXPORT_DIRECTORY", f: "AddressOfNames" }, { a: "RVA" }, { x: "DWORD[NumberOfNames]", fam: "exp", note: "sorted name RVAs → binary search" }, { a: "RVA" }, { x: "\"CreateFileW\\0\"", fam: "exp", note: "ASCIIZ string, found at index i" } ] },
      { title: "… then name → ordinal → address", items: [
        { s: "IMAGE_EXPORT_DIRECTORY", f: "AddressOfNameOrdinals" }, { a: "[i]" }, { x: "WORD[NumberOfNames]", fam: "exp", note: "ordinal_index = NameOrdinals[i]" }, { a: "index" },
        { s: "IMAGE_EXPORT_DIRECTORY", f: "AddressOfFunctions" }, { a: "[ordinal_index]" }, { x: "DWORD[NumberOfFunctions]", fam: "exp", note: "RVA of the code (EAT)" }, { a: "+ base" }, { x: "function address", fam: "exp", note: "" } ] },
      { title: "Resolving by ordinal — GetProcAddress(hMod, MAKEINTRESOURCE(n))", items: [
        { x: "ordinal n", fam: "exp", note: "" }, { a: "− Base" }, { s: "IMAGE_EXPORT_DIRECTORY", f: "AddressOfFunctions" }, { a: "[n − Base]" }, { x: "RVA of the code", fam: "exp", note: "" } ] }
    ],
    notes: [
      { t: "warn", h: "Forwarders", b: "If the RVA found in `AddressOfFunctions` falls **inside** the range `[DataDirectory[EXPORT].VirtualAddress, + Size[`, it isn't code but an ASCIIZ string `\"OTHERDLL.Function\"` (or `\"OTHERDLL.#12\"`): that DLL must be loaded and the function resolved from it. Example: `kernel32!HeapAlloc` → `NTDLL.RtlAllocateHeap`." },
      { t: "info", h: "Good to know", b: "An export's real ordinal = index in `AddressOfFunctions` + `Base`. A slot set to 0 means « no export at this ordinal »." }
    ] },

  { id: "imports", grp: "dirs", dd: 1, label: "Imports", fam: "imp",
    structs: ["IMAGE_IMPORT_DESCRIPTOR", "IMAGE_THUNK_DATA", "IMAGE_IMPORT_BY_NAME", "IMAGE_BOUND_IMPORT_DESCRIPTOR", "IMAGE_BOUND_FORWARDER_REF"],
    intro: "Imports are the scariest-looking part — yet they're very regular: an **array of {{IMAGE_IMPORT_DESCRIPTOR}}** (one per DLL, ended by a zero descriptor), each pointing to **two parallel arrays** of {{IMAGE_THUNK_DATA}}: the **INT** (what to import) and the **IAT** (where to write the address).",
    chains: [
      { title: "Which DLL?", items: [
        { x: "DataDirectory[1]", fam: "dd", note: "IMAGE_DIRECTORY_ENTRY_IMPORT" }, { a: "RVA" }, { x: "IMAGE_IMPORT_DESCRIPTOR[]", fam: "imp", note: "ends with a null descriptor" }, { a: "Name (RVA)" }, { x: "\"KERNEL32.dll\\0\"", fam: "imp", note: "→ recursive LoadLibrary" } ] },
      { title: "What to import? (INT)", items: [
        { s: "IMAGE_IMPORT_DESCRIPTOR", f: "OriginalFirstThunk" }, { a: "RVA" }, { x: "IMAGE_THUNK_DATA[]", fam: "imp", note: "INT, ends with 0" }, { a: "AddressOfData (RVA), high bit = 0" }, { s: "IMAGE_IMPORT_BY_NAME", f: "Name" } ] },
      { title: "… or by ordinal", items: [
        { x: "IMAGE_THUNK_DATA", fam: "imp", note: "bit 31/63 = 1" }, { a: "& 0xFFFF" }, { x: "ordinal", fam: "imp", note: "→ GetProcAddress(dll, MAKEINTRESOURCE(ord))" } ] },
      { title: "Where to write the result? (IAT)", items: [
        { s: "IMAGE_IMPORT_DESCRIPTOR", f: "FirstThunk" }, { a: "RVA" }, { x: "IMAGE_THUNK_DATA[]", fam: "imp", note: "IAT: same length as the INT" }, { a: "the loader writes" }, { s: "IMAGE_THUNK_DATA", f: "Function" } ] }
    ],
    notes: [
      { t: "tip", h: "The algorithm in 5 lines", b: "For each descriptor up to the null one: `LoadLibrary(base + Name)`. Then for `i = 0, 1, 2…` until `INT[i] == 0`: if the high bit is set → import by ordinal, otherwise `GetProcAddress(dll, ((IMAGE_IMPORT_BY_NAME*)(base + INT[i]))->Name)`. Write the result into `IAT[i]`." },
      { t: "warn", h: "Gotcha", b: "If `OriginalFirstThunk` is 0 (some packers/linkers do this), the IAT (`FirstThunk`) must be read instead, since it still holds the name RVAs at that point." },
      { t: "info", h: "Bound imports", b: "The on-disk IAT may already hold addresses (« bound »). With ASLR these are ignored and resolution is redone." }
    ] },

  { id: "resources", grp: "dirs", dd: 2, label: "Resources", fam: "res",
    structs: ["IMAGE_RESOURCE_DIRECTORY", "IMAGE_RESOURCE_DIRECTORY_ENTRY", "IMAGE_RESOURCE_DIR_STRING_U", "IMAGE_RESOURCE_DATA_ENTRY"],
    intro: "Resources form a **3-level tree**: *Type* (RT_ICON, RT_MANIFEST…) → *Name or ID* → *Language*. Each level is an {{IMAGE_RESOURCE_DIRECTORY}} followed by its {{IMAGE_RESOURCE_DIRECTORY_ENTRY}} records. The leaves are {{IMAGE_RESOURCE_DATA_ENTRY}}.",
    chains: [
      { title: "Walking down the tree", items: [
        { x: "DataDirectory[2]", fam: "dd", note: "start R = resource section" }, { a: "RVA" },
        { s: "IMAGE_RESOURCE_DIRECTORY", f: "NumberOfIdEntries" }, { a: "level 1: Type" },
        { x: "ENTRY[] (Id = RT_*)", fam: "res", note: "" }, { a: "R + OffsetToDirectory" },
        { x: "DIRECTORY level 2", fam: "res", note: "Name/ID" }, { a: "R + OffsetToDirectory" },
        { x: "DIRECTORY level 3", fam: "res", note: "Language (LANGID)" }, { a: "R + OffsetToData" },
        { s: "IMAGE_RESOURCE_DATA_ENTRY", f: "OffsetToData" }, { a: "RVA!" }, { x: "resource bytes", fam: "res", note: "" } ] }
    ],
    notes: [
      { t: "warn", h: "Gotcha #1: three kinds of « offset »", b: "In **ENTRY** records, `OffsetToData`/`OffsetToDirectory` are **relative to the start of the resource section** (R). But in {{IMAGE_RESOURCE_DATA_ENTRY}}, `OffsetToData` is a **real RVA**. And bit 31 of an entry means « sub-directory »." },
      { t: "info", h: "Resources aren't loaded by the loader", b: "They're simply mapped along with the rest of the image; it's `FindResource` / `LoadResource` that walk the tree on demand." }
    ] },

  { id: "exception", grp: "dirs", dd: 3, label: "Exception", fam: "exc", structs: ["IMAGE_RUNTIME_FUNCTION_ENTRY", "UNWIND_INFO"],
    intro: "On **x64**, exception handling is driven by tables (the `.pdata` section) instead of chains of stack frames. Every non-leaf function has an {{IMAGE_RUNTIME_FUNCTION_ENTRY}}, sorted by start address, which the OS binary-searches to unwind the stack.",
    chains: [
      { title: "From RIP to the handler", items: [
        { x: "DataDirectory[3]", fam: "dd", note: "" }, { a: "RVA" }, { x: "IMAGE_RUNTIME_FUNCTION_ENTRY[]", fam: "exc", note: "sorted by BeginAddress" }, { a: "UnwindInfoAddress (RVA)" }, { x: "UNWIND_INFO", fam: "exc", note: "+ UNWIND_CODE[] + handler RVA if EHANDLER/UHANDLER" } ] }
    ] },

  { id: "security", grp: "dirs", dd: 4, label: "Security", fam: "cert", structs: ["WIN_CERTIFICATE"],
    intro: "The **Authenticode** signature is tacked on **at the end of the file** (an overlay), outside any section. {{WIN_CERTIFICATE}} is its wrapper; the content is PKCS#7.",
    notes: [
      { t: "warn", h: "The one exception in the bunch", b: "For this entry, `DataDirectory[4].VirtualAddress` is a **file offset**, not an RVA: this area is never mapped into memory by the loader." },
      { t: "info", h: "What's signed", b: "The digest excludes `CheckSum`, the Security entry in the Data Directory, and the certificate table itself, so the signature can be added without breaking it." },
      { t: "tip", h: "Walking the table", b: "`off = DataDirectory[4].VirtualAddress` (file offset). Read a `WIN_CERTIFICATE`, then `off += (dwLength + 7) & ~7` (8-byte alignment, zero padding). Repeat until `Size` bytes have been consumed — otherwise the table or `Size` is corrupt. `Size` includes the padding. Alternative: `ImageEnumerateCertificates`." },
      { t: "info", h: "Place in the file", b: "The certificate and any unmapped debug info sit at the **very end** of the file, the certificate table right before the debug section, since the loader never maps either of them." }
    ] },

  { id: "reloc", grp: "dirs", dd: 5, label: "BaseReloc", fam: "reloc", structs: ["IMAGE_BASE_RELOCATION"],
    intro: "When the image isn't loaded at its `ImageBase`, every absolute pointer it contains becomes wrong. The relocation table lists **where** they are, so `delta = actualBase − ImageBase` can be added to them. It's organized into **4 KB blocks**.",
    chains: [
      { title: "Walking the blocks", items: [
        { x: "DataDirectory[5]", fam: "dd", note: "" }, { a: "RVA" }, { s: "IMAGE_BASE_RELOCATION", f: "VirtualAddress" }, { a: "+ SizeOfBlock" },
        { x: "WORD[(SizeOfBlock−8)/2]", fam: "reloc", note: "type (4 bits) | offset (12 bits)" }, { a: "next block = block + SizeOfBlock" }, { x: "…until Size bytes", fam: "reloc", note: "" } ] }
    ],
    notes: [
      { t: "tip", h: "Applying one entry", b: "`entry = TypeOffset[i]` · `type = entry >> 12` · `offset = entry & 0xFFF` · address to patch: `p = base + block->VirtualAddress + offset`.\nThen depending on `type`: `DIR64` → `*(ULONGLONG*)p += delta`; `HIGHLOW` → `*(DWORD*)p += (DWORD)delta`; `ABSOLUTE` → do nothing (padding)." },
      { t: "warn", h: "Gotcha", b: "An EXE with no relocation table carries `IMAGE_FILE_RELOCS_STRIPPED` and can only be loaded at its `ImageBase`: if that address isn't free, the loader reports an error." },
      { t: "info", h: "Alignment", b: "Every block starts on a 32-bit boundary. The loader doesn't have to apply relocations already resolved by the linker as long as the image loads at its ImageBase. Type `HIGHADJ` (4) takes up **two** entries: the next one holds the low 16 bits." }
    ] },

  { id: "debug", grp: "dirs", dd: 6, label: "Debug", fam: "debug", structs: ["IMAGE_DEBUG_DIRECTORY", "CV_INFO_PDB70", "GUID", "FPO_DATA"],
    intro: "The debug directory is an **array** of {{IMAGE_DEBUG_DIRECTORY}} (28 bytes each). The best-known entry, type `CODEVIEW`, holds the GUID and the `.pdb` path: that's how debuggers find symbols.",
    chains: [
      { title: "Finding the PDB", items: [
        { x: "DataDirectory[6]", fam: "dd", note: "" }, { a: "RVA" }, { x: "IMAGE_DEBUG_DIRECTORY[Size/28]", fam: "debug", note: "look for Type = CODEVIEW" }, { a: "PointerToRawData (file offset)" },
        { s: "CV_INFO_PDB70", f: "CvSignature" }, { a: "« RSDS » → GUID + Age + path" } ] }
    ] },

  { id: "tls", grp: "dirs", dd: 9, label: "TLS", fam: "tls", structs: ["IMAGE_TLS_DIRECTORY"],
    intro: "Static TLS enables `__declspec(thread)` variables. A detail heavily used in security research: **TLS callbacks** run **before** the entry point, as soon as the image is loaded.",
    chains: [
      { title: "The callbacks", items: [
        { x: "DataDirectory[9]", fam: "dd", note: "" }, { a: "RVA" }, { x: "IMAGE_TLS_DIRECTORY", fam: "tls", note: "" }, { a: "AddressOfCallBacks (a VA!)" },
        { x: "PIMAGE_TLS_CALLBACK[]", fam: "tls", note: "NULL-terminated" }, { a: "call" }, { x: "VOID NTAPI cb(PVOID DllHandle, DWORD Reason, PVOID Reserved)", fam: "tls", note: "" } ] }
    ],
    notes: [
      { t: "warn", h: "VA, not RVA", b: "`StartAddressOfRawData`, `EndAddressOfRawData`, `AddressOfIndex`, and `AddressOfCallBacks` are **absolute virtual addresses**: they do show up in the relocation table. To read the callback array: `base + (AddressOfCallBacks − ImageBase)`." }
    ] },

  { id: "loadcfg", grp: "dirs", dd: 10, label: "Load Config", fam: "cfg", structs: ["IMAGE_LOAD_CONFIG_DIRECTORY", "IMAGE_LOAD_CONFIG_CODE_INTEGRITY"],
    intro: "{{IMAGE_LOAD_CONFIG_DIRECTORY}} gathers the module's security settings: the **/GS cookie**, **SafeSEH** (x86), **Control Flow Guard**… It's extensible, which is why its first field is its own size.",
    notes: [
      { t: "tip", h: "Reading it safely", b: "Only read a field if it sits **before** `Size`: `if (offsetof(…, GuardFlags) + sizeof(DWORD) <= cfg->Size)`." },
      { t: "warn", h: "Every pointer is a VA", b: "`SecurityCookie`, `SEHandlerTable`, `GuardCFFunctionTable`… are all absolute (relocated) VAs. The CFG tables themselves, on the other hand, hold RVAs." }
    ] },

  { id: "delay", grp: "dirs", dd: 13, label: "Delay Imports", fam: "imp", structs: ["IMAGE_DELAYLOAD_DESCRIPTOR"],
    intro: "**Delay-load imports** follow the same logic as regular imports, except the DLL is only loaded on the **first call** to one of its functions, through a stub that calls `__delayLoadHelper2`. The loader doesn't process them at load time.",
    notes: [
      { t: "info", h: "Same structure, different timing", b: "`ImportNameTableRVA` plays the role of `OriginalFirstThunk` and `ImportAddressTableRVA` that of `FirstThunk`. The fields are RVAs if `Attributes.RvaBased = 1`; VAs in the legacy format." }
    ] },

  { id: "clr", grp: "dirs", dd: 14, label: ".NET (CLR)", fam: "clr", structs: ["IMAGE_COR20_HEADER"],
    intro: "A .NET assembly is a valid PE: the COM_DESCRIPTOR entry points to {{IMAGE_COR20_HEADER}}, which in turn leads to the **metadata** (the « BSJB » root, with the `#~`, `#Strings`, `#US`, `#GUID`, `#Blob` streams).",
    chains: [
      { title: "To the metadata", items: [
        { x: "DataDirectory[14]", fam: "dd", note: "" }, { a: "RVA" }, { x: "IMAGE_COR20_HEADER", fam: "clr", note: "" }, { a: "MetaData (RVA + Size)" }, { x: "« BSJB » + streams", fam: "clr", note: "" } ] }
    ] },

  { id: "coffsym", grp: "coff", label: "COFF Symbols", fam: "coff",
    structs: ["IMAGE_SYMBOL", "AUX_FUNCTION_DEF", "AUX_BF_EF", "AUX_WEAK_EXTERNAL", "AUX_FILE", "AUX_SECTION_DEF", "AUX_CLR_TOKEN"],
    intro: "The **COFF symbol table** comes from object files (`.obj`); an image no longer has one (`PointerToSymbolTable` = 0, COFF debugging is deprecated). It's an array of 18-byte {{IMAGE_SYMBOL}} entries, each possibly followed by **auxiliary** records of the same size whose format depends on the storage class. The string table comes right after.",
    chains: [
      { title: "Reading a symbol's name", items: [
        { s: "IMAGE_SYMBOL", f: "ShortName" }, { a: "first 4 bytes = 0?" }, { x: "Long (DWORD)", fam: "coff", note: "offset into the string table" }, { a: "+ start of the string table" }, { x: "ASCIIZ string", fam: "coff", note: "table = PointerToSymbolTable + NumberOfSymbols × 18" } ] }
    ],
    notes: [
      { t: "info", h: "COFF string table", b: "Right after the symbols: a DWORD giving the total size of the block (**including those 4 bytes**: it's 4 if empty), then the ASCIIZ strings pointed to by the symbols (and by « /n » section names in an object file)." },
      { t: "tip", h: "What Microsoft tools produce", b: "Only 4 storage classes: `EXTERNAL` (2), `STATIC` (3), `FUNCTION` (101) and `FILE` (103), and `Type` ∈ {0x00, 0x20}. Type information comes from CodeView in `.debug$S`. A reader must **ignore** any auxiliary record format it doesn't recognize." }
    ] },
  { id: "coffreloc", grp: "coff", label: "COFF Relocs & Lines", fam: "coff", structs: ["IMAGE_RELOCATION", "IMAGE_LINENUMBER"],
    intro: "In an object file, every section has its own list of **COFF relocations** ({{IMAGE_RELOCATION}}): « patch this byte with the address of that symbol, this way ». The linker resolves them, and for an image, only base relocations are left (the BaseReloc page). Line numbers ({{IMAGE_LINENUMBER}}) are obsolete.",
    notes: [
      { t: "warn", h: "Not the same relocations", b: "Don't confuse {{IMAGE_RELOCATION}} (object files, one per referenced symbol, machine-dependent type) with {{IMAGE_BASE_RELOCATION}} (images, fixes up the base delta). Images carry no COFF relocations at all." },
      { t: "info", h: "Overflow", b: "If `IMAGE_SCN_LNK_NRELOC_OVFL` is set and `NumberOfRelocations` = 0xFFFF, the real count is stored in the `VirtualAddress` field of the **first** relocation." }
    ] },
  { id: "archive", grp: "coff", label: ".lib Archives", fam: "lib",
    structs: ["IMAGE_ARCHIVE_MEMBER_HEADER", "ARCHIVE_FIRST_LINKER_MEMBER", "ARCHIVE_SECOND_LINKER_MEMBER", "IMPORT_OBJECT_HEADER"],
    intro: "A `.lib` library is an **archive**: the `!<arch>\\n` signature followed by members, each preceded by a 60-byte text {{IMAGE_ARCHIVE_MEMBER_HEADER}}. In order: first linker member, second linker member, longnames member (optional), then the object files — or, for an import library, small {{IMPORT_OBJECT_HEADER}} members.",
    notes: [
      { t: "warn", h: "Endianness", b: "The **first** linker member stores its numbers in **big-endian**, the **second** in little-endian. Linkers actually use the second one (sorted symbols, faster lookup)." },
      { t: "info", h: "« Long » vs « short » imports", b: "Long: a real COFF pseudo-object (File Header, sections, symbols, strings). Short: just {{IMPORT_OBJECT_HEADER}} + the symbol's name + the DLL's name — enough to regenerate the import tables (`.idata`)." }
    ] },

  { id: "consts", grp: "ref", label: "Constants (flags & enums)", fam: null }
];
