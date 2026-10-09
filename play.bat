@echo off
cd /d "%~dp0"
echo Starting Sam City... (keep this window open while you play; close it to stop the game)
where node >nul 2>nul && (node serve.js 8123 & goto :eof)
where py >nul 2>nul && (py serve.py 8123 & goto :eof)
where python >nul 2>nul && (python serve.py 8123 & goto :eof)
echo.
echo Sam City needs Node.js or Python to run (just one of them).
echo Install Node.js from https://nodejs.org (the LTS button), then double-click play.bat again.
echo.
pause
