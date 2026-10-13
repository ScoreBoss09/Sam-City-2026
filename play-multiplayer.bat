@echo off
cd /d "%~dp0"
echo Starting Sam City for multiplayer... (keep this window open; friends on your network open the address it shows)
where node >nul 2>nul && (node serve.js 8123 --lan & goto :eof)
echo.
echo Multiplayer needs Node.js. Install it from https://nodejs.org (the LTS button), then double-click play-multiplayer.bat again.
echo.
pause
