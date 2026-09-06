@echo off
title Rinse ^& Rise - Reset WhatsApp Scanner
cd /d "%~dp0"

set "WHATSAPP_AUTH_DIR=%~dp0data\whatsapp-auth"
set "WHATSAPP_CACHE_DIR=%~dp0data\whatsapp-cache"

echo ============================================
echo   Reset WhatsApp Scanner Connection
echo ============================================
echo.
echo This will:
echo   1. Stop any WhatsApp scanner on port 3001
echo   2. Clear the saved session ^(you must scan QR again^)
echo   3. Start a fresh scanner
echo.

for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":3001" ^| findstr "LISTENING"') do (
  echo Stopping process %%a on port 3001...
  taskkill /F /PID %%a >nul 2>&1
)

taskkill /F /FI "WINDOWTITLE eq WhatsApp Scanner*" >nul 2>&1

timeout /t 2 /nobreak >nul

if exist "%WHATSAPP_AUTH_DIR%" (
  echo Clearing saved WhatsApp session in data\whatsapp-auth...
  rmdir /s /q "%WHATSAPP_AUTH_DIR%" 2>nul
)
if exist "whatsapp-bridge\.wwebjs_auth" (
  echo Clearing legacy session folder...
  rmdir /s /q "whatsapp-bridge\.wwebjs_auth" 2>nul
)
mkdir "%WHATSAPP_AUTH_DIR%" 2>nul
mkdir "%WHATSAPP_CACHE_DIR%" 2>nul

echo.
echo Starting fresh WhatsApp scanner...
where node >nul 2>&1
if errorlevel 1 (
  echo ERROR: Node.js is not installed. Install from https://nodejs.org
  pause
  exit /b 1
)

if not exist "whatsapp-bridge\node_modules" (
  echo Installing WhatsApp bridge packages...
  cd whatsapp-bridge
  call npm install
  cd ..
)

start "WhatsApp Scanner" /MIN cmd /c "set WHATSAPP_AUTH_DIR=%WHATSAPP_AUTH_DIR%&& set WHATSAPP_CACHE_DIR=%WHATSAPP_CACHE_DIR%&& cd /d "%~dp0whatsapp-bridge" && node server.js >> bridge.log 2>&1"
timeout /t 4 /nobreak >nul

echo.
echo Scanner started. Open billing at http://localhost:8080
echo Click the WhatsApp pill in the header - scan QR once to link.
echo.
echo Tip: On your phone - WhatsApp - Linked Devices - remove old
echo      "WhatsApp Web" entries, then Link a Device and scan.
echo.
pause
