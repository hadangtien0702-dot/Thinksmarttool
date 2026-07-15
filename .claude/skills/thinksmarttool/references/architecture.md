# Architecture

## Folder structure (repo root: `G:\2026\Thinksmart\Sale\Proposal2026`)

| Path | What it is | In git? |
|------|-----------|---------|
| `public/` | The web app served by Express — `index.html`, `app.js`, `style.css`, `fonts/`, `templates/` | yes |
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

## Two run modes (app.js auto-detects)

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

## Key app.js functions (vanilla JS, single file)

- `fetchSvgsList()` → `/api/svgs` (server) or `fetchStaticList()` (manifest). Then `fetchLibrary()` → `/api/library`.
- `renderFileTree()` — builds the left nav: **Proposal** (grouped by carrier via `carrierOf()`), **Brochure**
  (`renderLibrarySection` + `preprocessLibraryItems`), **Name Card** (masters direct + "Của tôi" copies).
  `isNameCardFile()` splits name cards out of Proposal; `isMasterFile()` marks masters (protected).
- `loadSvgContent(fileInfo)` — fetch + parse SVG, assign `data-editor-id` per `<text>`, render, show right
  editor. Shows the right panel only for editable files (`setEditorVisible`); `no-editor` body class hides it.
- `populateTextsEditor()` — builds the right-panel fields. Branches: **Name Card** (tagged `data-nc` → 5
  fields, else generic per-line) vs **Proposal** (client/plan/agent groups by position/content heuristics).
- `renderSvgOnCanvas()` — injects the SVG; `zoomToFit()` fits to viewport (cap = `MAX_ZOOM`, so small
  designs like name cards open large/readable).
- `renderSvgToCanvas()` (async) — rasterizes for export; **injects base64 @font-face** (`getEmbeddedFontCSS`)
  so JPEG/PDF keep the real fonts on any machine. `exportToJpeg()` (white bg) + `exportToPdf()` only.
- `preprocessLibraryItems()` — groups multi-page brochures: ≥2 same-base JPGs (with or without a PDF) → one
  multi-page item.

See `references/tools.md` for tool-level behavior and `references/conventions.md` for how to change things safely.
