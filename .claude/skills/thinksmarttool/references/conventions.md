# Conventions & how to change things safely

## Cache versioning (do this on every front-end change)
`index.html` loads `style.css?v=N` and the 5 JS modules `js/core.js?v=N`, `js/proposal.js?v=N`,
`js/brochure.js?v=N`, `js/namecard.js?v=N`, `js/main.js?v=N`. After editing a file, **bump that file's
number** in `index.html` (only the files you touched — versions are independent per file).
(Don't trust hardcoded numbers here — ALWAYS check `index.html` for current versions; the changelog's
"Current state" block tracks them too.)

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

### Pre-push checklist (owner mandate 2026-07-17 — BẮT BUỘC mỗi lần push)
1. **Bump version badge hiển thị**: tăng số trong `.sidebar-version-footer` (index.html) — `v1.01` →
   `v1.02`… + cập nhật ngày. Đây là cách owner phân biệt bản local vs live.
2. **Update & học Skill**: cập nhật `references/changelog.md` (entry mới + Current state + PENDING),
   các `references/*.md` liên quan nếu có convention/gotcha mới, và append design-lessons nếu phiên
   có đụng UI. Xong hết mới `git add -A`.
3. Privacy check như trên (`git status --porcelain --ignored | grep "!!"` — 4-Clients/2-Templates/_Archive).

## Design skills (USER-level — shared by all the owner's projects)
The design toolkit lives at `%USERPROFILE%\.claude\skills\` (NOT in this repo; bản gốc lâu dài ở
`E:\2026\Claude\.claude\skills\`): `frontend-design`
(© Anthropic, from anthropics/claude-code plugins), `ui-ux-pro-max` (community, no license file),
and `design-lessons` (the owner's own global lesson notebook — LESSONS.md, weekly structure).
Every project on this machine sees them automatically. The `.gitignore` still blocks
`.claude/skills/frontend-design/` and `.claude/skills/ui-ux-pro-max/` as a guard in case copies
ever land in the repo again (licenses forbid public redistribution). To rebuild on a NEW machine:
back up/copy the whole `%USERPROFILE%\.claude\skills\` folder; frontend-design can also be
re-fetched from `https://github.com/anthropics/claude-code` (plugins/frontend-design).
Project-specific design notes: `references/design-lessons.md` (generalizable ones get PROMOTED
to the global LESSONS.md).

## Fonts (why export used to change fonts, now FULLY fixed 2026-07-17)
Proposals reference SF Pro (+ italics/Bodoni). `renderSvgToCanvas()` injects base64 `@font-face` for the
bundled woffs into the SVG before rasterizing → JPEG/PDF keep the font anywhere. Since 2026-07-17 all
**11 font files in `public/fonts/` are REAL** (7 SF Pro weights + 3 SF Pro italics + Bodoni Moda Italic;
the old 7 woffs were fakes — several were the same file). `EMBED_FONTS` in core.js embeds all 11;
`ITALIC_ALIASES` was removed. Rebuild script: `build-fonts.py` (repo root, fontTools subset from
`C:\Windows\Fonts` OTFs). Do NOT copy woffs from `5-Design-Sections/sf pro/` — that's the old fake set.
