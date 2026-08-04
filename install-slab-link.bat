@echo off
chcp 65001 >nul
setlocal
cd /d "%~dp0"

set "LOCAL_LAUNCHER=%~dp0open-slab-builder.bat"

echo ========================================
echo Slab Builder link setup
echo ========================================
echo.

if not exist "%LOCAL_LAUNCHER%" (
    echo Local launcher was not found:
    echo %LOCAL_LAUNCHER%
    echo.
    pause
    exit /b 1
)

reg add "HKCU\Software\Classes\slabbuilder" /ve /d "URL:Slab Builder Launcher" /f >nul
if errorlevel 1 goto error

reg add "HKCU\Software\Classes\slabbuilder" /v "URL Protocol" /d "" /f >nul
if errorlevel 1 goto error

reg add "HKCU\Software\Classes\slabbuilder\shell" /ve /d "open" /f >nul
if errorlevel 1 goto error

reg add "HKCU\Software\Classes\slabbuilder\shell\open" /ve /d "open" /f >nul
if errorlevel 1 goto error

reg add "HKCU\Software\Classes\slabbuilder\shell\open\command" /ve /d "^"%LOCAL_LAUNCHER%^" ^"%%1^"" /f >nul
if errorlevel 1 goto error

echo.
echo Setup completed.
echo When the browser asks to open Slab Builder Launcher, choose Allow.
echo.
pause
exit /b 0

:error
echo.
echo Setup failed. Please check whether Windows allows user registry changes.
echo.
pause
exit /b 1
