@echo off
echo Starting Hangman App with automatic MongoDB...
echo.

REM Check if Docker is running
docker --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Docker is not running or not installed.
    echo Please install Docker Desktop and start it.
    pause
    exit /b 1
)

echo Docker is running. Starting services...
docker-compose up --build
