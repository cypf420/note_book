#!/usr/bin/env python3
from __future__ import annotations

import json
import os
import re
import shutil
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
SESSION = requests.Session()
SESSION.headers.update(HEADERS)
MAX_IMPORT_IMAGES = 80
ALLOWED_IMG_EXTS = {'.png', '.jpg', '.jpeg', '.gif', '.webp', '.bmp', '.svg', '.avif'}


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
    return json.loads(LIBRARY_FILE.read_text(encoding='utf-8'))


def save_library(data: dict) -> None:
    LIBRARY_FILE.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding='utf-8')


def update_library_entry(path: str, title: str, slug: str, doc_type: str, source_url: str | None = None) -> None:
    data = load_library()
    docs = data.setdefault('documents', [])
    normalized = f'./{path}' if not path.startswith('./') else path
    entry = {'title': title, 'slug': slug, 'path': normalized, 'type': doc_type}
    if source_url:
      entry['sourceUrl'] = source_url
    if doc_type == 'main':
        entry['remoteFallback'] = 'https://raw.githubusercontent.com/sqc-cyh/sqc-cyh.github.io/main/docs/LessonsNotes/D2CX_Xinanyuan/note.md'
    found = next((doc for doc in docs if doc['path'] == normalized), None)
    if found:
        found.update(entry)
    else:
        docs.append(entry)
    docs.sort(key=lambda x: (0 if x.get('type') == 'main' else 1, x.get('title', '')))
    save_library(data)


def extract_main_html(url: str, html_text: str | None = None) -> tuple[str, str]:
    if html_text is None:
        resp = requests.get(url, headers=HEADERS, timeout=30)
        resp.raise_for_status()
        html_text = resp.text
    soup = BeautifulSoup(html_text, 'html.parser')
    title = soup.title.string.strip() if soup.title and soup.title.string else urlparse(url).netloc
    for tag in soup(['script', 'style', 'noscript', 'iframe', 'svg']):
        tag.decompose()
    candidates = [
        soup.find('article'),
        soup.find('main'),
        soup.select_one('[role="main"]'),
        soup.select_one('.markdown-body'),
        soup.select_one('.post-content'),
        soup.select_one('.article-content'),
        soup.select_one('#content'),
        soup.select_one('#main-content')
    ]
    direct = [node for node in direct if node is not None]
    if direct:
        best_direct = max(direct, key=_candidate_score)
        if _candidate_score(best_direct) > 120:
            return best_direct
    candidates = soup.find_all(['article', 'main', 'section', 'div'])
    best = None
    best_score = -1.0
    for node in candidates:
        score = _candidate_score(node)
        if score > best_score:
            best_score = score
            best = node
    return best if best is not None else soup.body or soup


def extract_main_html(url: str, html_text: str | None = None) -> tuple[str, str]:
    if html_text is None:
        resp = fetch_url_text(url)
        resp.raise_for_status()
        if not resp.encoding:
            resp.encoding = resp.apparent_encoding or 'utf-8'
        html_text = resp.text
    soup = BeautifulSoup(html_text, 'html.parser')
    meta_title = soup.find('meta', attrs={'property': 'og:title'})
    page_title = (meta_title.get('content') or '').strip() if meta_title else ''
    title = page_title or (soup.title.string.strip() if soup.title and soup.title.string else urlparse(url).netloc)
    for tag in soup(['script', 'style', 'noscript', 'iframe', 'svg']):
        tag.decompose()
    container = _pick_content_container(soup)
    for node in container.find_all(['nav', 'footer', 'header', 'aside', 'form']):
        node.decompose()
    for node in container.select('.advertisement, .ads, .share, .social, .comment, .comments, .recommend, .related'):
        node.decompose()
    return title, str(container)


def extract_title_from_markdown(markdown: str, fallback: str) -> str:
    for line in markdown.splitlines():
        text = line.strip()
        if text.startswith('#'):
            return re.sub(r'^#+\s*', '', text).strip() or fallback
    return fallback


def is_markdown_like(url: str, content_type: str, text: str) -> bool:
    if urlparse(url).path.lower().endswith(('.md', '.markdown', '.mdown')):
        return True
    ctype = (content_type or '').lower()
    if 'markdown' in ctype:
        return True
    sample = text[:3000]
    has_html_structure = bool(re.search(r'<(html|head|body|article|main|div|section)\b', sample, re.I))
    has_md_structure = bool(re.search(r'(^|\n)\s{0,3}(#{1,6}\s+|[-*+]\s+|\d+\.\s+|```)', sample))
    return has_md_structure and not has_html_structure


def is_plain_text_like(content_type: str, text: str) -> bool:
    ctype = (content_type or '').lower()
    if 'text/plain' not in ctype:
        return False
    sample = text[:3000]
    has_html_structure = bool(re.search(r'<(html|head|body|article|main|div|section)\b', sample, re.I))
    return not has_html_structure


def download_and_rewrite_images(html: str, page_url: str, slug: str) -> tuple[str, dict]:
    soup = BeautifulSoup(html, 'html.parser')
    target_dir = ASSET_DIR / slug
    target_dir.mkdir(parents=True, exist_ok=True)
    total = 0
    downloaded = 0
    failed = 0
    for index, img in enumerate(soup.find_all('img'), start=1):
        total += 1
        src = img.get('src')
        if not src:
            failed += 1
            continue
        img_url = urljoin(page_url, src)
        ext = _safe_image_ext(img_url)
        filename = f'image-{index}{ext}'
        local_path = target_dir / filename
        try:
            r = SESSION.get(img_url, timeout=30, stream=True)
            r.raise_for_status()
            ctype = (r.headers.get('Content-Type') or '').lower()
            if ctype and 'image' not in ctype:
                failed += 1
                img['src'] = img_url
                continue
            with open(local_path, 'wb') as f:
                shutil.copyfileobj(r.raw, f)
            img['src'] = f'./content/assets/{slug}/{filename}'
            downloaded += 1
        except Exception:
            img['src'] = img_url
            failed += 1
    return str(soup), {'total': total, 'downloaded': downloaded, 'failed': failed}


def html_to_markdown(html: str, title: str) -> str:
    body = md(html, heading_style='ATX')
    body = re.sub(r'\n{3,}', '\n\n', body).strip()
    return f'---\ntitle: {title}\n---\n\n{body}\n'


def normalize_markdown(markdown: str, title: str) -> str:
    body = markdown.strip()
    if body.startswith('---'):
        return body + '\n'
    return f'---\ntitle: {title}\n---\n\n{body}\n'


def plain_text_to_markdown(text: str, title: str) -> str:
    body = text.strip()
    body = re.sub(r'\n{3,}', '\n\n', body)
    if not body:
        body = '(empty)'
    return f'---\ntitle: {title}\n---\n\n{body}\n'


def import_url_to_markdown(url: str) -> tuple[str, str, str, dict]:
    resp = requests.get(url, headers=HEADERS, timeout=30)
    resp.raise_for_status()
    ctype = resp.headers.get('Content-Type', '')
    text = resp.text
    if is_markdown_like(url, ctype, text):
        fallback = Path(urlparse(url).path).stem.replace('-', ' ').replace('_', ' ').strip() or urlparse(url).netloc
        title = extract_title_from_markdown(text, fallback)
        slug = slugify(title)
        return title, slug, normalize_markdown(text, title), {'detectedType': 'markdown', 'images': {'total': 0, 'downloaded': 0, 'failed': 0}}
    if is_plain_text_like(ctype, text):
        fallback = Path(urlparse(url).path).stem.replace('-', ' ').replace('_', ' ').strip() or urlparse(url).netloc
        first_line = next((line.strip() for line in text.splitlines() if line.strip()), fallback)
        title = first_line[:80] if first_line else fallback
        slug = slugify(title)
        return title, slug, plain_text_to_markdown(text, title), {'detectedType': 'text', 'images': {'total': 0, 'downloaded': 0, 'failed': 0}}
    title, html = extract_main_html(url, text)
    slug = slugify(title)
    html, image_stats = download_and_rewrite_images(html, url, slug)
    markdown = html_to_markdown(html, title)
    return title, slug, markdown, {'detectedType': 'html', 'images': image_stats}


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
                title, slug, markdown, meta = import_url_to_markdown(url)
                return self._send_json({'title': title, 'slug': slug, 'markdown': markdown, 'meta': meta})
            except Exception as exc:
                return self._send_json({'error': str(exc)}, 500)
        if parsed.path == '/api/library':
            return self._send_json(load_library())
        return super().do_GET()

    def do_POST(self):
        parsed = urlparse(self.path)
        if parsed.path != '/api/save-document':
            return self._send_json({'error': 'not found'}, 404)
        try:
            length = int(self.headers.get('Content-Length', '0'))
            payload = json.loads(self.rfile.read(length).decode('utf-8'))
            rel_path = payload['path'].lstrip('./')
            target = ROOT / rel_path
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_text(payload['markdown'], encoding='utf-8')
            update_library_entry(rel_path, payload['title'], payload['slug'], payload.get('type', 'import'), payload.get('sourceUrl'))
            return self._send_json({'ok': True, 'path': f'./{rel_path}'})
        except Exception as exc:
            return self._send_json({'error': str(exc)}, 500)


def main():
    ensure_dirs()
    port = int(os.environ.get('PORT', '8000'))
    server = ThreadingHTTPServer(('127.0.0.1', port), Handler)
    print(f'Serving editable note site at http://127.0.0.1:{port}')
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print('\nShutting down...')


if __name__ == '__main__':
    main()
