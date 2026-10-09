@echo off
cd /d "%~dp0"
echo Starting Sam City... (close this window to stop the game)
python serve.py 8123 || py serve.py 8123 || (echo. & echo Python is needed: install it from https://www.python.org/downloads/ and tick "Add python.exe to PATH". & pause)
