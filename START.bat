@echo off
title Dream Paintings - Starting...
color 0C

echo.
echo  ==========================================
echo   DREAM PAINTINGS - Starting Servers...
echo  ==========================================
echo.

:: Start Backend
echo  [1/2] Starting Backend (Port 5000)...
start "Dream Paintings - Backend" cmd /k "cd /d "%~dp0backend" && npm run dev"

:: Wait 3 seconds for backend to boot
timeout /t 3 /nobreak >nul

:: Start Frontend
echo  [2/2] Starting Frontend (Port 5173)...
start "Dream Paintings - Frontend" cmd /k "cd /d "%~dp0frontend" && npm run dev"

:: Wait 4 seconds for frontend to boot
timeout /t 4 /nobreak >nul

:: Open browser
echo  [3/3] Opening browser...
start http://localhost:5173

echo.
echo  ==========================================
echo   Both servers are running!
echo   Frontend : http://localhost:5173
echo   Backend  : http://localhost:5000
echo   Admin    : http://localhost:5173/super-admin-portal-xyz
echo  ==========================================
echo.
