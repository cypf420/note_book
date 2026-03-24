#!/usr/bin/env python3
from __future__ import annotations

import argparse
import sys
from pathlib import Path

import import_pipeline as pipeline
import requests


def is_url(value: str) -> bool:
    return value.startswith('http://') or value.startswith('https://')


def read_source(path_arg: str) -> tuple[str, str]:
    if path_arg == '-':
        return sys.stdin.read(), 'stdin'
    if is_url(path_arg):
        return path_arg, path_arg
    source_path = Path(path_arg)
    raw = source_path.read_bytes()
    return pipeline.decode_bytes(raw, is_html=source_path.suffix.lower() in {'.html', '.htm', '.xhtml'}), str(source_path)


def fetch_remote_source(url: str, render_mode: str) -> tuple[str, str]:
    if render_mode in {'auto', 'browser'} and pipeline.browser_render_available():
        try:
            rendered = pipeline.render_url_in_browser(url)
            return rendered['html'], rendered.get('url') or url
        except Exception:
            if render_mode == 'browser':
                raise
    response = requests.get(url, timeout=30)
    response.raise_for_status()
    return pipeline.decode_response_text(response), url


def main() -> int:
    parser = argparse.ArgumentParser(description='Render scraped HTML/Markdown/Text into normalized Markdown.')
    parser.add_argument('source', help='Source file path, URL, or - to read from stdin')
    parser.add_argument('-o', '--output', help='Write Markdown to this file')
    parser.add_argument('--title', default='', help='Override the detected title')
    parser.add_argument('--type', default='auto', choices=['auto', 'html', 'markdown', 'text'], help='Force the source type')
    parser.add_argument('--render', default='auto', choices=['auto', 'browser', 'http'], help='When source is a URL, choose browser or plain HTTP fetching')
    args = parser.parse_args()

    source_text, source_name = read_source(args.source)
    if is_url(args.source):
        source_text, source_name = fetch_remote_source(args.source, args.render)
    markdown = pipeline.render_source_to_markdown(
        source_text,
        title=args.title,
        source_type=args.type,
        source_name=source_name,
    )

    if args.output:
        output_path = Path(args.output)
        output_path.parent.mkdir(parents=True, exist_ok=True)
        output_path.write_text(markdown, encoding='utf-8')
        print(output_path)
        return 0

    sys.stdout.write(markdown)
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
