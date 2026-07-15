# Architecture

## Folder structure (repo root: `G:\2026\Thinksmart\Sale\Proposal2026`)

| Path | What it is | In git? |
|------|-----------|---------|
| `public/` | The web app served by Express — `index.html`, `js/` (per-tool modules), `style.css`, `fonts/`, `templates/` | yes |
| `public/js/` | **One JS file per tool** (since 2026-07-15; replaced monolithic `app.js`): `core.js` (shared), `proposal.js`, `brochure.js`, `namecard.js`, `main.js` (bootstrap). Load order in `index.html`: core → tools → main | yes |
| `public/templates/` | SVGs + `manifest.json` served in **static mode** (Vercel fallback). Copies of the master templates + name card | yes |
| `public/fonts/` | SF Pro woff files used by the SVGs and embedded on export | yes |
| `server.js` | Express server + all API routes | yes |
| `1-Design/` | Illustrator sources (`.ai`, ~40MB each). `~ai*.tmp` = Illustrator temp junk (gitignored) | yes (heavy) |
| `2-Templates/` | Master SVG templates, by carrier: `AIG/`, `NLG/` | **gitignored** |
| `3-Export-PDF/` | Exported proposal PDFs | yes |
| `4-Clients/` | Per-client saved proposals — **CUSTOMER DATA, gitignored, never push** | **gitignored** |
| `Brochure/` | Downloadable brochures by carrier (`AIG/`, `NLG/`). JPGs are tracked so they deploy | JPGs tracked |
| `Name Card/` | Name card master SVG(s), e.g. `Chung/Sale Name Card.svg` | tracked (was added) |
| `_Archive/` | Old/junk files | **gitignored** |
| `deploy-vercel.bat` | Copies masters → `public/templates`, then git add/commit/push | yes |
| `start-local.bat` | Local launcher | yes |

`.gitignore` ignores: `node_modules/`, `2-Templates/`, `4-Clients/`, `_Archive/`, `Brochure/` (but JPGs
were force/committed earlier so they deploy), `Name Card/` (master is tracked despite this), `*.tmp`,
`~ai*.tmp`, `.env*`, `push-to-github.bat`.

## Two run modes (core.js auto-detects)

- **Server mode** (local `node server.js` AND on Vercel — Vercel runs `server.js` as a serverless
  function). `/api/svgs`, `/api/library`, `/api/download` all work. This is the normal experience.
- **Static mode** (only if `/api/svgs` fails). Falls back to `public/templates/manifest.json`; proposals
  save to browser `localStorage`; brochure/name-card library is empty. Rarely hit now that Vercel runs
  the server.

## server.js API

| Route | Purpose |
|-------|---------|
| `GET /api/svgs` | Recursively lists editable SVGs (skips `node_modules,.git,.gemini,public,_Archive,Brochure`). Name Card SVGs ARE included (editable). Each: `{name,path,category,folder,size,mtime}` |
| `GET /api/svgs/content?path=` | Returns one SVG's text (path must end `.svg`, inside workspace) |
| `POST /api/svgs/save` | Save SVG. **Blocks overwriting** paths under `2-templates/` or `name card/` (masters protected) |
| `POST /api/svgs/clone` | Clone a template → `4-Clients/<name> - <base>.svg` (the "Tạo Proposal Mới" / create-my-own flow) |
| `GET /api/library` | Scans `Brochure/` (and any `LIBRARY_SECTIONS`) → `{carrier: [{name,path,size,ext,mtime}]}`. Downloadable exts: pdf/png/jpg/jpeg/gif/webp/svg/ai/eps/zip |
| `GET /api/download?path=&inline=` | Streams a Brochure file (attachment, or `inline=1` for preview). Restricted to library folders |

## Frontend modules (`public/js/`, vanilla JS, plain globals — no bundler)

All functions are global; scripts share one namespace and load in order: core → proposal → brochure
→ namecard → main. **Adding a new tool** = new `js/<tool>.js` with its own `render<Tool>NavSection()`
(+ editor fn if editable), call it from `renderFileTree()` in `main.js`, add the `<script>` to `index.html`.

**core.js** (shared engine):
- `appState`, `dom` cache, `isMasterFile()`, `isNameCardFile()`, text helpers (`applyTextValue`,
  `getLineTextContent`, `clearSiblingTspans`, `formatCurrencyValue`), `escapeHtml`, `formatBytes`.
- `fetchSvgsList()` → `/api/svgs` (server) or `fetchStaticList()` (manifest + localStorage proposals).
- `loadSvgContent(fileInfo)` — fetch + parse SVG, strip stale `data-editor-id`s, assign fresh ones per
  LINE (first tspan of each y-group), render, show right editor (`setEditorVisible`).
- `saveSvgToServer()`, `createNewProposal()` (shared clone flow: proposal copies AND name-card copies).
- Nav building blocks: `NAV_ICONS`, `carrierOf/carrierSort`, `makeCollapsibleFolder`, `makeProposalItem`.
- Canvas: `renderSvgOnCanvas`, `zoomToFit` (cap `MAX_ZOOM`), `handleZoom`, `applyTransform`.
- `populateTextsEditor()` — **dispatcher**: shared shell (clear panel, master warning, collect
  `[data-editor-id]`), then routes to `populateNameCardTextsEditor` or `populateProposalTextsEditor`.
- Colors panel, inspector, `optimizeSvgTexts`, font embedding (`getEmbeddedFontCSS`),
  `renderSvgToCanvas` (async, 2x + base64 @font-face), `exportToJpeg`/`exportToPdf`, `updateStatus`.

**proposal.js** (Proposal / Báo giá):
- `GENDERS`/`RATE_CLASSES`/`US_STATES` dropdown data.
- `renderProposalNavSection(container, proposals, q)` — carrier-grouped nav section.
- `populateProposalTextsEditor(svgEl, textElements)` — 3 groups (client Y<450 / plan $-values
  450≤Y<1100 / agent Y≥1100) with all the position+content heuristics, `tagClientInfoElements`
  (+`reclaimTag`), paragraph-line + phone detection.
- Agent preset: `collectAgentFields`, `saveAgentPreset`, `applyAgentPreset` (localStorage).

**brochure.js** (Brochure library):
- `fetchLibrary()` → `/api/library`; `preprocessLibraryItems()` (≥2 same-base JPGs → one multi-page item).
- `renderLibrarySection()`, `makeDownloadItem()`, `openLibraryGroup/Item()`,
  `showLibraryPreview/MultiPagePreview/GroupPreview()`, `hideLibraryPreview()`.

**namecard.js** (Name Card):
- `renderNameCardNavSection(container, nameCards, q)` — masters direct + "Của tôi" copies.
- `populateNameCardTextsEditor(svgEl, textElements)` — `data-nc` tagged → exactly 5 fields;
  else generic per-line classifier (`classifyLine`/`getLines`).

**main.js** (bootstrap):
- `renderFileTree()` — composes the 3 tool nav sections + file count.
- `showErrorState()`, `initEventListeners()` (zoom/pan/keyboard/save/export/new-proposal wiring),
  `DOMContentLoaded` init.

See `references/tools.md` for tool-level behavior and `references/conventions.md` for how to change things safely.
