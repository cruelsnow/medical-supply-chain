@echo off
REM =============================================================================
REM Medical Supply Chain Blockchain - Stop Network Script (Windows)
REM Function: Stop Docker containers
REM =============================================================================

echo ============================================================
echo    Stop Blockchain Network
echo ============================================================
echo.

cd /d "%~dp0.."

echo Stopping Docker containers...
docker compose down

if errorlevel 1 (
    echo [WARNING] Some containers may not have stopped cleanly
)

echo.
echo ============================================================
echo    Network Stopped
echo ============================================================
echo.
pause
