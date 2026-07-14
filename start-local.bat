@echo off
cd /d "%~dp0"
echo ==================================================
echo   Thinksmart Tool (LOCAL)
echo ==================================================
echo.
if not exist "node_modules" (
  echo [*] Cai dependencies lan dau...
  call npm install
)
echo [*] Dang khoi dong server tai http://localhost:3000
start "" http://localhost:3000
node server.js
pause
