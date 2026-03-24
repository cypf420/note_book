@echo off
setlocal
cd /d "%~dp0"
set "BEGIN_ARGS=%*"
if /I "%~1"=="--dry-run" set "BEGIN_ARGS=-DryRun"
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\begin.ps1" %BEGIN_ARGS%
exit /b %errorlevel%
