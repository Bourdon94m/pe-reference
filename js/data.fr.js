"use strict";
/* =========================================================================
   Données du format PE — noms exacts issus de winnt.h (et corhdr.h / guiddef.h)
   Chaque structure : fam (couleur), page (onglet), fields[] avec
     n nom · t type (ou [t32,t64]) · c nombre d'éléments · k nature · d description
     v constantes liées · s valeur d'exemple · only 32|64
   ========================================================================= */

/* ---------- Familles de structures = code couleur principal ---------- */
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
  coff:  { label: "COFF (objets)",   color: "#c9b458" },
  lib:   { label: "Bibliothèques",   color: "#8fb8a8" },
  pad:   { label: "Padding",         color: "#4b5563" }
};

/* ---------- Nature d'un champ = code couleur secondaire (pastilles) ---------- */
const KINDS = {
  magic:  { label: "Magic",        color: "#fca5a5", help: "Signature fixe servant à valider la structure." },
  rva:    { label: "RVA",          color: "#86efac", help: "Relative Virtual Address : offset depuis l’ImageBase, une fois l’image mappée." },
  va:     { label: "VA",           color: "#67e8f9", help: "Virtual Address absolue (ImageBase incluse) — corrigée par les relocations." },
  off:    { label: "Offset fichier", color: "#fdba74", help: "Position en octets dans le fichier sur disque (PointerTo…)." },
  size:   { label: "Taille",       color: "#cbd5e1", help: "Taille en octets." },
  count:  { label: "Compteur",     color: "#a5b4fc", help: "Nombre d’éléments." },
  flags:  { label: "Flags",        color: "#f0abfc", help: "Masque de bits : plusieurs valeurs combinées avec OR." },
  enum:   { label: "Enum",         color: "#fde047", help: "Une seule valeur parmi une liste." },
  time:   { label: "Timestamp",    color: "#d8b4fe", help: "Secondes depuis le 1er janvier 1970 UTC." },
  align:  { label: "Alignement",   color: "#bef264", help: "Multiple imposé pour des adresses/tailles." },
  ver:    { label: "Version",      color: "#94a3b8", help: "Numéro de version, purement informatif." },
  chk:    { label: "Checksum",     color: "#94a3b8", help: "Somme de contrôle." },
  res:    { label: "Réservé",      color: "#6b7280", help: "Réservé / obsolète — en pratique 0." },
  str:    { label: "Chaîne",       color: "#fcd34d", help: "Données textuelles." },
  struct: { label: "Sous-structure", color: "#e5e7eb", help: "Champ qui contient une autre structure." },
  misc:   { label: "Divers",       color: "#7c93ad", help: "Valeur d’implémentation sans rôle marquant pour LoadLibrary (registre, overlay, OEM…)." }
};

/* ---------- PE d'exemple (utilisé pour le hexdump coloré et la carte) ---------- */
const SAMPLE = {
  sections: [
    { Name: ".text",  VirtualSize: 0x1A3C, VirtualAddress: 0x1000, SizeOfRawData: 0x1C00, PointerToRawData: 0x0400, Characteristics: 0x60000020 },
    { Name: ".rdata", VirtualSize: 0x0D42, VirtualAddress: 0x3000, SizeOfRawData: 0x0E00, PointerToRawData: 0x2000, Characteristics: 0x40000040 },
    { Name: ".data",  VirtualSize: 0x05F0, VirtualAddress: 0x4000, SizeOfRawData: 0x0200, PointerToRawData: 0x2E00, Characteristics: 0xC0000040 },
    { Name: ".pdata", VirtualSize: 0x00CC, VirtualAddress: 0x5000, SizeOfRawData: 0x0200, PointerToRawData: 0x3000, Characteristics: 0x40000040 },
    { Name: ".rsrc",  VirtualSize: 0x01E0, VirtualAddress: 0x6000, SizeOfRawData: 0x0200, PointerToRawData: 0x3200, Characteristics: 0x40000040 },
    { Name: ".reloc", VirtualSize: 0x0028, VirtualAddress: 0x7000, SizeOfRawData: 0x0200, PointerToRawData: 0x3400, Characteristics: 0x42000040 }
  ],
  /* index DataDirectory -> [RVA, Size] */
  dirs: { 1: [0x3290, 0x78], 2: [0x6000, 0x1E0], 3: [0x5000, 0xCC], 5: [0x7000, 0x28], 6: [0x3100, 0x38], 10: [0x3140, 0x140], 12: [0x3000, 0x58] },
  imageBase: { 32: 0x400000, 64: 0x140000000 },
  entry: 0x1140,
  richKey: 0x7A1C4E93,
  rich: [ [0x0103, 0x7A9F, 12], [0x0102, 0x7A9F, 3], [0x00FF, 0x7A9F, 1] ]   /* [ProdId, Build, Count] */
};

/* ---------- Constantes (enums & flags) ---------- */
const E = {
  machine: { title: "Machine", kind: "enum", prefix: "IMAGE_FILE_MACHINE_", items: [
    ["UNKNOWN", 0x0, "Applicable à tout type de machine"], ["ALPHA", 0x184, "Alpha AXP, 32 bits"], ["ALPHA64 / AXP64", 0x284, "Alpha 64 bits"],
    ["AM33", 0x1D3, "Matsushita AM33"], ["AMD64", 0x8664, "x64 (AMD64 / Intel 64)"], ["ARM", 0x1C0, "ARM little endian"],
    ["ARM64", 0xAA64, "ARM64 little endian"], ["ARM64EC", 0xA641, "ABI qui permet l’interopérabilité ARM64 natif / x64 émulé"],
    ["ARM64X", 0xA64E, "Binaire où coexistent code ARM64 natif et ARM64EC"], ["ARMNT", 0x1C4, "ARM Thumb-2 little endian"],
    ["EBC", 0xEBC, "EFI byte code"], ["I386", 0x14C, "Intel 386 et compatibles (x86)"], ["IA64", 0x200, "Famille Intel Itanium"],
    ["LOONGARCH32", 0x6232, "LoongArch 32 bits"], ["LOONGARCH64", 0x6264, "LoongArch 64 bits"], ["M32R", 0x9041, "Mitsubishi M32R little endian"],
    ["MIPS16", 0x266, "MIPS16"], ["MIPSFPU", 0x366, "MIPS avec FPU"], ["MIPSFPU16", 0x466, "MIPS16 avec FPU"],
    ["POWERPC", 0x1F0, "Power PC little endian"], ["POWERPCFP", 0x1F1, "Power PC avec virgule flottante"],
    ["R3000BE", 0x160, "MIPS I 32 bits big endian"], ["R3000", 0x162, "MIPS I 32 bits little endian"],
    ["R4000", 0x166, "MIPS III 64 bits little endian"], ["R10000", 0x168, "MIPS IV 64 bits little endian"],
    ["RISCV32", 0x5032, "RISC-V 32 bits"], ["RISCV64", 0x5064, "RISC-V 64 bits"], ["RISCV128", 0x5128, "RISC-V 128 bits"],
    ["SH3", 0x1A2, "Hitachi SH3"], ["SH3DSP", 0x1A3, "Hitachi SH3 DSP"], ["SH4", 0x1A6, "Hitachi SH4"], ["SH5", 0x1A8, "Hitachi SH5"],
    ["THUMB", 0x1C2, "Thumb"], ["WCEMIPSV2", 0x169, "MIPS little endian WCE v2"] ] },

  fileChars: { title: "FileHeader.Characteristics", kind: "flags", prefix: "IMAGE_FILE_", items: [
    ["RELOCS_STRIPPED", 0x0001, "Pas de relocations : l’image doit être chargée à l’ImageBase"],
    ["EXECUTABLE_IMAGE", 0x0002, "Image valide (exécutable ou DLL), sans erreur de link"],
    ["LINE_NUMS_STRIPPED", 0x0004, "Numéros de ligne COFF retirés (obsolète)"],
    ["LOCAL_SYMS_STRIPPED", 0x0008, "Symboles locaux COFF retirés (obsolète)"],
    ["AGGRESIVE_WS_TRIM", 0x0010, "Obsolète, doit valoir 0 (winnt.h écrit « AGGRESIVE » ; la doc MS écrit AGGRESSIVE)"],
    ["LARGE_ADDRESS_AWARE", 0x0020, "Gère des adresses > 2 Go (32 bits)"],
    ["BYTES_REVERSED_LO", 0x0080, "Obsolète : octets little-endian inversés"],
    ["32BIT_MACHINE", 0x0100, "Machine à mots de 32 bits"],
    ["DEBUG_STRIPPED", 0x0200, "Infos de debug retirées du fichier"],
    ["REMOVABLE_RUN_FROM_SWAP", 0x0400, "Si sur média amovible : copier dans le swap puis lancer"],
    ["NET_RUN_FROM_SWAP", 0x0800, "Si sur le réseau : copier dans le swap puis lancer"],
    ["SYSTEM", 0x1000, "Fichier système (pilote)"],
    ["DLL", 0x2000, "C’est une DLL"],
    ["UP_SYSTEM_ONLY", 0x4000, "Mono-processeur uniquement"],
    ["BYTES_REVERSED_HI", 0x8000, "Obsolète"] ] },

  optMagic: { title: "OptionalHeader.Magic", kind: "enum", prefix: "", items: [
    ["IMAGE_NT_OPTIONAL_HDR32_MAGIC", 0x10B, "PE32 → IMAGE_OPTIONAL_HEADER32"],
    ["IMAGE_NT_OPTIONAL_HDR64_MAGIC", 0x20B, "PE32+ → IMAGE_OPTIONAL_HEADER64"],
    ["IMAGE_ROM_OPTIONAL_HDR_MAGIC", 0x107, "Image ROM"] ] },

  subsystem: { title: "OptionalHeader.Subsystem", kind: "enum", prefix: "IMAGE_SUBSYSTEM_", items: [
    ["UNKNOWN", 0, "Inconnu"], ["NATIVE", 1, "Pilotes et processus natifs (pas de sous-système Win32)"],
    ["WINDOWS_GUI", 2, "Application graphique Windows"], ["WINDOWS_CUI", 3, "Application console Windows"],
    ["OS2_CUI", 5, "Console OS/2"], ["POSIX_CUI", 7, "Console POSIX"], ["NATIVE_WINDOWS", 8, "Pilote natif Win9x"], ["WINDOWS_CE_GUI", 9, "Windows CE"],
    ["EFI_APPLICATION", 10, "Application EFI"], ["EFI_BOOT_SERVICE_DRIVER", 11, "Pilote EFI (boot services)"],
    ["EFI_RUNTIME_DRIVER", 12, "Pilote EFI (runtime)"], ["EFI_ROM", 13, "ROM EFI"], ["XBOX", 14, "Xbox"],
    ["WINDOWS_BOOT_APPLICATION", 16, "Application de boot Windows"] ] },

  dllChars: { title: "OptionalHeader.DllCharacteristics", kind: "flags", prefix: "IMAGE_DLLCHARACTERISTICS_", items: [
    ["HIGH_ENTROPY_VA", 0x0020, "ASLR 64 bits haute entropie (VA > 4 Go)"],
    ["DYNAMIC_BASE", 0x0040, "ASLR : l’image peut être relogée à une autre base"],
    ["FORCE_INTEGRITY", 0x0080, "Vérification d’intégrité de la signature forcée"],
    ["NX_COMPAT", 0x0100, "Compatible DEP (No eXecute)"],
    ["NO_ISOLATION", 0x0200, "Isolation (manifeste) ignorée"],
    ["NO_SEH", 0x0400, "Pas de SEH dans cette image"],
    ["NO_BIND", 0x0800, "Ne pas lier (binding) l’image"],
    ["APPCONTAINER", 0x1000, "Doit s’exécuter dans une AppContainer"],
    ["WDM_DRIVER", 0x2000, "Pilote WDM"],
    ["GUARD_CF", 0x4000, "Control Flow Guard"],
    ["TERMINAL_SERVER_AWARE", 0x8000, "Compatible Terminal Server"] ] },

  secChars: { title: "SectionHeader.Characteristics", kind: "flags", prefix: "IMAGE_SCN_", items: [
    ["TYPE_NO_PAD", 0x00000008, "Obsolète"],
    ["CNT_CODE", 0x00000020, "Contient du code exécutable"],
    ["CNT_INITIALIZED_DATA", 0x00000040, "Contient des données initialisées"],
    ["CNT_UNINITIALIZED_DATA", 0x00000080, "Contient des données non initialisées (.bss)"],
    ["LNK_OTHER", 0x00000100, "Réservé"],
    ["LNK_INFO", 0x00000200, "Commentaires / infos (objets uniquement)"],
    ["LNK_REMOVE", 0x00000800, "À ne pas inclure dans l’image (objets uniquement)"],
    ["LNK_COMDAT", 0x00001000, "Données COMDAT (objets uniquement)"],
    ["GPREL", 0x00008000, "Données référencées via le global pointer"],
    ["MEM_16BIT / MEM_PURGEABLE", 0x00020000, "Réservé"],
    ["MEM_LOCKED", 0x00040000, "Réservé"],
    ["MEM_PRELOAD", 0x00080000, "Réservé"],
    ["ALIGN_*", 0x00F00000, "Champ (4 bits) d’alignement : ALIGN_1BYTES = 0x100000, 2 = 0x200000, 4 = 0x300000 … 4096 = 0xD00000, 8192 = 0xE00000. Valable pour les objets uniquement"],
    ["LNK_NRELOC_OVFL", 0x01000000, "Plus de 0xFFFF relocations : compteur réel dans la 1re"],
    ["MEM_DISCARDABLE", 0x02000000, "Peut être libérée après chargement (ex. .reloc)"],
    ["MEM_NOT_CACHED", 0x04000000, "Non cachable"],
    ["MEM_NOT_PAGED", 0x08000000, "Non paginable"],
    ["MEM_SHARED", 0x10000000, "Partagée entre processus"],
    ["MEM_EXECUTE", 0x20000000, "Exécutable → PAGE_EXECUTE_*"],
    ["MEM_READ", 0x40000000, "Lisible → PAGE_READONLY / READWRITE"],
    ["MEM_WRITE", 0x80000000, "Inscriptible → PAGE_READWRITE"] ] },

  ddIndex: { title: "Index de DataDirectory[]", kind: "enum", prefix: "IMAGE_DIRECTORY_ENTRY_", items: [
    ["EXPORT", 0, "Table d’exports"], ["IMPORT", 1, "Table d’imports"], ["RESOURCE", 2, "Ressources"],
    ["EXCEPTION", 3, "Table d’exceptions (x64 : .pdata)"], ["SECURITY", 4, "Certificats Authenticode — VirtualAddress = OFFSET FICHIER"],
    ["BASERELOC", 5, "Relocations"], ["DEBUG", 6, "Répertoire de debug"], ["ARCHITECTURE", 7, "Réservé"],
    ["GLOBALPTR", 8, "RVA du global pointer (IA64)"], ["TLS", 9, "Thread Local Storage"],
    ["LOAD_CONFIG", 10, "Configuration de chargement (cookie, CFG…)"], ["BOUND_IMPORT", 11, "Imports liés (bound)"],
    ["IAT", 12, "Import Address Table"], ["DELAY_IMPORT", 13, "Imports différés"], ["COM_DESCRIPTOR", 14, "En-tête CLR (.NET)"] ] },

  relocType: { title: "Type d’entrée de relocation", kind: "enum", prefix: "IMAGE_REL_BASED_", items: [
    ["ABSOLUTE", 0, "Ignorée — sert de remplissage pour aligner le bloc"],
    ["HIGH", 1, "16 bits de poids fort de delta, sur un WORD"],
    ["LOW", 2, "16 bits de poids faible de delta, sur un WORD"],
    ["HIGHLOW", 3, "delta 32 bits ajouté à un DWORD (PE32)"],
    ["HIGHADJ", 4, "Réservé : occupe 2 entrées"],
    ["MIPS_JMPADDR / ARM_MOV32 / RISCV_HIGH20", 5, "Dépend de la machine : saut MIPS · paire MOVW/MOVT ARM · 20 bits hauts RISC-V"],
    ["(réservé)", 6, "Doit valoir 0"],
    ["THUMB_MOV32 / RISCV_LOW12I", 7, "Paire MOVW/MOVT Thumb · 12 bits bas RISC-V (format I)"],
    ["RISCV_LOW12S / LOONGARCH32_MARK_LA / LOONGARCH64_MARK_LA", 8, "12 bits bas RISC-V (format S) · adresse LoongArch en 2 ou 4 instructions"],
    ["MIPS_JMPADDR16", 9, "Saut MIPS16"],
    ["DIR64", 10, "delta 64 bits ajouté à un ULONGLONG (PE32+)"] ] },

  debugType: { title: "IMAGE_DEBUG_DIRECTORY.Type", kind: "enum", prefix: "IMAGE_DEBUG_TYPE_", items: [
    ["UNKNOWN", 0], ["COFF", 1, "Infos COFF"], ["CODEVIEW", 2, "CodeView → chemin du PDB (RSDS)"], ["FPO", 3, "Frame Pointer Omission"],
    ["MISC", 4, "Chemin du .dbg"], ["EXCEPTION", 5], ["FIXUP", 6], ["OMAP_TO_SRC", 7], ["OMAP_FROM_SRC", 8], ["BORLAND", 9],
    ["RESERVED10", 10], ["CLSID", 11], ["VC_FEATURE", 12, "Infos de compilation VC++"], ["POGO", 13, "Profile Guided Optimization"],
    ["ILTCG", 14], ["MPX", 15], ["REPRO", 16, "Build reproductible : timestamps remplacés par un hash du contenu"],
    ["(sans nom)", 17, "Infos de debug embarquées dans le PE à PointerToRawData"],
    ["(sans nom)", 19, "Hash cryptographique du fichier de symboles utilisé pour le build"],
    ["EX_DLLCHARACTERISTICS", 20, "DllCharacteristics étendues (CET…)"] ] },

  resType: { title: "Types de ressources (niveau 1)", kind: "enum", prefix: "RT_", items: [
    ["CURSOR", 1], ["BITMAP", 2], ["ICON", 3], ["MENU", 4], ["DIALOG", 5], ["STRING", 6], ["FONTDIR", 7], ["FONT", 8],
    ["ACCELERATOR", 9], ["RCDATA", 10], ["MESSAGETABLE", 11], ["GROUP_CURSOR", 12], ["GROUP_ICON", 14], ["VERSION", 16],
    ["DLGINCLUDE", 17], ["PLUGPLAY", 19], ["VXD", 20], ["ANICURSOR", 21], ["ANIICON", 22], ["HTML", 23], ["MANIFEST", 24] ] },

  certRev: { title: "WIN_CERTIFICATE.wRevision", kind: "enum", prefix: "WIN_CERT_REVISION_", items: [
    ["1_0", 0x0100, "Ancienne version"], ["2_0", 0x0200, "Version courante"] ] },
  certType: { title: "WIN_CERTIFICATE.wCertificateType", kind: "enum", prefix: "WIN_CERT_TYPE_", items: [
    ["X509", 0x0001, "Certificat X.509"], ["PKCS_SIGNED_DATA", 0x0002, "PKCS#7 SignedData (Authenticode)"],
    ["RESERVED_1", 0x0003, "Réservé"], ["TS_STACK_SIGNED", 0x0004, "Terminal Server Protocol Stack"] ] },

  ordFlag: { title: "Import par ordinal (IMAGE_THUNK_DATA)", kind: "flags", prefix: "", items: [
    ["IMAGE_ORDINAL_FLAG32", 0x80000000, "Bit 31 : si 1, importe par ordinal (PE32)"],
    ["IMAGE_ORDINAL_FLAG64", "0x8000000000000000", "Bit 63 : si 1, importe par ordinal (PE32+)"] ] },

  unwindFlags: { title: "UNWIND_INFO.Flags", kind: "flags", prefix: "UNW_FLAG_", items: [
    ["EHANDLER", 1, "Une fonction de gestion d’exception est présente"], ["UHANDLER", 2, "Un handler de terminaison (unwind) est présent"],
    ["CHAININFO", 4, "L’UNWIND_INFO est chaînée à une RUNTIME_FUNCTION parente"] ] },

  guardFlags: { title: "LoadConfig.GuardFlags", kind: "flags", prefix: "IMAGE_GUARD_", items: [
    ["CF_INSTRUMENTED", 0x100, "CFG : le module vérifie les appels indirects"], ["CFW_INSTRUMENTED", 0x200, "CFG avec contrôle d’écriture"],
    ["CF_FUNCTION_TABLE_PRESENT", 0x400, "GuardCFFunctionTable est valide"], ["SECURITY_COOKIE_UNUSED", 0x800, "Pas de /GS cookie"],
    ["PROTECT_DELAYLOAD_IAT", 0x1000, "IAT des delay-imports protégée"], ["DELAYLOAD_IAT_IN_ITS_OWN_SECTION", 0x2000, "…dans sa propre section"],
    ["CF_EXPORT_SUPPRESSION_INFO_PRESENT", 0x4000, "Infos de suppression d’exports"], ["CF_ENABLE_EXPORT_SUPPRESSION", 0x8000, "Suppression d’exports activée"],
    ["CF_LONGJUMP_TABLE_PRESENT", 0x10000, "Table de cibles longjmp valide"],
    ["CF_FUNCTION_TABLE_SIZE_MASK", 0xF0000000, "Sous-champ de 4 bits : octets supplémentaires par entrée de GuardCFFunctionTable (décalage de 28 : IMAGE_GUARD_CF_FUNCTION_TABLE_SIZE_SHIFT)"] ] },

  corFlags: { title: "IMAGE_COR20_HEADER.Flags", kind: "flags", prefix: "COMIMAGE_FLAGS_", items: [
    ["ILONLY", 0x1, "Code IL pur (pas de code natif)"], ["32BITREQUIRED", 0x2, "Exige un processus 32 bits"], ["IL_LIBRARY", 0x4, "Bibliothèque IL"],
    ["STRONGNAMESIGNED", 0x8, "Signé par nom fort"], ["NATIVE_ENTRYPOINT", 0x10, "EntryPointRVA pointe vers du code natif"],
    ["TRACKDEBUGDATA", 0x10000, "Suivre les données de debug"], ["32BITPREFERRED", 0x20000, "Préfère 32 bits (AnyCPU 32-bit preferred)"] ] }
};

Object.assign(E, {
  dllCharsEx: { title: "Extended DLL Characteristics (debug type 20)", kind: "flags", prefix: "IMAGE_DLLCHARACTERISTICS_EX_", items: [
    ["CET_COMPAT", 0x0001, "Compatible Shadow Stack CET (Control-flow Enforcement Technology)"],
    ["FORWARD_CFI_COMPAT", 0x0040, "Toutes les cibles de branchement portent une instruction de garde (CET-IBT, ARM BTI). Non utilisé par Windows"] ] },

  tlsReason: { title: "Reason des callbacks TLS (et de DllMain)", kind: "enum", prefix: "DLL_", items: [
    ["PROCESS_DETACH", 0, "Le processus va se terminer"], ["PROCESS_ATTACH", 1, "Nouveau processus (premier thread inclus)"],
    ["THREAD_ATTACH", 2, "Nouveau thread (sauf le premier)"], ["THREAD_DETACH", 3, "Un thread va se terminer (sauf le dernier)"] ] },

  comdat: { title: "COMDAT : champ Selection (aux section)", kind: "enum", prefix: "IMAGE_COMDAT_SELECT_", items: [
    ["NODUPLICATES", 1, "Erreur « multiply defined symbol » si déjà défini"], ["ANY", 2, "N’importe quelle section peut être gardée, les autres sont supprimées"],
    ["SAME_SIZE", 3, "Une au choix ; erreur si les tailles diffèrent"], ["EXACT_MATCH", 4, "Une au choix ; erreur si le contenu diffère"],
    ["ASSOCIATIVE", 5, "Liée si une autre section COMDAT (champ Number) est liée"], ["LARGEST", 6, "La plus grande définition est choisie"] ] },

  symSection: { title: "IMAGE_SYMBOL.SectionNumber (valeurs < 1)", kind: "enum", prefix: "IMAGE_SYM_", items: [
    ["UNDEFINED", 0, "Pas encore de section : Value = 0 → symbole externe ; Value ≠ 0 → symbole commun (taille)"],
    ["ABSOLUTE (−1)", 0xFFFF, "Valeur absolue, pas une adresse (SHORT signé −1)"], ["DEBUG (−2)", 0xFFFE, "Info de type/debug sans section : records .file (SHORT signé −2)"] ] },

  symType: { title: "IMAGE_SYMBOL.Type — type de base (octet bas)", kind: "enum", prefix: "IMAGE_SYM_TYPE_", items: [
    ["NULL", 0, "Aucune info / inconnu (outils Microsoft)"], ["VOID", 1], ["CHAR", 2], ["SHORT", 3], ["INT", 4], ["LONG", 5], ["FLOAT", 6], ["DOUBLE", 7],
    ["STRUCT", 8], ["UNION", 9], ["ENUM", 10], ["MOE", 11, "Membre d’énumération"], ["BYTE", 12], ["WORD", 13], ["UINT", 14], ["DWORD", 15] ] },

  symDType: { title: "IMAGE_SYMBOL.Type — type dérivé (octet haut)", kind: "enum", prefix: "IMAGE_SYM_DTYPE_", items: [
    ["NULL", 0, "Variable scalaire"], ["POINTER", 1, "Pointeur"], ["FUNCTION", 2, "Fonction (les outils MS ne mettent que 0x00 ou 0x20 en Type)"], ["ARRAY", 3, "Tableau"] ] },

  symClass: { title: "IMAGE_SYMBOL.StorageClass", kind: "enum", prefix: "IMAGE_SYM_CLASS_", items: [
    ["END_OF_FUNCTION", 0xFF, "Fin de fonction (debug)"], ["NULL", 0], ["AUTOMATIC", 1, "Variable de pile (Value = offset)"],
    ["EXTERNAL", 2, "Symbole externe (usage Microsoft)"], ["STATIC", 3, "Offset dans la section ; Value = 0 → nom de section"],
    ["REGISTER", 4], ["EXTERNAL_DEF", 5], ["LABEL", 6], ["UNDEFINED_LABEL", 7], ["MEMBER_OF_STRUCT", 8], ["ARGUMENT", 9], ["STRUCT_TAG", 10],
    ["MEMBER_OF_UNION", 11], ["UNION_TAG", 12], ["TYPE_DEFINITION", 13], ["UNDEFINED_STATIC", 14], ["ENUM_TAG", 15], ["MEMBER_OF_ENUM", 16],
    ["REGISTER_PARAM", 17], ["BIT_FIELD", 18], ["BLOCK", 100, "Records .bb / .eb"], ["FUNCTION", 101, "Records .bf / .lf / .ef"],
    ["END_OF_STRUCT", 102], ["FILE", 103, "Nom de fichier source (suivi d’un aux « File »)"], ["SECTION", 104],
    ["WEAK_EXTERNAL", 105, "Symbole faible (suivi d’un aux « Weak External »)"], ["CLR_TOKEN", 107, "Token CLR"] ] },

  weakExt: { title: "Weak External : Characteristics", kind: "enum", prefix: "IMAGE_WEAK_EXTERN_SEARCH_", items: [
    ["NOLIBRARY", 1, "Ne pas chercher sym1 dans les bibliothèques"], ["LIBRARY", 2, "Chercher sym1 dans les bibliothèques"], ["ALIAS", 3, "sym1 est un alias de sym2"] ] },

  coffRelAmd64: { title: "IMAGE_RELOCATION.Type — x64", kind: "enum", prefix: "IMAGE_REL_AMD64_", items: [
    ["ABSOLUTE", 0x0, "Ignorée"], ["ADDR64", 0x1, "VA 64 bits de la cible"], ["ADDR32", 0x2, "VA 32 bits de la cible"], ["ADDR32NB", 0x3, "Adresse 32 bits sans base (RVA)"],
    ["REL32", 0x4, "32 bits relatif à l’octet suivant la relocation"], ["REL32_1", 0x5, "Relatif à +1"], ["REL32_2", 0x6, "Relatif à +2"],
    ["REL32_3", 0x7, "Relatif à +3"], ["REL32_4", 0x8, "Relatif à +4"], ["REL32_5", 0x9, "Relatif à +5"],
    ["SECTION", 0xA, "Indice 16 bits de la section de la cible (debug)"], ["SECREL", 0xB, "Offset 32 bits depuis le début de la section (debug, TLS)"],
    ["SECREL7", 0xC, "Offset non signé 7 bits depuis la section"], ["TOKEN", 0xD, "Token CLR"],
    ["SREL32", 0xE, "Valeur signée 32 bits dépendante de l’étendue"], ["PAIR", 0xF, "Doit suivre toute valeur dépendante de l’étendue"], ["SSPAN32", 0x10, "Valeur signée 32 bits appliquée au link"] ] },

  coffRelI386: { title: "IMAGE_RELOCATION.Type — i386", kind: "enum", prefix: "IMAGE_REL_I386_", items: [
    ["ABSOLUTE", 0x0, "Ignorée"], ["DIR16", 0x1, "Non supporté"], ["REL16", 0x2, "Non supporté"], ["DIR32", 0x6, "VA 32 bits de la cible"],
    ["DIR32NB", 0x7, "RVA 32 bits de la cible"], ["SEG12", 0x9, "Non supporté"], ["SECTION", 0xA, "Indice 16 bits de section (debug)"],
    ["SECREL", 0xB, "Offset 32 bits depuis la section"], ["TOKEN", 0xC, "Token CLR"], ["SECREL7", 0xD, "Offset 7 bits depuis la section"],
    ["REL32", 0x14, "Déplacement relatif 32 bits (call / jmp x86)"] ] },

  importType: { title: "IMPORT_OBJECT_HEADER.Type", kind: "enum", prefix: "IMPORT_OBJECT_", items: [
    ["CODE", 0, "Code exécutable"], ["DATA", 1, "Données"], ["CONST", 2, "CONST dans le .def"] ] },

  importNameType: { title: "IMPORT_OBJECT_HEADER.NameType", kind: "enum", prefix: "IMPORT_OBJECT_", items: [
    ["ORDINAL", 0, "Import par ordinal (Ordinal/Hint = ordinal) ; sinon c’est un hint"], ["NAME", 1, "Nom = symbole public"],
    ["NAME_NOPREFIX", 2, "Nom public sans le « ? », « @ » ou « _ » initial"], ["NAME_UNDECORATE", 3, "Comme NOPREFIX, tronqué au premier « @ »"] ] }
});

/* ---------- Tailles des types de base ---------- */
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
  desc: "En-tête MS-DOS hérité, toujours long de 64 octets. Windows n’exploite que deux champs : e_magic et e_lfanew.",
  loc: "Offset fichier 0x00.",
  fields: [
    F("e_magic", "WORD", "magic", "Signature « MZ » (0x5A4D = IMAGE_DOS_SIGNATURE), initiales de Mark Zbikowski.", { s: 0x5A4D }),
    F("e_cblp", "WORD", "size", "Octets utilisés dans la dernière page de 512 octets du fichier DOS.", { s: 0x90 }),
    F("e_cp", "WORD", "count", "Nombre de pages de 512 octets du fichier DOS.", { s: 3 }),
    F("e_crlc", "WORD", "count", "Nombre d’entrées dans la table de relocations DOS.", { s: 0 }),
    F("e_cparhdr", "WORD", "size", "Taille de l’en-tête DOS en paragraphes (1 paragraphe = 16 octets).", { s: 4 }),
    F("e_minalloc", "WORD", "size", "Paragraphes minimum à allouer au-dessus du programme.", { s: 0 }),
    F("e_maxalloc", "WORD", "size", "Paragraphes maximum à allouer (0xFFFF = tout ce qui est disponible).", { s: 0xFFFF }),
    F("e_ss", "WORD", "misc", "Valeur initiale (relative) de SS.", { s: 0 }),
    F("e_sp", "WORD", "misc", "Valeur initiale de SP.", { s: 0xB8 }),
    F("e_csum", "WORD", "chk", "Checksum DOS (ignoré).", { s: 0 }),
    F("e_ip", "WORD", "misc", "Valeur initiale de IP.", { s: 0 }),
    F("e_cs", "WORD", "misc", "Valeur initiale (relative) de CS.", { s: 0 }),
    F("e_lfarlc", "WORD", "off", "Offset de la table de relocations DOS. 0x40 (juste après l’en-tête) signale un exécutable « nouvelle génération » (NE/PE).", { s: 0x40 }),
    F("e_ovno", "WORD", "misc", "Numéro d’overlay.", { s: 0 }),
    F("e_res", "WORD", "res", "Réservé.", { c: 4 }),
    F("e_oemid", "WORD", "misc", "Identifiant OEM (utilisé par e_oeminfo).", { s: 0 }),
    F("e_oeminfo", "WORD", "misc", "Infos OEM.", { s: 0 }),
    F("e_res2", "WORD", "res", "Réservé.", { c: 10 }),
    F("e_lfanew", "LONG", "off", "Offset fichier de l’IMAGE_NT_HEADERS (signature « PE\\0\\0 »). C’est ce champ qui permet de sauter le stub DOS.",
      { s: 0xB0, to: "IMAGE_NT_HEADERS" })
  ]
};

/* ---------- Rich header (non documenté) ---------- */
S.RICH_ENTRY = {
  fam: "rich", page: "rich", hdr: "non documentée — absente de windows.h",
  desc: "Une entrée « @comp.id » : un outil (compilateur, linker, assembleur…) utilisé pour produire le binaire, et le nombre d’objets qu’il a fournis.",
  fields: [
    F("wBuild", "WORD", "ver", "Numéro de build de l’outil (ex. 31391 pour un VC++ 2022). Partie basse du @comp.id."),
    F("wProdId", "WORD", "enum", "Identifiant du produit/outil (cl, link, masm, cvtres…). Partie haute du @comp.id."),
    F("dwCount", "DWORD", "count", "Nombre de fois où cet outil/build a été utilisé (nombre d’objets).")
  ]
};
S.RICH_HEADER = {
  fam: "rich", page: "rich", hdr: "non documentée — absente de windows.h", noEncode: true,
  desc: "Bloc facultatif inséré par le linker Microsoft entre le stub DOS et la signature PE. Tout, sauf la chaîne « Rich » et la clé, est XORé avec cette clé. Il n’est lu ni par le loader ni par LoadLibrary.",
  loc: "Entre la fin du stub DOS et e_lfanew (aligné sur 8 octets typiquement) ; s’identifie en cherchant « Rich » en partant de e_lfanew vers l’arrière.",
  fields: [
    F("DanS", "DWORD", "magic", "« DanS » (0x536E6144) XORé avec XorKey. Début du bloc.", { s: 0 }),
    F("Padding", "DWORD", "res", "3 DWORD à 0 avant XOR (donc égaux à XorKey sur disque).", { c: 3 }),
    F("Entries", "RICH_ENTRY", "struct", "Tableau d’entrées @comp.id (8 octets chacune), chaque DWORD XORé avec XorKey.", { c: 1, vs: true }),
    F("Rich", "DWORD", "magic", "« Rich » (0x68636952), en clair : marque la fin du bloc.", { s: 0 }),
    F("XorKey", "DWORD", "chk", "Clé XOR = checksum des octets précédant « DanS » (en ignorant e_lfanew) combiné aux entrées.", { s: 0 })
  ]
};

/* ---------- NT headers ---------- */
S.IMAGE_NT_HEADERS = {
  name: ["IMAGE_NT_HEADERS32", "IMAGE_NT_HEADERS64"], fam: "nt", page: "file", hdr: "winnt.h",
  desc: "Racine du format PE : signature + File Header + Optional Header. IMAGE_NT_HEADERS est un alias de la version 32 ou 64 selon _WIN64.",
  loc: "Offset fichier = IMAGE_DOS_HEADER.e_lfanew.",
  fields: [
    F("Signature", "DWORD", "magic", "« PE\\0\\0 » (0x00004550 = IMAGE_NT_SIGNATURE).", { s: 0x4550 }),
    F("FileHeader", "IMAGE_FILE_HEADER", "struct", "En-tête COFF : architecture, nombre de sections…"),
    F("OptionalHeader", "IMAGE_OPTIONAL_HEADER", "struct", "En-tête « optionnel » (obligatoire pour une image) : adresses, tailles, alignements, Data Directories.")
  ]
};

S.IMAGE_FILE_HEADER = {
  fam: "file", page: "file", hdr: "winnt.h",
  desc: "En-tête COFF, hérité des fichiers objet. Donne l’architecture, le nombre de sections et la taille de l’Optional Header.",
  loc: "IMAGE_NT_HEADERS + 0x04.",
  fields: [
    F("Machine", "WORD", "enum", "Architecture cible du CPU.", { v: "machine", s: { 32: 0x14C, 64: 0x8664 } }),
    F("NumberOfSections", "WORD", "count", "Nombre d’entrées de la table de sections (le loader Windows en accepte 96 au plus).", { s: 6 }),
    F("TimeDateStamp", "DWORD", "time", "Date de création de l’image. Avec /Brepro, c’est un hash au lieu d’une date.", { s: 0x6652F1A0 }),
    F("PointerToSymbolTable", "DWORD", "off", "Offset de la table de symboles COFF — 0 dans une image (obsolète).", { s: 0 }),
    F("NumberOfSymbols", "DWORD", "count", "Nombre de symboles COFF — 0 dans une image.", { s: 0 }),
    F("SizeOfOptionalHeader", "WORD", "size", "Taille de l’Optional Header : 0xE0 en PE32, 0xF0 en PE32+ (avec 16 data directories).", { s: { 32: 0xE0, 64: 0xF0 } }),
    F("Characteristics", "WORD", "flags", "Attributs du fichier (EXE/DLL, relocations retirées…).", { v: "fileChars", s: { 32: 0x0102, 64: 0x0022 } })
  ]
};

S.IMAGE_OPTIONAL_HEADER = {
  name: ["IMAGE_OPTIONAL_HEADER32", "IMAGE_OPTIONAL_HEADER64"], fam: "opt", page: "optional", hdr: "winnt.h",
  desc: "Malgré son nom il est obligatoire dans une image. Contient le point d’entrée, l’ImageBase, les alignements, la taille de l’image et les Data Directories. Sa disposition change entre PE32 et PE32+ (BaseOfData disparaît, ImageBase et les tailles pile/tas passent à 64 bits).",
  loc: "IMAGE_NT_HEADERS + 0x18.",
  fields: [
    F("Magic", "WORD", "enum", "Type d’image : 0x10B = PE32, 0x20B = PE32+. C’est ce champ — pas Machine — qui décide de la disposition de la suite.", { v: "optMagic", s: { 32: 0x10B, 64: 0x20B } }),
    F("MajorLinkerVersion", "BYTE", "ver", "Version majeure du linker.", { s: 14 }),
    F("MinorLinkerVersion", "BYTE", "ver", "Version mineure du linker.", { s: 36 }),
    F("SizeOfCode", "DWORD", "size", "Somme des tailles brutes des sections contenant du code.", { s: 0x1C00 }),
    F("SizeOfInitializedData", "DWORD", "size", "Somme des tailles brutes des sections de données initialisées.", { s: 0x1600 }),
    F("SizeOfUninitializedData", "DWORD", "size", "Somme des tailles des sections de données non initialisées (.bss).", { s: 0 }),
    F("AddressOfEntryPoint", "DWORD", "rva", "RVA du point d’entrée : CRT startup pour un EXE, wrapper de DllMain pour une DLL, DriverEntry pour un pilote. 0 = aucun.",
      { s: 0x1140 }),
    F("BaseOfCode", "DWORD", "rva", "RVA du début de la section de code (informatif).", { s: 0x1000 }),
    F("BaseOfData", "DWORD", "rva", "RVA du début des données. PE32 uniquement : en PE32+ ce champ n’existe plus et ImageBase passe à 8 octets.", { only: 32, s: 0x3000 }),
    F("ImageBase", PTR, "va", "Adresse virtuelle préférée de chargement (multiple de 64 Ko). Si l’adresse n’est pas libre ou avec ASLR, le loader relocalise l’image.",
      { s: { 32: 0x400000, 64: 0x140000000 } }),
    F("SectionAlignment", "DWORD", "align", "Alignement des sections en mémoire (leurs VirtualAddress). ≥ FileAlignment ; 0x1000 = taille de page.", { s: 0x1000 }),
    F("FileAlignment", "DWORD", "align", "Alignement des données brutes dans le fichier : puissance de 2 entre 0x200 et 0x10000.", { s: 0x200 }),
    F("MajorOperatingSystemVersion", "WORD", "ver", "Version majeure de l’OS requis (informatif).", { s: 6 }),
    F("MinorOperatingSystemVersion", "WORD", "ver", "Version mineure de l’OS requis.", { s: 0 }),
    F("MajorImageVersion", "WORD", "ver", "Version majeure de l’image (option /VERSION).", { s: 0 }),
    F("MinorImageVersion", "WORD", "ver", "Version mineure de l’image.", { s: 0 }),
    F("MajorSubsystemVersion", "WORD", "ver", "Version majeure minimale du sous-système.", { s: 6 }),
    F("MinorSubsystemVersion", "WORD", "ver", "Version mineure minimale du sous-système.", { s: 0 }),
    F("Win32VersionValue", "DWORD", "res", "Réservé, doit valoir 0.", { s: 0 }),
    F("SizeOfImage", "DWORD", "size", "Taille totale de l’image en mémoire, en-têtes compris, multiple de SectionAlignment.", { s: 0x8000 }),
    F("SizeOfHeaders", "DWORD", "size", "Taille cumulée de DOS header + stub + NT headers + section headers, arrondie à FileAlignment. Égale au plus petit PointerToRawData.", { s: 0x400 }),
    F("CheckSum", "DWORD", "chk", "Checksum de l’image. Ignorée, sauf pour les pilotes, DLL système et services lancés au boot.", { s: 0 }),
    F("Subsystem", "WORD", "enum", "Sous-système requis (GUI, console, natif, EFI…).", { v: "subsystem", s: 3 }),
    F("DllCharacteristics", "WORD", "flags", "Attributs de chargement et de sécurité (nom historique : vaut aussi pour les EXE). DYNAMIC_BASE = ASLR, NX_COMPAT = DEP, GUARD_CF = CFG.",
      { v: "dllChars", s: { 32: 0x8140, 64: 0x8160 } }),
    F("SizeOfStackReserve", PTR, "size", "Pile du thread principal : mémoire réservée.", { s: 0x100000 }),
    F("SizeOfStackCommit", PTR, "size", "Pile du thread principal : mémoire committée dès le départ.", { s: 0x1000 }),
    F("SizeOfHeapReserve", PTR, "size", "Tas par défaut du processus : mémoire réservée.", { s: 0x100000 }),
    F("SizeOfHeapCommit", PTR, "size", "Tas par défaut : mémoire committée dès le départ.", { s: 0x1000 }),
    F("LoaderFlags", "DWORD", "res", "Obsolète, 0.", { s: 0 }),
    F("NumberOfRvaAndSizes", "DWORD", "count", "Nombre d’entrées valides de DataDirectory (IMAGE_NUMBEROF_DIRECTORY_ENTRIES = 16). Peut être plus petit.", { s: 16 }),
    F("DataDirectory", "IMAGE_DATA_DIRECTORY", "struct", "16 pointeurs (RVA + taille) vers les tables du PE : imports, exports, ressources, relocations…", { c: 16, v: "ddIndex", s: Array.from({ length: 16 }, (_, i) => SAMPLE.dirs[i] || [0, 0]) })
  ]
};

S.IMAGE_DATA_DIRECTORY = {
  fam: "dd", page: "optional", hdr: "winnt.h",
  desc: "Une entrée de la table des Data Directories : pointeur + taille vers une structure du PE. L’index (IMAGE_DIRECTORY_ENTRY_*) dit quelle structure s’y trouve.",
  loc: "OptionalHeader.DataDirectory[index].",
  fields: [
    F("VirtualAddress", "DWORD", "rva", "RVA de la table. ⚠ Exception : pour IMAGE_DIRECTORY_ENTRY_SECURITY c’est un OFFSET FICHIER (le certificat n’est pas mappé en mémoire)."),
    F("Size", "DWORD", "size", "Taille de la table en octets.")
  ]
};

/* ---------- Sections ---------- */
S.IMAGE_SECTION_HEADER = {
  fam: "sec", page: "sections", hdr: "winnt.h",
  desc: "Décrit une section : où ses octets sont dans le fichier (PointerToRawData / SizeOfRawData) et où ils vont en mémoire (VirtualAddress / VirtualSize), avec ses droits (Characteristics). La table de sections est un tableau de ces structures de 40 octets.",
  loc: "Juste après l’Optional Header : IMAGE_FIRST_SECTION(nt) = OptionalHeader + SizeOfOptionalHeader. NumberOfSections entrées.",
  fields: [
    F("Name", "BYTE", "str", "Nom UTF-8 sur 8 octets, complété par des 0 ; pas de 0 final s’il fait exactement 8 caractères. Dans un objet, « /n » renvoie à la table de chaînes COFF ; une image ne gère pas les noms plus longs. Conventions : .text .rdata .data .rsrc .reloc .pdata.", { c: 8, s: ".text" }),
    F("VirtualSize", "DWORD", "size", "Taille de la section en mémoire (avant alignement). Si > SizeOfRawData, la fin est remplie de zéros (.bss). Union avec PhysicalAddress (fichiers objet).",
      { u: "Misc", alt: ["PhysicalAddress"] }),
    F("VirtualAddress", "DWORD", "rva", "RVA du début de la section en mémoire. Multiple de SectionAlignment, croissant d’une section à l’autre."),
    F("SizeOfRawData", "DWORD", "size", "Taille des données dans le fichier, multiple de FileAlignment. Peut être 0 (section purement .bss)."),
    F("PointerToRawData", "DWORD", "off", "Offset fichier du début des données de la section."),
    F("PointerToRelocations", "DWORD", "off", "Offset des relocations COFF — 0 dans une image (les relocations PE sont dans BaseReloc).", { s: 0 }),
    F("PointerToLinenumbers", "DWORD", "off", "Offset des numéros de ligne COFF — 0 dans une image.", { s: 0 }),
    F("NumberOfRelocations", "WORD", "count", "Nombre de relocations COFF — 0 dans une image.", { s: 0 }),
    F("NumberOfLinenumbers", "WORD", "count", "Nombre de numéros de ligne COFF — 0 dans une image.", { s: 0 }),
    F("Characteristics", "DWORD", "flags", "Contenu et droits d’accès : CNT_CODE, MEM_READ, MEM_WRITE, MEM_EXECUTE…", { v: "secChars" })
  ]
};

/* ---------- Exports ---------- */
S.IMAGE_EXPORT_DIRECTORY = {
  fam: "exp", page: "exports", hdr: "winnt.h",
  desc: "En-tête de la table d’exports. Trois tableaux travaillent ensemble : noms (triés), ordinaux associés, et adresses des fonctions (EAT).",
  loc: "DataDirectory[IMAGE_DIRECTORY_ENTRY_EXPORT] (RVA).",
  fields: [
    F("Characteristics", "DWORD", "res", "Réservé, 0."),
    F("TimeDateStamp", "DWORD", "time", "Date de création de la table d’exports."),
    F("MajorVersion", "WORD", "ver", "Version majeure (définie par l’utilisateur, rarement utilisée)."),
    F("MinorVersion", "WORD", "ver", "Version mineure."),
    F("Name", "DWORD", "rva", "RVA du nom de la DLL (ASCIIZ), ex. « KERNEL32.dll ».", { to: "ASCIIZ" }),
    F("Base", "DWORD", "count", "Ordinal de départ : l’ordinal d’un export = indice dans AddressOfFunctions + Base (souvent 1)."),
    F("NumberOfFunctions", "DWORD", "count", "Taille du tableau AddressOfFunctions (certaines cases peuvent valoir 0)."),
    F("NumberOfNames", "DWORD", "count", "Nombre d’exports nommés (≤ NumberOfFunctions). Taille de AddressOfNames et de AddressOfNameOrdinals."),
    F("AddressOfFunctions", "DWORD", "rva", "RVA d’un tableau de DWORD[NumberOfFunctions] : RVA de chaque fonction (EAT)."),
    F("AddressOfNames", "DWORD", "rva", "RVA d’un tableau de DWORD[NumberOfNames] : RVA des noms (ASCIIZ), triés par ordre alphabétique."),
    F("AddressOfNameOrdinals", "DWORD", "rva", "RVA d’un tableau de WORD[NumberOfNames] : pour chaque nom, indice correspondant dans AddressOfFunctions (SANS ajouter Base).")
  ]
};

/* ---------- Imports ---------- */
S.IMAGE_IMPORT_DESCRIPTOR = {
  fam: "imp", page: "imports", hdr: "winnt.h",
  desc: "Décrit les imports d’UNE DLL. Le tableau de descripteurs est terminé par un descripteur entièrement à zéro.",
  loc: "DataDirectory[IMAGE_DIRECTORY_ENTRY_IMPORT] (RVA), tableau de descripteurs.",
  fields: [
    F("OriginalFirstThunk", "DWORD", "rva", "RVA de l’INT (Import Name Table) : tableau d’IMAGE_THUNK_DATA terminé par 0, qui n’est jamais modifié. Union avec Characteristics (0 = descripteur de fin).",
      { alt: ["Characteristics"], to: "IMAGE_THUNK_DATA" }),
    F("TimeDateStamp", "DWORD", "time", "0 = non lié (not bound) ; −1 = lié via Bound Import ; sinon date de la DLL au moment du binding."),
    F("ForwarderChain", "DWORD", "misc", "Indice du premier forwarder (ancien binding), −1 si aucun."),
    F("Name", "DWORD", "rva", "RVA du nom de la DLL (ASCIIZ).", { to: "ASCIIZ" }),
    F("FirstThunk", "DWORD", "rva", "RVA de l’IAT (Import Address Table) de cette DLL. Sur disque : copie de l’INT ; en mémoire : adresses réelles des fonctions.", { to: "IMAGE_THUNK_DATA" })
  ]
};

S.IMAGE_THUNK_DATA = {
  name: ["IMAGE_THUNK_DATA32", "IMAGE_THUNK_DATA64"], fam: "imp", page: "imports", hdr: "winnt.h", union: true, wrapper: "u1",
  desc: "Une case de l’INT ou de l’IAT : c’est une union, un seul mot (32 ou 64 bits) interprété différemment selon l’état. Les tableaux se terminent par une case à 0.",
  fields: [
    F("ForwarderString", PTR, "rva", "RVA d’une chaîne de forwarder (usage obsolète)."),
    F("Function", PTR, "va", "Après chargement, dans l’IAT : adresse virtuelle de la fonction importée."),
    F("Ordinal", PTR, "enum", "Si le bit de poids fort est à 1 (IMAGE_ORDINAL_FLAG), import par ordinal : les 16 bits bas sont l’ordinal (les bits 30–15 ou 62–15 doivent valoir 0).", { v: "ordFlag", bits: [["Ordinal", "bits 0–15"], ["Ordinal/Name Flag", "bit 31 (PE32) · bit 63 (PE32+)"]] }),
    F("AddressOfData", PTR, "rva", "Sinon (bit fort = 0) : RVA d’un IMAGE_IMPORT_BY_NAME (Hint + nom). Seuls 31 bits sont utilisés ; en PE32+ les bits 62–31 doivent valoir 0.", { to: "IMAGE_IMPORT_BY_NAME", bits: [["Hint/Name Table RVA", "bits 0–30"]] })
  ]
};

S.IMAGE_IMPORT_BY_NAME = {
  fam: "imp", page: "imports", hdr: "winnt.h",
  desc: "Hint + nom d’une fonction importée par nom. Doit être aligné sur 2 octets.",
  fields: [
    F("Hint", "WORD", "misc", "Indice « suggéré » dans la table de noms d’exports de la DLL — accélère la recherche, pas fiable."),
    F("Name", "CHAR", "str", "Nom de la fonction, ASCIIZ, de longueur variable.", { c: 1, vs: true })
  ]
};

S.IMAGE_BOUND_IMPORT_DESCRIPTOR = {
  fam: "imp", page: "imports", hdr: "winnt.h",
  desc: "Entrée du Bound Import Directory : DLLs contre lesquelles l’IAT a été pré-résolue (optimisation ancienne, abandonnée avec l’ASLR).",
  loc: "DataDirectory[IMAGE_DIRECTORY_ENTRY_BOUND_IMPORT]. Terminé par un descripteur nul.",
  fields: [
    F("TimeDateStamp", "DWORD", "time", "TimeDateStamp de la DLL au moment du binding."),
    F("OffsetModuleName", "WORD", "off", "Offset du nom de la DLL, RELATIF au début du Bound Import Directory."),
    F("NumberOfModuleForwarderRefs", "WORD", "count", "Nombre de IMAGE_BOUND_FORWARDER_REF qui suivent immédiatement.")
  ]
};
S.IMAGE_BOUND_FORWARDER_REF = {
  fam: "imp", page: "imports", hdr: "winnt.h",
  desc: "Référence de forwarder liée, juste après un IMAGE_BOUND_IMPORT_DESCRIPTOR.",
  fields: [
    F("TimeDateStamp", "DWORD", "time", "Date de la DLL de destination du forwarder."),
    F("OffsetModuleName", "WORD", "off", "Offset du nom, relatif au Bound Import Directory."),
    F("Reserved", "WORD", "res", "Réservé.")
  ]
};

/* ---------- Delay imports ---------- */
S.IMAGE_DELAYLOAD_DESCRIPTOR = {
  fam: "imp", page: "delay", hdr: "winnt.h",
  desc: "Imports différés : l’IAT n’est remplie qu’au premier appel de la fonction, via un stub du CRT (__delayLoadHelper2). Ne sont pas traités par le loader au chargement.",
  loc: "DataDirectory[IMAGE_DIRECTORY_ENTRY_DELAY_IMPORT]. Terminé par un descripteur nul.",
  fields: [
    F("Attributes", "DWORD", "flags", "Bit 0 = RvaBased (dlattrRva dans delayimp.h) : 1 ⇒ tous les champs suivants sont des RVA (format Visual C++ 7.0+) ; 0 ⇒ ce sont des VA (ancien format). Le tableau de la spec MS dit « doit valoir 0 », le SDK définit ce bit : lisez-le.", { u: "Attributes", bits: [["RvaBased", "bit 0"], ["ReservedAttributes", "bits 1–31"]],
      cRaw: "union {\n        DWORD AllAttributes;\n        struct {\n            DWORD RvaBased : 1;\n            DWORD ReservedAttributes : 31;\n        } DUMMYSTRUCTNAME;\n    } Attributes;" }),
    F("DllNameRVA", "DWORD", "rva", "RVA du nom de la DLL (ASCIIZ)."),
    F("ModuleHandleRVA", "DWORD", "rva", "RVA d’un emplacement où stocker le HMODULE une fois la DLL chargée."),
    F("ImportAddressTableRVA", "DWORD", "rva", "RVA de l’IAT différée (initialement pointe vers des stubs)."),
    F("ImportNameTableRVA", "DWORD", "rva", "RVA de l’INT différée (IMAGE_THUNK_DATA), comme OriginalFirstThunk."),
    F("BoundImportAddressTableRVA", "DWORD", "rva", "RVA de la table d’adresses liées (optionnelle, 0 si absente)."),
    F("UnloadInformationTableRVA", "DWORD", "rva", "RVA d’une copie de l’IAT pour pouvoir décharger la DLL (optionnelle)."),
    F("TimeDateStamp", "DWORD", "time", "Date de la DLL liée, 0 si non liée.")
  ]
};

/* ---------- Ressources ---------- */
S.IMAGE_RESOURCE_DIRECTORY = {
  fam: "res", page: "resources", hdr: "winnt.h",
  desc: "Nœud d’un arbre de ressources à 3 niveaux (Type → Nom/ID → Langue). Il est suivi immédiatement de (NumberOfNamedEntries + NumberOfIdEntries) IMAGE_RESOURCE_DIRECTORY_ENTRY.",
  loc: "DataDirectory[IMAGE_DIRECTORY_ENTRY_RESOURCE] pour la racine ; tous les offsets internes sont relatifs à ce début.",
  fields: [
    F("Characteristics", "DWORD", "res", "Réservé, 0."),
    F("TimeDateStamp", "DWORD", "time", "Date de création de la ressource."),
    F("MajorVersion", "WORD", "ver", "Version majeure."),
    F("MinorVersion", "WORD", "ver", "Version mineure."),
    F("NumberOfNamedEntries", "WORD", "count", "Entrées identifiées par un nom : elles viennent en premier, triées alphabétiquement."),
    F("NumberOfIdEntries", "WORD", "count", "Entrées identifiées par un ID numérique : elles suivent, triées par ID.")
  ]
};
S.IMAGE_RESOURCE_DIRECTORY_ENTRY = {
  fam: "res", page: "resources", hdr: "winnt.h",
  desc: "Une entrée dans un nœud : identifie une ressource (par nom ou ID) et pointe vers un sous-nœud ou vers la donnée.",
  fields: [
    F("Name", "DWORD", "enum", "Bit 31 = NameIsString : si 1, NameOffset (bits 0–30) est l’offset d’une IMAGE_RESOURCE_DIR_STRING_U ; sinon l’Id (16 bits bas) est numérique (RT_*, ID de ressource, ou LANGID au niveau 3).",
      { bits: [["NameOffset", "bits 0–30"], ["NameIsString", "bit 31"], ["Id", "WORD bas"]], v: "resType",
        cRaw: "union {\n        struct {\n            DWORD NameOffset : 31;\n            DWORD NameIsString : 1;\n        } DUMMYSTRUCTNAME;\n        DWORD Name;\n        WORD  Id;\n    } DUMMYUNIONNAME;" }),
    F("OffsetToData", "DWORD", "off", "Bit 31 = DataIsDirectory : si 1, OffsetToDirectory (bits 0–30) = offset d’un sous-nœud ; sinon offset d’un IMAGE_RESOURCE_DATA_ENTRY. Offsets relatifs au début du répertoire de ressources.",
      { bits: [["OffsetToDirectory", "bits 0–30"], ["DataIsDirectory", "bit 31"]],
        cRaw: "union {\n        DWORD OffsetToData;\n        struct {\n            DWORD OffsetToDirectory : 31;\n            DWORD DataIsDirectory : 1;\n        } DUMMYSTRUCTNAME2;\n    } DUMMYUNIONNAME2;" })
  ]
};
S.IMAGE_RESOURCE_DIR_STRING_U = {
  fam: "res", page: "resources", hdr: "winnt.h",
  desc: "Nom d’une ressource, en UTF-16, non terminé par 0.",
  fields: [
    F("Length", "WORD", "count", "Nombre de caractères (WCHAR), pas d’octets."),
    F("NameString", "WCHAR", "str", "Les caractères UTF-16.", { c: 1, vs: true })
  ]
};
S.IMAGE_RESOURCE_DATA_ENTRY = {
  fam: "res", page: "resources", hdr: "winnt.h",
  desc: "Feuille de l’arbre : localise les octets de la ressource.",
  fields: [
    F("OffsetToData", "DWORD", "rva", "⚠ Une vraie RVA (pas un offset relatif à la section de ressources, contrairement aux entrées de répertoire)."),
    F("Size", "DWORD", "size", "Taille des données."),
    F("CodePage", "DWORD", "misc", "Code page utilisée pour décoder les données (souvent 0)."),
    F("Reserved", "DWORD", "res", "Réservé, 0.")
  ]
};

/* ---------- Exceptions (x64) ---------- */
S.IMAGE_RUNTIME_FUNCTION_ENTRY = {
  fam: "exc", page: "exception", hdr: "winnt.h (x64)",
  desc: "Entrée de la table d’exceptions x64 (.pdata) : une par fonction, triées par BeginAddress. Permet de dérouler la pile sans frame pointer. Le PE32 (x86) n’en a pas : son SEH est basé sur la pile.",
  loc: "DataDirectory[IMAGE_DIRECTORY_ENTRY_EXCEPTION] : tableau de Size/12 entrées.",
  fields: [
    F("BeginAddress", "DWORD", "rva", "RVA du début de la fonction."),
    F("EndAddress", "DWORD", "rva", "RVA de la fin de la fonction."),
    F("UnwindInfoAddress", "DWORD", "rva", "RVA d’une structure UNWIND_INFO. Union avec UnwindData.", { alt: ["UnwindData"], to: "UNWIND_INFO" })
  ]
};
S.UNWIND_INFO = {
  fam: "exc", page: "exception", hdr: "winnt.h (x64)",
  desc: "Informations de déroulement pour une fonction (taille du prologue, registres sauvegardés…). Suivie des UNWIND_CODE puis, selon Flags, de l’adresse d’un handler d’exception.",
  fields: [
    F("Version", "BYTE", "ver", "Bits 0–2 : version (1 ou 2).", { bits: [["Version", "bits 0–2"], ["Flags", "bits 3–7"]], v: "unwindFlags",
      cRaw: "BYTE Version : 3;\n    BYTE Flags : 5;" }),
    F("SizeOfProlog", "BYTE", "size", "Taille du prologue en octets."),
    F("CountOfCodes", "BYTE", "count", "Nombre d’UNWIND_CODE (2 octets chacun) qui suivent."),
    F("FrameRegister", "BYTE", "misc", "Bits 0–3 : registre de frame (0 = aucun) ; bits 4–7 : FrameOffset (×16).", { bits: [["FrameRegister", "bits 0–3"], ["FrameOffset", "bits 4–7"]],
      cRaw: "BYTE FrameRegister : 4;\n    BYTE FrameOffset : 4;" }),
    F("UnwindCode", "WORD", "misc", "UNWIND_CODE[CountOfCodes] : opérations à rejouer à l’envers (push registre, alloc pile…).", { c: 1, vs: true })
  ]
};

/* ---------- Security ---------- */
S.WIN_CERTIFICATE = {
  fam: "cert", page: "security", hdr: "WinTrust.h / winnt.h",
  desc: "Enveloppe d’une signature Authenticode (ou d’un certificat). Stockée après les sections (overlay) : le loader ne la mappe pas en mémoire.",
  loc: "DataDirectory[IMAGE_DIRECTORY_ENTRY_SECURITY] — VirtualAddress est un OFFSET FICHIER. Chaque certificat est aligné sur 8 octets.",
  fields: [
    F("dwLength", "DWORD", "size", "Taille de l’entrée complète (en-tête de 8 octets + certificat), hors bourrage d’alignement."),
    F("wRevision", "WORD", "enum", "Version de la structure (0x0200 en pratique).", { v: "certRev" }),
    F("wCertificateType", "WORD", "enum", "Type de certificat (0x0002 = PKCS#7 SignedData pour Authenticode).", { v: "certType" }),
    F("bCertificate", "BYTE", "misc", "Le certificat lui-même (DER), longueur variable.", { c: 1, vs: true })
  ]
};

/* ---------- Relocations ---------- */
S.IMAGE_BASE_RELOCATION = {
  fam: "reloc", page: "reloc", hdr: "winnt.h",
  desc: "En-tête d’un bloc de relocations : couvre une page de 4 Ko. Suivi de (SizeOfBlock − 8) / 2 entrées de 16 bits : 4 bits de type + 12 bits d’offset dans la page.",
  loc: "DataDirectory[IMAGE_DIRECTORY_ENTRY_BASERELOC] : enchaînement de blocs, fin quand on a consommé Size octets.",
  fields: [
    F("VirtualAddress", "DWORD", "rva", "RVA de la page concernée (multiple de 0x1000)."),
    F("SizeOfBlock", "DWORD", "size", "Taille du bloc, en-tête de 8 octets inclus (et alignée sur 4)."),
    F("TypeOffset", "WORD", "enum", "Entrées de 16 bits : bits 12–15 = type (IMAGE_REL_BASED_*), bits 0–11 = offset dans la page.", { c: 1, vs: true, v: "relocType",
      bits: [["Type", "bits 12–15"], ["Offset", "bits 0–11"]] })
  ]
};

/* ---------- Debug ---------- */
S.IMAGE_DEBUG_DIRECTORY = {
  fam: "debug", page: "debug", hdr: "winnt.h",
  desc: "Entrée du répertoire de debug. Tableau de Size/28 entrées. La plus utile : CODEVIEW, qui donne le GUID et le chemin du .pdb.",
  loc: "DataDirectory[IMAGE_DIRECTORY_ENTRY_DEBUG] (RVA).",
  fields: [
    F("Characteristics", "DWORD", "res", "Réservé, 0."),
    F("TimeDateStamp", "DWORD", "time", "Date de création de l’info de debug."),
    F("MajorVersion", "WORD", "ver", "Version majeure du format."),
    F("MinorVersion", "WORD", "ver", "Version mineure du format."),
    F("Type", "DWORD", "enum", "Type d’information de debug.", { v: "debugType" }),
    F("SizeOfData", "DWORD", "size", "Taille des données de debug."),
    F("AddressOfRawData", "DWORD", "rva", "RVA des données quand elles sont mappées en mémoire (0 sinon)."),
    F("PointerToRawData", "DWORD", "off", "OFFSET FICHIER des données (toujours renseigné).")
  ]
};
S.GUID = {
  fam: "debug", page: "debug", hdr: "guiddef.h",
  desc: "Identifiant 128 bits. Dans le CodeView PDB70 il identifie de façon unique la version du .pdb associée.",
  fields: [
    F("Data1", "DWORD", "misc", "Premiers 32 bits."), F("Data2", "WORD", "misc", "16 bits suivants."),
    F("Data3", "WORD", "misc", "16 bits suivants."), F("Data4", "BYTE", "misc", "8 derniers octets.", { c: 8 })
  ]
};
S.CV_INFO_PDB70 = {
  fam: "debug", page: "debug", hdr: "cvinfo.h (hors windows.h)",
  desc: "Contenu d’une entrée de debug de type CODEVIEW (PDB 7.0) : de quoi retrouver le .pdb sur un serveur de symboles (GUID + Age).",
  fields: [
    F("CvSignature", "DWORD", "magic", "« RSDS » (0x53445352)."),
    F("Signature", "GUID", "struct", "GUID du PDB."),
    F("Age", "DWORD", "count", "Incrémenté à chaque mise à jour du PDB."),
    F("PdbFileName", "CHAR", "str", "Chemin du .pdb, ASCIIZ UTF-8.", { c: 1, vs: true })
  ]
};

/* ---------- TLS ---------- */
S.IMAGE_TLS_DIRECTORY = {
  name: ["IMAGE_TLS_DIRECTORY32", "IMAGE_TLS_DIRECTORY64"], fam: "tls", page: "tls", hdr: "winnt.h",
  desc: "Thread Local Storage statique (__declspec(thread)). ⚠ Les quatre premiers champs sont des VA (pas des RVA) : ils sont corrigés par les relocations.",
  loc: "DataDirectory[IMAGE_DIRECTORY_ENTRY_TLS].",
  fields: [
    F("StartAddressOfRawData", PTR, "va", "VA du début du modèle de données TLS, copié pour chaque thread."),
    F("EndAddressOfRawData", PTR, "va", "VA de la fin du modèle."),
    F("AddressOfIndex", PTR, "va", "VA d’un DWORD où le loader écrit l’index TLS de ce module."),
    F("AddressOfCallBacks", PTR, "va", "VA d’un tableau de PIMAGE_TLS_CALLBACK terminé par NULL (sans callback : pointe vers un seul mot à 0) : exécutés AVANT le point d’entrée. Reason = DLL_PROCESS_ATTACH, THREAD_ATTACH…", { v: "tlsReason" }),
    F("SizeOfZeroFill", "DWORD", "size", "Octets à zéro à ajouter après le modèle."),
    F("Characteristics", "DWORD", "flags", "Contient en pratique l’alignement (IMAGE_SCN_ALIGN_*) dans les bits 20–23.")
  ]
};

/* ---------- Load config ---------- */
S.IMAGE_LOAD_CONFIG_DIRECTORY = {
  name: ["IMAGE_LOAD_CONFIG_DIRECTORY32", "IMAGE_LOAD_CONFIG_DIRECTORY64"], fam: "cfg", page: "loadcfg", hdr: "winnt.h",
  desc: "Paramètres de sécurité et de chargement : /GS cookie, SafeSEH, Control Flow Guard… La structure grandit à chaque version de Windows : Size indique ce qui est présent. Ici, les champs jusqu’à GuardLongJumpTargetCount, comme dans la doc Microsoft (d’autres suivent dans les SDK récents : CHPE, DynamicValueRelocTable, XFG…).",
  loc: "DataDirectory[IMAGE_DIRECTORY_ENTRY_LOAD_CONFIG]. Taille attendue de 64 octets en x86 pour la compatibilité avec Windows XP (ancienne version).",
  fields: [
    F("Size", "DWORD", "size", "Taille de la structure telle que le linker l’a écrite (nommée Characteristics, « inutilisé », dans la spec MS : même position)."),
    F("TimeDateStamp", "DWORD", "time", "Date."),
    F("MajorVersion", "WORD", "ver", "Version majeure."),
    F("MinorVersion", "WORD", "ver", "Version mineure."),
    F("GlobalFlagsClear", "DWORD", "flags", "Flags globaux (NtGlobalFlag) à effacer."),
    F("GlobalFlagsSet", "DWORD", "flags", "Flags globaux à activer."),
    F("CriticalSectionDefaultTimeout", "DWORD", "misc", "Timeout par défaut des sections critiques."),
    F("DeCommitFreeBlockThreshold", PTR, "size", "Seuil de décommit des blocs libres du tas."),
    F("DeCommitTotalFreeThreshold", PTR, "size", "Seuil de décommit total du tas."),
    F("LockPrefixTable", PTR, "va", "VA de la table des préfixes LOCK (x86 uniquement, obsolète)."),
    F("MaximumAllocationSize", PTR, "size", "Taille maximale d’allocation."),
    F("VirtualMemoryThreshold", PTR, "size", "Seuil mémoire virtuelle."),
    F("ProcessAffinityMask", PTR, "flags", "Masque d’affinité par défaut."),
    F("ProcessHeapFlags", "DWORD", "flags", "Flags du tas du processus."),
    F("CSDVersion", "WORD", "ver", "Service pack."),
    F("DependentLoadFlags", "WORD", "flags", "Flags de LoadLibraryEx pour les dépendances."),
    F("EditList", PTR, "va", "Réservé."),
    F("SecurityCookie", PTR, "va", "VA du cookie /GS (__security_cookie)."),
    F("SEHandlerTable", PTR, "va", "VA de la table SafeSEH (x86 uniquement)."),
    F("SEHandlerCount", PTR, "count", "Nombre de handlers SafeSEH."),
    F("GuardCFCheckFunctionPointer", PTR, "va", "VA du pointeur de la fonction de vérification CFG."),
    F("GuardCFDispatchFunctionPointer", PTR, "va", "VA du pointeur de la fonction de dispatch CFG."),
    F("GuardCFFunctionTable", PTR, "va", "VA de la table des cibles d’appels indirects valides (RVA triées)."),
    F("GuardCFFunctionCount", PTR, "count", "Nombre d’entrées de GuardCFFunctionTable."),
    F("GuardFlags", "DWORD", "flags", "Options CFG.", { v: "guardFlags" }),
    F("CodeIntegrity", "IMAGE_LOAD_CONFIG_CODE_INTEGRITY", "struct", "Informations d’intégrité du code (12 octets)."),
    F("GuardAddressTakenIatEntryTable", PTR, "va", "VA de la table CFG des entrées d’IAT dont l’adresse est prise."),
    F("GuardAddressTakenIatEntryCount", PTR, "count", "Nombre de RVA uniques dans cette table."),
    F("GuardLongJumpTargetTable", PTR, "va", "VA de la table CFG des cibles de longjmp."),
    F("GuardLongJumpTargetCount", PTR, "count", "Nombre de RVA uniques dans cette table.")
  ]
};
S.IMAGE_LOAD_CONFIG_CODE_INTEGRITY = {
  fam: "cfg", page: "loadcfg", hdr: "winnt.h",
  desc: "Sous-structure de 12 octets de la Load Config : liaison avec les catalogues de signature.",
  fields: [
    F("Flags", "WORD", "flags", "Flags d’intégrité du code."),
    F("Catalog", "WORD", "misc", "Indice du catalogue de signature."),
    F("CatalogOffset", "DWORD", "off", "Offset du catalogue."),
    F("Reserved", "DWORD", "res", "Réservé.")
  ]
};

/* ---------- .NET ---------- */
S.IMAGE_COR20_HEADER = {
  fam: "clr", page: "clr", hdr: "corhdr.h",
  desc: "En-tête CLR d’un assembly .NET. Il pointe vers les métadonnées (racine « BSJB ») et indique l’entry point managé. Un binaire .NET reste un PE valide avec un petit stub natif.",
  loc: "DataDirectory[IMAGE_DIRECTORY_ENTRY_COM_DESCRIPTOR].",
  fields: [
    F("cb", "DWORD", "size", "Taille de la structure (0x48)."),
    F("MajorRuntimeVersion", "WORD", "ver", "Version minimale du CLR requise (majeure)."),
    F("MinorRuntimeVersion", "WORD", "ver", "Version minimale du CLR requise (mineure)."),
    F("MetaData", "IMAGE_DATA_DIRECTORY", "struct", "Métadonnées (tables, streams #~ #Strings #US #GUID #Blob)."),
    F("Flags", "DWORD", "flags", "ILONLY, 32BITREQUIRED, STRONGNAMESIGNED…", { v: "corFlags" }),
    F("EntryPointToken", "DWORD", "misc", "Token de la méthode d’entrée managée (ou RVA si NATIVE_ENTRYPOINT). Union avec EntryPointRVA.", { alt: ["EntryPointRVA"] }),
    F("Resources", "IMAGE_DATA_DIRECTORY", "struct", "Ressources managées."),
    F("StrongNameSignature", "IMAGE_DATA_DIRECTORY", "struct", "Signature de nom fort."),
    F("CodeManagerTable", "IMAGE_DATA_DIRECTORY", "struct", "Réservé."),
    F("VTableFixups", "IMAGE_DATA_DIRECTORY", "struct", "Fixups de vtable (C++/CLI)."),
    F("ExportAddressTableJumps", "IMAGE_DATA_DIRECTORY", "struct", "Sauts d’export (réservé)."),
    F("ManagedNativeHeader", "IMAGE_DATA_DIRECTORY", "struct", "En-tête d’image native précompilée (NGEN/R2R).")
  ]
};

/* ---------- Debug : FPO ---------- */
S.FPO_DATA = {
  fam: "debug", page: "debug", hdr: "winnt.h",
  desc: "Entrée FPO (Frame Pointer Omission) : tableau, une par fonction, quand IMAGE_DEBUG_DIRECTORY.Type = FPO. Les fonctions sans entrée sont supposées avoir un frame standard.",
  fields: [
    F("ulOffStart", "DWORD", "off", "Offset du premier octet de la fonction."),
    F("cbProcSize", "DWORD", "size", "Taille de la fonction en octets."),
    F("cdwLocals", "DWORD", "size", "Taille des variables locales, en DWORD (octets / 4)."),
    F("cdwParams", "WORD", "size", "Taille des paramètres, en DWORD (octets / 4)."),
    F("cbProlog", "WORD", "flags", "Mot de bits : taille du prologue, registres sauvés, SEH, EBP utilisé, type de frame (FRAME_FPO 0, FRAME_TRAP 1, FRAME_TSS 2).",
      { bits: [["cbProlog", "bits 0–7"], ["cbRegs", "bits 8–10"], ["fHasSEH", "bit 11"], ["fUseBP", "bit 12"], ["reserved", "bit 13"], ["cbFrame", "bits 14–15"]],
        cRaw: "WORD cbProlog : 8;\n    WORD cbRegs : 3;\n    WORD fHasSEH : 1;\n    WORD fUseBP : 1;\n    WORD reserved : 1;\n    WORD cbFrame : 2;" })
  ]
};

/* ---------- COFF : relocations, numéros de ligne, symboles ---------- */
S.IMAGE_RELOCATION = {
  fam: "coff", page: "coffreloc", hdr: "winnt.h", pack: 2,
  desc: "Relocation COFF d’un fichier objet : dit au linker comment patcher les octets d’une section une fois placée. Les images n’en ont pas (elles ont la table BaseReloc à la place). Structure packée sur 2 octets : 10 octets.",
  loc: "Tableau de NumberOfRelocations entrées à PointerToRelocations (en-tête de section).",
  fields: [
    F("VirtualAddress", "DWORD", "rva", "Adresse de l’élément à patcher : offset dans la section + RVA de la section (0 pour les compilateurs). Union avec RelocCount (si IMAGE_SCN_LNK_NRELOC_OVFL).", { alt: ["RelocCount"] }),
    F("SymbolTableIndex", "DWORD", "count", "Indice (base 0) du symbole dont l’adresse sert à la relocation.", { to: "IMAGE_SYMBOL" }),
    F("Type", "WORD", "enum", "Type de relocation — dépend de la machine (voir la page Constantes : x64 et i386).", { v: "coffRelAmd64" })
  ]
};
S.IMAGE_LINENUMBER = {
  fam: "coff", page: "coffreloc", hdr: "winnt.h", pack: 2,
  desc: "Numéro de ligne COFF (obsolète, plus produit). Un enregistrement avec Linenumber = 0 désigne une fonction (index de symbole) ; les suivants donnent (adresse, numéro de ligne).",
  loc: "Tableau de NumberOfLinenumbers entrées à PointerToLinenumbers.",
  fields: [
    F("VirtualAddress", "DWORD", "rva", "Si Linenumber ≠ 0 : RVA du code de la ligne (offset dans la section pour un objet). Si Linenumber = 0 : indice de symbole de la fonction (SymbolTableIndex).", { u: "Type", alt: ["SymbolTableIndex"] }),
    F("Linenumber", "WORD", "count", "Numéro de ligne (base 1, relatif au début de la fonction) ; 0 = l’union désigne une fonction.")
  ]
};
S.IMAGE_SYMBOL = {
  fam: "coff", page: "coffsym", hdr: "winnt.h", pack: 2,
  desc: "Entrée de la table de symboles COFF (18 octets, packée sur 2 octets). Table = tableau de ces records ; chacun peut être suivi de NumberOfAuxSymbols records « auxiliaires » de même taille. Table de chaînes juste après.",
  loc: "PointerToSymbolTable (File Header) : NumberOfSymbols entrées ; la table de chaînes commence à PointerToSymbolTable + NumberOfSymbols × 18.",
  fields: [
    F("ShortName", "BYTE", "str", "Nom du symbole : 8 octets ASCII/UTF-8 complétés par 0 s’il ne dépasse pas 8 caractères. Sinon les 4 premiers octets (Short) valent 0 et les 4 suivants (Long) sont un offset dans la table de chaînes.",
      { c: 8, bits: [["ShortName[8]", "nom court"], ["Short = 0 · Long", "offset table de chaînes"], ["LongName[2]", "variante DWORD[2]"]],
        cRaw: "union {\n        BYTE  ShortName[8];\n        struct {\n            DWORD Short;\n            DWORD Long;\n        } Name;\n        DWORD LongName[2];\n    } N;" }),
    F("Value", "DWORD", "misc", "Valeur associée : dépend de SectionNumber et StorageClass (typiquement une adresse relocalisable)."),
    F("SectionNumber", "SHORT", "enum", "Indice (base 1) dans la table de sections, ou valeur spéciale ≤ 0.", { v: "symSection" }),
    F("Type", "WORD", "enum", "Octet bas = type de base ; octet haut = type dérivé. Les outils Microsoft ne mettent que 0x20 (fonction) ou 0x0.", { v: "symType" }),
    F("StorageClass", "BYTE", "enum", "Classe de stockage. Les outils Microsoft n’utilisent que EXTERNAL (2), STATIC (3), FUNCTION (101) et FILE (103).", { v: "symClass" }),
    F("NumberOfAuxSymbols", "BYTE", "count", "Nombre de records auxiliaires qui suivent immédiatement.")
  ]
};
const AUXH = "winnt.h — variante de l’union IMAGE_AUX_SYMBOL";
S.AUX_FUNCTION_DEF = {
  fam: "coff", page: "coffsym", hdr: AUXH, pack: 2,
  desc: "Aux. format 1 — Définition de fonction. Suit un symbole EXTERNAL, Type = 0x20 (fonction) et SectionNumber > 0.",
  fields: [
    F("TagIndex", "DWORD", "count", "Indice du symbole « .bf » (begin function) correspondant."),
    F("TotalSize", "DWORD", "size", "Taille du code de la fonction."),
    F("PointerToLinenumber", "DWORD", "off", "Offset fichier du premier IMAGE_LINENUMBER de la fonction (0 si aucun).", { to: "IMAGE_LINENUMBER" }),
    F("PointerToNextFunction", "DWORD", "count", "Indice du symbole de la fonction suivante (0 si dernière)."),
    F("Unused", "WORD", "res", "Inutilisé.")
  ]
};
S.AUX_BF_EF = {
  fam: "coff", page: "coffsym", hdr: AUXH, pack: 2,
  desc: "Aux. format 2 — Symboles « .bf » et « .ef » (début/fin de fonction, classe FUNCTION). Pas pour « .lf ».",
  fields: [
    F("Unused", "DWORD", "res", "Inutilisé."),
    F("Linenumber", "WORD", "count", "Numéro de ligne source (1, 2, 3…) correspondant au .bf ou .ef."),
    F("Unused2", "BYTE", "res", "Inutilisé.", { c: 6 }),
    F("PointerToNextFunction", "DWORD", "count", "(.bf seulement) Indice du prochain symbole .bf, 0 si dernier."),
    F("Unused3", "WORD", "res", "Inutilisé.")
  ]
};
S.AUX_WEAK_EXTERNAL = {
  fam: "coff", page: "coffsym", hdr: AUXH, pack: 2,
  desc: "Aux. format 3 — Weak external : si sym1 n’est pas défini à l’édition de liens, les références vont à sym2. Suit un symbole EXTERNAL / UNDEF / Value = 0.",
  fields: [
    F("TagIndex", "DWORD", "count", "Indice de sym2, le symbole de repli."),
    F("Characteristics", "DWORD", "enum", "Comportement de recherche (NOLIBRARY / LIBRARY / ALIAS). Absent de winnt.h, qui y met TotalSize.", { v: "weakExt" }),
    F("Unused", "BYTE", "res", "Inutilisé.", { c: 10 })
  ]
};
S.AUX_FILE = {
  fam: "coff", page: "coffsym", hdr: AUXH, pack: 2,
  desc: "Aux. format 4 — Fichier source. Suit un symbole « .file » de classe FILE (103). Un nom plus long que 18 octets utilise plusieurs records.",
  fields: [ F("Name", "CHAR", "str", "Nom du fichier source (ANSI), complété par des 0.", { c: 18 }) ]
};
S.AUX_SECTION_DEF = {
  fam: "coff", page: "coffsym", hdr: AUXH, pack: 2,
  desc: "Aux. format 5 — Définition de section. Suit un symbole portant le nom d’une section (.text…) de classe STATIC ; recopie une partie de l’en-tête de section.",
  fields: [
    F("Length", "DWORD", "size", "Taille des données (= SizeOfRawData)."),
    F("NumberOfRelocations", "WORD", "count", "Nombre de relocations de la section."),
    F("NumberOfLinenumbers", "WORD", "count", "Nombre de numéros de ligne."),
    F("CheckSum", "DWORD", "chk", "Checksum des données communes (si IMAGE_SCN_LNK_COMDAT)."),
    F("Number", "WORD", "count", "Indice (base 1) de la section associée — utilisé si Selection = ASSOCIATIVE."),
    F("Selection", "BYTE", "enum", "Règle de résolution COMDAT.", { v: "comdat" }),
    F("Unused", "BYTE", "res", "Inutilisé.", { c: 3 })
  ]
};
S.AUX_CLR_TOKEN = {
  fam: "coff", page: "coffsym", hdr: AUXH, pack: 2,
  desc: "Définition de token CLR (objets .NET). Suit un symbole de classe CLR_TOKEN (107).",
  fields: [
    F("bAuxType", "BYTE", "enum", "Doit valoir IMAGE_AUX_SYMBOL_TYPE_TOKEN_DEF (1)."),
    F("bReserved", "BYTE", "res", "Réservé, 0."),
    F("SymbolTableIndex", "DWORD", "count", "Indice du symbole COFF concerné par ce token."),
    F("Reserved", "BYTE", "res", "Réservé, 0.", { c: 12 })
  ]
};

/* ---------- Archives .lib ---------- */
S.IMAGE_ARCHIVE_MEMBER_HEADER = {
  fam: "lib", page: "archive", hdr: "winnt.h",
  desc: "En-tête de chaque membre d’une archive .lib (60 octets, tout en texte ASCII complété par des espaces, sans 0 final). Chaque en-tête commence à une adresse paire (un « \\n » de bourrage peut être inséré).",
  loc: "Après la signature « !<arch>\\n » (IMAGE_ARCHIVE_START, 8 octets), puis après chaque membre.",
  fields: [
    F("Name", "BYTE", "str", "Nom du membre terminé par « / ». « / » = membre linker, « // » = membre longnames, « /n » = nom à l’offset décimal n dans longnames.", { c: 16 }),
    F("Date", "BYTE", "time", "Date de création : secondes depuis 1970, en décimal ASCII.", { c: 12 }),
    F("UserID", "BYTE", "res", "User ID décimal — que des espaces avec les outils Microsoft.", { c: 6 }),
    F("GroupID", "BYTE", "res", "Group ID décimal — que des espaces avec les outils Microsoft.", { c: 6 }),
    F("Mode", "BYTE", "flags", "Mode du fichier en octal ASCII (st_mode de _wstat).", { c: 8 }),
    F("Size", "BYTE", "size", "Taille du membre en décimal ASCII, sans l’en-tête.", { c: 10 }),
    F("EndHeader", "BYTE", "magic", "« `\\n » = 0x60 0x0A (IMAGE_ARCHIVE_END).", { c: 2 })
  ]
};
S.ARCHIVE_FIRST_LINKER_MEMBER = {
  fam: "lib", page: "archive", hdr: "non documentée dans winnt.h — spécifiée dans la doc PE", noEncode: true,
  desc: "Premier membre linker (Name = « / »). Conservé pour la compatibilité, non utilisé par les linkers actuels, mais doit être correct. Les nombres y sont en BIG-ENDIAN.",
  fields: [
    F("NumberOfSymbols", "DWORD", "count", "Nombre de symboles indexés (big-endian)."),
    F("Offsets", "DWORD", "off", "Pour chaque symbole : offset fichier de l’en-tête du membre qui le définit, en ordre croissant (big-endian).", { c: 1, vs: true }),
    F("StringTable", "CHAR", "str", "Noms des symboles : chaînes ASCIIZ consécutives, dans le même ordre.", { c: 1, vs: true })
  ]
};
S.ARCHIVE_SECOND_LINKER_MEMBER = {
  fam: "lib", page: "archive", hdr: "non documentée dans winnt.h — spécifiée dans la doc PE", noEncode: true,
  desc: "Second membre linker (Name = « / »), celui que les linkers utilisent : symboles triés par ordre lexical, nombres en little-endian.",
  fields: [
    F("NumberOfMembers", "DWORD", "count", "Nombre de membres de l’archive."),
    F("Offsets", "DWORD", "off", "Offsets fichier des en-têtes de membres, croissants (m entrées).", { c: 1, vs: true }),
    F("NumberOfSymbols", "DWORD", "count", "Nombre de symboles indexés."),
    F("Indices", "WORD", "count", "Pour chaque symbole : indice (base 1) dans Offsets du membre qui le contient.", { c: 1, vs: true }),
    F("StringTable", "CHAR", "str", "Noms des symboles ASCIIZ, en ordre lexical croissant.", { c: 1, vs: true })
  ]
};
S.IMPORT_OBJECT_HEADER = {
  fam: "lib", page: "archive", hdr: "winnt.h",
  desc: "En-tête d’un membre d’import « court » d’une bibliothèque d’import (.lib de DLL). Suivi de deux chaînes ASCIIZ : nom du symbole importé puis nom de la DLL. Suffisant pour reconstruire la section .idata.",
  fields: [
    F("Sig1", "WORD", "magic", "Doit valoir IMAGE_FILE_MACHINE_UNKNOWN (0).", { s: 0 }),
    F("Sig2", "WORD", "magic", "Doit valoir 0xFFFF (IMPORT_OBJECT_HDR_SIG2).", { s: 0xFFFF }),
    F("Version", "WORD", "ver", "Version de la structure."),
    F("Machine", "WORD", "enum", "Architecture cible.", { v: "machine" }),
    F("TimeDateStamp", "DWORD", "time", "Date de création."),
    F("SizeOfData", "DWORD", "size", "Taille des chaînes qui suivent l’en-tête."),
    F("Hint", "WORD", "misc", "Ordinal ou hint de l’import selon NameType (ORDINAL ⇒ ordinal ; sinon hint). Union avec Ordinal.", { u: "DUMMYUNIONNAME", alt: ["Ordinal"] }),
    F("Type", "WORD", "enum", "Mot de bits : Type (2 bits : CODE / DATA / CONST), NameType (3 bits : ORDINAL / NAME / NAME_NOPREFIX / NAME_UNDECORATE), Reserved (11 bits, 0).",
      { v: "importType", bits: [["Type", "bits 0–1"], ["NameType", "bits 2–4 (importNameType)"], ["Reserved", "bits 5–15"]],
        cRaw: "WORD Type : 2;\n    WORD NameType : 3;\n    WORD Reserved : 11;" })
  ]
};

/* =========================================================================
   Table des Data Directories : index -> structure -> page
   ========================================================================= */
const DD = [
  [0,  "EXPORT",         "Export Directory",     "IMAGE_EXPORT_DIRECTORY",       "exports",   "RVA"],
  [1,  "IMPORT",         "Import Directory",     "IMAGE_IMPORT_DESCRIPTOR",      "imports",   "RVA"],
  [2,  "RESOURCE",       "Resource Directory",   "IMAGE_RESOURCE_DIRECTORY",     "resources", "RVA"],
  [3,  "EXCEPTION",      "Exception Directory",  "IMAGE_RUNTIME_FUNCTION_ENTRY", "exception", "RVA"],
  [4,  "SECURITY",       "Certificate Table",    "WIN_CERTIFICATE",              "security",  "OFFSET FICHIER"],
  [5,  "BASERELOC",      "Base Relocation Table","IMAGE_BASE_RELOCATION",        "reloc",     "RVA"],
  [6,  "DEBUG",          "Debug Directory",      "IMAGE_DEBUG_DIRECTORY",        "debug",     "RVA"],
  [7,  "ARCHITECTURE",   "Architecture",         null,                           null,        "réservé, 0"],
  [8,  "GLOBALPTR",      "Global Pointer",       null,                           null,        "RVA (IA64), Size = 0"],
  [9,  "TLS",            "TLS Directory",        "IMAGE_TLS_DIRECTORY",          "tls",       "RVA"],
  [10, "LOAD_CONFIG",    "Load Config Directory","IMAGE_LOAD_CONFIG_DIRECTORY",  "loadcfg",   "RVA"],
  [11, "BOUND_IMPORT",   "Bound Import",         "IMAGE_BOUND_IMPORT_DESCRIPTOR","imports",   "RVA"],
  [12, "IAT",            "Import Address Table", "IMAGE_THUNK_DATA",             "imports",   "RVA"],
  [13, "DELAY_IMPORT",   "Delay Import Descriptor","IMAGE_DELAYLOAD_DESCRIPTOR", "delay",     "RVA"],
  [14, "COM_DESCRIPTOR", "CLR Runtime Header",   "IMAGE_COR20_HEADER",           "clr",       "RVA"],
  [15, "(réservé)",      "Réservé",              null,                           null,        "doit valoir 0"]
];

/* =========================================================================
   Pages (onglets). Syntaxe des textes : `code` · **gras** · {{STRUCT}} · {{STRUCT.champ}}
   ========================================================================= */
const GROUPS = [
  { id: "start",   label: "Démarrer" },
  { id: "headers", label: "En-têtes" },
  { id: "dirs",    label: "Data Directories" },
  { id: "coff",    label: "COFF & bibliothèques" },
  { id: "ref",     label: "Référence" }
];

const PAGES = [
  { id: "overview", grp: "start", label: "Vue d’ensemble", fam: null },
  { id: "scene3d", grp: "start", label: "Vue 3D", fam: null },
  { id: "tree", grp: "start", label: "Arbre des structures", fam: null },
  { id: "concepts", grp: "start", label: "RVA · VA · Offset", fam: null },

  { id: "dos", grp: "headers", label: "DOS Hdr", fam: "dos", structs: ["IMAGE_DOS_HEADER"], hexFams: ["dos", "stub"],
    intro: "Le tout premier bloc d’un PE est un en-tête **MS-DOS** de 64 octets, suivi d’un petit programme DOS (le *stub*) qui affiche « This program cannot be run in DOS mode ». Windows ignore presque tout : il lit `e_magic` pour reconnaître le fichier, puis suit `e_lfanew` pour trouver {{IMAGE_NT_HEADERS}}.",
    notes: [
      { t: "tip", h: "À retenir", b: "Sur **64 octets**, seuls **2 champs** comptent : `e_magic` (offset 0x00) et `e_lfanew` (offset 0x3C). Le stub DOS peut être vidé ou remplacé sans que Windows s’en aperçoive." }
    ] },

  { id: "rich", grp: "headers", label: "Rich Hdr", fam: "rich", structs: ["RICH_HEADER", "RICH_ENTRY"], hexFams: ["rich"],
    intro: "Le **Rich Header** n’est pas défini dans `windows.h` : c’est une structure non documentée écrite par le linker Microsoft entre le stub DOS et la signature PE. Elle liste les outils de compilation utilisés. Elle est utile en analyse (empreinte de toolchain) mais **jamais lue par le loader**.",
    notes: [
      { t: "info", h: "Comment calculer la clé XOR", b: "`key = offset de « DanS »` · pour chaque octet `b` d’indice `i` avant « DanS » (en ignorant les 4 octets de `e_lfanew`) : `key += ROL8(b, i)` · puis pour chaque entrée : `key += ROL32(comp.id, count)`. Les DWORD entre « DanS » et « Rich » sont ensuite XORés avec `key`." },
      { t: "tip", h: "Comment le retrouver", b: "Chercher la chaîne « Rich » en partant de `e_lfanew` vers l’arrière ; le DWORD qui suit est la clé. XORer en reculant jusqu’à retomber sur « DanS »." }
    ] },

  { id: "file", grp: "headers", label: "File Hdr", fam: "file", structs: ["IMAGE_NT_HEADERS", "IMAGE_FILE_HEADER"], hexFams: ["nt", "file"],
    intro: "À l’offset `e_lfanew` commence {{IMAGE_NT_HEADERS}} : la signature `PE\\0\\0`, puis {{IMAGE_FILE_HEADER}} (architecture, nombre de sections) et enfin {{IMAGE_OPTIONAL_HEADER}}. C’est le véritable début du format PE.",
    notes: [
      { t: "tip", h: "Retrouver la table des sections", b: "Elle commence **après** l’Optional Header, dont la taille est donnée par `SizeOfOptionalHeader` — pas par une constante :\n`IMAGE_FIRST_SECTION(nt)` = `(BYTE*)&nt->OptionalHeader + nt->FileHeader.SizeOfOptionalHeader`." },
      { t: "warn", h: "Piège", b: "`IMAGE_NT_HEADERS` n’est qu’un **alias** : `IMAGE_NT_HEADERS32` ou `IMAGE_NT_HEADERS64` selon la compilation (`_WIN64`). Lisez `OptionalHeader.Magic` pour savoir ce que contient *réellement* le fichier." }
    ] },

  { id: "optional", grp: "headers", label: "Optional Hdr", fam: "opt", structs: ["IMAGE_OPTIONAL_HEADER", "IMAGE_DATA_DIRECTORY"], hexFams: ["opt", "dd"], ddTable: true,
    intro: "L’**Optional Header** est obligatoire pour toute image. Il contient tout ce dont le loader a besoin : taille de l’image, alignements, point d’entrée, ImageBase… et à la fin, le tableau des **Data Directories** qui mène à toutes les autres tables (imports, exports, relocations…).",
    notes: [
      { t: "warn", h: "PE32 vs PE32+", b: "Utilisez le sélecteur **PE32 / PE32+** en haut : les offsets, les types et la présence de `BaseOfData` changent. Les lignes qui diffèrent sont marquées **≠**." },
      { t: "tip", h: "Valeurs usuelles", b: "`ImageBase` : 0x400000 (EXE x86), 0x10000000 (DLL x86), 0x140000000 (EXE x64), 0x180000000 (DLL x64). `SectionAlignment` 0x1000, `FileAlignment` 0x200." },
      { t: "warn", h: "Validez avant de lire", b: "La taille de l’Optional Header n’est pas fixe : utilisez `SizeOfOptionalHeader` pour vérifier qu’une entrée de DataDirectory tient **entièrement** dedans, et `NumberOfRvaAndSizes` pour vérifier l’indice demandé. Ne supposez pas non plus qu’une RVA de directory pointe au début d’une section ni que la section porte un nom précis. Le PE32+ limite l’image à 2 Go." }
    ] },

  { id: "sections", grp: "headers", label: "Section Hdrs", fam: "sec", structs: ["IMAGE_SECTION_HEADER"], hexFams: ["sec"],
    intro: "La **table des sections** est un tableau de {{IMAGE_SECTION_HEADER}}, une entrée de 40 octets par section. Chaque entrée fait le lien entre deux mondes : l’emplacement des octets **dans le fichier** (`PointerToRawData`, `SizeOfRawData`) et leur emplacement **en mémoire** (`VirtualAddress`, `VirtualSize`).",
    notes: [
      { t: "tip", h: "Convertir RVA → offset fichier", b: "Trouver la section telle que `VirtualAddress ≤ rva < VirtualAddress + VirtualSize`, puis :\n`offset = rva − VirtualAddress + PointerToRawData`. Voir la page « RVA · VA · Offset » pour un convertisseur interactif." },
      { t: "info", h: "Les droits des pages", b: "`MEM_READ` / `MEM_WRITE` / `MEM_EXECUTE` de `Characteristics` deviennent la protection de page de la section (ex. `.text` = RX, `.rdata` = R, `.data` = RW)." }
    ] },

  { id: "exports", grp: "dirs", dd: 0, label: "Exports", fam: "exp", structs: ["IMAGE_EXPORT_DIRECTORY"],
    intro: "Une DLL publie ses fonctions via {{IMAGE_EXPORT_DIRECTORY}}. C’est ce que lit **GetProcAddress**. Les exports sont répartis sur **trois tableaux** parallèles qu’il faut savoir enchaîner.",
    chains: [
      { title: "Résolution par nom — GetProcAddress(hMod, \"CreateFileW\")", items: [
        { s: "IMAGE_EXPORT_DIRECTORY", f: "AddressOfNames" }, { a: "RVA" }, { x: "DWORD[NumberOfNames]", fam: "exp", note: "RVA de noms, triés → recherche dichotomique" }, { a: "RVA" }, { x: "\"CreateFileW\\0\"", fam: "exp", note: "chaîne ASCIIZ, trouvée à l’indice i" } ] },
      { title: "… puis nom → ordinal → adresse", items: [
        { s: "IMAGE_EXPORT_DIRECTORY", f: "AddressOfNameOrdinals" }, { a: "[i]" }, { x: "WORD[NumberOfNames]", fam: "exp", note: "ordinal_index = NameOrdinals[i]" }, { a: "indice" },
        { s: "IMAGE_EXPORT_DIRECTORY", f: "AddressOfFunctions" }, { a: "[ordinal_index]" }, { x: "DWORD[NumberOfFunctions]", fam: "exp", note: "RVA du code (EAT)" }, { a: "+ base" }, { x: "adresse de la fonction", fam: "exp", note: "" } ] },
      { title: "Résolution par ordinal — GetProcAddress(hMod, MAKEINTRESOURCE(n))", items: [
        { x: "ordinal n", fam: "exp", note: "" }, { a: "− Base" }, { s: "IMAGE_EXPORT_DIRECTORY", f: "AddressOfFunctions" }, { a: "[n − Base]" }, { x: "RVA du code", fam: "exp", note: "" } ] }
    ],
    notes: [
      { t: "warn", h: "Forwarders", b: "Si la RVA trouvée dans `AddressOfFunctions` tombe **à l’intérieur** de la plage `[DataDirectory[EXPORT].VirtualAddress, + Size[`, ce n’est pas du code mais une chaîne ASCIIZ `\"AUTREDLL.Fonction\"` (ou `\"AUTREDLL.#12\"`) : il faut charger cette DLL et résoudre la fonction. Exemple : `kernel32!HeapAlloc` → `NTDLL.RtlAllocateHeap`." },
      { t: "info", h: "À savoir", b: "L’ordinal réel d’un export = indice dans `AddressOfFunctions` + `Base`. Une case à 0 signifie « pas d’export à cet ordinal »." }
    ] },

  { id: "imports", grp: "dirs", dd: 1, label: "Imports", fam: "imp",
    structs: ["IMAGE_IMPORT_DESCRIPTOR", "IMAGE_THUNK_DATA", "IMAGE_IMPORT_BY_NAME", "IMAGE_BOUND_IMPORT_DESCRIPTOR", "IMAGE_BOUND_FORWARDER_REF"],
    intro: "Les imports sont la partie qui fait le plus peur — alors qu’elle est très régulière : un **tableau de {{IMAGE_IMPORT_DESCRIPTOR}}** (un par DLL, terminé par un descripteur à zéro), chacun pointant vers **deux tableaux parallèles** de {{IMAGE_THUNK_DATA}} : l’**INT** (quoi importer) et l’**IAT** (où écrire l’adresse).",
    chains: [
      { title: "Qui est la DLL ?", items: [
        { x: "DataDirectory[1]", fam: "dd", note: "IMAGE_DIRECTORY_ENTRY_IMPORT" }, { a: "RVA" }, { x: "IMAGE_IMPORT_DESCRIPTOR[]", fam: "imp", note: "terminé par un descripteur nul" }, { a: "Name (RVA)" }, { x: "\"KERNEL32.dll\\0\"", fam: "imp", note: "→ LoadLibrary récursif" } ] },
      { title: "Quoi importer ? (INT)", items: [
        { s: "IMAGE_IMPORT_DESCRIPTOR", f: "OriginalFirstThunk" }, { a: "RVA" }, { x: "IMAGE_THUNK_DATA[]", fam: "imp", note: "INT, terminé par 0" }, { a: "AddressOfData (RVA), bit fort = 0" }, { s: "IMAGE_IMPORT_BY_NAME", f: "Name" } ] },
      { title: "… ou par ordinal", items: [
        { x: "IMAGE_THUNK_DATA", fam: "imp", note: "bit 31/63 = 1" }, { a: "& 0xFFFF" }, { x: "ordinal", fam: "imp", note: "→ GetProcAddress(dll, MAKEINTRESOURCE(ord))" } ] },
      { title: "Où écrire le résultat ? (IAT)", items: [
        { s: "IMAGE_IMPORT_DESCRIPTOR", f: "FirstThunk" }, { a: "RVA" }, { x: "IMAGE_THUNK_DATA[]", fam: "imp", note: "IAT : même longueur que l’INT" }, { a: "le loader écrit" }, { s: "IMAGE_THUNK_DATA", f: "Function" } ] }
    ],
    notes: [
      { t: "tip", h: "L’algorithme en 5 lignes", b: "Pour chaque descripteur jusqu’au descripteur nul : `LoadLibrary(base + Name)`. Puis pour `i = 0, 1, 2…` jusqu’à ce que `INT[i] == 0` : si le bit fort est à 1 → import par ordinal, sinon `GetProcAddress(dll, ((IMAGE_IMPORT_BY_NAME*)(base + INT[i]))->Name)`. Écrire le résultat dans `IAT[i]`." },
      { t: "warn", h: "Piège", b: "Si `OriginalFirstThunk` vaut 0 (certains packers/linkers), il faut lire l’IAT (`FirstThunk`) à la place, car elle contient alors encore les RVA de noms." },
      { t: "info", h: "Bound imports", b: "L’IAT sur disque peut déjà contenir des adresses (« bound »). Avec ASLR, elles sont ignorées et la résolution est refaite." }
    ] },

  { id: "resources", grp: "dirs", dd: 2, label: "Resources", fam: "res",
    structs: ["IMAGE_RESOURCE_DIRECTORY", "IMAGE_RESOURCE_DIRECTORY_ENTRY", "IMAGE_RESOURCE_DIR_STRING_U", "IMAGE_RESOURCE_DATA_ENTRY"],
    intro: "Les ressources forment un **arbre à 3 niveaux** : *Type* (RT_ICON, RT_MANIFEST…) → *Nom ou ID* → *Langue*. Chaque niveau est un {{IMAGE_RESOURCE_DIRECTORY}} suivi de ses {{IMAGE_RESOURCE_DIRECTORY_ENTRY}}. Les feuilles sont des {{IMAGE_RESOURCE_DATA_ENTRY}}.",
    chains: [
      { title: "Descendre dans l’arbre", items: [
        { x: "DataDirectory[2]", fam: "dd", note: "début R = section de ressources" }, { a: "RVA" },
        { s: "IMAGE_RESOURCE_DIRECTORY", f: "NumberOfIdEntries" }, { a: "niveau 1 : Type" },
        { x: "ENTRY[] (Id = RT_*)", fam: "res", note: "" }, { a: "R + OffsetToDirectory" },
        { x: "DIRECTORY niveau 2", fam: "res", note: "Nom/ID" }, { a: "R + OffsetToDirectory" },
        { x: "DIRECTORY niveau 3", fam: "res", note: "Langue (LANGID)" }, { a: "R + OffsetToData" },
        { s: "IMAGE_RESOURCE_DATA_ENTRY", f: "OffsetToData" }, { a: "RVA !" }, { x: "octets de la ressource", fam: "res", note: "" } ] }
    ],
    notes: [
      { t: "warn", h: "Piège n°1 : trois sortes d’« offset »", b: "Dans les **ENTRY**, `OffsetToData`/`OffsetToDirectory` sont **relatifs au début de la section de ressources** (R). Mais dans {{IMAGE_RESOURCE_DATA_ENTRY}}, `OffsetToData` est une **vraie RVA**. Et le bit 31 d’une entrée signifie « sous-répertoire »." },
      { t: "info", h: "Les ressources ne sont pas chargées par le loader", b: "Elles sont simplement mappées avec le reste de l’image ; ce sont `FindResource` / `LoadResource` qui parcourent l’arbre à la demande." }
    ] },

  { id: "exception", grp: "dirs", dd: 3, label: "Exception", fam: "exc", structs: ["IMAGE_RUNTIME_FUNCTION_ENTRY", "UNWIND_INFO"],
    intro: "Sur **x64**, la gestion d’exceptions est pilotée par des tables (section `.pdata`) et non par des chaînes de frames sur la pile. Chaque fonction non-feuille a une entrée {{IMAGE_RUNTIME_FUNCTION_ENTRY}}, triées par adresse de début, que l’OS parcourt par recherche dichotomique pour dérouler la pile.",
    chains: [
      { title: "Du RIP au handler", items: [
        { x: "DataDirectory[3]", fam: "dd", note: "" }, { a: "RVA" }, { x: "IMAGE_RUNTIME_FUNCTION_ENTRY[]", fam: "exc", note: "trié par BeginAddress" }, { a: "UnwindInfoAddress (RVA)" }, { x: "UNWIND_INFO", fam: "exc", note: "+ UNWIND_CODE[] + handler RVA si EHANDLER/UHANDLER" } ] }
    ] },

  { id: "security", grp: "dirs", dd: 4, label: "Security", fam: "cert", structs: ["WIN_CERTIFICATE"],
    intro: "La signature **Authenticode** est collée **à la fin du fichier** (overlay), hors de toute section. {{WIN_CERTIFICATE}} en est l’enveloppe ; le contenu est un PKCS#7.",
    notes: [
      { t: "warn", h: "La seule exception du lot", b: "Pour cette entrée, `DataDirectory[4].VirtualAddress` est un **offset fichier**, pas une RVA : cette zone n’est jamais mappée en mémoire par le loader." },
      { t: "info", h: "Ce qui est signé", b: "L’empreinte exclut le `CheckSum`, l’entrée Security du Data Directory, et la table de certificats elle-même, pour que la signature puisse être ajoutée sans la casser." },
      { t: "tip", h: "Parcourir la table", b: "`off = DataDirectory[4].VirtualAddress` (offset fichier). Lire un `WIN_CERTIFICATE`, puis `off += (dwLength + 7) & ~7` (alignement sur 8 octets, zéros de bourrage). Recommencer jusqu’à avoir consommé `Size` octets — sinon la table ou `Size` est corrompu. `Size` inclut le bourrage. Alternative : `ImageEnumerateCertificates`." },
      { t: "info", h: "Place dans le fichier", b: "Le certificat et les infos de debug non mappées sont placés **tout à la fin** du fichier, la table de certificats juste avant la section de debug, car le loader ne les mappe pas." }
    ] },

  { id: "reloc", grp: "dirs", dd: 5, label: "BaseReloc", fam: "reloc", structs: ["IMAGE_BASE_RELOCATION"],
    intro: "Quand l’image n’est pas chargée à son `ImageBase`, tous les pointeurs absolus qu’elle contient deviennent faux. La table de relocations liste **où** ils sont, pour leur ajouter `delta = baseRéelle − ImageBase`. Elle est organisée en **blocs de 4 Ko**.",
    chains: [
      { title: "Parcours des blocs", items: [
        { x: "DataDirectory[5]", fam: "dd", note: "" }, { a: "RVA" }, { s: "IMAGE_BASE_RELOCATION", f: "VirtualAddress" }, { a: "+ SizeOfBlock" },
        { x: "WORD[(SizeOfBlock−8)/2]", fam: "reloc", note: "type (4 bits) | offset (12 bits)" }, { a: "bloc suivant = bloc + SizeOfBlock" }, { x: "…jusqu’à Size octets", fam: "reloc", note: "" } ] }
    ],
    notes: [
      { t: "tip", h: "Appliquer une entrée", b: "`entry = TypeOffset[i]` · `type = entry >> 12` · `offset = entry & 0xFFF` · adresse à patcher : `p = base + block->VirtualAddress + offset`.\nPuis selon `type` : `DIR64` → `*(ULONGLONG*)p += delta` ; `HIGHLOW` → `*(DWORD*)p += (DWORD)delta` ; `ABSOLUTE` → ne rien faire (bourrage)." },
      { t: "warn", h: "Piège", b: "Un EXE sans table de relocations porte `IMAGE_FILE_RELOCS_STRIPPED` et ne peut être chargé qu’à son `ImageBase` : si l’adresse n’est pas libre, le loader signale une erreur." },
      { t: "info", h: "Alignement", b: "Chaque bloc commence sur une frontière de 32 bits. Le loader n’est pas obligé d’appliquer les relocations déjà résolues par le linker tant que l’image est chargée à son ImageBase. Le type `HIGHADJ` (4) occupe **deux** entrées : la suivante contient les 16 bits bas." }
    ] },

  { id: "debug", grp: "dirs", dd: 6, label: "Debug", fam: "debug", structs: ["IMAGE_DEBUG_DIRECTORY", "CV_INFO_PDB70", "GUID", "FPO_DATA"],
    intro: "Le répertoire de debug est un **tableau** de {{IMAGE_DEBUG_DIRECTORY}} (28 octets chacun). L’entrée la plus connue, de type `CODEVIEW`, contient le GUID et le chemin du `.pdb` : c’est avec elle que les débogueurs trouvent les symboles.",
    chains: [
      { title: "Retrouver le PDB", items: [
        { x: "DataDirectory[6]", fam: "dd", note: "" }, { a: "RVA" }, { x: "IMAGE_DEBUG_DIRECTORY[Size/28]", fam: "debug", note: "chercher Type = CODEVIEW" }, { a: "PointerToRawData (offset fichier)" },
        { s: "CV_INFO_PDB70", f: "CvSignature" }, { a: "« RSDS » → GUID + Age + chemin" } ] }
    ] },

  { id: "tls", grp: "dirs", dd: 9, label: "TLS", fam: "tls", structs: ["IMAGE_TLS_DIRECTORY"],
    intro: "Le TLS statique permet les variables `__declspec(thread)`. Particularité très utilisée en sécurité : les **callbacks TLS** s’exécutent **avant** le point d’entrée, dès le chargement.",
    chains: [
      { title: "Les callbacks", items: [
        { x: "DataDirectory[9]", fam: "dd", note: "" }, { a: "RVA" }, { x: "IMAGE_TLS_DIRECTORY", fam: "tls", note: "" }, { a: "AddressOfCallBacks (VA !)" },
        { x: "PIMAGE_TLS_CALLBACK[]", fam: "tls", note: "terminé par NULL" }, { a: "appel" }, { x: "VOID NTAPI cb(PVOID DllHandle, DWORD Reason, PVOID Reserved)", fam: "tls", note: "" } ] }
    ],
    notes: [
      { t: "warn", h: "VA, pas RVA", b: "`StartAddressOfRawData`, `EndAddressOfRawData`, `AddressOfIndex` et `AddressOfCallBacks` sont des **adresses virtuelles absolues** : elles figurent donc dans la table de relocations. Pour lire le tableau de callbacks : `base + (AddressOfCallBacks − ImageBase)`." }
    ] },

  { id: "loadcfg", grp: "dirs", dd: 10, label: "Load Config", fam: "cfg", structs: ["IMAGE_LOAD_CONFIG_DIRECTORY", "IMAGE_LOAD_CONFIG_CODE_INTEGRITY"],
    intro: "{{IMAGE_LOAD_CONFIG_DIRECTORY}} regroupe les options de sécurité du module : **cookie /GS**, **SafeSEH** (x86), **Control Flow Guard**… Elle est extensible, c’est pourquoi son premier champ est sa taille.",
    notes: [
      { t: "tip", h: "Lire en sécurité", b: "Ne lisez un champ que s’il se trouve **avant** `Size` : `if (offsetof(…, GuardFlags) + sizeof(DWORD) <= cfg->Size)`." },
      { t: "warn", h: "Tous les pointeurs sont des VA", b: "`SecurityCookie`, `SEHandlerTable`, `GuardCFFunctionTable`… sont des VA absolues (relocalisées). Les tables CFG, elles, contiennent des RVA." }
    ] },

  { id: "delay", grp: "dirs", dd: 13, label: "Delay Imports", fam: "imp", structs: ["IMAGE_DELAYLOAD_DESCRIPTOR"],
    intro: "Les **imports différés** reprennent la logique des imports classiques, mais la DLL n’est chargée qu’au **premier appel** d’une de ses fonctions, grâce à un stub qui appelle `__delayLoadHelper2`. Le loader ne les traite pas au chargement.",
    notes: [
      { t: "info", h: "Même structure, autre moment", b: "`ImportNameTableRVA` joue le rôle d’`OriginalFirstThunk` et `ImportAddressTableRVA` celui de `FirstThunk`. Les champs sont des RVA si `Attributes.RvaBased = 1` ; des VA dans l’ancien format." }
    ] },

  { id: "clr", grp: "dirs", dd: 14, label: ".NET (CLR)", fam: "clr", structs: ["IMAGE_COR20_HEADER"],
    intro: "Un assembly .NET est un PE valide : l’entrée COM_DESCRIPTOR pointe vers {{IMAGE_COR20_HEADER}}, qui à son tour mène aux **métadonnées** (racine « BSJB », avec les streams `#~`, `#Strings`, `#US`, `#GUID`, `#Blob`).",
    chains: [
      { title: "Vers les métadonnées", items: [
        { x: "DataDirectory[14]", fam: "dd", note: "" }, { a: "RVA" }, { x: "IMAGE_COR20_HEADER", fam: "clr", note: "" }, { a: "MetaData (RVA + Size)" }, { x: "« BSJB » + streams", fam: "clr", note: "" } ] }
    ] },

  { id: "coffsym", grp: "coff", label: "COFF Symbols", fam: "coff",
    structs: ["IMAGE_SYMBOL", "AUX_FUNCTION_DEF", "AUX_BF_EF", "AUX_WEAK_EXTERNAL", "AUX_FILE", "AUX_SECTION_DEF", "AUX_CLR_TOKEN"],
    intro: "La **table de symboles COFF** vient des fichiers objet (`.obj`) ; une image n’en a plus (`PointerToSymbolTable` = 0, débogage COFF déprécié). C’est un tableau de {{IMAGE_SYMBOL}} de 18 octets, chacun pouvant être suivi de records **auxiliaires** de même taille dont le format dépend de la classe de stockage. Elle est suivie de la table de chaînes.",
    chains: [
      { title: "Lire un nom de symbole", items: [
        { s: "IMAGE_SYMBOL", f: "ShortName" }, { a: "4 premiers octets = 0 ?" }, { x: "Long (DWORD)", fam: "coff", note: "offset dans la table de chaînes" }, { a: "+ début table de chaînes" }, { x: "chaîne ASCIIZ", fam: "coff", note: "table = PointerToSymbolTable + NumberOfSymbols × 18" } ] }
    ],
    notes: [
      { t: "info", h: "Table de chaînes COFF", b: "Juste après les symboles : un DWORD donnant la taille totale du bloc (**incluant ces 4 octets** : vaut 4 si vide), puis les chaînes ASCIIZ pointées par les symboles (et par les noms de section « /n » dans un objet)." },
      { t: "tip", h: "Ce que les outils Microsoft produisent", b: "Seulement 4 classes de stockage : `EXTERNAL` (2), `STATIC` (3), `FUNCTION` (101) et `FILE` (103), et `Type` ∈ {0x00, 0x20}. Les infos de types viennent de CodeView dans `.debug$S`. Un lecteur doit **ignorer** les records auxiliaires qu’il ne connaît pas." }
    ] },
  { id: "coffreloc", grp: "coff", label: "COFF Relocs & Lines", fam: "coff", structs: ["IMAGE_RELOCATION", "IMAGE_LINENUMBER"],
    intro: "Dans un fichier objet, chaque section a sa propre liste de **relocations COFF** ({{IMAGE_RELOCATION}}) : « patcher tel octet avec l’adresse de tel symbole, de telle façon ». Le linker les résout et, pour une image, il ne reste que les relocations de base (page BaseReloc). Les numéros de ligne ({{IMAGE_LINENUMBER}}) sont obsolètes.",
    notes: [
      { t: "warn", h: "Pas les mêmes relocations", b: "Ne pas confondre {{IMAGE_RELOCATION}} (objets, une par symbole référencé, type dépendant de la machine) avec {{IMAGE_BASE_RELOCATION}} (images, corrige le delta de base). Les images n’ont aucune relocation COFF." },
      { t: "info", h: "Débordement", b: "Si `IMAGE_SCN_LNK_NRELOC_OVFL` est posé et `NumberOfRelocations` = 0xFFFF, le vrai nombre est dans le champ `VirtualAddress` de la **première** relocation." }
    ] },
  { id: "archive", grp: "coff", label: "Archives .lib", fam: "lib",
    structs: ["IMAGE_ARCHIVE_MEMBER_HEADER", "ARCHIVE_FIRST_LINKER_MEMBER", "ARCHIVE_SECOND_LINKER_MEMBER", "IMPORT_OBJECT_HEADER"],
    intro: "Une bibliothèque `.lib` est une **archive** : la signature `!<arch>\\n` suivie de membres, chacun précédé d’un {{IMAGE_ARCHIVE_MEMBER_HEADER}} de 60 octets en texte. Dans l’ordre : premier membre linker, second membre linker, membre longnames (optionnel), puis les fichiers objet — ou, pour une bibliothèque d’import, de petits membres {{IMPORT_OBJECT_HEADER}}.",
    notes: [
      { t: "warn", h: "Endianness", b: "Le **premier** membre linker stocke ses nombres en **big-endian**, le **second** en little-endian. Le second est celui que les linkers utilisent (symboles triés, recherche plus rapide)." },
      { t: "info", h: "Import « long » vs « court »", b: "Long : un vrai pseudo-objet COFF (File Header, sections, symboles, chaînes). Court : seulement {{IMPORT_OBJECT_HEADER}} + nom du symbole + nom de la DLL — suffisant pour régénérer les tables d’import (`.idata`)." }
    ] },

  { id: "consts", grp: "ref", label: "Constantes (flags & enums)", fam: null }
];
