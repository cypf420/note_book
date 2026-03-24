from __future__ import annotations

import html
import re
from pathlib import Path
from urllib.parse import urljoin, urlparse

from bs4 import BeautifulSoup, UnicodeDammit
from markdownify import markdownify

try:
    from ftfy import fix_text as ftfy_fix_text
except Exception:  # pragma: no cover
    ftfy_fix_text = None

try:
    from playwright.sync_api import TimeoutError as PlaywrightTimeoutError
    from playwright.sync_api import sync_playwright
except Exception:  # pragma: no cover
    PlaywrightTimeoutError = Exception
    sync_playwright = None


MOJIBAKE_CHAR_RE = re.compile(r'[ÃÂâæåçïð¤]')
MOJIBAKE_SEQ_RE = re.compile(r'(?:Ã.|Â.|â.|å.|æ.|ç.|ï.)')
CONTROL_RE = re.compile(r'[\x00-\x08\x0b\x0c\x0e-\x1f]')
CJK_RE = re.compile(r'[\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]')
HTML_TAG_RE = re.compile(r'<(?:!doctype|html|head|body|article|main|div|section|p|br|hr|h[1-6]|ul|ol|li|table|a|img)\b', re.I)
BROWSER_LAUNCH_OPTIONS = (
    ('msedge', {'channel': 'msedge', 'headless': True}),
    ('chrome', {'channel': 'chrome', 'headless': True}),
    ('chromium', {'headless': True}),
)


def _cleanup_text(text: str) -> str:
    normalized = (text or '').replace('\r\n', '\n').replace('\r', '\n')
    return CONTROL_RE.sub('', normalized)


def _text_quality_score(text: str) -> float:
    if not text:
        return float('-inf')
    cjk_count = len(CJK_RE.findall(text))
    suspicious_chars = len(MOJIBAKE_CHAR_RE.findall(text))
    suspicious_seqs = len(MOJIBAKE_SEQ_RE.findall(text))
    replacement = text.count('\ufffd')
    punctuation = sum(text.count(ch) for ch in '，。！？；：（）【】《》“”‘’、')
    return (cjk_count * 5.0) + (punctuation * 2.0) - (suspicious_chars * 2.0) - (suspicious_seqs * 10.0) - (replacement * 15.0)


def _restore_cjk_punctuation(text: str) -> str:
    restored = text
    for ascii_punct, cjk_punct in {',': '，', ':': '：', ';': '；', '!': '！', '?': '？'}.items():
        restored = re.sub(fr'{re.escape(ascii_punct)}(?=[\u4e00-\u9fff])', cjk_punct, restored)
        restored = re.sub(fr'(?<=[\u4e00-\u9fff]){re.escape(ascii_punct)}(?=\s|$)', cjk_punct, restored)
    return restored


def repair_text(text: str, *, unescape_html_entities: bool = True) -> str:
    raw_base = (text or '').replace('\r\n', '\n').replace('\r', '\n')
    base = _cleanup_text(raw_base)
    if not base:
        return ''

    ftfy_candidate = ''
    if ftfy_fix_text is not None:
        try:
            ftfy_candidate = _cleanup_text(ftfy_fix_text(raw_base))
        except Exception:
            ftfy_candidate = ''
    if ftfy_candidate and ftfy_candidate != base and (
        MOJIBAKE_CHAR_RE.search(base)
        or MOJIBAKE_SEQ_RE.search(base)
        or '\ufffd' in base
        or _text_quality_score(ftfy_candidate) >= _text_quality_score(base) + 2
    ):
        return _restore_cjk_punctuation(ftfy_candidate)

    candidates = [base]
    if unescape_html_entities:
        candidates.append(_cleanup_text(html.unescape(base)))
    for encoding in ('latin-1', 'cp1252'):
        try:
            candidates.append(_cleanup_text(base.encode(encoding).decode('utf-8')))
        except (UnicodeEncodeError, UnicodeDecodeError):
            continue

    best = max((candidate for candidate in candidates if candidate), key=_text_quality_score)
    if MOJIBAKE_CHAR_RE.search(base) or MOJIBAKE_SEQ_RE.search(base) or '\ufffd' in base or _text_quality_score(best) >= _text_quality_score(base) + 4:
        return _restore_cjk_punctuation(best)
    clean = html.unescape(base) if unescape_html_entities else base
    return _restore_cjk_punctuation(clean)


def decode_bytes(raw: bytes, *, is_html: bool = True) -> str:
    if not raw:
        return ''

    preferred_encodings = ('utf-8', 'utf-8-sig')
    for encoding in preferred_encodings:
        try:
            preferred = repair_text(raw.decode(encoding), unescape_html_entities=False)
        except (LookupError, UnicodeDecodeError):
            continue
        if preferred and '\ufffd' not in preferred and not MOJIBAKE_SEQ_RE.search(preferred):
            return preferred

    candidates: list[str] = []
    dammit = UnicodeDammit(raw, is_html=is_html)
    if dammit.unicode_markup:
        candidates.append(dammit.unicode_markup)

    for encoding in (*preferred_encodings, 'gb18030', 'gbk', 'big5'):
        try:
            candidates.append(raw.decode(encoding))
        except (LookupError, UnicodeDecodeError):
            continue

    repaired = [repair_text(candidate, unescape_html_entities=False) for candidate in candidates if candidate]
    return max(repaired, key=_text_quality_score) if repaired else ''


def decode_response_text(response) -> str:
    raw = getattr(response, 'content', b'') or b''
    if not raw:
        return repair_text(getattr(response, 'text', '') or '', unescape_html_entities=False)

    candidates: list[str] = [decode_bytes(raw, is_html=True)]

    encodings: list[str] = []
    for value in (getattr(response, 'encoding', None), getattr(response, 'apparent_encoding', None), 'utf-8', 'utf-8-sig', 'gb18030', 'gbk', 'big5'):
        if value and value not in encodings:
            encodings.append(value)
    for encoding in encodings:
        try:
            candidates.append(raw.decode(encoding))
        except (LookupError, UnicodeDecodeError):
            continue

    if not candidates:
        candidates.append(getattr(response, 'text', '') or '')

    repaired = [repair_text(candidate, unescape_html_entities=False) for candidate in candidates]
    return max(repaired, key=_text_quality_score)


def browser_render_available() -> bool:
    return sync_playwright is not None


def render_url_in_browser(url: str, *, timeout_ms: int = 30000, wait_after_load_ms: int = 1200) -> dict:
    if sync_playwright is None:
        raise RuntimeError('Playwright 未安装，无法进行浏览器渲染')

    launch_errors: list[str] = []
    with sync_playwright() as playwright:
        browser = None
        browser_name = ''
        for name, launch_kwargs in BROWSER_LAUNCH_OPTIONS:
            try:
                browser = playwright.chromium.launch(**launch_kwargs)
                browser_name = name
                break
            except Exception as exc:  # pragma: no cover - depends on local browsers
                launch_errors.append(f'{name}: {exc}')
        if browser is None:
            joined = '; '.join(launch_errors) or 'unknown error'
            raise RuntimeError(f'无法启动浏览器渲染：{joined}')

        try:
            page = browser.new_page(
                locale='zh-CN',
                viewport={'width': 1440, 'height': 2200},
                user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36 EditableNoteSite/4.0',
            )
            page.goto(url, wait_until='domcontentloaded', timeout=timeout_ms)
            try:
                page.wait_for_load_state('networkidle', timeout=min(timeout_ms, 10000))
            except PlaywrightTimeoutError:
                pass
            page.wait_for_timeout(min(max(wait_after_load_ms, 0), 5000))
            try:
                page.evaluate(
                    """
                    () => {
                      window.scrollTo(0, document.body.scrollHeight);
                      window.dispatchEvent(new Event('scroll'));
                    }
                    """
                )
                page.wait_for_timeout(400)
                page.evaluate('() => window.scrollTo(0, 0)')
            except Exception:
                pass
            html_text = page.content()
            title = repair_text(page.title() or '')
            visible_text = ''
            try:
                visible_text = repair_text(page.locator('body').inner_text(timeout=3000))
            except Exception:
                visible_text = ''
            return {
                'url': page.url,
                'title': title,
                'html': html_text,
                'visible_text': visible_text,
                'browser': browser_name,
            }
        finally:
            browser.close()


def extract_title_from_markdown(markdown: str, fallback: str) -> str:
    for line in repair_text(markdown).splitlines():
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
    sample = repair_text(text)[:3000]
    has_html_structure = bool(re.search(r'<(html|head|body|article|main|div|section)\b', sample, re.I))
    has_md_structure = bool(re.search(r'(^|\n)\s{0,3}(#{1,6}\s+|[-*+]\s+|\d+\.\s+|```|---\s*\n)', sample))
    return has_md_structure and not has_html_structure


def is_plain_text_like(content_type: str, text: str) -> bool:
    content_type = (content_type or '').lower()
    if 'text/plain' not in content_type:
        return False
    sample = repair_text(text)[:3000]
    has_html_structure = bool(re.search(r'<(html|head|body|article|main|div|section)\b', sample, re.I))
    return not has_html_structure


def looks_like_html(text: str) -> bool:
    sample = _cleanup_text(text)[:5000]
    return bool(HTML_TAG_RE.search(sample) and re.search(r'</?[a-z][^>]*>', sample, re.I))


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


def _cc98_topic_title(soup: BeautifulSoup, fallback: str) -> str:
    title_node = soup.select_one('#essay1') or soup.select_one('.topicInfo-title #essay1')
    if title_node:
        text = repair_text(title_node.get_text(' ', strip=True))
        if text:
            return text
    page_title = soup.title.string.strip() if soup.title and soup.title.string else fallback
    return repair_text(re.sub(r'\s*-\s*CC98论坛\s*$', '', page_title).strip() or fallback)


def _cc98_topic_meta_html(soup: BeautifulSoup) -> str:
    meta_node = soup.select_one('#essayProp')
    if not meta_node:
        return ''
    for node in meta_node.select('button, .displaynone, .noticeSuccess, .dropdown-menu'):
        node.decompose()
    text = repair_text(meta_node.get_text(' ', strip=True))
    text = re.sub(r'\s+(收藏|收起所有图片|分享帖子链接)\b.*$', '', text).strip()
    return f'<p>{html.escape(text)}</p>' if text else ''


def _cc98_reply_to_html(reply) -> str:
    floor = repair_text(reply.select_one('.reply-floor').get_text(' ', strip=True) if reply.select_one('.reply-floor') else '')
    author = repair_text(reply.select_one('.userMessage-userName').get_text(' ', strip=True) if reply.select_one('.userMessage-userName') else '')
    is_lz = bool(reply.select_one('.reply-floor-lz')) or floor == '1'

    meta_node = reply.select_one('div.column > div.comment1')
    if not meta_node:
        meta_node = reply.select_one('.comment1')
    if meta_node:
        meta_clone = BeautifulSoup(str(meta_node), 'html.parser')
        for bad in meta_clone.select('.displaynone, .noticeSuccess, .dropdown-menu, button'):
            bad.decompose()
        meta_text = repair_text(meta_clone.get_text(' ', strip=True))
        meta_text = re.sub(r'\s+\d+\s+\d+\s+评分\s+引用\s+追踪$', '', meta_text).strip()
    else:
        meta_text = ''

    content_node = reply.select_one('.reply-content article') or reply.select_one('.reply-content')
    content_html = ''
    if content_node:
        content_clone = BeautifulSoup(str(content_node), 'html.parser')
        for bad in content_clone.select('.displaynone, .noticeSuccess, script, style, button'):
            bad.decompose()
        wrapper = content_clone.select_one('.reply-content') or content_clone
        content_html = ''.join(str(child) for child in wrapper.contents).strip()

    heading_parts = [part for part in [floor, '楼', author] if part]
    heading = ' '.join(heading_parts).strip() or '回复'
    if is_lz:
        heading += '（楼主）'

    html_parts = [f'<section class="cc98-reply"><h2>{html.escape(heading)}</h2>']
    if meta_text:
        html_parts.append(f'<p>{html.escape(meta_text)}</p>')
    if content_html:
        html_parts.append(content_html)
    html_parts.append('</section>')
    return ''.join(html_parts)


def extract_cc98_topic_html(url: str, soup: BeautifulSoup) -> tuple[str, str] | None:
    parsed = urlparse(url)
    if 'cc98.org' not in parsed.netloc.lower():
        return None
    if not parsed.path.startswith('/topic/'):
        return None

    replies = soup.select('div.reply')
    title = _cc98_topic_title(soup, parsed.path.rsplit('/', 1)[-1] or 'CC98话题')
    if not replies:
        error_node = soup.select_one('.text-danger') or soup.find(string=lambda s: s and '帖子不存在' in s)
        if error_node:
            text = repair_text(error_node.get_text(' ', strip=True) if hasattr(error_node, 'get_text') else str(error_node))
            html_parts = [f'<section class="cc98-topic"><h1>{html.escape(title)}</h1>']
            if text:
                html_parts.append(f'<p>{html.escape(text)}</p>')
            html_parts.append('</section>')
            return title, ''.join(html_parts)
        return None

    html_parts = [f'<section class="cc98-topic"><h1>{html.escape(title)}</h1>']
    meta_html = _cc98_topic_meta_html(soup)
    if meta_html:
        html_parts.append(meta_html)
    for reply in replies:
        html_parts.append(_cc98_reply_to_html(reply))
    html_parts.append('</section>')
    return title, ''.join(html_parts)


def extract_main_html(url: str, html_text: str | None = None) -> tuple[str, str]:
    normalized_html = repair_text(html_text or '', unescape_html_entities=False)
    soup = BeautifulSoup(normalized_html, 'html.parser')

    meta_title = soup.find('meta', attrs={'property': 'og:title'}) or soup.find('meta', attrs={'name': 'twitter:title'})
    page_title = (meta_title.get('content') or '').strip() if meta_title else ''
    fallback = urlparse(url).netloc or Path(urlparse(url).path).stem or 'untitled'
    title = repair_text(page_title or (soup.title.string.strip() if soup.title and soup.title.string else fallback))

    cc98_topic = extract_cc98_topic_html(url, soup)
    if cc98_topic is not None:
        return cc98_topic

    for tag in soup(['script', 'style', 'noscript', 'iframe', 'svg', 'canvas', 'template']):
        tag.decompose()
    for node in soup.select('[hidden], [aria-hidden="true"], [style*="display:none"]'):
        node.decompose()

    container = _pick_content_container(soup)
    for node in container.find_all(['nav', 'footer', 'header', 'aside', 'form']):
        node.decompose()
    for node in container.select('.advertisement, .ads, .share, .social, .comment, .comments, .recommend, .related'):
        node.decompose()
    for node in container.select('[hidden], [aria-hidden="true"], [style*="display:none"]'):
        node.decompose()
    return title, str(container)


def _yaml_title(title: str) -> str:
    clean = repair_text(title).replace('\n', ' ').strip() or 'untitled'
    if re.search(r'[:{}\[\],&*!?|<>=\'"%@`]', clean) or clean.startswith(('-', '?', '!', '@', '*', '&')):
        escaped = clean.replace('\\', '\\\\').replace('"', '\\"')
        return f'"{escaped}"'
    return clean


def _rewrite_anchor_hrefs(html_text: str, base_url: str = '') -> str:
    normalized_html = repair_text(html_text, unescape_html_entities=False)
    if not base_url or urlparse(base_url).scheme not in {'http', 'https'}:
        return normalized_html

    soup = BeautifulSoup(normalized_html, 'html.parser')
    for anchor in soup.find_all('a'):
        href = (anchor.get('href') or '').strip()
        if not href:
            continue
        if href.startswith(('javascript:', 'data:')):
            continue
        anchor['href'] = _absolutize_link_destination(href, base_url)
    return str(soup)


def _absolutize_link_destination(href: str, base_url: str) -> str:
    value = (href or '').strip()
    if not value or not base_url or urlparse(base_url).scheme not in {'http', 'https'}:
        return value
    if value.startswith(('javascript:', 'data:', 'mailto:', 'tel:')):
        return value
    if value.startswith('./content/'):
        return value
    parsed = urlparse(value)
    if parsed.scheme:
        return value
    return urljoin(base_url, value)


def _rewrite_markdown_links(markdown_text: str, base_url: str = '') -> str:
    if not base_url or urlparse(base_url).scheme not in {'http', 'https'}:
        return markdown_text

    pattern = re.compile(r'(?<!!)\[([^\]]+)\]\(([^)\s]+)\)')

    def replace(match: re.Match[str]) -> str:
        label = match.group(1)
        href = match.group(2)
        absolute = _absolutize_link_destination(href, base_url)
        return f'[{label}]({absolute})'

    return pattern.sub(replace, markdown_text)


def html_to_markdown(html_text: str, title: str, base_url: str = '') -> str:
    normalized_html = _rewrite_anchor_hrefs(html_text, base_url)
    body = markdownify(normalized_html, heading_style='ATX')
    body = repair_text(body)
    body = _rewrite_markdown_links(body, base_url)
    body = re.sub(r'\n\s*\*\s\*\s\*\s*\n', '\n\n---\n\n', f'\n{body}\n')
    body = re.sub(r'[ \t]+\n', '\n', body)
    body = re.sub(r'\n{3,}', '\n\n', body).strip()
    return f'---\ntitle: {_yaml_title(title)}\n---\n\n{body or "(empty)"}\n'


def normalize_markdown(markdown: str, title: str) -> str:
    body = repair_text(markdown).strip()
    if body.startswith('---'):
        return body + '\n'
    return f'---\ntitle: {_yaml_title(title)}\n---\n\n{body or "(empty)"}\n'


def plain_text_to_markdown(text: str, title: str) -> str:
    body = re.sub(r'\n{3,}', '\n\n', repair_text(text).strip())
    return f'---\ntitle: {_yaml_title(title)}\n---\n\n{body or "(empty)"}\n'


def _fallback_title(source_name: str) -> str:
    if not source_name:
        return 'untitled'
    parsed = urlparse(source_name)
    raw = Path(parsed.path).stem if parsed.path else source_name
    return raw.replace('-', ' ').replace('_', ' ').strip() or 'untitled'


def render_source_to_markdown(source: str, *, title: str = '', source_type: str = 'auto', source_name: str = '') -> str:
    mode = source_type.lower()
    if mode not in {'auto', 'html', 'markdown', 'text'}:
        raise ValueError(f'Unsupported source type: {source_type}')

    if mode == 'auto':
        normalized_source = repair_text(source, unescape_html_entities=False)
        if looks_like_html(normalized_source):
            mode = 'html'
        elif is_markdown_like(source_name, '', source):
            mode = 'markdown'
        else:
            mode = 'text'

    if mode == 'html':
        page_url = source_name if urlparse(source_name).scheme in {'http', 'https'} else f'https://local.invalid/{Path(source_name or "source.html").name}'
        derived_title, main_html = extract_main_html(page_url, source)
        return html_to_markdown(main_html, title or derived_title, page_url)

    if mode == 'markdown':
        fallback = title or _fallback_title(source_name)
        derived_title = title or extract_title_from_markdown(source, fallback)
        return normalize_markdown(source, derived_title)

    fallback = title or _fallback_title(source_name)
    first_line = next((line.strip() for line in repair_text(source).splitlines() if line.strip()), fallback)
    return plain_text_to_markdown(source, title or first_line or fallback)
