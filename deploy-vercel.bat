@echo off
cd /d "G:\2026\Thinksmart\Sale\Proposal2026"
echo === COPY TEMPLATES ===
if not exist "public\templates" mkdir "public\templates"
copy /Y "2-Templates\NLG\IUL - NLG.svg" "public\templates\"
copy /Y "2-Templates\NLG\TERMLIFE - NLG.svg" "public\templates\"
copy /Y "2-Templates\AIG\AIG IUL.svg" "public\templates\"
copy /Y "2-Templates\AIG\AIG Termlife.svg" "public\templates\"
copy /Y "Name Card\Chung\Sale Name Card.svg" "public\templates\"
echo === SYNTAX CHECK ===
node --check public\app.js && echo APP_JS_OK
echo === GIT ===
git add -A
git commit -m "Fix right sidebar: single scroll container, no overlapping nested scrolls"
git push origin main
echo === DONE exit code %errorlevel% ===
