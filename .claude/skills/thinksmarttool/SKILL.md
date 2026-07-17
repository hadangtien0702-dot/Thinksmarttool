---
name: thinksmarttool
description: >-
  Project knowledge base for **Thinksmart Tool** — the in-house SVG editor at
  E:\2026\Thinksmart\Sale\Proposal2026 (insurance Proposal/Báo giá, Brochure, and Name Card tools,
  Node/Express + vanilla JS, deployed on Vercel). Load this at the START of ANY session that touches
  this project so you already know its architecture, folders, conventions, deployment, and open tasks
  instead of re-discovering them. Use it whenever the user mentions Thinksmart Tool, the proposal/báo giá
  editor, brochure, name card, the AIG/NLG templates, localhost:8000, thinksmarttool-gy6f.vercel.app,
  or asks to edit/run/deploy/debug anything under this repo. Also FOLLOW the "Keep this skill current"
  section: update these files at end of session so the knowledge compounds over time.
---

# Thinksmart Tool — project skill

Thinksmart Tool is a custom, self-built **internal-tools platform** for a Vietnamese life-insurance
team in the US (Thinksmart Insurance). It started as an SVG-based **insurance proposal editor** and is
growing into a suite. The UI is Vietnamese. It is NOT a generic app — treat it as a real product the
owner uses daily with their sales team.

**Repo:** `E:\2026\Thinksmart\Sale\Proposal2026` (trước 16/07/2026 ổ này tên `G:`) · **Stack:** Node/Express (`server.js`) + vanilla
HTML/CSS/JS in `public/` · **Local:** `http://localhost:8000` · **Live:** `thinksmarttool-gy6f.vercel.app`.

## First thing to do in a session

1. Read this file, then skim `references/` (below) for the area you're touching.
2. **Read `references/changelog.md` last** — it holds the newest state, recent changes, and the current
   PENDING task list. It overrides anything older here if they disagree.
3. Start the local server so you can verify changes: `PORT=8000 node server.js` (background). Confirm
   with `curl -s -o /dev/null -w "%{http_code}" http://localhost:8000/`.

## Reference files (read the one you need)

| File | When to read |
|------|--------------|
| `references/architecture.md` | Folder structure, `server.js` API, data flow, server vs static mode, `public/js/` module layout (one file per tool) |
| `references/tools.md` | How each tool works: Proposal (master→clone), Brochure (download library), Name Card (tagged fields) |
| `references/conventions.md` | Cache-version bumping, git/privacy rules, workflow (local-first, EOD push), fonts, verifying changes |
| `references/deployment.md` | GitHub repo, Vercel (serverless), the two URLs, publish/deploy steps |
| `references/design-lessons.md` | **Design lessons that compound daily** + how to use the project's 2 design skills. Read before ANY UI work; append lessons at session end. |
| `references/changelog.md` | **Newest state + recent changes + PENDING tasks.** Read this every session; update it every session. |

## Design skills (owner mandate 2026-07-15, restructured same day)

The owner's design toolkit lives at **USER level** — `%USERPROFILE%\.claude\skills\` (bản gốc lâu
dài: `E:\2026\Claude\.claude\skills\`) — so EVERY
project (this one and future ones) gets it automatically. No project-level copies (removed to avoid
duplicate names). **Use for every UI task:**

- **`frontend-design`** (Anthropic) — creation: intentional aesthetic direction, anti-"AI-look".
- **`ui-ux-pro-max`** — QC/review: a11y/touch/contrast checklists; database via
  `python "$env:USERPROFILE/.claude/skills/ui-ux-pro-max/scripts/search.py" "<query>" --domain <ux|style|color|typography>`.
- **`design-lessons`** — the owner's GLOBAL lesson notebook
  (`%USERPROFILE%\.claude\skills\design-lessons\LESSONS.md`): read before UI work, append after,
  weekly summaries. Owner's philosophy: solve short-term problems → extract lessons → compound daily
  for the long game.

After any UI session: append project-specific lessons to `references/design-lessons.md` here, and
**promote any generalizable lesson to the GLOBAL notebook** (LESSONS.md above, under the current week).

## How to work on this project (short version)

- **Verify in the real app, not just syntax.** After editing `public/js/*.js`/`style.css`/`index.html`,
  bump the `?v=N` query in `index.html` (both files), then reload localhost:8000 to confirm. `server.js`
  changes need a server restart; static files are served fresh from disk.
- **Never break element IDs / function names that JS depends on** when restyling. Match the existing
  Vietnamese copy and code style.
- **Privacy is real:** `4-Clients/` (customer proposals), `2-Templates/`, `_Archive/` are gitignored and
  must never be pushed to the public repo. Confirm before any push.
- **Follow the owner's workflow:** edit + test on local during the day; do NOT push per change. At end of
  day (or when the user says so), do ONE `git add -A` + commit + `git push origin main` → Vercel deploys.
  **Mỗi lần push BẮT BUỘC (owner mandate 2026-07-17): (1) bump version badge trong index.html,
  (2) update các file skill này (changelog + lessons) TRƯỚC khi commit.** See `references/conventions.md`
  → "Pre-push checklist".

## Keep this skill current ("self-learn")

The owner wants this skill to get smarter every day. So, near the end of a working session (or when the
user says to wrap up / update memory / push), **update the skill files** so the next session starts ahead:

1. Append a dated entry to `references/changelog.md` — what changed, why, current `public/js/*`/`style.css`
   version numbers, and any new/closed PENDING items.
2. If you introduced a new tool, folder, convention, API route, or gotcha, add it to the matching
   `references/*.md` (not just the changelog) so it's found by topic later.
3. If the session touched UI, append a dated lesson entry to `references/design-lessons.md`
   (and promote lasting rules into its "Quy tắc đúc kết" list).
4. Keep entries concrete and short (file paths, function names, exact commands). Prune anything now false.
5. Do this by editing the files directly with normal file tools — this skill lives in the repo at
   `.claude/skills/thinksmarttool/`, so updates are versioned with the project.

This is the mechanism that makes the skill compound: every session leaves the knowledge base a little
more accurate and complete than it found it.
