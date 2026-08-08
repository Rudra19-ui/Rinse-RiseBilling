@echo off
title Rinse & Rise - Laundry Billing (SQLite)
cd /d "%~dp0"

echo ============================================
echo   Rinse ^& Rise Billing - SQLite Database
echo ============================================
echo.

pip install -r requirements.txt -q

where node >nul 2>&1
if %ERRORLEVEL%==0 (
  if not exist "whatsapp-bridge\node_modules" (
    echo Installing WhatsApp PDF send service ^(first time only^)...
    cd whatsapp-bridge
    call npm install
    cd ..
  )
) else (
  echo NOTE: Install Node.js from https://nodejs.org for automatic PDF sending on WhatsApp.
  echo.
)

echo Starting billing server...
echo Database: data\rinse_rise.db
echo Browser:  http://localhost:8080
echo.
echo WhatsApp PDF: Click the WhatsApp pill in the header and scan QR once.
echo Press Ctrl+C to stop
echo.

start http://localhost:8080
cd server
python app.py
