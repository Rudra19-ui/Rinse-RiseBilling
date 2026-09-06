@echo off
title Rinse & Rise - Laundry Billing (SQLite)
cd /d "%~dp0"

echo ============================================
echo   Rinse ^& Rise Billing - SQLite Database
echo ============================================
echo.

pip install -r requirements.txt -q

set "WHATSAPP_AUTH_DIR=%~dp0data\whatsapp-auth"
set "WHATSAPP_CACHE_DIR=%~dp0data\whatsapp-cache"
if not exist "%WHATSAPP_AUTH_DIR%" mkdir "%WHATSAPP_AUTH_DIR%"
if not exist "%WHATSAPP_CACHE_DIR%" mkdir "%WHATSAPP_CACHE_DIR%"

where node >nul 2>&1
if %ERRORLEVEL%==0 (
  if not exist "whatsapp-bridge\node_modules" (
    echo Installing WhatsApp PDF send service ^(first time only^)...
    cd whatsapp-bridge
    call npm install
    cd ..
  )

  set "WA_ALREADY_OK=0"
  powershell -NoProfile -Command "try { $r = Invoke-WebRequest -Uri 'http://127.0.0.1:3001/health' -UseBasicParsing -TimeoutSec 2; if ($r.StatusCode -eq 200) { exit 0 } else { exit 1 } } catch { exit 1 }" >nul 2>&1
  if %ERRORLEVEL%==0 set "WA_ALREADY_OK=1"

  if "%WA_ALREADY_OK%"=="1" (
    echo WhatsApp scanner already running — keeping saved session.
  ) else (
    for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":3001" ^| findstr "LISTENING"') do (
      echo Stopping stuck WhatsApp scanner ^(PID %%a^)...
      taskkill /F /PID %%a >nul 2>&1
    )
    timeout /t 1 /nobreak >nul
    echo Starting WhatsApp scanner service...
    start "WhatsApp Scanner" /MIN cmd /c "set WHATSAPP_AUTH_DIR=%WHATSAPP_AUTH_DIR%&& set WHATSAPP_CACHE_DIR=%WHATSAPP_CACHE_DIR%&& cd /d "%~dp0whatsapp-bridge" && node server.js >> bridge.log 2>&1"
    timeout /t 3 /nobreak >nul
  )
) else (
  echo NOTE: Install Node.js from https://nodejs.org for automatic PDF sending on WhatsApp.
  echo.
)

echo Starting billing server...
echo Database: data\rinse_rise.db
echo WhatsApp session: data\whatsapp-auth
echo Browser:  http://localhost:8080
echo.
echo WhatsApp: Scan QR once in the header — session stays saved after that.
echo Any phone/tablet/PC on this network can send bills once linked.
echo If QR won't link: run "Reset WhatsApp.bat" then scan again.
echo Press Ctrl+C to stop
echo.

start http://localhost:8080
cd server
python app.py
