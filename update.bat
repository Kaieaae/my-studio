@echo off
chcp 65001 >nul
setlocal

cd /d "%~dp0"

title My Studio 自動更新

echo.
echo ========================================
echo        My Studio 自動更新程式
echo ========================================
echo.
echo 專案位置：
echo %CD%
echo.

git --version >nul 2>&1
if errorlevel 1 (
    echo [錯誤] 找不到 Git。
    echo 請先確認 Git for Windows 已安裝。
    goto error
)

git rev-parse --is-inside-work-tree >nul 2>&1
if errorlevel 1 (
    echo [錯誤] 目前資料夾不是 Git repository。
    goto error
)

echo [1/4] 檢查網站修改...
git status --short
echo.

git status --porcelain > "%TEMP%\my_studio_git_status.txt"
for %%A in ("%TEMP%\my_studio_git_status.txt") do if %%~zA==0 (
    del "%TEMP%\my_studio_git_status.txt"
    echo 目前沒有需要更新的內容。
    pause
    exit /b 0
)
del "%TEMP%\my_studio_git_status.txt"

echo [2/4] 加入所有修改...
git add .
if errorlevel 1 goto error

echo.
echo [3/4] 建立 Git 版本...
git commit -m "Update My Studio"
if errorlevel 1 goto error

echo.
echo [4/4] 推送到 GitHub...
git push origin main
if errorlevel 1 goto error

echo.
echo ========================================
echo 更新成功！
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
echo 請查看上方顯示的錯誤訊息。
echo ========================================
echo.
pause
exit /b 1