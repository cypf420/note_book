#!/usr/bin/env python3
from __future__ import annotations

import json
import os
import re
import shutil
import webbrowser
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, urljoin, urlparse

import requests
from bs4 import BeautifulSoup
from markdownify import markdownify as md

ROOT = Path(__file__).resolve().parent.parent
CONTENT_DIR = ROOT / 'content'
IMPORT_DIR = CONTENT_DIR / 'imports'
ASSET_DIR = CONTENT_DIR / 'assets'
LIBRARY_FILE = CONTENT_DIR / 'library.json'
HEADERS = {'User-Agent': 'EditableNoteSite/3.0 (+https://127.0.0.1)'}


def slugify(text: str) -> str:
    text = text.strip().lower()
    text = re.sub(r'[^\w\u4e00-\u9fa5-]+', '-', text)
    text = re.sub(r'-+', '-', text).strip('-')
    return text or 'untitled'


def ensure_dirs() -> None:
    CONTENT_DIR.mkdir(exist_ok=True)
    IMPORT_DIR.mkdir(parents=True, exist_ok=True)
    ASSET_DIR.mkdir(parents=True, exist_ok=True)
    (IMPORT_DIR / '.gitkeep').touch()
    (ASSET_DIR / '.gitkeep').touch()
    if not LIBRARY_FILE.exists():
        LIBRARY_FILE.write_text(json.dumps({
            'groups': [],
            'documents': [
                {
                    'title': '信息安全原理主笔记',
                    'slug': 'note',
                    'path': './content/note.md',
                    'type': 'main',
                    'remoteFallback': 'https://raw.githubusercontent.com/sqc-cyh/sqc-cyh.github.io/main/docs/LessonsNotes/D2CX_Xinanyuan/note.md'
                }
            ]
        }, ensure_ascii=False, indent=2), encoding='utf-8')


def load_library() -> dict:
    ensure_dirs()
    data = json.loads(LIBRARY_FILE.read_text(encoding='utf-8'))
    return normalize_library_data(data)


def save_library(data: dict) -> None:
    normalized = normalize_library_data(data)
    LIBRARY_FILE.write_text(json.dumps(normalized, ensure_ascii=False, indent=2), encoding='utf-8')


def normalize_group_name(group: str | None) -> str:
    return (group or '').strip()


def normalize_library_data(data: dict) -> dict:
    docs = data.setdefault('documents', [])
    groups = data.setdefault('groups', [])

    normalized_groups: list[dict] = []
    seen: set[str] = set()
    for index, group in enumerate(groups, start=1):
        if isinstance(group, dict):
            name = normalize_group_name(group.get('name'))
            order = group.get('order', index)
        else:
            name = normalize_group_name(str(group))
            order = index
        if not name or name in seen:
            continue
        seen.add(name)
        try:
            order_value = int(order)
        except (TypeError, ValueError):
            order_value = index
        normalized_groups.append({'name': name, 'order': order_value})

    for doc in docs:
        group = normalize_group_name(doc.get('group'))
        doc['group'] = group
        try:
            doc['order'] = int(doc.get('order', next_order_value(docs, group, exclude_path=doc.get('path'))))
        except (TypeError, ValueError):
            doc['order'] = next_order_value(docs, group, exclude_path=doc.get('path'))
        if group and group not in seen:
            seen.add(group)
            normalized_groups.append({'name': group, 'order': len(normalized_groups) + 1})

    normalized_groups.sort(key=lambda item: (int(item.get('order', 999999)), item.get('name', '').lower()))
    for index, group in enumerate(normalized_groups, start=1):
        group['order'] = index
    data['groups'] = normalized_groups
    docs.sort(key=document_sort_key)
    return data


def ensure_group_exists(data: dict, group: str) -> None:
    normalized = normalize_group_name(group)
    if not normalized:
        return
    groups = data.setdefault('groups', [])
    if any(normalize_group_name(item.get('name')) == normalized for item in groups):
        return
    groups.append({'name': normalized, 'order': len(groups) + 1})


def find_group_entry(data: dict, group: str) -> tuple[list[dict], int]:
    normalized = normalize_group_name(group)
    if not normalized:
        raise ValueError('group name cannot be empty')
    groups = data.setdefault('groups', [])
    index = next((i for i, item in enumerate(groups) if normalize_group_name(item.get('name')) == normalized), None)
    if index is None:
        raise FileNotFoundError(f'group not found: {normalized}')
    return groups, index


def create_group(group: str) -> dict:
    normalized = normalize_group_name(group)
    if not normalized:
        raise ValueError('group name cannot be empty')
    data = load_library()
    groups = data.setdefault('groups', [])
    if any(normalize_group_name(item.get('name')) == normalized for item in groups):
        raise ValueError('group already exists')
    groups.append({'name': normalized, 'order': len(groups) + 1})
    save_library(data)
    return {'name': normalized}


def rename_group(old_group: str, new_group: str) -> dict:
    old_name = normalize_group_name(old_group)
    new_name = normalize_group_name(new_group)
    if not old_name or not new_name:
        raise ValueError('group name cannot be empty')
    data = load_library()
    groups, index = find_group_entry(data, old_name)
    if old_name != new_name and any(normalize_group_name(item.get('name')) == new_name for item in groups):
        raise ValueError('target group already exists')
    groups[index]['name'] = new_name
    for doc in data.setdefault('documents', []):
        if normalize_group_name(doc.get('group')) == old_name:
            doc['group'] = new_name
    save_library(data)
    return {'oldName': old_name, 'newName': new_name}


def delete_group(group: str) -> dict:
    normalized = normalize_group_name(group)
    if not normalized:
        raise ValueError('group name cannot be empty')
    data = load_library()
    if any(normalize_group_name(doc.get('group')) == normalized for doc in data.setdefault('documents', [])):
        raise ValueError('group is not empty')
    groups, index = find_group_entry(data, normalized)
    groups.pop(index)
    save_library(data)
    return {'name': normalized}


def document_sort_key(doc: dict) -> tuple[str, int, int, str]:
    group = normalize_group_name(doc.get('group'))
    order = int(doc.get('order', 999999))
    title = doc.get('title', '')
    type_rank = 0 if doc.get('type') == 'main' else 1
    return (group.lower(), type_rank, order, title.lower())


def next_order_value(docs: list[dict], group: str, exclude_path: str | None = None) -> int:
    normalized_group = normalize_group_name(group)
    values = []
    for doc in docs:
        if exclude_path and doc.get('path') == exclude_path:
            continue
        if normalize_group_name(doc.get('group')) != normalized_group:
            continue
        try:
            values.append(int(doc.get('order', 0)))
        except (TypeError, ValueError):
            continue
    return (max(values) + 1) if values else 1


def update_library_entry(
    path: str,
    title: str,
    slug: str,
    doc_type: str,
    source_url: str | None = None,
    group: str | None = None,
    order: int | None = None
) -> None:
    data = load_library()
    docs = data.setdefault('documents', [])
    ensure_group_exists(data, target_group)
    normalized = f'./{path}' if not path.startswith('./') else path
    found = next((doc for doc in docs if doc['path'] == normalized), None)
    current_group = normalize_group_name(found.get('group')) if found else ''
    target_group = current_group if group is None else normalize_group_name(group)
    target_order = order
    if target_order is None:
        if found and target_group == current_group and found.get('order') is not None:
            try:
                target_order = int(found.get('order'))
            except (TypeError, ValueError):
                target_order = None
        if target_order is None:
            target_order = next_order_value(docs, target_group, exclude_path=normalized)
    entry = {
        'title': title,
        'slug': slug,
        'path': normalized,
        'type': doc_type,
        'group': target_group,
        'order': int(target_order)
    }
    if source_url:
        entry['sourceUrl'] = source_url
    if doc_type == 'main':
        entry['remoteFallback'] = 'https://raw.githubusercontent.com/sqc-cyh/sqc-cyh.github.io/main/docs/LessonsNotes/D2CX_Xinanyuan/note.md'
    if found:
        found.update(entry)
    else:
        docs.append(entry)
    docs.sort(key=document_sort_key)
    save_library(data)


def find_library_entry(path: str) -> tuple[dict, list[dict], int]:
    data = load_library()
    normalized = f'./{path}' if not path.startswith('./') else path
    docs = data.setdefault('documents', [])
    index = next((i for i, doc in enumerate(docs) if doc.get('path') == normalized), None)
    if index is None:
        raise FileNotFoundError(f'document not found in library: {normalized}')
    entry = docs[index]
    if entry.get('type') == 'main':
        raise ValueError('main document cannot be deleted')
    return data, docs, index


def delete_library_entry(path: str) -> dict:
    data, docs, index = find_library_entry(path)
    entry = docs.pop(index)
    save_library(data)
    return entry


def update_document_meta(path: str, group: str | None = None, order: int | None = None) -> dict:
    data, docs, index = find_library_entry(path)
    entry = docs[index]
    target_group = normalize_group_name(group if group is not None else entry.get('group'))
    if order is None:
        if target_group == normalize_group_name(entry.get('group')):
            try:
                target_order = int(entry.get('order', next_order_value(docs, target_group, exclude_path=entry['path'])))
            except (TypeError, ValueError):
                target_order = next_order_value(docs, target_group, exclude_path=entry['path'])
        else:
            target_order = next_order_value(docs, target_group, exclude_path=entry['path'])
    else:
        target_order = int(order)
    entry['group'] = target_group
    entry['order'] = target_order
    ensure_group_exists(data, target_group)
    docs.sort(key=document_sort_key)
    save_library(data)
    return entry


def delete_document_file(entry: dict) -> dict:
    rel_path = entry['path'].lstrip('./')
    target = ROOT / rel_path
    if target.exists() and target.is_file():
        target.unlink()

    slug = entry.get('slug', '')
    asset_dir = ASSET_DIR / slug if slug else None
    if asset_dir and asset_dir.exists() and asset_dir.is_dir():
        shutil.rmtree(asset_dir)

    return {
        'path': f'./{rel_path}',
        'slug': slug,
        'deletedAssets': bool(asset_dir and not asset_dir.exists())
    }


def extract_main_html(url: str) -> tuple[str, str]:
    resp = requests.get(url, headers=HEADERS, timeout=30)
    resp.raise_for_status()
    soup = BeautifulSoup(resp.text, 'html.parser')
    title = soup.title.string.strip() if soup.title and soup.title.string else urlparse(url).netloc
    for tag in soup(['script', 'style', 'noscript', 'iframe', 'svg']):
        tag.decompose()
    candidates = [
        soup.find('article'),
        soup.find('main'),
        soup.select_one('.markdown-body'),
        soup.select_one('.content'),
        soup.select_one('#content'),
        soup.body,
    ]
    container = next((c for c in candidates if c is not None), soup)
    for node in container.find_all(['nav', 'footer', 'header', 'aside']):
        node.decompose()
    return title, str(container)


def download_and_rewrite_images(html: str, page_url: str, slug: str) -> str:
    soup = BeautifulSoup(html, 'html.parser')
    target_dir = ASSET_DIR / slug
    target_dir.mkdir(parents=True, exist_ok=True)
    for index, img in enumerate(soup.find_all('img'), start=1):
        src = img.get('src')
        if not src:
            continue
        img_url = urljoin(page_url, src)
        parsed = urlparse(img_url)
        ext = Path(parsed.path).suffix or '.png'
        filename = f'image-{index}{ext}'
        local_path = target_dir / filename
        try:
            r = requests.get(img_url, headers=HEADERS, timeout=30, stream=True)
            r.raise_for_status()
            with open(local_path, 'wb') as f:
                shutil.copyfileobj(r.raw, f)
            img['src'] = f'./content/assets/{slug}/{filename}'
        except Exception:
            img['src'] = img_url
    return str(soup)


def html_to_markdown(html: str, title: str) -> str:
    body = md(html, heading_style='ATX')
    body = re.sub(r'\n{3,}', '\n\n', body).strip()
    return f'---\ntitle: {title}\n---\n\n{body}\n'


def truthy_env(name: str, default: bool = False) -> bool:
    value = os.environ.get(name)
    if value is None:
        return default
    return value.strip().lower() in {'1', 'true', 'yes', 'on'}


def create_server(host: str, preferred_port: int, attempts: int = 20) -> tuple[ThreadingHTTPServer, int]:
    for offset in range(attempts):
        port = preferred_port + offset
        try:
            return ThreadingHTTPServer((host, port), Handler), port
        except OSError as exc:
            if exc.errno not in {98, 10048}:
                raise
    raise OSError(f'Unable to bind {host}:{preferred_port} after {attempts} attempts')


def print_startup_banner(url: str) -> None:
    print('=' * 72)
    print('可编辑笔记网站已启动')
    print(f'访问地址: {url}')
    print('抓取与保存位置:')
    print(f'  Markdown 主笔记: {CONTENT_DIR / "note.md"}')
    print(f'  导入后的 Markdown: {IMPORT_DIR}')
    print(f'  下载的图片资源: {ASSET_DIR}')
    print(f'  文档索引: {LIBRARY_FILE}')
    print('停止服务: Ctrl+C')
    print('=' * 72)


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def _send_json(self, data: dict, status: int = 200):
        payload = json.dumps(data, ensure_ascii=False).encode('utf-8')
        self.send_response(status)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Content-Length', str(len(payload)))
        self.end_headers()
        self.wfile.write(payload)

    def do_GET(self):
        parsed = urlparse(self.path)
        if parsed.path == '/api/import-url':
            query = parse_qs(parsed.query)
            url = (query.get('url') or [''])[0].strip()
            if not url:
                return self._send_json({'error': 'missing url'}, 400)
            try:
                ensure_dirs()
                title, html = extract_main_html(url)
                slug = slugify(title)
                html = download_and_rewrite_images(html, url, slug)
                markdown = html_to_markdown(html, title)
                print(f'[import] {url} -> assets/{slug}/')
                return self._send_json({'title': title, 'slug': slug, 'markdown': markdown})
            except Exception as exc:
                return self._send_json({'error': str(exc)}, 500)
        if parsed.path == '/api/library':
            return self._send_json(load_library())
        return super().do_GET()

    def do_POST(self):
        parsed = urlparse(self.path)
        try:
            if parsed.path == '/api/delete-document':
                length = int(self.headers.get('Content-Length', '0'))
                payload = json.loads(self.rfile.read(length).decode('utf-8'))
                _, docs, index = find_library_entry(payload['path'])
                entry = docs[index]
                result = delete_document_file(entry)
                delete_library_entry(payload['path'])
                print(f'[delete] {result["path"]}')
                return self._send_json({'ok': True, **result})
            if parsed.path == '/api/update-document-meta':
                length = int(self.headers.get('Content-Length', '0'))
                payload = json.loads(self.rfile.read(length).decode('utf-8'))
                entry = update_document_meta(payload['path'], payload.get('group'), payload.get('order'))
                print(f'[meta] {entry["path"]} -> group={entry.get("group", "")!r}, order={entry.get("order")}')
                return self._send_json({'ok': True, 'document': entry})
            if parsed.path == '/api/create-group':
                length = int(self.headers.get('Content-Length', '0'))
                payload = json.loads(self.rfile.read(length).decode('utf-8'))
                result = create_group(payload.get('name'))
                print(f'[group:create] {result["name"]!r}')
                return self._send_json({'ok': True, **result})
            if parsed.path == '/api/rename-group':
                length = int(self.headers.get('Content-Length', '0'))
                payload = json.loads(self.rfile.read(length).decode('utf-8'))
                result = rename_group(payload.get('oldName'), payload.get('newName'))
                print(f'[group:rename] {result["oldName"]!r} -> {result["newName"]!r}')
                return self._send_json({'ok': True, **result})
            if parsed.path == '/api/delete-group':
                length = int(self.headers.get('Content-Length', '0'))
                payload = json.loads(self.rfile.read(length).decode('utf-8'))
                result = delete_group(payload.get('name'))
                print(f'[group:delete] {result["name"]!r}')
                return self._send_json({'ok': True, **result})
            if parsed.path != '/api/save-document':
                return self._send_json({'error': 'not found'}, 404)
            length = int(self.headers.get('Content-Length', '0'))
            payload = json.loads(self.rfile.read(length).decode('utf-8'))
            rel_path = payload['path'].lstrip('./')
            target = ROOT / rel_path
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_text(payload['markdown'], encoding='utf-8')
            update_library_entry(
                rel_path,
                payload['title'],
                payload['slug'],
                payload.get('type', 'import'),
                payload.get('sourceUrl'),
                payload.get('group'),
                payload.get('order')
            )
            print(f'[save] {target}')
            return self._send_json({'ok': True, 'path': f'./{rel_path}'})
        except Exception as exc:
            return self._send_json({'error': str(exc)}, 500)


def main():
    ensure_dirs()
    host = os.environ.get('HOST', '127.0.0.1')
    preferred_port = int(os.environ.get('PORT', '8000'))
    server, port = create_server(host, preferred_port)
    browser_host = '127.0.0.1' if host in {'0.0.0.0', '::'} else host
    url = f'http://{browser_host}:{port}'
    print_startup_banner(url)
    if port != preferred_port:
        print(f'[提示] 端口 {preferred_port} 已占用，已自动切换到 {port}')
    if truthy_env('AUTO_OPEN_BROWSER', default=False):
        try:
            webbrowser.open(url)
        except Exception as exc:
            print(f'[提示] 自动打开浏览器失败，请手动访问: {url} ({exc})')
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print('\nShutting down...')
    finally:
        server.server_close()


if __name__ == '__main__':
    main()
