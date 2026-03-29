@echo off
REM =============================================================================
REM Medical Supply Chain Blockchain - Quick Start Script (Windows)
REM Function: Start network, create channel, deploy chaincode in one click
REM =============================================================================

echo ============================================================
echo    Medical Supply Chain Blockchain - Quick Start
echo ============================================================
echo.

REM Set script directory
set SCRIPTS_DIR=%~dp0
set NETWORK_DIR=%SCRIPTS_DIR%..

cd /d "%NETWORK_DIR%"

REM Check Docker
echo [CHECK] Docker...
docker info >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Docker is not running. Please start Docker Desktop first.
    echo.
    echo Steps:
    echo   1. Open Docker Desktop
    echo   2. Wait for Docker to start (green icon in taskbar)
    echo   3. Run this script again
    echo.
    pause
    exit /b 1
)
echo [OK] Docker is running
echo.

REM Step 1: Start network
echo ============================================================
echo    Step 1/4: Start Docker Containers
echo ============================================================
echo.

echo Starting Docker containers...
docker compose up -d

if errorlevel 1 (
    echo [ERROR] Failed to start Docker containers
    echo Try running: docker compose down
    pause
    exit /b 1
)

echo Waiting for containers to start (30 seconds)...
timeout /t 30 /nobreak >nul

echo Container status:
docker compose ps
echo.

REM Step 2: Create channel
echo ============================================================
echo    Step 2/4: Create Channel
echo ============================================================
echo.

call "%SCRIPTS_DIR%createChannel.bat"
if errorlevel 1 (
    echo [ERROR] Channel creation failed
    pause
    exit /b 1
)

REM Step 3: Deploy chaincode
echo ============================================================
echo    Step 3/4: Deploy Chaincode
echo ============================================================
echo.

call "%SCRIPTS_DIR%deployChaincode.bat"
if errorlevel 1 (
    echo [ERROR] Chaincode deployment failed
    pause
    exit /b 1
)

REM Step 4: Verify
echo ============================================================
echo    Step 4/4: Verify Network
echo ============================================================
echo.

echo Container status:
docker ps --format "table {{.Names}}\t{{.Status}}"
echo.

echo ============================================================
echo    Blockchain Network Started Successfully!
echo ============================================================
echo.
echo NEXT STEPS:
echo.
echo   1. Start backend service:
echo      cd ..\..\..\..\backend
echo      npm run dev
echo.
echo   2. Start frontend application (new terminal):
echo      cd ..\..\..\..\frontend
echo      npm run dev
echo.
echo   3. Access the system:
echo      http://localhost:5173
echo.
echo   4. Login with test account:
echo      Username: producer_admin
echo      Password: 123456
echo      Organization: producer
echo.
pause
