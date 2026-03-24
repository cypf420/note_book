@echo off
setlocal enabledelayedexpansion
set "SCRIPT_PATH=\scripts\server.py"

rem 查找正在运行的 server.py 进程并强制终止
powershell -NoProfile -Command ^
  "$targets = Get-CimInstance Win32_Process | Where-Object { $_.CommandLine -and $_.CommandLine -match 'scripts[\\/]+server\\.py' }; ^
   if (-not $targets) { Write-Host '没有检测到运行中的 服务端 (scripts\\server.py)。'; exit 1 }; ^
   foreach ($proc in $targets) { Write-Host ('终止进程: {0} (PID {1})' -f $proc.Name, $proc.ProcessId); Stop-Process -Id $proc.ProcessId -Force }; ^
   Write-Host '服务端已停止。'"

endlocal
