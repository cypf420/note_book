@echo off
setlocal
cd /d "%~dp0"

where py >nul 2>nul
if %errorlevel%==0 (
  py -3 "%~dp0scripts\stop_server.py"
  exit /b %errorlevel%
)

where python >nul 2>nul
if %errorlevel%==0 (
  python "%~dp0scripts\stop_server.py"
  exit /b %errorlevel%
)

echo [ERROR] Python was not found, so stop.bat cannot stop the local server.
exit /b 1
