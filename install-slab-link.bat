@echo off
chcp 65001 >nul
cd /d "%~dp0"

echo ========================================
echo Slab Builder link setup
echo ========================================
echo.

if not exist "%~dp0install-slab-link.reg" (
    echo install-slab-link.reg was not found.
    echo.
    pause
    exit /b 1
)

echo Windows will ask whether to add this link setting.
echo Please choose Yes.
echo.

regedit.exe "%~dp0install-slab-link.reg"
set "EXITCODE=%ERRORLEVEL%"

echo.
echo If Windows showed a success message, setup is complete.
pause
exit /b %EXITCODE%
