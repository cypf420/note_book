#!/usr/bin/env python3
from __future__ import annotations

import json
import os
import re
import shutil
import subprocess
import tempfile
import webbrowser
from datetime import datetime, timezone
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, quote, urljoin, urlparse

import requests
from bs4 import BeautifulSoup

import import_pipeline as pipeline

ROOT = Path(__file__).resolve().parent.parent


def find_git_repo_root(start: Path) -> Path:
    try:
        result = subprocess.run(
            ['git', 'rev-parse', '--show-toplevel'],
            cwd=str(start),
            check=False,
            capture_output=True,
            text=True,
            encoding='utf-8',
            errors='ignore',
        )
    except OSError:
        return start
    if result.returncode != 0:
        return start
    text = result.stdout.strip()
    return Path(text) if text else start


REPO_ROOT = find_git_repo_root(ROOT)
try:
    SITE_REPO_ROOT = ROOT.relative_to(REPO_ROOT)
except ValueError:
    SITE_REPO_ROOT = Path('.')
CONTENT_DIR = ROOT / 'content'
IMPORT_DIR = CONTENT_DIR / 'imports'
ASSET_DIR = CONTENT_DIR / 'assets'
LIBRARY_FILE = CONTENT_DIR / 'library.json'
RUNTIME_DIR = ROOT / 'runtime'
SERVER_STATE_FILE = RUNTIME_DIR / 'server-state.json'
STOP_BAT_FILE = ROOT / 'stop.bat'
SHARED_NOTES_DIRNAME = 'shared_notes'
SHARED_NOTES_LOCAL_DIR = ROOT / SHARED_NOTES_DIRNAME
SHARED_INDEX_FILENAME = 'shared-index.json'
SHARED_INDEX_FILE = SHARED_NOTES_LOCAL_DIR / SHARED_INDEX_FILENAME
SHARE_BRANCH_PREFIX = 'notes/'
AUTOMATION_COMMIT_NAME = 'Note Book Publisher'
AUTOMATION_COMMIT_EMAIL = 'note-book@local.invalid'
HEADERS = {'User-Agent': 'EditableNoteSite/3.0 (+https://127.0.0.1)'}
SESSION = requests.Session()
SESSION.headers.update(HEADERS)
MAX_IMPORT_IMAGES = 80
ALLOWED_IMG_EXTS = {'.png', '.jpg', '.jpeg', '.gif', '.webp', '.bmp', '.svg', '.avif'}
GUIDE_GROUP_NAME = '新手引导'
LEGACY_GUIDE_GROUP_NAME = '帮助'


def slugify(text: str) -> str:
    text = text.strip().lower()
    text = re.sub(r'[^\w\u4e00-\u9fa5-]+', '-', text)
    text = re.sub(r'-+', '-', text).strip('-')
    return text or 'untitled'


def iso_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def bundle_repo_path(*parts: str) -> Path:
    base = SITE_REPO_ROOT / SHARED_NOTES_DIRNAME if SITE_REPO_ROOT != Path('.') else Path(SHARED_NOTES_DIRNAME)
    path = base
    for part in parts:
        path = path / part
    return path


def run_git(args: list[str], cwd: Path | None = None, check: bool = True, text: bool = True) -> subprocess.CompletedProcess:
    try:
        result = subprocess.run(
            ['git', *args],
            cwd=str(cwd or REPO_ROOT),
            check=False,
            capture_output=True,
            text=text,
            encoding='utf-8' if text else None,
            errors='ignore' if text else None,
        )
    except OSError as exc:
        raise RuntimeError(f'无法执行 git：{exc}') from exc
    if check and result.returncode != 0:
        detail = (result.stderr or result.stdout or '').strip()
        raise RuntimeError(detail or f'git {" ".join(args)} 执行失败')
    return result


def ensure_git_remote_origin() -> str:
    if REPO_ROOT == ROOT and not (REPO_ROOT / '.git').exists():
        raise RuntimeError('当前目录不是 Git 仓库，无法上传共享笔记')
    result = run_git(['remote', 'get-url', 'origin'])
    remote = result.stdout.strip()
    if not remote:
        raise RuntimeError('没有检测到 origin 远程仓库，无法上传共享笔记')
    return remote


def shared_index_repo_path() -> Path:
    if SITE_REPO_ROOT == Path('.'):
        return Path(SHARED_NOTES_DIRNAME) / SHARED_INDEX_FILENAME
    return SITE_REPO_ROOT / SHARED_NOTES_DIRNAME / SHARED_INDEX_FILENAME


def normalize_share_text(value: str | None, label: str, *, allow_empty: bool = False, max_len: int = 160) -> str:
    text = re.sub(r'\s+', ' ', (value or '').strip())
    if not text:
        if allow_empty:
            return ''
        raise ValueError(f'{label}不能为空')
    text = text.strip(' ./-_')
    if not text:
        if allow_empty:
            return ''
        raise ValueError(f'{label}不能为空')
    if text.endswith('.lock') or '..' in text or '@{' in text:
        raise ValueError(f'{label}格式不合法')
    return text[:max_len]


def normalize_share_value(value: str | None, label: str) -> str:
    text = normalize_share_text(value, label)
    text = re.sub(r'\s+', '', text)
    text = re.sub(r'[^\w\u4e00-\u9fa5-]+', '_', text, flags=re.UNICODE)
    text = re.sub(r'_+', '_', text).strip('._-/')
    if not text:
        raise ValueError(f'{label}不能为空')
    return text[:80]


def slugify_share_branch_part(value: str | None, label: str) -> str:
    text = normalize_share_text(value, label)
    text = re.sub(r'\s+', '-', text)
    text = re.sub(r'[^\w\u4e00-\u9fa5-]+', '-', text, flags=re.UNICODE)
    text = re.sub(r'-+', '-', text).strip('-.')
    if not text:
        raise ValueError(f'{label}格式不合法')
    return text[:80]


def get_git_config_value(key: str) -> str:
    result = run_git(['config', '--get', key], check=False)
    return (result.stdout or '').strip()


def get_remote_default_branch_name() -> str:
    result = run_git(['ls-remote', '--symref', 'origin', 'HEAD'], check=False)
    for line in result.stdout.splitlines():
        if not line.startswith('ref: '):
            continue
        ref = line.split('\t', 1)[0].split(' ', 1)[1].strip()
        if ref.startswith('refs/heads/'):
            return ref[len('refs/heads/'):]
    return 'main'


def detect_share_author(remote_url: str = '') -> str:
    repo_info = parse_github_repo(remote_url) if remote_url else {}
    email = get_git_config_value('user.email')
    email_local = email.split('@', 1)[0].strip() if '@' in email else email.strip()
    candidates = [
        get_git_config_value('user.name'),
        email_local,
        os.environ.get('GITHUB_ACTOR', ''),
        os.environ.get('USERNAME', ''),
        os.environ.get('USER', ''),
        repo_info.get('owner', ''),
    ]
    for candidate in candidates:
        text = normalize_share_text(candidate, '作者', allow_empty=True, max_len=80)
        if text:
            return text
    return 'anonymous'


def normalize_share_tags(value: str | list[str] | None) -> list[str]:
    if value is None:
        return []
    raw_items = value if isinstance(value, list) else re.split(r'[\n,，;；]+', str(value))
    tags: list[str] = []
    seen: set[str] = set()
    for item in raw_items:
        text = normalize_share_text(item, '标签', allow_empty=True, max_len=32)
        if not text:
            continue
        key = text.casefold()
        if key in seen:
            continue
        seen.add(key)
        tags.append(text)
        if len(tags) >= 12:
            break
    return tags


def derive_share_tags(value: str | list[str] | None, library_data: dict) -> list[str]:
    tags = normalize_share_tags(value)
    if tags:
        return tags
    inferred: list[str] = []
    for group in library_data.get('groups', []):
        leaf = group_leaf_name(group.get('name'))
        if leaf and leaf not in {GUIDE_GROUP_NAME, '共享笔记'}:
            inferred.append(leaf)
    for doc in sort_documents_for_share(library_data.get('documents', [])):
        title = normalize_share_text(doc.get('title'), '标签', allow_empty=True, max_len=32)
        if title:
            inferred.append(title)
        if len(inferred) >= 12:
            break
    return normalize_share_tags(inferred)


def derive_share_summary(value: str | None, library_data: dict) -> str:
    summary = normalize_share_text(value, '简介', allow_empty=True, max_len=200)
    if summary:
        return summary
    documents = sort_documents_for_share(library_data.get('documents', []))
    if not documents:
        return '当前共享分支还没有写入笔记内容。'
    titles = [normalize_share_text(doc.get('title'), '标题', allow_empty=True, max_len=48) for doc in documents]
    titles = [title for title in titles if title]
    if not titles:
        return f'共享 {len(documents)} 篇本地 Markdown 笔记。'
    preview = '、'.join(titles[:3])
    if len(titles) > 3:
        preview += ' 等'
    return f'共享 {len(documents)} 篇本地 Markdown 笔记，涵盖 {preview}。'


def build_shared_branch_name(academy: str, major: str, year: str, author: str | None = None, remote_url: str = '') -> tuple[str, dict]:
    academy_name = normalize_share_text(academy, '学院', max_len=80)
    major_name = normalize_share_text(major, '专业', max_len=80)
    year_name = normalize_share_text(year, '年级', max_len=40)
    author_name = normalize_share_text(author, '作者', allow_empty=True, max_len=80) or detect_share_author(remote_url)
    branch_name = f'{SHARE_BRANCH_PREFIX}{slugify_share_branch_part(academy_name, "学院")}-{slugify_share_branch_part(major_name, "专业")}-{slugify_share_branch_part(year_name, "年级")}-{slugify_share_branch_part(author_name, "作者")}'
    if branch_name.endswith('/') or branch_name.startswith('.') or branch_name.startswith('/'):
        raise ValueError('生成的分支名不合法')
    return branch_name, {
        'academy': academy_name,
        'major': major_name,
        'year': year_name,
        'author': author_name,
        'authorSlug': slugify_share_branch_part(author_name, '作者'),
    }


def parse_github_repo(remote_url: str) -> dict:
    text = (remote_url or '').strip()
    match = re.search(r'github\.com[:/](?P<owner>[^/]+)/(?P<repo>[^/.]+)(?:\.git)?$', text)
    if not match:
        return {'remoteUrl': text, 'hostedOnGitHub': False}
    return {
        'remoteUrl': text,
        'hostedOnGitHub': True,
        'owner': match.group('owner'),
        'repo': match.group('repo'),
    }


def remote_branch_exists(branch_name: str) -> bool:
    result = run_git(['ls-remote', '--heads', 'origin', branch_name], check=False)
    return bool(result.stdout.strip())


def fetch_remote_branch(branch_name: str) -> None:
    run_git(['fetch', '--depth', '1', 'origin', f'+refs/heads/{branch_name}:refs/remotes/origin/{branch_name}'])


def safe_rmtree(path: Path) -> None:
    if path.exists():
        shutil.rmtree(path)


def build_shared_documents_preview(documents: list[dict]) -> list[dict]:
    preview = []
    for doc in sort_documents_for_share(documents):
        path = str(doc.get('path') or '')
        updated_at = ''
        try:
            source_rel = validate_doc_path(path).lstrip('./')
            source_file = ROOT / source_rel
            if source_file.exists() and source_file.is_file():
                updated_at = datetime.fromtimestamp(source_file.stat().st_mtime, timezone.utc).isoformat()
        except Exception:
            updated_at = ''
        preview.append({
            'title': doc.get('title', ''),
            'slug': doc.get('slug', ''),
            'group': normalize_group_name(doc.get('group')),
            'type': doc.get('type', 'import'),
            'path': path,
            'order': int(doc.get('order', 0) or 0),
            'sourceUrl': doc.get('sourceUrl', ''),
            'updatedAt': updated_at,
        })
    return preview


def sort_documents_for_share(documents: list[dict]) -> list[dict]:
    def key(doc: dict) -> tuple[str, int, int, str]:
        group = normalize_group_name(doc.get('group'))
        try:
            order = int(doc.get('order', 999999))
        except (TypeError, ValueError):
            order = 999999
        title = doc.get('title', '')
        type_rank = 0 if doc.get('type') == 'main' else 1
        return (group.lower(), type_rank, order, title.lower())

    return sorted(documents, key=key)


def shared_branch_marker(branch_name: str) -> str:
    return f'github-branch:{branch_name}'


def is_shared_import_entry(doc: dict, branch_name: str | None = None) -> bool:
    shared_from_branch = str(doc.get('sharedFromBranch') or '').strip()
    source_url = str(doc.get('sourceUrl') or '').strip()
    group = normalize_group_name(doc.get('group'))
    slug = str(doc.get('slug') or '').strip()
    if branch_name:
        branch_slug = slugify(branch_name)
        if shared_from_branch == branch_name or source_url == shared_branch_marker(branch_name):
            return True
        return group.startswith('共享笔记/') and slug.startswith(f'{branch_slug}-')
    return bool(shared_from_branch) or source_url.startswith('github-branch:') or group.startswith('共享笔记/')


def collect_shareable_library_data(library_data: dict) -> dict:
    documents = [
        dict(doc)
        for doc in sort_documents_for_share(library_data.get('documents', []))
        if not is_shared_import_entry(doc)
    ]
    return normalize_library_data({
        'groups': [],
        'documents': documents,
    })


def build_shared_import_target(branch_name: str, original_slug: str) -> tuple[str, str]:
    branch_slug = slugify(branch_name)
    target_slug = slugify(f'{branch_slug}-{original_slug}')
    return target_slug, f'content/imports/{target_slug}.md'


def build_manifest_url(repo_info: dict, branch_name: str) -> str:
    if not repo_info.get('hostedOnGitHub'):
        return ''
    owner = repo_info.get('owner', '')
    repo = repo_info.get('repo', '')
    manifest_path = bundle_repo_path('manifest.json').as_posix()
    return f'https://github.com/{owner}/{repo}/blob/{quote(branch_name, safe="")}/{manifest_path}'


def build_branch_url(repo_info: dict, branch_name: str) -> str:
    if not repo_info.get('hostedOnGitHub'):
        return ''
    owner = repo_info.get('owner', '')
    repo = repo_info.get('repo', '')
    site_root = '.' if SITE_REPO_ROOT == Path('.') else SITE_REPO_ROOT.as_posix()
    return f'https://github.com/{owner}/{repo}/tree/{quote(branch_name, safe="")}/{site_root}'


def build_shared_index_item(manifest: dict, branch_name: str | None = None) -> dict:
    documents = manifest.get('documents', [])
    repo = dict(manifest.get('repo') or {})
    resolved_branch_name = manifest.get('branchName') or branch_name or ''
    author = manifest.get('author', '') or repo.get('owner', '') or ''
    author_slug = manifest.get('authorSlug', '') or (slugify(author) if author else '')
    if repo.get('hostedOnGitHub') and resolved_branch_name:
        repo.setdefault('branchUrl', build_branch_url(repo, resolved_branch_name))
        repo.setdefault('manifestUrl', build_manifest_url(repo, resolved_branch_name))
    item = {
        'branchName': resolved_branch_name,
        'author': author,
        'authorSlug': author_slug,
        'academy': manifest.get('academy', ''),
        'major': manifest.get('major', ''),
        'year': manifest.get('year', ''),
        'publishedAt': manifest.get('publishedAt', ''),
        'documentCount': int(manifest.get('documentCount', 0) or 0),
        'groupCount': int(manifest.get('groupCount', 0) or 0),
        'tags': normalize_share_tags(manifest.get('tags')),
        'summary': manifest.get('summary', ''),
        'documents': documents[:10] if isinstance(documents, list) else [],
        'manifestPath': manifest.get('manifestPath') or bundle_repo_path('manifest.json').as_posix(),
        'manifestUrl': manifest.get('manifestUrl') or repo.get('manifestUrl') or '',
        'repo': repo,
    }
    return item


def sort_shared_index_items(items: list[dict]) -> list[dict]:
    def key(item: dict) -> tuple[str, str]:
        return (item.get('publishedAt', ''), item.get('branchName', ''))

    return sorted(items, key=key, reverse=True)


def is_share_branch_name(branch_name: str) -> bool:
    text = (branch_name or '').strip()
    return text.startswith(SHARE_BRANCH_PREFIX) or text.count('_') >= 2


def build_shared_manifest(branch_name: str, profile: dict, remote_url: str, library_data: dict) -> dict:
    documents = sort_documents_for_share(library_data.get('documents', []))
    groups = library_data.get('groups', [])
    repo_info = parse_github_repo(remote_url)
    bundle_root = bundle_repo_path().as_posix()
    manifest_path = bundle_repo_path('manifest.json').as_posix()
    repo_info['branchUrl'] = build_branch_url(repo_info, branch_name)
    repo_info['manifestUrl'] = build_manifest_url(repo_info, branch_name)
    return {
        'schemaVersion': 2,
        'branchName': branch_name,
        'author': profile['author'],
        'authorSlug': profile['authorSlug'],
        'academy': profile['academy'],
        'major': profile['major'],
        'year': profile['year'],
        'publishedAt': iso_now(),
        'documentCount': len(documents),
        'groupCount': len(groups),
        'tags': profile.get('tags', []),
        'summary': profile.get('summary', ''),
        'bundleRoot': bundle_root,
        'manifestPath': manifest_path,
        'manifestUrl': repo_info.get('manifestUrl', ''),
        'siteRoot': '.' if SITE_REPO_ROOT == Path('.') else SITE_REPO_ROOT.as_posix(),
        'repo': repo_info,
        'documents': build_shared_documents_preview(documents),
    }


def prepare_shared_bundle(worktree_root: Path, manifest: dict, library_data: dict) -> Path:
    site_root = worktree_root / SITE_REPO_ROOT if SITE_REPO_ROOT != Path('.') else worktree_root
    bundle_root = site_root / SHARED_NOTES_DIRNAME
    safe_rmtree(bundle_root)
    bundle_content_root = bundle_root / 'content'
    (bundle_content_root / 'imports').mkdir(parents=True, exist_ok=True)
    (bundle_content_root / 'assets').mkdir(parents=True, exist_ok=True)

    for doc in sort_documents_for_share(library_data.get('documents', [])):
        source_rel = validate_doc_path(doc.get('path', '')).lstrip('./')
        source_file = ROOT / source_rel
        if not source_file.exists() or not source_file.is_file():
            continue
        target_file = bundle_root / source_rel
        target_file.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(source_file, target_file)

        doc_slug = doc.get('slug') or slugify(doc.get('title') or source_file.stem)
        source_asset_dir = ASSET_DIR / doc_slug
        target_asset_dir = bundle_content_root / 'assets' / doc_slug
        safe_rmtree(target_asset_dir)
        if source_asset_dir.exists() and source_asset_dir.is_dir():
            shutil.copytree(source_asset_dir, target_asset_dir)

    (bundle_content_root / 'library.json').write_text(
        json.dumps(library_data, ensure_ascii=False, indent=2),
        encoding='utf-8',
    )
    (bundle_root / 'manifest.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding='utf-8')
    return bundle_root


def git_status_for_path(worktree_root: Path, repo_path: Path) -> str:
    result = run_git(['status', '--short', '--', repo_path.as_posix()], cwd=worktree_root)
    return result.stdout.strip()


def publish_shared_notes_bundle(
    academy: str,
    major: str,
    year: str,
    author: str | None = None,
    tags: str | list[str] | None = None,
    summary: str | None = None,
) -> dict:
    ensure_dirs()
    remote_url = ensure_git_remote_origin()
    library_data = collect_shareable_library_data(load_library())
    branch_name, profile = build_shared_branch_name(academy, major, year, author, remote_url)
    profile['tags'] = derive_share_tags(tags, library_data)
    profile['summary'] = derive_share_summary(summary, library_data)
    manifest = build_shared_manifest(branch_name, profile, remote_url, library_data)
    branch_exists = remote_branch_exists(branch_name)

    with tempfile.TemporaryDirectory(prefix='note-share-publish-') as temp_dir:
        worktree_root = Path(temp_dir) / 'worktree'
        run_git(['worktree', 'add', '--detach', str(worktree_root), 'HEAD'])
        try:
            if branch_exists:
                fetch_remote_branch(branch_name)
                run_git(['checkout', '-B', branch_name, f'origin/{branch_name}'], cwd=worktree_root)
            else:
                run_git(['checkout', '-B', branch_name], cwd=worktree_root)

            prepare_shared_bundle(worktree_root, manifest, library_data)
            shared_repo_path = bundle_repo_path()
            status_text = git_status_for_path(worktree_root, shared_repo_path)
            if status_text:
                run_git(['add', '--', shared_repo_path.as_posix()], cwd=worktree_root)
                run_git(
                    [
                        '-c', f'user.name={AUTOMATION_COMMIT_NAME}',
                        '-c', f'user.email={AUTOMATION_COMMIT_EMAIL}',
                        'commit',
                        '-m',
                        f'Publish shared notes for {branch_name}',
                    ],
                    cwd=worktree_root,
                )
            run_git(['push', '-u', 'origin', f'{branch_name}:{branch_name}'], cwd=worktree_root)
            return {
                'ok': True,
                'branchName': branch_name,
                'profile': profile,
                'remoteUrl': remote_url,
                'documentCount': manifest['documentCount'],
                'groupCount': manifest['groupCount'],
                'manifestPath': manifest['manifestPath'],
                'changed': bool(status_text),
            }
        finally:
            run_git(['worktree', 'remove', '--force', str(worktree_root)], check=False)


def load_remote_manifest(branch_name: str) -> dict:
    fetch_remote_branch(branch_name)
    manifest_path = bundle_repo_path('manifest.json').as_posix()
    result = run_git(['show', f'refs/remotes/origin/{branch_name}:{manifest_path}'])
    data = json.loads(result.stdout)
    if not isinstance(data, dict):
        raise ValueError('共享笔记元数据格式不正确')
    return data


def scan_shared_note_bundles() -> tuple[list[dict], list[dict]]:
    remote_url = ensure_git_remote_origin()
    result = run_git(['ls-remote', '--heads', 'origin'])
    bundles: list[dict] = []
    skipped: list[dict] = []
    for line in result.stdout.splitlines():
        try:
            _sha, ref = line.split('\t', 1)
        except ValueError:
            continue
        if not ref.startswith('refs/heads/'):
            continue
        branch_name = ref[len('refs/heads/'):]
        if not is_share_branch_name(branch_name):
            continue
        try:
            manifest = load_remote_manifest(branch_name)
            item = build_shared_index_item(manifest, branch_name)
            if not item['repo']:
                item['repo'] = parse_github_repo(remote_url)
            bundles.append(item)
        except Exception as exc:
            skipped.append({'branchName': branch_name, 'error': str(exc)})
            continue
    return sort_shared_index_items(bundles), skipped


def build_shared_index_document() -> dict:
    remote_url = ensure_git_remote_origin()
    default_branch = get_remote_default_branch_name()
    items, skipped = scan_shared_note_bundles()
    return {
        'schemaVersion': 1,
        'generatedAt': iso_now(),
        'defaultBranch': default_branch,
        'indexPath': shared_index_repo_path().as_posix(),
        'remoteUrl': remote_url,
        'itemCount': len(items),
        'skippedBranches': skipped,
        'items': items,
    }


def write_shared_index_file(data: dict, target_file: Path = SHARED_INDEX_FILE) -> Path:
    target_file.parent.mkdir(parents=True, exist_ok=True)
    target_file.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding='utf-8')
    return target_file


def load_remote_shared_index() -> dict:
    default_branch = get_remote_default_branch_name()
    fetch_remote_branch(default_branch)
    index_path = shared_index_repo_path().as_posix()
    result = run_git(['show', f'refs/remotes/origin/{default_branch}:{index_path}'], check=False)
    if result.returncode != 0 or not result.stdout.strip():
        raise FileNotFoundError('远程默认分支中还没有 shared-index.json')
    data = json.loads(result.stdout)
    if not isinstance(data, dict) or not isinstance(data.get('items'), list):
        raise ValueError('中央 shared-index.json 格式不正确')
    return data


def list_shared_note_bundles(force_scan: bool = False) -> dict:
    if not force_scan:
        try:
            data = load_remote_shared_index()
            items = sort_shared_index_items([build_shared_index_item(item, item.get('branchName')) for item in data.get('items', [])])
            return {
                'items': items,
                'source': {
                    'mode': 'shared-index',
                    'generatedAt': data.get('generatedAt', ''),
                    'defaultBranch': data.get('defaultBranch', ''),
                    'indexPath': data.get('indexPath', shared_index_repo_path().as_posix()),
                },
            }
        except Exception as exc:
            items, skipped = scan_shared_note_bundles()
            return {
                'items': items,
                'source': {
                    'mode': 'scan-fallback',
                    'generatedAt': '',
                    'defaultBranch': get_remote_default_branch_name(),
                    'indexPath': shared_index_repo_path().as_posix(),
                    'fallbackReason': str(exc),
                },
                'skippedBranches': skipped,
            }
    items, skipped = scan_shared_note_bundles()
    return {
        'items': items,
        'source': {
            'mode': 'scan',
            'generatedAt': '',
            'defaultBranch': get_remote_default_branch_name(),
            'indexPath': shared_index_repo_path().as_posix(),
        },
        'skippedBranches': skipped,
    }


def read_share_profile_defaults() -> dict:
    try:
        remote_url = ensure_git_remote_origin()
    except Exception:
        remote_url = ''
    return {
        'author': detect_share_author(remote_url),
        'remoteUrl': remote_url,
        'defaultBranch': get_remote_default_branch_name() if remote_url else '',
    }


def rewrite_shared_markdown_assets(markdown: str, source_slug: str, target_slug: str) -> str:
    replacements = [
        (f'./content/assets/{source_slug}/', f'./content/assets/{target_slug}/'),
        (f'content/assets/{source_slug}/', f'content/assets/{target_slug}/'),
        (f'/content/assets/{source_slug}/', f'/content/assets/{target_slug}/'),
    ]
    text = markdown
    for old, new in replacements:
        text = text.replace(old, new)
    return text


def find_existing_shared_docs_for_branch(data: dict, branch_name: str) -> list[dict]:
    return [
        doc
        for doc in data.get('documents', [])
        if is_shared_import_entry(doc, branch_name)
    ]


def apply_shared_bundle(site_root: Path, branch_name: str, manifest: dict, bundle_library: dict) -> dict:
    share_group_root = '/'.join(filter(None, ['共享笔记', manifest.get('academy', ''), manifest.get('major', ''), manifest.get('year', ''), manifest.get('author', '')]))
    branch_marker = shared_branch_marker(branch_name)
    imported: list[dict] = []
    imported_paths: set[str] = set()

    for doc in sort_documents_for_share(bundle_library.get('documents', [])):
        source_rel = validate_doc_path(doc.get('path', '')).lstrip('./')
        if not source_rel:
            continue
        source_file = (site_root / SHARED_NOTES_DIRNAME / source_rel).resolve()
        if not source_file.exists() or not source_file.is_file():
            continue
        original_slug = doc.get('slug') or slugify(doc.get('title') or source_file.stem)
        target_slug, target_path = build_shared_import_target(branch_name, original_slug)
        imported_paths.add(f'./{target_path}')
        markdown = source_file.read_text(encoding='utf-8')
        markdown = rewrite_shared_markdown_assets(markdown, original_slug, target_slug)

        source_asset_dir = site_root / SHARED_NOTES_DIRNAME / 'content' / 'assets' / original_slug
        target_asset_dir = ASSET_DIR / target_slug
        safe_rmtree(target_asset_dir)
        if source_asset_dir.exists() and source_asset_dir.is_dir():
            shutil.copytree(source_asset_dir, target_asset_dir)

        target_file = ROOT / target_path
        target_file.parent.mkdir(parents=True, exist_ok=True)
        target_file.write_text(markdown, encoding='utf-8')

        original_group = normalize_group_name(doc.get('group'))
        target_group = '/'.join(filter(None, [share_group_root, original_group]))
        source_url = doc.get('sourceUrl') or branch_marker
        try:
            order_value = int(doc.get('order', 0) or 0)
        except (TypeError, ValueError):
            order_value = None
        update_library_entry(
            target_path,
            doc.get('title') or target_slug,
            target_slug,
            'import',
            source_url,
            target_group,
            order_value,
            extra={
                'sharedFromBranch': branch_name,
                'sharedOriginalSlug': original_slug,
                'sharedOriginalPath': f'./{source_rel}',
                'sharedSourceUrl': source_url,
            },
        )
        imported.append({
            'title': doc.get('title') or target_slug,
            'slug': target_slug,
            'path': f'./{target_path}',
            'group': target_group,
        })

    existing_library = load_library()
    removed: list[dict] = []
    for doc in find_existing_shared_docs_for_branch(existing_library, branch_name):
        path = str(doc.get('path') or '')
        if path in imported_paths:
            continue
        result = delete_document_file(doc)
        delete_library_entry(path)
        removed.append({
            'title': doc.get('title') or path,
            'slug': doc.get('slug') or '',
            'path': result['path'],
        })

    return {
        'ok': True,
        'branchName': branch_name,
        'documentCount': len(imported),
        'documents': imported,
        'removedCount': len(removed),
        'removed': removed,
    }


def import_shared_notes_bundle(branch_name: str) -> dict:
    ensure_dirs()
    branch_name = (branch_name or '').strip()
    if not branch_name:
        raise ValueError('分支名不能为空')
    manifest = load_remote_manifest(branch_name)
    with tempfile.TemporaryDirectory(prefix='note-share-import-') as temp_dir:
        worktree_root = Path(temp_dir) / 'worktree'
        run_git(['worktree', 'add', '--detach', str(worktree_root), f'refs/remotes/origin/{branch_name}'])
        try:
            site_root = worktree_root / SITE_REPO_ROOT if SITE_REPO_ROOT != Path('.') else worktree_root
            bundle_root = site_root / SHARED_NOTES_DIRNAME / 'content'
            bundle_library_file = bundle_root / 'library.json'
            if not bundle_library_file.exists():
                raise FileNotFoundError('共享分支中没有可导入的笔记索引')
            bundle_library = normalize_library_data(json.loads(bundle_library_file.read_text(encoding='utf-8')))
            return apply_shared_bundle(site_root, branch_name, manifest, bundle_library)
        finally:
            run_git(['worktree', 'remove', '--force', str(worktree_root)], check=False)


def ensure_dirs() -> None:
    CONTENT_DIR.mkdir(exist_ok=True)
    IMPORT_DIR.mkdir(parents=True, exist_ok=True)
    ASSET_DIR.mkdir(parents=True, exist_ok=True)
    RUNTIME_DIR.mkdir(parents=True, exist_ok=True)
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
                'group': GUIDE_GROUP_NAME,
                'order': 1
            })
        LIBRARY_FILE.write_text(json.dumps({
            'groups': [{'name': GUIDE_GROUP_NAME, 'order': 1}] if documents else [],
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


def migrate_guide_group_name(group: str | None) -> str:
    normalized = normalize_group_name(group)
    if not normalized:
        return ''
    if normalized == LEGACY_GUIDE_GROUP_NAME:
        return GUIDE_GROUP_NAME
    legacy_prefix = f'{LEGACY_GUIDE_GROUP_NAME}/'
    if normalized.startswith(legacy_prefix):
        return f'{GUIDE_GROUP_NAME}/{normalized[len(legacy_prefix):]}'
    return normalized


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
            name = validate_group_name(migrate_guide_group_name(group.get('name')))
            order = group.get('order', index)
        else:
            name = validate_group_name(migrate_guide_group_name(str(group)))
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
        group = validate_group_name(migrate_guide_group_name(doc.get('group')))
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
    order: int | None = None,
    extra: dict | None = None,
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
    if extra:
        entry.update(extra)
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


def rewrite_markdown_asset_paths(markdown: str, old_slug: str, new_slug: str) -> str:
    if not old_slug or not new_slug or old_slug == new_slug:
        return markdown
    replacements = [
        (f'./content/assets/{old_slug}/', f'./content/assets/{new_slug}/'),
        (f'content/assets/{old_slug}/', f'content/assets/{new_slug}/'),
        (f'/content/assets/{old_slug}/', f'/content/assets/{new_slug}/'),
    ]
    text = markdown
    for old, new in replacements:
        text = text.replace(old, new)
    return text


def rewrite_front_matter_title(markdown: str, title: str) -> str:
    body = markdown or ''
    if body.startswith('---'):
        match = re.match(r'^---\n(.*?)\n---\n?', body, flags=re.DOTALL)
        if match:
            front_matter = match.group(1)
            content = body[match.end():]
            if re.search(r'^title\s*:', front_matter, flags=re.MULTILINE):
                front_matter = re.sub(r'^title\s*:.*$', f'title: {title}', front_matter, count=1, flags=re.MULTILINE)
            else:
                front_matter = f'title: {title}\n{front_matter}'.strip()
            return f'---\n{front_matter}\n---\n\n{content.lstrip()}'
    stripped = body.strip()
    return f'---\ntitle: {title}\n---\n\n{stripped}\n'


def rename_document(path: str, title: str) -> dict:
    clean_title = (title or '').strip()
    if not clean_title:
        raise ValueError('文档名不能为空')
    data, docs, index = find_library_entry(path)
    entry = docs[index]
    if entry.get('type') == 'main':
        raise ValueError('主文档不能通过资源管理器重命名')

    old_rel_path = validate_doc_path(entry['path'])
    old_file = ROOT / old_rel_path
    if not old_file.exists() or not old_file.is_file():
        raise FileNotFoundError(f'文档不存在：{entry["path"]}')

    new_slug = slugify(clean_title)
    new_rel_path = f'content/imports/{new_slug}.md'
    new_normalized_path = f'./{validate_doc_path(new_rel_path)}'
    duplicate = next((doc for doc in docs if doc.get('path') == new_normalized_path and doc.get('path') != entry['path']), None)
    if duplicate:
        raise ValueError(f'目标文档已存在：{new_normalized_path}')

    markdown = old_file.read_text(encoding='utf-8')
    old_slug = entry.get('slug') or old_file.stem
    markdown = rewrite_front_matter_title(markdown, clean_title)
    markdown = rewrite_markdown_asset_paths(markdown, old_slug, new_slug)

    new_file = ROOT / new_rel_path
    new_file.parent.mkdir(parents=True, exist_ok=True)
    new_file.write_text(markdown, encoding='utf-8')
    if new_file.resolve() != old_file.resolve():
        old_file.unlink()

    old_asset_dir = ASSET_DIR / old_slug if old_slug else None
    new_asset_dir = ASSET_DIR / new_slug if new_slug else None
    if old_asset_dir and new_asset_dir and old_asset_dir.exists() and old_asset_dir.is_dir() and old_asset_dir != new_asset_dir:
        if new_asset_dir.exists():
            shutil.rmtree(new_asset_dir)
        shutil.move(str(old_asset_dir), str(new_asset_dir))

    entry['title'] = clean_title
    entry['slug'] = new_slug
    entry['path'] = new_normalized_path
    docs.sort(key=document_sort_key)
    save_library(data)
    return entry


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
        html_text = pipeline.decode_response_text(response)
    return pipeline.extract_main_html(url, html_text)


def extract_title_from_markdown(markdown: str, fallback: str) -> str:
    return pipeline.extract_title_from_markdown(markdown, fallback)


def is_markdown_like(url: str, content_type: str, text: str) -> bool:
    return pipeline.is_markdown_like(url, content_type, text)


def is_plain_text_like(content_type: str, text: str) -> bool:
    return pipeline.is_plain_text_like(content_type, text)


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


def html_to_markdown(html: str, title: str, base_url: str = '') -> str:
    return pipeline.html_to_markdown(html, title, base_url)


def normalize_markdown(markdown: str, title: str) -> str:
    return pipeline.normalize_markdown(markdown, title)


def plain_text_to_markdown(text: str, title: str) -> str:
    return pipeline.plain_text_to_markdown(text, title)


def import_url_to_markdown(url: str) -> tuple[str, str, str, dict]:
    safe_url = validate_import_url(url)
    response = None
    content_type = ''
    text = ''
    response_error = ''
    try:
        response = fetch_url_text(safe_url)
        content_type = response.headers.get('Content-Type', '')
        text = pipeline.decode_response_text(response)
    except Exception as exc:
        response_error = str(exc)

    if response is not None and urlparse(safe_url).path.lower().endswith('.txt') and is_plain_text_like(content_type, text):
        fallback = Path(urlparse(safe_url).path).stem.replace('-', ' ').replace('_', ' ').strip() or urlparse(safe_url).netloc
        first_line = next((line.strip() for line in text.splitlines() if line.strip()), fallback)
        title = first_line[:80] if first_line else fallback
        slug = slugify(title)
        return title, slug, plain_text_to_markdown(text, title), {'detectedType': 'text', 'images': {'total': 0, 'downloaded': 0, 'failed': 0}}
    if response is not None and is_markdown_like(safe_url, content_type, text):
        fallback = Path(urlparse(safe_url).path).stem.replace('-', ' ').replace('_', ' ').strip() or urlparse(safe_url).netloc
        title = extract_title_from_markdown(text, fallback)
        slug = slugify(title)
        return title, slug, normalize_markdown(text, title), {'detectedType': 'markdown', 'images': {'total': 0, 'downloaded': 0, 'failed': 0}}
    if response is not None and is_plain_text_like(content_type, text):
        fallback = Path(urlparse(safe_url).path).stem.replace('-', ' ').replace('_', ' ').strip() or urlparse(safe_url).netloc
        first_line = next((line.strip() for line in text.splitlines() if line.strip()), fallback)
        title = first_line[:80] if first_line else fallback
        slug = slugify(title)
        return title, slug, plain_text_to_markdown(text, title), {'detectedType': 'text', 'images': {'total': 0, 'downloaded': 0, 'failed': 0}}
    render_mode = 'http'
    page_url = safe_url
    page_text = text
    browser_meta = {}
    if pipeline.browser_render_available():
        try:
            rendered = pipeline.render_url_in_browser(safe_url)
            page_url = rendered.get('url') or safe_url
            page_text = rendered.get('html') or text
            render_mode = f'browser:{rendered.get("browser", "chromium")}'
            browser_meta = {
                'browser': rendered.get('browser', ''),
                'finalUrl': page_url,
                'visibleTextLength': len(rendered.get('visible_text', '')),
            }
        except Exception as exc:
            browser_meta = {'browserError': str(exc)}
    if not page_text:
        raise RuntimeError(browser_meta.get('browserError') or response_error or '无法获取网页内容')
    title, html = extract_main_html(page_url, page_text)
    slug = slugify(title)
    html, image_stats = download_and_rewrite_images(html, page_url, slug)
    markdown = html_to_markdown(html, title, page_url)
    meta = {'detectedType': 'html', 'images': image_stats, 'renderMode': render_mode}
    meta.update(browser_meta)
    return title, slug, markdown, meta


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
    print('YCY 本地笔记工作台已启动')
    print(f'访问地址: {url}')
    print('抓取与保存位置:')
    print(f'  导入后的 Markdown: {IMPORT_DIR}')
    print(f'  下载的图片资源: {ASSET_DIR}')
    print(f'  文档索引: {LIBRARY_FILE}')
    print('停止服务: Ctrl+C')
    print('=' * 72)


def write_server_state(url: str, port: int) -> None:
    ensure_dirs()
    SERVER_STATE_FILE.write_text(json.dumps({
        'pid': os.getpid(),
        'port': port,
        'url': url,
        'root': str(ROOT),
        'script': str(Path(__file__).resolve())
    }, ensure_ascii=False, indent=2), encoding='utf-8')


def clear_server_state() -> None:
    try:
        if SERVER_STATE_FILE.exists():
            SERVER_STATE_FILE.unlink()
    except OSError:
        pass


def schedule_shutdown_via_bat() -> None:
    if not STOP_BAT_FILE.exists():
        raise FileNotFoundError(f'未找到退出脚本：{STOP_BAT_FILE.name}')
    command = f'ping 127.0.0.1 -n 2 >nul && call "{STOP_BAT_FILE}"'
    creationflags = 0
    for flag_name in ('CREATE_NEW_PROCESS_GROUP', 'DETACHED_PROCESS', 'CREATE_NO_WINDOW'):
        creationflags |= getattr(subprocess, flag_name, 0)
    subprocess.Popen(
        ['cmd', '/c', command],
        cwd=str(ROOT),
        stdin=subprocess.DEVNULL,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
        creationflags=creationflags,
    )


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
                print(f'[import] {url} -> type={meta.get("detectedType")} assets={meta.get("images", {}).get("downloaded", 0)}/{meta.get("images", {}).get("total", 0)}')
                return self._send_json({'title': title, 'slug': slug, 'markdown': markdown, 'meta': meta})
            except ValueError as exc:
                return self._send_json({'error': str(exc)}, 400)
            except Exception as exc:
                return self._send_json({'error': str(exc)}, 500)
        if parsed.path == '/api/library':
            return self._send_json(load_library())
        if parsed.path == '/api/share-profile-defaults':
            try:
                return self._send_json({'ok': True, **read_share_profile_defaults()})
            except Exception as exc:
                return self._send_json({'error': str(exc)}, 500)
        if parsed.path == '/api/shared-notes':
            try:
                query = parse_qs(parsed.query)
                force_scan = (query.get('mode') or [''])[0].strip().lower() == 'scan'
                return self._send_json({'ok': True, **list_shared_note_bundles(force_scan=force_scan)})
            except Exception as exc:
                return self._send_json({'error': str(exc)}, 500)
        return super().do_GET()

    def do_POST(self):
        parsed = urlparse(self.path)
        try:
            if parsed.path == '/api/shutdown':
                self._send_json({'ok': True, 'message': 'stopping'})
                self.wfile.flush()
                print('[shutdown] requested from web ui')
                schedule_shutdown_via_bat()
                return
            if parsed.path == '/api/publish-shared-notes':
                length = int(self.headers.get('Content-Length', '0'))
                payload = json.loads(self.rfile.read(length).decode('utf-8'))
                result = publish_shared_notes_bundle(
                    payload.get('academy'),
                    payload.get('major'),
                    payload.get('year'),
                    payload.get('author'),
                    payload.get('tags'),
                    payload.get('summary'),
                )
                print(f'[share:publish] {result["branchName"]} docs={result["documentCount"]}')
                return self._send_json(result)
            if parsed.path == '/api/import-shared-notes':
                length = int(self.headers.get('Content-Length', '0'))
                payload = json.loads(self.rfile.read(length).decode('utf-8'))
                result = import_shared_notes_bundle(str(payload.get('branchName') or '').strip())
                print(f'[share:import] {result["branchName"]} docs={result["documentCount"]}')
                return self._send_json(result)
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
            if parsed.path == '/api/rename-document':
                length = int(self.headers.get('Content-Length', '0'))
                payload = json.loads(self.rfile.read(length).decode('utf-8'))
                entry = rename_document(payload['path'], payload.get('title'))
                print(f'[rename] {payload["path"]!r} -> {entry["path"]!r}')
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
    write_server_state(url, port)
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
        clear_server_state()


if __name__ == '__main__':
    main()
