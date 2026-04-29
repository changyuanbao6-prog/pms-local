@echo off
chcp 65001 >nul
title 流光青旅 PMS
cd /d "%~dp0"
echo.
echo =================================
echo    启动流光青旅 PMS 系统
echo =================================
echo.
echo [1/2] 启动后端服务 (localhost:3000)...
start "PMS-后端" cmd /k "node server\index.js"
echo.
echo [2/2] 启动前端服务 (localhost:5173)...
timeout /t 2 /nobreak >nul
start "PMS-前端" cmd /k "npx vite --host 0.0.0.0"
echo.
echo =================================
echo    系统启动中，请稍候...
echo.
echo    后端: http://localhost:3000
echo    前端: http://localhost:5173
echo.
echo    登录账号: admin
echo    登录密码: admin123
echo =================================
echo.
pause