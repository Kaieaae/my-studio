@echo off
chcp 65001 >nul
setlocal
cd /d "%~dp0"

set "SLAB_LAUNCHER=%~dp0..\slab-builder\launch_slab_builder.bat"

if not exist "%SLAB_LAUNCHER%" (
    echo 找不到 Slab Builder 啟動檔：
    echo %SLAB_LAUNCHER%
    echo.
    pause
    exit /b 1
)

start "" "%SLAB_LAUNCHER%"
exit /b 0
