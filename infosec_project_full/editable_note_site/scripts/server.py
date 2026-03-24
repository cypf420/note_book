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
        documents = []
        guide_path = IMPORT_DIR / '新手引导.md'
        if guide_path.exists():
            documents.append({
                'title': '新手引导',
                'slug': '新手引导',
                'path': './content/imports/新手引导.md',
                'type': 'import',
                'group': '帮助',
                'order': 1
            })
        LIBRARY_FILE.write_text(json.dumps({
            'groups': [{'name': '帮助', 'order': 1}] if documents else [],
            'documents': documents
        }, ensure_ascii=False, indent=2), encoding='utf-8')


def load_library() -> dict:
    ensure_dirs()
    data = json.loads(LIBRARY_FILE.read_text(encoding='utf-8'))
    return normalize_library_data(data)


def save_library(data: dict) -> None:
    normalized = normalize_library_data(data)
    LIBRARY_FILE.write_text(json.dumps(normalized, ensure_ascii=False, indent=2), encoding='utf-8')


def normalize_group_name(group: str | None) -> str:
    text = (group or '').replace('\\', '/').strip()
    if not text:
        return ''
    parts = [part.strip() for part in text.split('/') if part.strip()]
    return '/'.join(parts)


def validate_group_name(group: str | None, allow_empty: bool = True) -> str:
    normalized = normalize_group_name(group)
    if not normalized:
        if allow_empty:
            return ''
        raise ValueError('分组名不能为空')
    if normalized.startswith('/') or normalized.endswith('/') or '//' in normalized:
        raise ValueError('分组层级格式不正确')
    parts = normalized.split('/')
    if any(not part for part in parts):
        raise ValueError('分组层级格式不正确')
    for part in parts:
        if len(part) > 50:
            raise ValueError('每级分组名不能超过 50 个字符')
        if re.search(r'[\\:*?"<>|]', part):
            raise ValueError('分组名不能包含 \\ : * ? " < > |')
    return normalized


def split_group_name(group: str | None) -> list[str]:
    normalized = normalize_group_name(group)
    return normalized.split('/') if normalized else []


def group_parent_name(group: str | None) -> str:
    parts = split_group_name(group)
    return '/'.join(parts[:-1]) if len(parts) > 1 else ''


def group_leaf_name(group: str | None) -> str:
    parts = split_group_name(group)
    return parts[-1] if parts else ''


def join_group_name(parent: str | None, leaf: str | None) -> str:
    parent_name = validate_group_name(parent)
    leaf_name = validate_group_name(leaf, allow_empty=False)
    if '/' in leaf_name:
        raise ValueError('新建子分组时，名称不能再包含 /')
    return f'{parent_name}/{leaf_name}' if parent_name else leaf_name


def is_group_within(group: str | None, root: str | None) -> bool:
    group_name = validate_group_name(group)
    root_name = validate_group_name(root)
    if not root_name:
        return True
    return group_name == root_name or group_name.startswith(f'{root_name}/')


def count_group_siblings(groups: list[dict], parent: str) -> int:
    normalized_parent = validate_group_name(parent)
    return sum(1 for item in groups if group_parent_name(item.get('name')) == normalized_parent)


def validate_doc_path(path: str) -> str:
    normalized = path.lstrip('./').replace('\\', '/')
    if normalized == 'content/note.md':
        return normalized
    if normalized.startswith('content/imports/') and normalized.endswith('.md') and '..' not in normalized:
        return normalized
    raise ValueError('文档路径不被允许')


def normalize_library_data(data: dict) -> dict:
    docs = data.setdefault('documents', [])
    groups = data.setdefault('groups', [])

    normalized_groups: list[dict] = []
    seen: set[str] = set()
    for index, group in enumerate(groups, start=1):
        if isinstance(group, dict):
            name = validate_group_name(group.get('name'))
            order = group.get('order', index)
        else:
            name = validate_group_name(str(group))
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
        group = validate_group_name(doc.get('group'))
        doc['group'] = group
        try:
            doc['order'] = int(doc.get('order', next_order_value(docs, group, exclude_path=doc.get('path'))))
        except (TypeError, ValueError):
            doc['order'] = next_order_value(docs, group, exclude_path=doc.get('path'))
        if group and group not in seen:
            seen.add(group)
            normalized_groups.append({'name': group, 'order': len(normalized_groups) + 1})

    for group in list(normalized_groups):
        parent = group_parent_name(group['name'])
        if parent and parent not in seen:
            seen.add(parent)
            normalized_groups.append({'name': parent, 'order': len(normalized_groups) + 1})

    normalized_groups.sort(key=lambda item: (
        len(split_group_name(item.get('name'))),
        group_parent_name(item.get('name')).lower(),
        int(item.get('order', 999999)),
        item.get('name', '').lower()
    ))
    for index, group in enumerate(normalized_groups, start=1):
        group['order'] = index
    data['groups'] = normalized_groups
    docs.sort(key=document_sort_key)
    return data


def ensure_group_exists(data: dict, group: str) -> None:
    normalized = validate_group_name(group)
    if not normalized:
        return
    groups = data.setdefault('groups', [])
    parent = group_parent_name(normalized)
    if parent:
        ensure_group_exists(data, parent)
    if any(normalize_group_name(item.get('name')) == normalized for item in groups):
        return
    groups.append({'name': normalized, 'order': count_group_siblings(groups, parent) + 1})


def find_group_entry(data: dict, group: str) -> tuple[list[dict], int]:
    normalized = validate_group_name(group, allow_empty=False)
    groups = data.setdefault('groups', [])
    index = next((i for i, item in enumerate(groups) if normalize_group_name(item.get('name')) == normalized), None)
    if index is None:
        raise FileNotFoundError(f'分组不存在：{normalized}')
    return groups, index


def create_group(group: str, parent: str | None = None) -> dict:
    normalized = join_group_name(parent, group) if parent is not None else validate_group_name(group, allow_empty=False)
    data = load_library()
    groups = data.setdefault('groups', [])
    if any(normalize_group_name(item.get('name')) == normalized for item in groups):
        raise ValueError('分组已存在')
    ensure_group_exists(data, group_parent_name(normalized))
    groups.append({'name': normalized, 'order': count_group_siblings(groups, group_parent_name(normalized)) + 1})
    save_library(data)
    return {'name': normalized, 'parent': group_parent_name(normalized)}


def rename_group(old_group: str, new_group: str) -> dict:
    old_name = validate_group_name(old_group, allow_empty=False)
    new_name = validate_group_name(new_group, allow_empty=False)
    data = load_library()
    groups, index = find_group_entry(data, old_name)
    if new_name != old_name and any(
        normalize_group_name(item.get('name')) == new_name or normalize_group_name(item.get('name')).startswith(f'{new_name}/')
        for item in groups
    ):
        raise ValueError('目标分组已存在')
    ensure_group_exists(data, group_parent_name(new_name))
    prefix = f'{old_name}/'
    for item in groups:
        item_name = normalize_group_name(item.get('name'))
        if item_name == old_name:
            item['name'] = new_name
        elif item_name.startswith(prefix):
            item['name'] = f'{new_name}/{item_name[len(prefix):]}'
    for doc in data.setdefault('documents', []):
        doc_group = normalize_group_name(doc.get('group'))
        if doc_group == old_name:
            doc['group'] = new_name
        elif doc_group.startswith(prefix):
            doc['group'] = f'{new_name}/{doc_group[len(prefix):]}'
    save_library(data)
    return {'oldName': old_name, 'newName': new_name}


def update_group_parent(group: str, parent: str | None = None) -> dict:
    name = validate_group_name(group, allow_empty=False)
    parent_name = validate_group_name(parent)
    data = load_library()
    groups, _ = find_group_entry(data, name)
    if parent_name and is_group_within(parent_name, name):
        raise ValueError('不能把分组移动到它自己的子分组里')
    target_name = f'{parent_name}/{group_leaf_name(name)}' if parent_name else group_leaf_name(name)
    target_name = validate_group_name(target_name, allow_empty=False)
    if target_name != name and any(
        normalize_group_name(item.get('name')) == target_name or normalize_group_name(item.get('name')).startswith(f'{target_name}/')
        for item in groups
    ):
        raise ValueError('目标位置已经存在同名分组')
    if target_name == name:
        return {'name': name, 'parent': group_parent_name(name)}
    ensure_group_exists(data, parent_name)
    prefix = f'{name}/'
    for item in groups:
        item_name = normalize_group_name(item.get('name'))
        if item_name == name:
            item['name'] = target_name
        elif item_name.startswith(prefix):
            item['name'] = f'{target_name}/{item_name[len(prefix):]}'
    for doc in data.setdefault('documents', []):
        doc_group = normalize_group_name(doc.get('group'))
        if doc_group == name:
            doc['group'] = target_name
        elif doc_group.startswith(prefix):
            doc['group'] = f'{target_name}/{doc_group[len(prefix):]}'
    save_library(data)
    return {'name': target_name, 'parent': parent_name, 'oldName': name}


def delete_group(group: str) -> dict:
    normalized = validate_group_name(group, allow_empty=False)
    data = load_library()
    if any(is_group_within(doc.get('group'), normalized) for doc in data.setdefault('documents', [])):
        raise ValueError('分组内还有笔记，不能删除')
    if any(
        normalize_group_name(item.get('name')) != normalized and is_group_within(item.get('name'), normalized)
        for item in data.setdefault('groups', [])
    ):
        raise ValueError('分组下还有子分组，不能删除')
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
    safe_path = validate_doc_path(path)
    normalized = f'./{safe_path}' if not safe_path.startswith('./') else safe_path
    found = next((doc for doc in docs if doc['path'] == normalized), None)
    current_group = normalize_group_name(found.get('group')) if found else ''
    target_group = current_group if group is None else validate_group_name(group)
    ensure_group_exists(data, target_group)
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
    safe_path = validate_doc_path(path)
    normalized = f'./{safe_path}' if not safe_path.startswith('./') else safe_path
    docs = data.setdefault('documents', [])
    index = next((i for i, doc in enumerate(docs) if doc.get('path') == normalized), None)
    if index is None:
        raise FileNotFoundError(f'文档不存在：{normalized}')
    entry = docs[index]
    if entry.get('type') == 'main':
        raise ValueError('该保留文档不能删除')
    return data, docs, index


def delete_library_entry(path: str) -> dict:
    data, docs, index = find_library_entry(path)
    entry = docs.pop(index)
    save_library(data)
    return entry


def update_document_meta(path: str, group: str | None = None, order: int | None = None) -> dict:
    data, docs, index = find_library_entry(path)
    entry = docs[index]
    target_group = validate_group_name(group if group is not None else entry.get('group'))
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


def validate_import_url(url: str) -> str:
    parsed = urlparse(url.strip())
    if parsed.scheme not in {'http', 'https'}:
        raise ValueError('只允许导入 http 或 https 网页')
    return url.strip()


def fetch_url_text(url: str) -> requests.Response:
    response = SESSION.get(url, timeout=30)
    response.raise_for_status()
    if not response.encoding:
        response.encoding = response.apparent_encoding or 'utf-8'
    return response


def _candidate_score(node) -> float:
    if node is None:
        return -1.0
    text = node.get_text(' ', strip=True)
    text_length = len(text)
    score = float(text_length)
    score += len(node.find_all('p')) * 45
    score += len(node.find_all(['h1', 'h2', 'h3'])) * 18
    score += len(node.find_all('li')) * 4
    score += len(node.find_all('img')) * 6
    if node.name in {'article', 'main'}:
        score += 120
    elif node.name == 'section':
        score += 30
    elif node.name in {'nav', 'footer', 'aside', 'header', 'form'}:
        score -= 320
    attrs = f"{' '.join(node.get('class', []))} {node.get('id', '')}".lower()
    if re.search(r'comment|sidebar|footer|header|nav|menu|share|social|recommend|related|ads?|banner', attrs):
        score -= 240
    return score


def _pick_content_container(soup: BeautifulSoup):
    direct_candidates = [
        soup.find('article'),
        soup.find('main'),
        soup.select_one('[role="main"]'),
        soup.select_one('.markdown-body'),
        soup.select_one('.post-content'),
        soup.select_one('.article-content'),
        soup.select_one('.content'),
        soup.select_one('#content'),
        soup.select_one('#main-content'),
        soup.body,
    ]
    direct = [node for node in direct_candidates if node is not None]
    if direct:
        best_direct = max(direct, key=_candidate_score)
        if _candidate_score(best_direct) > 120:
            return best_direct
    candidates = soup.find_all(['article', 'main', 'section', 'div'])
    best = max(candidates, key=_candidate_score, default=None)
    return best if best is not None else soup.body or soup


def _safe_image_ext(image_url: str, content_type: str = '') -> str:
    suffix = Path(urlparse(image_url).path).suffix.lower()
    if suffix in ALLOWED_IMG_EXTS:
        return suffix
    content_type = content_type.lower()
    if 'svg' in content_type:
        return '.svg'
    if 'jpeg' in content_type or 'jpg' in content_type:
        return '.jpg'
    if 'gif' in content_type:
        return '.gif'
    if 'webp' in content_type:
        return '.webp'
    if 'bmp' in content_type:
        return '.bmp'
    if 'avif' in content_type:
        return '.avif'
    return '.png'


def extract_main_html(url: str, html_text: str | None = None) -> tuple[str, str]:
    if html_text is None:
        response = fetch_url_text(url)
        html_text = response.text
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
    content_type = (content_type or '').lower()
    if 'markdown' in content_type:
        return True
    sample = text[:3000]
    has_html_structure = bool(re.search(r'<(html|head|body|article|main|div|section)\b', sample, re.I))
    has_md_structure = bool(re.search(r'(^|\n)\s{0,3}(#{1,6}\s+|[-*+]\s+|\d+\.\s+|```)', sample))
    return has_md_structure and not has_html_structure


def is_plain_text_like(content_type: str, text: str) -> bool:
    content_type = (content_type or '').lower()
    if 'text/plain' not in content_type:
        return False
    sample = text[:3000]
    has_html_structure = bool(re.search(r'<(html|head|body|article|main|div|section)\b', sample, re.I))
    return not has_html_structure


def download_and_rewrite_images(html: str, page_url: str, slug: str) -> tuple[str, dict]:
    soup = BeautifulSoup(html, 'html.parser')
    images = soup.find_all('img')
    total = len(images)
    downloaded = 0
    failed = max(0, total - MAX_IMPORT_IMAGES)
    if total:
        target_dir = ASSET_DIR / slug
        target_dir.mkdir(parents=True, exist_ok=True)
    for index, img in enumerate(images[:MAX_IMPORT_IMAGES], start=1):
        src = (img.get('src') or img.get('data-src') or img.get('data-original') or '').strip()
        if not src:
            failed += 1
            continue
        img_url = urljoin(page_url, src)
        try:
            response = SESSION.get(img_url, timeout=30, stream=True)
            response.raise_for_status()
            content_type = (response.headers.get('Content-Type') or '').lower()
            if content_type and 'image' not in content_type:
                failed += 1
                img['src'] = img_url
                continue
            ext = _safe_image_ext(img_url, content_type)
            filename = f'image-{index}{ext}'
            local_path = ASSET_DIR / slug / filename
            with open(local_path, 'wb') as file_obj:
                shutil.copyfileobj(response.raw, file_obj)
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
    body = re.sub(r'\n{3,}', '\n\n', text.strip())
    return f'---\ntitle: {title}\n---\n\n{body or "(empty)"}\n'


def import_url_to_markdown(url: str) -> tuple[str, str, str, dict]:
    safe_url = validate_import_url(url)
    response = fetch_url_text(safe_url)
    content_type = response.headers.get('Content-Type', '')
    text = response.text
    if urlparse(safe_url).path.lower().endswith('.txt') and is_plain_text_like(content_type, text):
        fallback = Path(urlparse(safe_url).path).stem.replace('-', ' ').replace('_', ' ').strip() or urlparse(safe_url).netloc
        first_line = next((line.strip() for line in text.splitlines() if line.strip()), fallback)
        title = first_line[:80] if first_line else fallback
        slug = slugify(title)
        return title, slug, plain_text_to_markdown(text, title), {'detectedType': 'text', 'images': {'total': 0, 'downloaded': 0, 'failed': 0}}
    if is_markdown_like(safe_url, content_type, text):
        fallback = Path(urlparse(safe_url).path).stem.replace('-', ' ').replace('_', ' ').strip() or urlparse(safe_url).netloc
        title = extract_title_from_markdown(text, fallback)
        slug = slugify(title)
        return title, slug, normalize_markdown(text, title), {'detectedType': 'markdown', 'images': {'total': 0, 'downloaded': 0, 'failed': 0}}
    if is_plain_text_like(content_type, text):
        fallback = Path(urlparse(safe_url).path).stem.replace('-', ' ').replace('_', ' ').strip() or urlparse(safe_url).netloc
        first_line = next((line.strip() for line in text.splitlines() if line.strip()), fallback)
        title = first_line[:80] if first_line else fallback
        slug = slugify(title)
        return title, slug, plain_text_to_markdown(text, title), {'detectedType': 'text', 'images': {'total': 0, 'downloaded': 0, 'failed': 0}}
    title, html = extract_main_html(safe_url, text)
    slug = slugify(title)
    html, image_stats = download_and_rewrite_images(html, safe_url, slug)
    markdown = html_to_markdown(html, title)
    return title, slug, markdown, {'detectedType': 'html', 'images': image_stats}


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
    print('本地笔记工作台已启动')
    print(f'访问地址: {url}')
    print('抓取与保存位置:')
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
                title, slug, markdown, meta = import_url_to_markdown(url)
                print(f'[import] {url} -> type={meta.get("detectedType")} assets={meta.get("images", {}).get("downloaded", 0)}/{meta.get("images", {}).get("total", 0)}')
                return self._send_json({'title': title, 'slug': slug, 'markdown': markdown, 'meta': meta})
            except ValueError as exc:
                return self._send_json({'error': str(exc)}, 400)
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
                result = create_group(payload.get('name'), payload.get('parent'))
                print(f'[group:create] {result["name"]!r}')
                return self._send_json({'ok': True, **result})
            if parsed.path == '/api/rename-group':
                length = int(self.headers.get('Content-Length', '0'))
                payload = json.loads(self.rfile.read(length).decode('utf-8'))
                result = rename_group(payload.get('oldName'), payload.get('newName'))
                print(f'[group:rename] {result["oldName"]!r} -> {result["newName"]!r}')
                return self._send_json({'ok': True, **result})
            if parsed.path == '/api/update-group-parent':
                length = int(self.headers.get('Content-Length', '0'))
                payload = json.loads(self.rfile.read(length).decode('utf-8'))
                result = update_group_parent(payload.get('name'), payload.get('parent'))
                print(f'[group:move] {result["oldName"]!r} -> parent {result["parent"]!r}')
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
            rel_path = validate_doc_path(payload['path'])
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
        except (ValueError, FileNotFoundError) as exc:
            return self._send_json({'error': str(exc)}, 400)
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
