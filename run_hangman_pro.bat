@echo off
echo ========================================================
echo   Launching Hangman Pro Application...
echo ========================================================
echo.
cd /d "%~dp0backend"
echo Starting Backend & Frontend Web Server on http://127.0.0.1:5000 ...
start "" http://127.0.0.1:5000
python app.py
