@echo off
chcp 65001 >nul
setlocal
cd /d "%~dp0"

echo ========================================
echo My Studio 自動更新
echo ========================================
echo.
echo 目前資料夾：
echo %CD%

git --version >nul 2>&1
if errorlevel 1 (
    echo.
    echo 找不到 Git，請先安裝 Git for Windows。
    echo.
    pause
    exit /b 1
)

git rev-parse --is-inside-work-tree >nul 2>&1
if errorlevel 1 (
    echo.
    echo 目前資料夾不是 Git repository。
    echo.
    pause
    exit /b 1
)

echo.
echo 目前修改：
git status --short

set "STATUS_FILE=%TEMP%\my_studio_git_status_%RANDOM%%RANDOM%.txt"
git status --porcelain > "%STATUS_FILE%"
for %%A in ("%STATUS_FILE%") do if %%~zA==0 (
    del "%STATUS_FILE%" >nul 2>&1
    echo.
    echo 目前沒有需要更新的內容。
    echo.
    pause
    exit /b 0
)
del "%STATUS_FILE%" >nul 2>&1

echo.
echo 正在加入修改...
git add .
if errorlevel 1 goto error

set "COMMIT_MESSAGE=Update Studio"
for /f "usebackq delims=" %%A in (`powershell -NoProfile -Command "Get-Date -Format 'yyyy-MM-dd HH:mm'" 2^>nul`) do set "COMMIT_MESSAGE=Update Studio %%A"

echo.
echo 正在建立版本...
git commit -m "%COMMIT_MESSAGE%"
if errorlevel 1 goto error

echo.
echo 正在推送到 GitHub...
git push origin main
if errorlevel 1 goto error

echo.
echo 最新版本：
git log -1 --oneline

echo.
echo ========================================
echo 更新成功
echo GitHub 已更新
echo Cloudflare 將自動重新部署
echo ========================================
echo.
pause
exit /b 0

:error
echo.
echo ========================================
echo 更新失敗
echo 請查看上方 Git 錯誤訊息
echo ========================================
echo.
pause
exit /b 1
