@echo off
chcp 65001 >nul
echo ========================================
echo   可编辑笔记网站 - 一键环境配置脚本
echo ========================================
echo.

REM 检查 conda 是否安装
where conda >nul 2>nul
if %errorlevel% neq 0 (
    echo [错误] 未检测到 conda，请先安装 Anaconda 或 Miniconda
    echo 下载地址: https://www.anaconda.com/download
    pause
    exit /b 1
)

echo [1/4] 检测到 conda 环境
echo.

REM 设置环境名称
set ENV_NAME=note_book
set PYTHON_VERSION=3.13

echo [2/4] 创建/更新 conda 环境: %ENV_NAME% (Python %PYTHON_VERSION%)
echo.
conda create -n %ENV_NAME% python=%PYTHON_VERSION% -y
if %errorlevel% neq 0 (
    echo [错误] 创建 conda 环境失败
    pause
    exit /b 1
)
echo.

echo [3/4] 激活环境并安装依赖包
echo.
call conda activate %ENV_NAME%
if %errorlevel% neq 0 (
    echo [错误] 激活环境失败
    pause
    exit /b 1
)

REM 安装依赖
pip install -r requirements.txt
if %errorlevel% neq 0 (
    echo [错误] 安装依赖包失败
    pause
    exit /b 1
)
echo.

echo [4/4] 环境配置完成！
echo.
echo ========================================
echo   环境配置成功！
echo ========================================
echo.
echo 使用方法:
echo   1. 激活环境: conda activate %ENV_NAME%
echo   2. 启动服务器: python scripts\server.py
echo   3. 访问网站: http://127.0.0.1:8000
echo.
echo 如需停止服务器，按 Ctrl+C
echo.
pause