# Deployment

## GitHub
- Repo: **`hadangtien0702-dot/Thinksmarttool`** (renamed from `EditorProposesalsale`; the git remote URL was
  updated to the new name). Branch: `main`. Pushing to `main` triggers Vercel auto-deploy.

## Vercel
- **Vercel runs `server.js` as a serverless function** — it is NOT a pure static host. So `/api/svgs`,
  `/api/library`, `/api/download` work online, which means **Brochure downloads and Name Card editing work on
  the live site** (no static-bundle workaround needed). Brochure JPGs are committed so they deploy.
- Live URLs, same repo:
  - **`https://tool.thinksmartinsurance.com`** ← custom domain (verified 2026-07-17) — SHARE THIS ONE.
    DNS: CNAME `tool` → vercel-dns; TXT `_vercel` giữ lại cho lần re-verify.
  - `https://thinksmarttool-gy6f.vercel.app` ← Vercel default, vẫn sống.
  - `https://editor-proposesalsale.vercel.app` ← old name; may lag. Worth consolidating in the Vercel dashboard.

## Deploy steps (end of day)
1. Bump `?v=` in `index.html` for any changed front-end file (see `conventions.md`).
2. `git add -A && git commit -m "..." && git push origin main`.
3. Verify: poll the live URL until the new version shows, e.g.
   ```bash
   for i in $(seq 1 25); do v=$(curl -s https://thinksmarttool-gy6f.vercel.app/ | grep -oE "js/core.js\?v=[0-9]+" | head -1); [ "$v" = "js/core.js?v=<N>" ] && { echo "DEPLOYED $v"; break; }; sleep 6; done
   ```
4. Sanity-check the live `templates/manifest.json` and a couple of asset URLs return 200.

`deploy-vercel.bat` automates copying masters → `public/templates` + commit + push, but the manual flow above
is what's typically used. When adding a template/name card to the deploy, copy the SVG into `public/templates/`
AND add an entry to `public/templates/manifest.json`.
