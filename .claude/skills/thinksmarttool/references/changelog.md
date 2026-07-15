# Changelog & current state

**This is the freshest source of truth.** Read it first every session; update it last every session.
Newest entries on top. Keep it concrete (versions, files, commands).

## Current state (as of 2026-07-15)
- Versions: `app.js?v=22`, `style.css?v=9` (verify against `public/index.html`).
- Last commit on `main`: `43eb973` (uncommitted local work: agent-zone dedupe fixes — commit at EOD).
- Live at `thinksmarttool-gy6f.vercel.app`.
- All 3 tools working: Proposal (AIG/NLG + Khách hàng), Brochure (multi-page grouping, minimal preview),
  Name Card (5 tagged fields, editable, fit-to-viewport zoom, master-protected + copy flow).
- Font embedding on export is live. Design system + light/dark theme live.

## PENDING / open tasks
0. **`TERMLIFE - NLG` master polluted with test data** (see 2026-07-15 log) — owner to supply/restore
   a clean master (both `2-Templates/NLG/` and `public/templates/`).
1. **Name Card icons are low-res raster** → look rough / "mất góc" when zoomed/exported. Confirmed a
   source-asset issue, not a tool bug. Awaiting the owner's choice: re-export from Illustrator with vector
   icons (preferred) OR replace icons with vectors in code. See `tools.md` → "Known limitation".
2. **SF Pro italics + Bodoni Moda** not truly bundled — export aliases them to nearest weight. 100% fidelity
   needs the real font files (or bundle Bodoni Moda from Google Fonts). See `conventions.md` → Fonts.
3. **Two Vercel URLs** (gy6f vs editor-proposesalsale) — consider consolidating/removing one in the dashboard.
4. Future tools the owner may add (platform vision): more sales tools beyond proposals (video, training docs,
   FB post templates, client management…). Keep the structure modular.

## Log
### 2026-07-15
- **Fixed bogus duplicate "Tên Agent Assistant" field** (user report, AIG IUL + IUL - NLG): the
  surrender-charge disclaimer paragraph wraps, and its short last line "khi không còn áp dụng."
  (Y≈1177, X≈66, <40 chars) slipped through the agent-zone filters in `populateTextsEditor`.
  Fix: in Section 3, skip any line whose parent `<text>` holds 2+ `[data-editor-id]` lines
  (`isParagraphLine`) — real agent fields are always single-line `<text>` elements.
- **loadSvgContent now strips stale `data-editor-id`** saved into files by older versions before
  re-assigning fresh ids (old files carried ids on the `<text>` wrapper → duplicate rows + id
  collisions). Follow-up: `tagClientInfoElements` got a `reclaimTag()` helper — if a saved
  `id="client-*"` sits on an element without `data-editor-id` (old `<text>`-level tagging, e.g.
  `IUL - NLG.svg`), the id is moved down to the inner tspan that carries the fresh editor id,
  otherwise the client fields disappear (the editor loop only iterates `[data-editor-id]`).
- **Wider phone detection in agent zone**: `isPhone` now also matches all-digit numbers like
  `0938169130` (VN format), not just `(346) 858-4277` — TERMLIFE - NLG labeled phones as "Tên".
- Verified all 4 templates + Jenny client file: 5 client fields, plan values, exactly 4 agent
  fields, edit propagates to canvas. `app.js?v=22`.
- NOTE for owner: **`TERMLIFE - NLG` master (both `2-Templates` and `public/templates`) contains
  saved test data** (client "Trương thị thanh hảo", state "Sài gòn bình thạnh", VN phones) — it was
  overwritten before master-protection existed. Needs a clean re-export/restore of that master.

### 2026-07-14 (later 2)
- **Fixed empty Proposal section on Vercel** (commit `6bda21f`): `2-Templates/` is gitignored so it isn't on
  Vercel; `/api/svgs` now also scans `public/templates/*.svg` (deduped by filename, synthetic
  `folder` so master-detection + carrier grouping work). Keep `public/templates/` + `manifest.json` in
  sync with `2-Templates/`.
- **Fixed proposal client fields (name/gender/rate) not showing** (commit `43eb973`). IMPORTANT ARCHITECTURE
  GOTCHA: `data-editor-id` is assigned to the **FIRST `<tspan>` of each line** (see loadSvgContent ~line 312),
  NOT the `<text>` element. So a value split across several tspans (e.g. "Standard Non-Tobacco" = 8 tspans,
  a person name = 4 tspans) is NOT equal to that first tspan's `.textContent`. Any code that reads/matches a
  field value must use **`getLineTextContent(el)`** (concatenates all tspans on the same line), and any write
  must clear the sibling tspans (`applyTextValue` already calls `clearSiblingTspans`). Fixed
  `tagClientInfoElements` (match via getLineTextContent; match rate/state against `RATE_CLASSES`/`US_STATES`;
  detect the client name by a capitalized-multiword pattern in the client zone instead of a hardcoded string)
  and the field-render read in `populateTextsEditor`. Verified all 4 templates show 5 client fields + editing
  updates the canvas. Debug tip that worked: temporarily add `window.appState = appState;` to inspect
  `activeSvgDoc` from `mcp__Claude_Browser__javascript_tool` (sync evals only — Promise evals hang the pane).

### 2026-07-14 (later)
- **Fixed empty Proposal section on Vercel.** Root cause: `2-Templates/` is gitignored → not deployed →
  `/api/svgs` (Vercel runs server mode) found no proposal masters. Fix in `server.js` `/api/svgs` handler:
  after the workspace scan, also scan `public/templates/*.svg` and add any not already found (dedupe by
  filename), with a synthetic `folder` (`2-Templates/<carrier>` or `Name Card/Chung`) so master-protection +
  carrier grouping still work. Their `path` is `public/templates/<file>` (loads fine via `/api/svgs/content`).
  Also added `public/templates/` to the save-protection prefixes. Commit `6bda21f`. So: **keep the deployed
  proposal copies in `public/templates/` + `manifest.json` in sync with `2-Templates/`** (deploy-vercel.bat
  does the copy) — that's now what the live site serves. Local still uses `2-Templates/` (deduped).

### 2026-07-14
- Created this `thinksmarttool` skill (project knowledge base) under `.claude/skills/thinksmarttool/`.
- Fixed `itemBlock is not defined` crash (missing `const itemBlock` in the agent-fields render). Commit `e1417be`.
- Name Card: removed the "Mẫu gốc" sub-group — masters show directly under the Name Card section.
- Name Card: only 5 tagged fields shown (name/title/phone/fax/email); added `data-nc` tagging + generic fallback.
- Name Card made editable like a proposal (master-protected + "Tạo bản riêng" copy flow); routed via `/api/svgs`.
- Fit-to-viewport zoom fix (`zoomToFit` cap → `MAX_ZOOM`) so small designs open readable, not tiny.
- Brochure: group multi-page image brochures even without a PDF; cleaner preview (dropped filename/type/size).
- Font embedding for JPEG/PDF export. Exports reduced to JPEG + PDF (removed SVG/PNG/copy buttons).
- Established owner workflow: local-first, one commit+push at end of day.

### 2026-07-13 (earlier work, condensed)
- Rebrand to "Thinksmart Tool" across UI + package + server logs.
- Premium SaaS design-system reskin (tokens, Plus Jakarta Sans, light/dark theme toggle).
- Reorganized folders → `1-Design / 2-Templates / 3-Export-PDF / 4-Clients / Brochure / Name Card / _Archive`.
- Left nav restructured into tool sections (Proposal / Brochure / Name Card); clean labels (no folder/ext).
- Right editor panel shows only when a proposal/name-card is open.
- Added Brochure download library (`/api/library`, `/api/download`) + downloaded the real AIG/NLG brochures.

---
## How to update this file (reminder)
At session end (or when told to wrap up / update memory / push): add a dated `### YYYY-MM-DD` block under
**Log** with what changed + why, refresh **Current state** (version numbers, last commit), and edit the
**PENDING** list (add new items, remove finished ones). Push it with the rest of the day's commit.
