# Conventions & how to change things safely

## Cache versioning (do this on every front-end change)
`index.html` loads `style.css?v=N` and the 5 JS modules `js/core.js?v=N`, `js/proposal.js?v=N`,
`js/brochure.js?v=N`, `js/namecard.js?v=N`, `js/main.js?v=N`. After editing a file, **bump that file's
number** in `index.html` (only the files you touched — versions are independent per file).
(As of 2026-07-15: `style.css?v=9`, all 5 js at `?v=1` — check `index.html` for current.)

## Verify in the real app (don't stop at syntax)
- `node --check public/js/<file>.js` catches syntax errors, but always also **reload localhost:8000** and exercise
  the change (open a proposal, click a brochure, edit a name card field, export).
- `server.js` changes → **restart** the server. Front-end files are served fresh from disk (just reload).
- The in-app browser preview + screenshots have been **flaky/timing out** in past sessions. Fallbacks that
  worked well: `curl` the API/HTML, `node`-simulate logic on real data, and `mcp__Claude_Browser__javascript_tool`
  for synchronous DOM checks (avoid Promise-based evals — they tended to hang the pane).

## Don't break the app while restyling
The JS modules depend on specific element IDs (`btn-save-top`, `tree-container`, `active-file-title`,
`btn-export-jpeg`, `btn-export-pdf`, etc.) and function/variable names. All 5 files share ONE global
namespace (plain scripts, no bundler) — don't redeclare a `const`/`function` name that another file
already defines. Preserve them. Keep UI copy Vietnamese
and match the existing code style. `style.css` is a token-driven design system (light default + `body.dark-theme`),
brand violet `#4F00CA` family, font **Plus Jakarta Sans** (UI) + **Fira Code** (mono). SVG proposals use SF Pro
(bundled in `public/fonts/`).

## Git / privacy (hard rules)
- **Never push customer data.** `4-Clients/` is gitignored — keep it that way. Before any push, run
  `git status --porcelain --ignored | grep "!!"` and confirm `4-Clients/`, `2-Templates/`, `_Archive/` are ignored.
- `1-Design/*.ai` (~40MB) is tracked (design backup) — that's intentional; just know pushes are heavy.
- Commit message convention: short imperative summary + bullet body; end with
  `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`.

## The owner's workflow (follow it)
**Local-first, one push at end of day.** During the day: edit + test on `localhost:8000`, do NOT commit or
push per change. At **end of day** (or when the user says "push đi em" / wraps up): ONE `git add -A` + commit
+ `git push origin main` → Vercel auto-deploys. Then confirm the deploy (poll the live URL for the new `?v=`).

## Fonts (why export used to change fonts, now fixed)
Proposals reference SF Pro (+ some italics/Bodoni not bundled). On machines without SF Pro, and in the
`<img>`-based export, fonts fell back. Fix in place: `renderSvgToCanvas()` injects base64 `@font-face` for the
bundled SF Pro woff into the SVG before rasterizing → JPEG/PDF keep the font anywhere. Still-open nuance: the
3 SF Pro italics + Bodoni aren't true-bundled (aliased to nearest weight); a 100% fix needs those font files.
