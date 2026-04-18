@echo off
title Dream Paintings - Full Start (Back/Front/Ngrok)
color 0A

echo.
echo  ==========================================
echo   DREAM PAINTINGS - FULL START WITH NGROK
echo  ==========================================
echo.

:: Authenticate ngrok
echo  [0/6] Authenticating ngrok...
ngrok authtoken 3AwkmdtxWrUAzpCROGxdAnTYdrb_5t5GqMdwFQyBAFTW7U888

:: Start Backend
echo  [1/6] Starting Backend (Port 5000)...
start "Dream Paintings - Backend" cmd /k "cd /d "%~dp0backend" && npm run dev"

:: Wait 5 seconds for backend
timeout /t 5 /nobreak >nul

:: Start Backend Ngrok
echo  [2/6] Starting Backend Ngrok (5000 ^> public)...
start "Backend Ngrok" cmd /k "ngrok http 5000"

:: Wait 3 seconds
timeout /t 3 /nobreak >nul

:: Start Frontend
echo  [3/6] Starting Frontend (Port 5173)...
start "Dream Paintings - Frontend" cmd /k "cd /d "%~dp0frontend" && npm run dev"

:: Wait 5 seconds for frontend
timeout /t 5 /nobreak >nul

:: Start Frontend Ngrok
echo  [4/6] Starting Frontend Ngrok (5173 ^> public)...
start "Frontend Ngrok" cmd /k "ngrok http 5173 --host-header=localhost:5173"

:: Wait 4 seconds
timeout /t 4 /nobreak >nul

:: Open browser
echo  [5/6] Opening browser to localhost:5173...
start http://localhost:5173

echo  [6/6] COMPLETE!
echo.
echo  ==========================================
echo   All running! Local: http://localhost:5173
echo   Backend: http://localhost:5000
echo   Public URLs in Ngrok terminals (back/front)
echo   Admin: http://localhost:5173/super-admin-portal-xyz
echo  ==========================================
echo.
