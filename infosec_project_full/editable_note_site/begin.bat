@echo off
setlocal EnableExtensions EnableDelayedExpansion
chcp 65001 >nul

set "ROOT=%~dp0"
cd /d "%ROOT%"

echo ========================================
echo   Editable Note Site - 一键启动
echo ========================================
echo.

set "PY_CMD="
where py >nul 2>nul
if %errorlevel%==0 (
  set "PY_CMD=py -3"
) else (
  where python >nul 2>nul
  if %errorlevel%==0 set "PY_CMD=python"
)

if "%PY_CMD%"=="" (
  echo [错误] 未检测到 Python（py/python）。
  echo 请先安装 Python 3.10+，并勾选 "Add Python to PATH"。
  pause
  exit /b 1
)

echo [1/4] 使用解释器: %PY_CMD%

%PY_CMD% -c "import sys; raise SystemExit(0 if sys.version_info >= (3,10) else 1)"
if %errorlevel% neq 0 (
  echo [错误] Python 版本过低，请升级到 3.10 或更高版本。
  pause
  exit /b 1
)

echo [2/4] 检查依赖包...
%PY_CMD% -c "import requests, bs4, markdownify" >nul 2>nul
if %errorlevel% neq 0 (
  echo [提示] 缺少依赖，正在安装 requirements.txt
  %PY_CMD% -m pip install -r requirements.txt
  if !errorlevel! neq 0 (
    echo [错误] 依赖安装失败，请检查网络或 pip 配置后重试。
    pause
    exit /b 1
  )
)

echo [3/4] 依赖已就绪

if /I "%~1"=="--dry-run" (
  echo [4/4] Dry run 完成：环境检查通过，可直接启动服务。
  exit /b 0
)

echo [4/4] 启动本地服务: http://127.0.0.1:8000
start "" http://127.0.0.1:8000
echo.
echo 如需停止服务，请在本窗口按 Ctrl + C
echo.
%PY_CMD% scripts\server.py
set "EXIT_CODE=%errorlevel%"
if not "%EXIT_CODE%"=="0" (
  echo.
  echo [错误] 服务异常退出，退出码: %EXIT_CODE%
  pause
)
exit /b %EXIT_CODE%
