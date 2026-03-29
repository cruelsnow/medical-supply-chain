@echo off
REM =============================================================================
REM Medical Supply Chain Blockchain System - Windows Startup Script
REM Function: Start blockchain network containers
REM =============================================================================

echo ============================================================
echo    Medical Supply Chain Blockchain - Start Network
echo ============================================================
echo.

REM Check Docker
echo [1/4] Checking Docker...
docker info >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Docker is not running. Please start Docker Desktop first.
    echo.
    echo Steps to start Docker:
    echo   1. Open Docker Desktop from Start Menu
    echo   2. Wait for Docker to start (green icon in taskbar)
    echo   3. Run this script again
    echo.
    pause
    exit /b 1
)
echo [OK] Docker is running
echo.

REM Go to network directory
cd /d "%~dp0.."

REM Start Docker containers
echo [2/4] Starting Docker containers...
docker compose up -d
if errorlevel 1 (
    echo [ERROR] Failed to start Docker containers
    echo.
    echo Try these steps:
    echo   1. Run: docker compose down
    echo   2. Run: docker compose up -d
    echo.
    pause
    exit /b 1
)
echo [OK] Docker containers started
echo.

REM Wait for containers
echo [3/4] Waiting for containers to be ready (30 seconds)...
timeout /t 30 /nobreak >nul
echo [OK] Containers are ready
echo.

REM Show container status
echo [4/4] Container status:
docker compose ps
echo.

echo ============================================================
echo    Network Started Successfully!
echo ============================================================
echo.
echo NEXT STEPS:
echo.
echo   Run the following scripts in order:
echo.
echo   1. Create channel:
echo      .\scripts\createChannel.bat
echo.
echo   2. Deploy chaincode:
echo      .\scripts\deployChaincode.bat
echo.
echo   OR run quick-start.bat to do everything at once:
echo      .\scripts\quick-start.bat
echo.
echo   After blockchain is ready:
echo   3. Start backend:
echo      cd ..\..\..\..\backend
echo      npm install
echo      npm run dev
echo.
echo   4. Start frontend (new terminal):
echo      cd ..\..\..\..\frontend
echo      npm install
echo      npm run dev
echo.
echo   5. Access: http://localhost:5173
echo.
pause
