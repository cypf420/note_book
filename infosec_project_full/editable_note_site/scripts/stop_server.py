#!/usr/bin/env python3
from __future__ import annotations

import json
import os
import signal
import subprocess
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
STATE_FILE = ROOT / 'runtime' / 'server-state.json'
FALLBACK_PORTS = set(range(8000, 8021))


def read_state_pid() -> int | None:
    if not STATE_FILE.exists():
        return None
    try:
        data = json.loads(STATE_FILE.read_text(encoding='utf-8'))
        pid = int(data.get('pid', 0))
        return pid or None
    except Exception:
        return None


def remove_state_file() -> None:
    try:
        if STATE_FILE.exists():
            STATE_FILE.unlink()
    except OSError:
        pass


def is_process_running(pid: int) -> bool:
    try:
        os.kill(pid, 0)
    except OSError:
        return False
    return True


def force_kill(pid: int) -> bool:
    try:
        subprocess.run(
            ['taskkill', '/PID', str(pid), '/F', '/T'],
            check=False,
            capture_output=True,
            text=True,
        )
    except OSError:
        return False
    return not is_process_running(pid)


def stop_pid(pid: int) -> bool:
    if pid <= 0:
        return False
    if not is_process_running(pid):
        return True
    try:
        os.kill(pid, signal.SIGTERM)
    except OSError:
        return force_kill(pid)
    for _ in range(10):
        time.sleep(0.2)
        if not is_process_running(pid):
            return True
    return force_kill(pid)


def iter_listening_pids() -> set[int]:
    try:
        result = subprocess.run(
            ['netstat', '-ano'],
            check=False,
            capture_output=True,
            text=True,
            encoding='utf-8',
            errors='ignore',
        )
    except OSError:
        return set()

    pids: set[int] = set()
    for line in result.stdout.splitlines():
        line = line.strip()
        if 'LISTENING' not in line.upper():
            continue
        parts = line.split()
        if len(parts) < 5:
            continue
        local_addr = parts[1]
        pid_text = parts[-1]
        try:
            port = int(local_addr.rsplit(':', 1)[-1])
            pid = int(pid_text)
        except ValueError:
            continue
        if port in FALLBACK_PORTS:
            pids.add(pid)
    return pids


def main() -> int:
    stopped = False
    pid = read_state_pid()
    if pid:
        print(f'发现运行状态文件，准备停止 PID {pid}')
        stopped = stop_pid(pid)
        remove_state_file()
        if stopped:
            print('本地笔记服务已停止。')
            return 0

    for fallback_pid in sorted(iter_listening_pids()):
        print(f'尝试停止端口占用进程 PID {fallback_pid}')
        if stop_pid(fallback_pid):
            stopped = True

    remove_state_file()
    if stopped:
        print('本地笔记服务已停止。')
        return 0

    print('没有检测到当前项目正在运行的服务。')
    return 1


if __name__ == '__main__':
    sys.exit(main())
