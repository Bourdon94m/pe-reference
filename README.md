# PE Reference

Site de référence statique (HTML/CSS/JS, sans build ni dépendance) sur les structures du format PE, avec les noms exacts de `winnt.h`.

## Lancer

Ouvrir `index.html`, ou servir le dossier :

```bash
python -m http.server 8765
```

puis http://localhost:8765. Le dossier peut être publié tel quel (GitHub Pages, etc.).

**La page « Vue 3D » a besoin d'un serveur** (elle charge Three.js comme module JS, bloqué en `file://` par les navigateurs) ; le reste du site fonctionne aussi en ouvrant `index.html` directement.

## Organisation

- `js/data.en.js` / `js/data.fr.js` — toutes les données, par langue : structures (`S`), constantes (`E`), pages (`PAGES`), PE d'exemple (`SAMPLE`). Chargé dynamiquement via `document.write()` dans `index.html` selon la langue active (`localStorage`, anglais par défaut).
- `js/tree-data.en.js` / `js/tree-data.fr.js` — les relations parents / enfants (`KIDS`, `ROOTS`, `HOW`), par langue elles aussi : alimentent la page « Arbre des structures », les blocs « Parents / Enfants » de chaque carte, et la Vue 3D.
- `js/ui-strings.js` — dictionnaire bilingue (EN/FR) de tout le texte de chrome (nav, boutons, libellés…), avec les fonctions `t(key)` / `tf(key, vars)`.
- `js/app.js` — rendu, routage par hash, recherche (Ctrl+K), hexdump coloré, convertisseur RVA/VA/offset, fil d'Ariane de navigation (chemin suivi entre structures).
- `js/scene-ui.js` — chrome de la page « Vue 3D » (chargé en premier : voir plus bas) et import paresseux de `scene-core.js`, avec message de repli si le navigateur ne peut pas charger de module (ex. `file://`).
- `js/scene-core.js` — module ES (Three.js, via l'import map dans `index.html`) : image mémoire du PE rendue comme une **barrette de RAM**, avec un mode « Disséquer » qui décolle les puces de la carte pour les inspecter séparément. Construit à partir des mêmes données que le reste du site (`FAM`, `S`, `SAMPLE`, `DD`, lues comme variables globales — classique en JS, pas besoin de les exporter).
- `css/style.css` — **sombre par défaut**, bascule clair en option (case « Light » dans la barre du haut, persistée en `localStorage`). Polices IBM Plex Sans / JetBrains Mono chargées depuis Google Fonts dans `index.html`.

## La carte de structure

Chaque structure a une **bande d'octets** (`byteMap()` dans `app.js`) au-dessus du tableau : un segment par champ, large proportionnellement à sa taille réelle, coloré par sa **nature** (`KINDS` dans `data.en.js`/`data.fr.js` — RVA, VA, offset, réservé…), pas par sa famille. Survoler un segment surligne la ligne du tableau correspondante (et inversement) via l'attribut `data-fi` partagé entre `.seg-b` et `<tr>`. Le tableau lui-même est volontairement sobre (style doc), la couleur reste concentrée dans la bande et dans le petit point de la colonne « Nature ».

⚠️ **Ordre des balises `<script>` dans `index.html`** : `scene-ui.js` doit être chargé *avant* `app.js`. Au premier chargement de la page sur `#scene3d`, `app.js` appelle `window.PE3D.mount(...)` de façon synchrone — si `scene-ui.js` n'a pas encore défini `window.PE3D` à ce moment-là, la vue 3D reste bloquée sur « Chargement… ». Les scripts classiques s'exécutant dans l'ordre du document, respecter cet ordre suffit à l'éviter.

## Ajouter une structure

1. Ajouter une entrée dans `S` (`fam` = couleur, `page` = onglet, `fields` = champs avec `F(nom, type, nature, description, options)`).
2. L'ajouter à la liste `structs` de la page concernée dans `PAGES`.

Les offsets, tailles, différences PE32/PE32+ et le code C sont calculés automatiquement.
