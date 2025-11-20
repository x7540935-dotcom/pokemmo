@echo off
chcp 65001 >nul
title 宝可梦对战平台 - 一键启动

echo ========================================
echo   宝可梦对战平台 - 一键启动
echo ========================================
echo.

:: 检查 Node.js
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo [错误] 未检测到 Node.js，请先安装 Node.js (https://nodejs.org/)
    pause
    exit /b 1
)

set ROOT=%~dp0

echo [1/3] 检查依赖...
if not exist "%ROOT%poke-proxy-server\node_modules" (
    echo [提示] 检测到后端依赖缺失，正在安装...
    pushd "%ROOT%poke-proxy-server"
    call npm install
    if %errorlevel% neq 0 (
        echo [错误] 安装后端依赖失败，请手动执行 npm install
        pause
        exit /b 1
    )
    popd
)

echo [2/3] 启动对战服务器 (ws://localhost:3071) ...
start "对战服务器 (Ctrl+C 可停止)" cmd /k "cd /d ""%ROOT%poke-proxy-server"" && node battle-server.js"

timeout /t 2 /nobreak >nul

echo [3/3] 启动前端服务器 (http://localhost:8080) ...
start "前端服务器 (Ctrl+C 可停止)" cmd /k "cd /d ""%ROOT%"" && node simple-http-server.js 8080"

timeout /t 2 /nobreak >nul

echo.
echo ========================================
echo   启动完成
echo ========================================
echo 访问地址：
echo   - 主页面:   http://localhost:8080/index.html
echo   - AI对战:   http://localhost:8080/pokemmo.html
echo   - 真人对战: http://localhost:8080/pvp-lobby.html
echo.
echo 温馨提示：
echo   - 关闭本窗口不会停止服务器
echo   - 要停止服务器，请关闭对应窗口
echo ========================================
echo.

start "" "http://localhost:8080/index.html"

pause

