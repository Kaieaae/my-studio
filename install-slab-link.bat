@echo off
chcp 65001 >nul
setlocal
cd /d "%~dp0"

set "LOCAL_LAUNCHER=%~dp0open-slab-builder.bat"

echo ========================================
echo Slab Builder 網站按鈕啟動設定
echo ========================================
echo.

if not exist "%LOCAL_LAUNCHER%" (
    echo 找不到本機啟動器：
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

reg add "HKCU\Software\Classes\slabbuilder\shell\open\command" /ve /d "\"%LOCAL_LAUNCHER%\" \"%%1\"" /f >nul
if errorlevel 1 goto error

echo.
echo 設定完成。
echo 之後在 My Studio 點「開啟工具」時，
echo 瀏覽器若詢問是否開啟 Slab Builder Launcher，請選擇允許。
echo.
pause
exit /b 0

:error
echo.
echo 設定失敗，請確認 Windows 是否允許寫入目前使用者的登錄設定。
echo.
pause
exit /b 1
