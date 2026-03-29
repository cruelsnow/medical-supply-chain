@echo off
REM =============================================================================
REM Medical Supply Chain Blockchain - Stop All Services (Windows)
REM Function: Stop frontend, backend, and blockchain network
REM =============================================================================

echo ============================================================
echo    Stop All Services
echo ============================================================
echo.

echo [1/3] Stopping frontend and backend processes...

REM Kill Node.js processes on ports 3000 and 5173
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3000 ^| findstr LISTENING') do (
    echo   Killing process on port 3000 (PID: %%a)
    taskkill /PID %%a /F >nul 2>&1
)

for /f "tokens=5" %%a in ('netstat -ano ^| findstr :5173 ^| findstr LISTENING') do (
    echo   Killing process on port 5173 (PID: %%a)
    taskkill /PID %%a /F >nul 2>&1
)

REM Also try to kill by name
taskkill /IM "node.exe" /F >nul 2>&1

echo   [OK] Frontend and backend stopped
echo.

echo [2/3] Stopping Docker containers...

cd /d "%~dp0.."

docker compose down

if errorlevel 1 (
    echo   [WARNING] Some containers may not have stopped cleanly
)

echo   [OK] Docker containers stopped
echo.

echo [3/3] Cleaning up...

REM Remove generated files (optional)
REM docker volume prune -f >nul 2>&1

echo   [OK] Cleanup complete
echo.

echo ============================================================
echo    All Services Stopped
echo ============================================================
echo.
pause
