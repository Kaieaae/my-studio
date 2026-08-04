@echo off
chcp 65001 >nul
cd /d "%~dp0"

echo ========================================
echo Slab Builder link setup
echo ========================================
echo.

powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0install-slab-link.ps1"
set "EXITCODE=%ERRORLEVEL%"

echo.
pause
exit /b %EXITCODE%
