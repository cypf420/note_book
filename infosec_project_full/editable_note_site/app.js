const REMOTE_IMG_BASE = 'https://raw.githubusercontent.com/sqc-cyh/sqc-cyh.github.io/main/docs/LessonsNotes/D2CX_Xinanyuan/img/';
const LIBRARY_URL = './content/library.json';
const LOCAL_CACHE_PREFIX = 'editable-note-site-cache:';
const STATIC_HOST = !(location.hostname === '127.0.0.1' || location.hostname === 'localhost');

const editor = document.getElementById('editor');
const preview = document.getElementById('preview');
const reloadBtn = document.getElementById('reloadBtn');
const saveBtn = document.getElementById('saveBtn');
const downloadBtn = document.getElementById('downloadBtn');
const clearLocalBtn = document.getElementById('clearLocalBtn');
const importPreviewBtn = document.getElementById('importPreviewBtn');
const importSaveBtn = document.getElementById('importSaveBtn');
const refreshLibraryBtn = document.getElementById('refreshLibraryBtn');
const editToggleBtn = document.getElementById('editToggleBtn');
const closeEditorBtn = document.getElementById('closeEditorBtn');
const toggleTocBtn = document.getElementById('toggleTocBtn');
const docSelect = document.getElementById('docSelect');
const docTitleInput = document.getElementById('docTitle');
const docSlugInput = document.getElementById('docSlug');
const urlInput = document.getElementById('urlInput');
const statusText = document.getElementById('statusText');
const docList = document.getElementById('docList');
const searchInput = document.getElementById('searchInput');
const searchResults = document.getElementById('searchResults');
const searchMeta = document.getElementById('searchMeta');
const docCount = document.getElementById('docCount');
const searchCount = document.getElementById('searchCount');
const tocList = document.getElementById('tocList');
const tocPanel = document.getElementById('tocPanel');
const docPath = document.getElementById('docPath');
const modeText = document.getElementById('modeText');
const permalink = document.getElementById('permalink');
const editorDrawer = document.getElementById('editorDrawer');

let library = [];
let searchIndex = [];
let currentDoc = null;
let originalContent = '';
let tocVisible = true;

marked.setOptions({ breaks: true, gfm: true });

function setStatus(text, isError = false) {
  statusText.textContent = text;
  statusText.style.color = isError ? '#ff8da1' : '#d9e5f3';
}

function slugify(text) {
  return (text || '')
    .toLowerCase()
    .trim()
    .replace(/[^\w\u4e00-\u9fa5-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '') || 'untitled';
}

function currentCacheKey() {
  return currentDoc ? `${LOCAL_CACHE_PREFIX}${currentDoc.path}` : `${LOCAL_CACHE_PREFIX}adhoc`;
}

function stripFrontMatter(md) {
  if (md.startsWith('---')) {
    const end = md.indexOf('\n---', 3);
    if (end !== -1) return md.slice(end + 4).trimStart();
  }
  return md;
}

function rewriteImagePaths(md) {
  return md.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (match, alt, src) => {
    if (/^https?:\/\//i.test(src) || src.startsWith('./content/') || src.startsWith('content/') || src.startsWith('data:')) return match;
    if (src.startsWith('./img/')) return `![${alt}](${REMOTE_IMG_BASE}${src.replace('./img/', '')})`;
    if (src.startsWith('./')) return `![${alt}](${src.slice(2)})`;
    return match;
  });
}

function convertAdmonitions(md) {
  const lines = md.split('\n');
  const out = [];
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(/^!!!\s+(\w+)\s*(?:"([^"]+)")?\s*$/);
    if (!m) {
      out.push(lines[i]);
      continue;
    }
    const kind = m[1];
    const title = m[2] || kind;
    const block = [];
    i++;
    while (i < lines.length && (/^\s{4,}/.test(lines[i]) || lines[i].trim() === '')) {
      block.push(lines[i].replace(/^\s{4}/, ''));
      i++;
    }
    i--;
    out.push(`<div class="admonition ${kind}">`);
    out.push(`<div class="admonition-title">${title}</div>`);
    out.push(block.join('\n'));
    out.push(`</div>`);
  }
  return out.join('\n');
}

function convertTabbedBlocks(md) {
  const lines = md.split('\n');
  const out = [];
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(/^\s*===\s+"([^"]+)"\s*$/);
    if (!m) {
      out.push(lines[i]);
      continue;
    }
    const title = m[1];
    const block = [];
    i++;
    while (i < lines.length && (/^\s{8,}/.test(lines[i]) || /^\s{4,}\S/.test(lines[i]) || lines[i].trim() === '')) {
      block.push(lines[i].replace(/^\s{4}/, ''));
      i++;
    }
    i--;
    out.push(`<div class="tab-block"><div class="tab-title">${title}</div>`);
    out.push(block.join('\n'));
    out.push(`</div>`);
  }
  return out.join('\n');
}

function preprocess(md) {
  let text = stripFrontMatter(md || '');
  text = rewriteImagePaths(text);
  text = convertAdmonitions(text);
  text = convertTabbedBlocks(text);
  return text;
}

function plainText(md) {
  return stripFrontMatter(md || '')
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`[^`]*`/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/[#>*_~|-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function escapeHtml(s) {
  return (s || '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

function highlightSnippet(text, query) {
  const q = query.trim();
  if (!q) return escapeHtml(text.slice(0, 160));
  const idx = text.toLowerCase().indexOf(q.toLowerCase());
  const start = Math.max(0, idx - 40);
  const end = Math.min(text.length, idx + q.length + 80);
  const snippet = text.slice(start, end);
  const safe = escapeHtml(snippet);
  const regex = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'ig');
  return safe.replace(regex, m => `<mark>${m}</mark>`);
}

function attachAnchorIds() {
  const seen = new Map();
  preview.querySelectorAll('h1, h2, h3').forEach(h => {
    const base = slugify(h.textContent);
    const count = seen.get(base) || 0;
    seen.set(base, count + 1);
    h.id = count ? `${base}-${count}` : base;
    if (!h.querySelector('.anchor-link')) {
      const a = document.createElement('a');
      a.href = `#doc=${currentDoc?.slug || 'note'}&section=${h.id}`;
      a.className = 'anchor-link';
      a.textContent = '#';
      h.appendChild(a);
    }
  });
}

function highlightCurrentToc(id) {
  tocList.querySelectorAll('a').forEach(a => {
    a.classList.toggle('active', a.dataset.section === id);
  });
}

function buildTOC() {
  const headings = [...preview.querySelectorAll('h1, h2, h3')];
  tocList.innerHTML = '';
  if (!headings.length) {
    tocList.innerHTML = '<div class="empty-search">当前文档没有标题结构。</div>';
    return;
  }
  headings.forEach(h => {
    const a = document.createElement('a');
    a.textContent = h.textContent.replace(/#$/, '').trim();
    a.href = `#${h.id}`;
    a.className = `toc-level-${h.tagName.substring(1)}`;
    a.dataset.section = h.id;
    a.addEventListener('click', evt => {
      evt.preventDefault();
      h.scrollIntoView({ behavior: 'smooth', block: 'start' });
      history.replaceState(null, '', `#doc=${encodeURIComponent(currentDoc.slug)}&section=${encodeURIComponent(h.id)}`);
      highlightCurrentToc(h.id);
    });
    tocList.appendChild(a);
  });
}

function render() {
  const processed = preprocess(editor.value);
  preview.innerHTML = marked.parse(processed);
  attachAnchorIds();
  buildTOC();
  localStorage.setItem(currentCacheKey(), editor.value);
  if (window.MathJax?.typesetPromise) {
    window.MathJax.typesetPromise([preview]).catch(() => {});
  }
}

function openEditor(force = true) {
  editorDrawer.classList.toggle('hidden', !force);
  document.body.classList.toggle('reading-mode', !force);
  modeText.textContent = force ? '编辑模式（源码显示）' : '阅读模式（源码隐藏）';
  editToggleBtn.textContent = force ? '返回阅读模式' : '编辑当前文档';
  editorDrawer.setAttribute('aria-hidden', String(!force));
  if (force) setTimeout(() => editor.focus(), 40);
}

async function fetchText(url, options = {}) {
  const res = await fetch(url, { cache: 'no-store', ...options });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${url}`);
  return res.text();
}

async function fetchJson(url, options = {}) {
  const res = await fetch(url, { cache: 'no-store', ...options });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(text || `HTTP ${res.status}: ${url}`);
  }
  return res.json();
}

function renderLibraryList() {
  docList.innerHTML = '';
  library.forEach(doc => {
    const card = document.createElement('button');
    card.className = 'doc-card';
    card.dataset.path = doc.path;
    card.innerHTML = `
      <div class="doc-title">${escapeHtml(doc.title || doc.slug)}</div>
      <div class="doc-meta">${escapeHtml(doc.path)} · ${doc.type || 'doc'}</div>
      <div class="doc-snippet">${escapeHtml((doc.sourceUrl || doc.remoteFallback || '本地文档').slice(0, 100))}</div>
    `;
    card.addEventListener('click', () => openDocument(doc.path));
    docList.appendChild(card);
  });
  syncActiveCard();
  docCount.textContent = String(library.length);
}

function syncActiveCard() {
  docList.querySelectorAll('.doc-card').forEach(card => {
    card.classList.toggle('active', currentDoc && card.dataset.path === currentDoc.path);
  });
}

async function loadLibrary() {
  const data = await fetchJson(LIBRARY_URL);
  library = data.documents || [];
  docSelect.innerHTML = '';
  library.forEach(doc => {
    const option = document.createElement('option');
    option.value = doc.path;
    option.textContent = `${doc.title} (${doc.path})`;
    docSelect.appendChild(option);
  });
  if (!library.length) throw new Error('library.json 中没有文档条目');
  renderLibraryList();
}

async function resolveDocContent(doc) {
  if (doc.remoteFallback) {
    try {
      return await fetchText(doc.path);
    } catch (_) {
      return await fetchText(doc.remoteFallback);
    }
  }
  return await fetchText(doc.path);
}

function hashForDoc(doc, section = '') {
  const base = `#doc=${encodeURIComponent(doc.slug || slugify(doc.title || 'note'))}`;
  return section ? `${base}&section=${encodeURIComponent(section)}` : base;
}

function findDocByHash() {
  const hash = new URLSearchParams(location.hash.replace(/^#/, ''));
  const slug = decodeURIComponent(hash.get('doc') || '').trim();
  const section = decodeURIComponent(hash.get('section') || '').trim();
  const doc = library.find(item => item.slug === slug) || library[0];
  return { doc, section };
}

async function openDocument(path, section = '') {
  const doc = library.find(item => item.path === path) || library[0];
  currentDoc = doc;
  docSelect.value = doc.path;
  docTitleInput.value = doc.title || '';
  docSlugInput.value = doc.slug || slugify(doc.title || 'untitled');
  const text = await resolveDocContent(doc);
  originalContent = text;
  editor.value = localStorage.getItem(currentCacheKey()) || text;
  render();
  docPath.textContent = doc.path;
  permalink.href = hashForDoc(doc);
  permalink.textContent = `#doc=${doc.slug}`;
  history.replaceState(null, '', hashForDoc(doc, section));
  syncActiveCard();
  setStatus(`已打开：${doc.title}`);
  if (section) {
    setTimeout(() => {
      const el = document.getElementById(section);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        highlightCurrentToc(section);
      }
    }, 80);
  }
}

function buildFrontMatter(title) {
  return `---\ntitle: ${title}\n---\n\n`;
}

async function saveCurrentDocument() {
  const title = docTitleInput.value.trim() || '未命名文档';
  const slug = slugify(docSlugInput.value.trim() || title);
  const body = editor.value.trim();
  const payload = {
    path: currentDoc?.type === 'main' ? 'content/note.md' : `content/imports/${slug}.md`,
    title,
    slug,
    markdown: body.startsWith('---') ? body : buildFrontMatter(title) + body,
    type: currentDoc?.type === 'main' ? 'main' : 'import'
  };
  const result = await fetchJson('/api/save-document', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  localStorage.removeItem(currentCacheKey());
  await loadLibrary();
  await rebuildSearchIndex();
  await openDocument(result.path);
  setStatus(`已保存：${result.path}`);
}

async function importUrl(mode) {
  const url = urlInput.value.trim();
  if (!url) {
    alert('请先输入网址');
    return;
  }
  setStatus('正在抓取网址内容，请稍候…');
  const data = await fetchJson(`/api/import-url?url=${encodeURIComponent(url)}`);
  docTitleInput.value = data.title || docTitleInput.value;
  docSlugInput.value = slugify(data.slug || data.title || 'imported');
  if (mode === 'preview') {
    currentDoc = { path: '__adhoc__', title: data.title || '网址导入', slug: slugify(data.slug || data.title || 'imported'), type: 'adhoc' };
    originalContent = data.markdown;
    editor.value = data.markdown;
    render();
    openEditor(true);
    docPath.textContent = 'adhoc / 未保存导入';
    setStatus(`已导入到编辑区：${data.title}`);
    return;
  }
  const saveResult = await fetchJson('/api/save-document', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      path: `content/imports/${slugify(data.slug || data.title || 'imported')}.md`,
      title: data.title || '网址导入',
      slug: slugify(data.slug || data.title || 'imported'),
      markdown: data.markdown,
      type: 'import',
      sourceUrl: url
    })
  });
  await loadLibrary();
  await rebuildSearchIndex();
  await openDocument(saveResult.path);
  setStatus(`已导入并保存：${saveResult.path}`);
}

async function rebuildSearchIndex() {
  searchMeta.textContent = '正在建立搜索索引…';
  const docs = [];
  await Promise.all(library.map(async doc => {
    try {
      const md = await resolveDocContent(doc);
      docs.push({ ...doc, markdown: md, plain: plainText(md) });
    } catch (_) {
      docs.push({ ...doc, markdown: '', plain: '' });
    }
  }));
  searchIndex = docs;
  searchCount.textContent = String(searchIndex.length);
  searchMeta.textContent = `已索引 ${searchIndex.length} 篇文档`;
  runSearch();
}

function runSearch() {
  const q = (searchInput.value || '').trim().toLowerCase();
  if (!q) {
    searchResults.innerHTML = '<div class="empty-search">输入关键词后会在全部文档中搜索标题和正文。</div>';
    return;
  }
  const terms = q.split(/\s+/).filter(Boolean);
  const results = searchIndex.filter(doc => {
    const hay = `${doc.title || ''} ${doc.plain || ''}`.toLowerCase();
    return terms.every(term => hay.includes(term));
  }).slice(0, 20);
  if (!results.length) {
    searchResults.innerHTML = '<div class="empty-search">没有找到匹配内容。</div>';
    return;
  }
  searchResults.innerHTML = results.map(doc => `
    <button class="search-card" data-path="${doc.path}">
      <div class="doc-title">${escapeHtml(doc.title || doc.slug)}</div>
      <div class="doc-meta">${escapeHtml(doc.path)}</div>
      <div class="search-snippet">${highlightSnippet(doc.plain || '', q)}</div>
    </button>
  `).join('');
  searchResults.querySelectorAll('.search-card').forEach(btn => {
    btn.addEventListener('click', () => openDocument(btn.dataset.path));
  });
}

editor.addEventListener('input', () => {
  if (currentDoc && currentDoc.type !== 'main') {
    docSlugInput.value = slugify(docSlugInput.value || currentDoc.slug || docTitleInput.value);
  }
  render();
});

docTitleInput.addEventListener('input', () => {
  if (!docSlugInput.value.trim()) docSlugInput.value = slugify(docTitleInput.value);
});

docSelect.addEventListener('change', async () => openDocument(docSelect.value));
searchInput.addEventListener('input', runSearch);
refreshLibraryBtn.addEventListener('click', async () => {
  await loadLibrary();
  await rebuildSearchIndex();
  setStatus('文档库与搜索索引已刷新');
});

reloadBtn.addEventListener('click', () => {
  editor.value = originalContent;
  localStorage.removeItem(currentCacheKey());
  render();
  setStatus('已恢复原始内容');
});

saveBtn.addEventListener('click', async () => {
  try {
    await saveCurrentDocument();
  } catch (err) {
    console.error(err);
    setStatus(`保存失败：${err.message}`, true);
    alert(`保存失败：${err.message}\n\n请确认你是通过 python scripts/server.py 启动站点。GitHub Pages 仅支持只读浏览。`);
  }
});

downloadBtn.addEventListener('click', () => {
  const blob = new Blob([editor.value], { type: 'text/markdown;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `${docSlugInput.value || 'note'}.md`;
  a.click();
  URL.revokeObjectURL(a.href);
});

clearLocalBtn.addEventListener('click', () => {
  Object.keys(localStorage).filter(key => key.startsWith(LOCAL_CACHE_PREFIX)).forEach(key => localStorage.removeItem(key));
  setStatus('浏览器缓存已清空');
});

importPreviewBtn.addEventListener('click', async () => {
  try {
    await importUrl('preview');
  } catch (err) {
    console.error(err);
    setStatus(`导入失败：${err.message}`, true);
    alert(`导入失败：${err.message}\n\n请确认你是通过 python scripts/server.py 启动站点。`);
  }
});

importSaveBtn.addEventListener('click', async () => {
  try {
    await importUrl('save');
  } catch (err) {
    console.error(err);
    setStatus(`导入保存失败：${err.message}`, true);
    alert(`导入保存失败：${err.message}\n\n请确认你是通过 python scripts/server.py 启动站点。`);
  }
});

editToggleBtn.addEventListener('click', () => openEditor(editorDrawer.classList.contains('hidden')));
closeEditorBtn.addEventListener('click', () => openEditor(false));

toggleTocBtn.addEventListener('click', () => {
  tocVisible = !tocVisible;
  tocPanel.style.display = tocVisible ? '' : 'none';
});

window.addEventListener('hashchange', async () => {
  if (!library.length) return;
  const { doc, section } = findDocByHash();
  if (!currentDoc || currentDoc.path !== doc.path) {
    await openDocument(doc.path, section);
  } else if (section) {
    const el = document.getElementById(section);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      highlightCurrentToc(section);
    }
  }
});

document.addEventListener('keydown', async evt => {
  const mod = evt.ctrlKey || evt.metaKey;
  if (mod && evt.key.toLowerCase() === 's') {
    evt.preventDefault();
    try { await saveCurrentDocument(); } catch (err) { setStatus(`保存失败：${err.message}`, true); }
  }
  if (evt.key === 'Escape') openEditor(false);
  if (mod && evt.key.toLowerCase() === 'e') {
    evt.preventDefault();
    openEditor(editorDrawer.classList.contains('hidden'));
  }
});

async function init() {
  if (STATIC_HOST) {
    setStatus('当前是静态只读模式：可阅读、搜索、导航；保存和网址导入需要本地服务端。');
  }
  await loadLibrary();
  await rebuildSearchIndex();
  const { doc, section } = findDocByHash();
  await openDocument(doc.path, section);
  openEditor(false);
  document.body.classList.add('reading-mode');
}

init().catch(err => {
  console.error(err);
  editor.value = `初始化失败：${err.message}\n\n请优先使用 python scripts/server.py 启动本项目。`;
  render();
  setStatus(`初始化失败：${err.message}`, true);
});
