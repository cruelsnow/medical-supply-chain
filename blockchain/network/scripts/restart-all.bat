@echo off
REM =============================================================================
REM Medical Supply Chain Blockchain - Restart All Services (Windows)
REM Function: Stop all services and restart everything
REM =============================================================================

echo ============================================================
echo    Restart All Services
echo ============================================================
echo.

REM Stop all services first
call "%~dp0stop-all.bat"

echo.
echo Waiting 5 seconds before restart...
timeout /t 5 /nobreak >nul
echo.

REM Start all services
call "%~dp0one-click-deploy.bat"
