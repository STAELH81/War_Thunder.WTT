@echo off
title WTT Patch Notes
cd /d "%~dp0"

where python >nul 2>&1
if %errorlevel% neq 0 (
  echo Python introuvable. Installe Python 3 ou utilise "npm start" si Node est installe.
  pause
  exit /b 1
)

echo.
echo  WTT Patch Notes — serveur local sur http://localhost:8080
echo  Ferme cette fenetre pour arreter le serveur.
echo.

start "" "http://localhost:8080"
python -m http.server 8080
