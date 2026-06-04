@echo off
echo Starting Chitradurga City Club...
echo.
echo Backend API will run on: http://localhost:3008
echo Frontend will run on:    http://localhost:5173
echo.
start "City Club API" cmd /k "cd /d "%~dp0server" && npm run dev"
timeout /t 3 /nobreak >nul
start "City Club Frontend" cmd /k "cd /d "%~dp0client" && npm run dev"
echo.
echo Both servers starting... Open http://localhost:5173 in your browser.
echo Default login: admin / Admin@1234
