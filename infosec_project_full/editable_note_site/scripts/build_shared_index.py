#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

SCRIPT_DIR = Path(__file__).resolve().parent
if str(SCRIPT_DIR) not in sys.path:
    sys.path.insert(0, str(SCRIPT_DIR))

import server


def resolve_output_path(value: str | None) -> Path:
    if not value:
        return server.SHARED_INDEX_FILE
    raw = Path(value)
    if raw.is_absolute():
        return raw
    return (server.REPO_ROOT / raw).resolve()


def main() -> int:
    parser = argparse.ArgumentParser(description='Build central shared-index.json from contributor branches.')
    parser.add_argument(
        '--output',
        help='Optional output path. Relative paths are resolved from the git repository root.',
    )
    args = parser.parse_args()

    output_path = resolve_output_path(args.output)
    data = server.build_shared_index_document()
    written_path = server.write_shared_index_file(data, output_path)
    summary = {
        'ok': True,
        'output': str(written_path),
        'generatedAt': data.get('generatedAt', ''),
        'itemCount': int(data.get('itemCount', 0) or 0),
        'skippedBranches': len(data.get('skippedBranches', [])),
    }
    print(json.dumps(summary, ensure_ascii=False))
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
