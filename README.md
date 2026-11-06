# PE Reference

Static reference site (HTML/CSS/JS, no build, no dependencies) on the structures of the PE format, using the exact names from `winnt.h`.

## Run it

Open `index.html`, or serve the folder:

```bash
python -m http.server 8765
```

then http://localhost:8765. The folder can be published as-is (GitHub Pages, etc.).

**The "3D View" page needs a server** (it loads Three.js as a JS module, which browsers block over `file://`); the rest of the site also works by opening `index.html` directly.

## Layout

- `js/data.en.js` / `js/data.fr.js` — all the data, per language: structures (`S`), constants (`E`), pages (`PAGES`), sample PE (`SAMPLE`). Loaded dynamically via `document.write()` in `index.html` based on the active language (`localStorage`, English by default).
- `js/tree-data.en.js` / `js/tree-data.fr.js` — parent/child relationships (`KIDS`, `ROOTS`, `HOW`), also per language: feed the "Structure Tree" page, the "Parents / Children" blocks on each card, and the 3D View.
- `js/ui-strings.js` — bilingual (EN/FR) dictionary for all chrome text (nav, buttons, labels…), with the `t(key)` / `tf(key, vars)` helper functions.
- `js/app.js` — rendering, hash routing, search (Ctrl+K), colored hexdump, RVA/VA/offset converter, navigation breadcrumb (the path followed between structures).
- `js/scene-ui.js` — chrome for the "3D View" page (loaded first: see below) and lazy import of `scene-core.js`, with a fallback message if the browser can't load a module (e.g. `file://`).
- `js/scene-core.js` — ES module (Three.js, via the import map in `index.html`): the PE's memory image rendered as a **RAM stick**, with a "Dissect" mode that lifts the chips off the board to inspect them individually. Built from the same data as the rest of the site (`FAM`, `S`, `SAMPLE`, `DD`, read as global variables — standard in classic JS, no need to export them).
- `css/style.css` — **dark by default**, with an optional light toggle (the "Light" button in the top bar, persisted in `localStorage`). IBM Plex Sans / JetBrains Mono fonts loaded from Google Fonts in `index.html`.

## The structure card

Every structure has a **byte strip** (`byteMap()` in `app.js`) above the table: one segment per field, sized proportionally to its real size, colored by its **nature** (`KINDS` in `data.en.js`/`data.fr.js` — RVA, VA, offset, reserved…), not by its family. Hovering a segment highlights the matching table row (and vice versa) via the `data-fi` attribute shared between `.seg-b` and `<tr>`. The table itself is deliberately plain (doc style); color stays concentrated in the strip and in the small dot in the "Nature" column.

⚠️ **`<script>` tag order in `index.html`**: `scene-ui.js` must load *before* `app.js`. On the first load of the `#scene3d` page, `app.js` calls `window.PE3D.mount(...)` synchronously — if `scene-ui.js` hasn't defined `window.PE3D` yet at that point, the 3D view stays stuck on "Loading…". Classic scripts execute in document order, so respecting this order is enough to avoid it.

## Adding a structure

1. Add an entry to `S` (`fam` = color, `page` = tab, `fields` = fields via `F(name, type, nature, description, options)`).
2. Add it to the `structs` list of the relevant page in `PAGES`.

Offsets, sizes, PE32/PE32+ differences, and the C code are all computed automatically.
