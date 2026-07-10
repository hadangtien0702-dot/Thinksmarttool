@echo off
cd /d "G:\2026\Thinksmart\Sale\Proposal2026"
echo === COPY TEMPLATES ===
if not exist "public\templates" mkdir "public\templates"
copy /Y "File Final\IUL - NLG.svg" "public\templates\"
copy /Y "File Final\TERMLIFE - NLG.svg" "public\templates\"
echo === SYNTAX CHECK ===
node --check public\app.js && echo APP_JS_OK
echo === GIT ===
git add -A
git commit -m "Fix right sidebar: single scroll container, no overlapping nested scrolls"
git push origin main
echo === DONE exit code %errorlevel% ===
