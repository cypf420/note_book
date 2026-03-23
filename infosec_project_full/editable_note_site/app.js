const REMOTE_IMG_BASE = 'https://raw.githubusercontent.com/sqc-cyh/sqc-cyh.github.io/main/docs/LessonsNotes/D2CX_Xinanyuan/img/';
const LIBRARY_URL = './content/library.json';
const LOCAL_CACHE_PREFIX = 'editable-note-site-cache:';
const STATIC_HOST = !(location.hostname === '127.0.0.1' || location.hostname === 'localhost');

const editor = document.getElementById('editor');
const preview = document.getElementById('preview');
const reloadBtn = document.getElementById('reloadBtn');
const saveBtn = document.getElementById('saveBtn');
const deleteBtn = document.getElementById('deleteBtn');
const downloadBtn = document.getElementById('downloadBtn');
const clearLocalBtn = document.getElementById('clearLocalBtn');
const importPreviewBtn = document.getElementById('importPreviewBtn');
const importSaveBtn = document.getElementById('importSaveBtn');
const refreshLibraryBtn = document.getElementById('refreshLibraryBtn');
const editToggleBtn = document.getElementById('editToggleBtn');
const toggleLeftSidebarBtn = document.getElementById('toggleLeftSidebarBtn');
const toggleRightSidebarBtn = document.getElementById('toggleRightSidebarBtn');
const toggleRichBtn = document.getElementById('toggleRichBtn');
const closeEditorBtn = document.getElementById('closeEditorBtn');
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
const richToolbar = document.getElementById('richToolbar');
const leftResizer = document.getElementById('leftResizer');
const rightResizer = document.getElementById('rightResizer');
const groupFilterSelect = document.getElementById('groupFilterSelect');
const currentGroupSelect = document.getElementById('currentGroupSelect');
const groupInput = document.getElementById('groupInput');
const applyGroupBtn = document.getElementById('applyGroupBtn');
const clearGroupBtn = document.getElementById('clearGroupBtn');
const moveDocUpBtn = document.getElementById('moveDocUpBtn');
const moveDocDownBtn = document.getElementById('moveDocDownBtn');
const groupMetaText = document.getElementById('groupMetaText');
const manageGroupSelect = document.getElementById('manageGroupSelect');
const newGroupInput = document.getElementById('newGroupInput');
const createGroupBtn = document.getElementById('createGroupBtn');
const renameGroupBtn = document.getElementById('renameGroupBtn');
const deleteGroupBtn = document.getElementById('deleteGroupBtn');
const groupManageHint = document.getElementById('groupManageHint');

let library = [];
let libraryGroups = [];
let searchIndex = [];
let currentDoc = null;
let originalContent = '';
let leftSidebarCollapsed = false;
let rightSidebarCollapsed = false;
let richMode = false;
const LAYOUT_STORAGE_KEY = 'editable-note-site-layout';
const GROUP_COLLAPSE_STORAGE_KEY = 'editable-note-site-group-collapse';
const DEFAULT_LAYOUT = { leftWidth: 310, rightWidth: 250 };
const layoutState = readLayoutState();
const turndownService = window.TurndownService ? new window.TurndownService({ headingStyle: 'atx', codeBlockStyle: 'fenced' }) : null;
const ALL_GROUPS_VALUE = '__ALL_GROUPS__';
const UNGROUPED_LABEL = '未分组';
let currentGroupFilter = ALL_GROUPS_VALUE;
let collapsedGroups = readCollapsedGroups();
let draggedDocPath = null;

marked.setOptions({ breaks: true, gfm: true });

function setStatus(text, isError = false) {
  statusText.textContent = text;
  statusText.style.color = isError ? 'var(--danger)' : 'var(--text)';
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function normalizeGroupName(group) {
  return (group || '').trim();
}

function displayGroupName(group) {
  return normalizeGroupName(group) || UNGROUPED_LABEL;
}

function getGroupOrderMap() {
  const map = new Map();
  libraryGroups.forEach((group, index) => {
    map.set(group.name, Number.isFinite(Number(group.order)) ? Number(group.order) : index + 1);
  });
  return map;
}

function documentSortValue(doc) {
  const group = normalizeGroupName(doc.group);
  const groupOrder = getGroupOrderMap().get(group) ?? 999999;
  const typeRank = doc.type === 'main' ? 0 : 1;
  const order = Number.isFinite(Number(doc.order)) ? Number(doc.order) : 999999;
  const title = (doc.title || '').toLocaleLowerCase('zh-CN');
  return [groupOrder, group.toLocaleLowerCase('zh-CN'), typeRank, order, title];
}

function sortDocuments(docs) {
  return [...docs].sort((a, b) => {
    const [groupOrderA, groupA, rankA, orderA, titleA] = documentSortValue(a);
    const [groupOrderB, groupB, rankB, orderB, titleB] = documentSortValue(b);
    return groupOrderA - groupOrderB
      || groupA.localeCompare(groupB, 'zh-CN')
      || rankA - rankB
      || orderA - orderB
      || titleA.localeCompare(titleB, 'zh-CN');
  });
}

function readLayoutState() {
  try {
    const parsed = JSON.parse(localStorage.getItem(LAYOUT_STORAGE_KEY) || '{}');
    return {
      leftWidth: clamp(Number(parsed.leftWidth) || DEFAULT_LAYOUT.leftWidth, 240, 520),
      rightWidth: clamp(Number(parsed.rightWidth) || DEFAULT_LAYOUT.rightWidth, 220, 420)
    };
  } catch (_) {
    return { ...DEFAULT_LAYOUT };
  }
}

function readCollapsedGroups() {
  try {
    return JSON.parse(localStorage.getItem(GROUP_COLLAPSE_STORAGE_KEY) || '{}');
  } catch (_) {
    return {};
  }
}

function persistLayoutState() {
  localStorage.setItem(LAYOUT_STORAGE_KEY, JSON.stringify(layoutState));
}

function persistCollapsedGroups() {
  localStorage.setItem(GROUP_COLLAPSE_STORAGE_KEY, JSON.stringify(collapsedGroups));
}

function applyLayoutState() {
  document.documentElement.style.setProperty('--left-panel-width', `${layoutState.leftWidth}px`);
  document.documentElement.style.setProperty('--right-panel-width', `${layoutState.rightWidth}px`);
  document.body.classList.toggle('left-collapsed', leftSidebarCollapsed);
  document.body.classList.toggle('right-collapsed', rightSidebarCollapsed);
  toggleLeftSidebarBtn.textContent = leftSidebarCollapsed ? '展开左栏' : '收起左栏';
  toggleRightSidebarBtn.textContent = rightSidebarCollapsed ? '展开右栏' : '收起右栏';
  toggleLeftSidebarBtn.setAttribute('aria-expanded', String(!leftSidebarCollapsed));
  toggleRightSidebarBtn.setAttribute('aria-expanded', String(!rightSidebarCollapsed));
}

function toggleLeftSidebar() {
  leftSidebarCollapsed = !leftSidebarCollapsed;
  applyLayoutState();
  persistLayoutState();
  setStatus(leftSidebarCollapsed ? '已收起左侧栏' : '已展开左侧栏');
}

function toggleRightSidebar() {
  rightSidebarCollapsed = !rightSidebarCollapsed;
  applyLayoutState();
  persistLayoutState();
  setStatus(rightSidebarCollapsed ? '已收起右侧栏' : '已展开右侧栏');
}

function startResize(side, evt) {
  if (evt.button !== 0 || window.innerWidth <= 900) return;
  if ((side === 'left' && leftSidebarCollapsed) || (side === 'right' && rightSidebarCollapsed)) return;
  evt.preventDefault();
  const startX = evt.clientX;
  const startWidth = side === 'left' ? layoutState.leftWidth : layoutState.rightWidth;
  document.body.classList.add('is-resizing');

  const handleMove = moveEvt => {
    const delta = moveEvt.clientX - startX;
    if (side === 'left') {
      layoutState.leftWidth = clamp(startWidth + delta, 240, 520);
    } else {
      layoutState.rightWidth = clamp(startWidth - delta, 220, 420);
    }
    applyLayoutState();
  };

  const handleUp = () => {
    document.body.classList.remove('is-resizing');
    persistLayoutState();
    document.removeEventListener('pointermove', handleMove);
    document.removeEventListener('pointerup', handleUp);
  };

  document.addEventListener('pointermove', handleMove);
  document.addEventListener('pointerup', handleUp);
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

function cacheKeyForPath(path) {
  return `${LOCAL_CACHE_PREFIX}${path}`;
}

function groupStorageKey(group) {
  return normalizeGroupName(group) || '__ungrouped__';
}

function isGroupCollapsed(group) {
  return Boolean(collapsedGroups[groupStorageKey(group)]);
}

function toggleGroupCollapsed(group) {
  const key = groupStorageKey(group);
  collapsedGroups[key] = !collapsedGroups[key];
  persistCollapsedGroups();
  renderLibraryList();
}

function getDocGroup(doc) {
  return normalizeGroupName(doc?.group);
}

function getAvailableGroups() {
  const names = [...libraryGroups.map(group => group.name), ...library.map(doc => getDocGroup(doc))];
  return [...new Set(names.filter(Boolean))];
}

function getFilteredLibrary() {
  if (currentGroupFilter === ALL_GROUPS_VALUE) return library;
  return library.filter(doc => getDocGroup(doc) === currentGroupFilter);
}

function getGroupSiblings(doc) {
  return sortDocuments(library.filter(item => getDocGroup(item) === getDocGroup(doc)));
}

function canManageGroup(doc) {
  return Boolean(doc && doc.path && doc.path !== '__adhoc__');
}

function getDocByPath(path) {
  return library.find(doc => doc.path === path) || null;
}

function clearDragIndicators() {
  docList.querySelectorAll('.drop-target, .dragging').forEach(el => {
    el.classList.remove('drop-target', 'dragging');
  });
}

function handleDragStart(evt, doc) {
  if (!canManageGroup(doc)) return;
  draggedDocPath = doc.path;
  evt.dataTransfer.effectAllowed = 'move';
  evt.dataTransfer.setData('text/plain', doc.path);
  evt.currentTarget.classList.add('dragging');
}

function handleDragEnd() {
  draggedDocPath = null;
  clearDragIndicators();
}

function handleDragOver(evt) {
  if (!draggedDocPath) return;
  evt.preventDefault();
  evt.dataTransfer.dropEffect = 'move';
}

function handleDragEnter(evt) {
  if (!draggedDocPath) return;
  evt.currentTarget.classList.add('drop-target');
}

function handleDragLeave(evt) {
  evt.currentTarget.classList.remove('drop-target');
}

async function reorderGroupDocuments(group, docs) {
  const normalizedGroup = normalizeGroupName(group);
  for (let i = 0; i < docs.length; i++) {
    const doc = docs[i];
    await updateDocumentMeta(doc.path, { group: normalizedGroup, order: i + 1 });
  }
}

async function handleDropToGroup(evt, targetGroup, beforePath = null) {
  if (!draggedDocPath) return;
  evt.preventDefault();
  evt.stopPropagation();
  const dragged = getDocByPath(draggedDocPath);
  if (!dragged) return;

  const sourceGroup = getDocGroup(dragged);
  const normalizedTargetGroup = normalizeGroupName(targetGroup);
  if (sourceGroup === normalizedTargetGroup && beforePath === dragged.path) {
    handleDragEnd();
    return;
  }
  const sourceDocs = sortDocuments(library.filter(doc => getDocGroup(doc) === sourceGroup && doc.path !== dragged.path));
  const targetDocs = sortDocuments(library.filter(doc => getDocGroup(doc) === normalizedTargetGroup && doc.path !== dragged.path));

  let insertIndex = targetDocs.length;
  if (beforePath) {
    const targetIndex = targetDocs.findIndex(doc => doc.path === beforePath);
    insertIndex = targetIndex === -1 ? targetDocs.length : targetIndex;
  }

  const movedDoc = { ...dragged, group: normalizedTargetGroup };
  targetDocs.splice(insertIndex, 0, movedDoc);

  if (sourceGroup === normalizedTargetGroup) {
    await reorderGroupDocuments(normalizedTargetGroup, targetDocs);
  } else {
    await reorderGroupDocuments(sourceGroup, sourceDocs);
    await reorderGroupDocuments(normalizedTargetGroup, targetDocs);
  }

  if (currentGroupFilter !== ALL_GROUPS_VALUE && currentGroupFilter !== sourceGroup && currentGroupFilter !== normalizedTargetGroup) {
    currentGroupFilter = ALL_GROUPS_VALUE;
  }
  await loadLibrary();
  await openDocument(dragged.path);
  setStatus(sourceGroup === normalizedTargetGroup ? '已拖拽调整组内顺序' : `已移动到分组：${displayGroupName(normalizedTargetGroup)}`);
  handleDragEnd();
}

function canDeleteDoc(doc) {
  return Boolean(doc && doc.type !== 'main' && doc.path && doc.path !== '__adhoc__');
}

function updateDeleteButtonState() {
  if (!deleteBtn) return;
  const deletable = canDeleteDoc(currentDoc);
  deleteBtn.disabled = !deletable;
  deleteBtn.title = deletable ? '删除当前导入文档' : '主笔记和未保存导入内容不可删除';
}

function getPendingGroupValue() {
  const fromInput = normalizeGroupName(groupInput.value);
  const fromSelect = normalizeGroupName(currentGroupSelect.value);
  return fromInput || fromSelect;
}

function getManagedGroupValue() {
  return normalizeGroupName(manageGroupSelect.value);
}

function getGroupDocumentCount(group) {
  const normalized = normalizeGroupName(group);
  return library.filter(doc => getDocGroup(doc) === normalized).length;
}

function renderGroupSelectors() {
  const groups = getAvailableGroups();
  const currentGroup = getDocGroup(currentDoc);
  if (currentGroupFilter !== ALL_GROUPS_VALUE && currentGroupFilter !== '' && !groups.includes(currentGroupFilter)) {
    currentGroupFilter = ALL_GROUPS_VALUE;
  }
  groupFilterSelect.innerHTML = [
    `<option value="${ALL_GROUPS_VALUE}">全部分组</option>`,
    `<option value="">${UNGROUPED_LABEL}</option>`,
    ...groups.map(group => `<option value="${escapeHtml(group)}">${escapeHtml(group)}</option>`)
  ].join('');
  groupFilterSelect.value = currentGroupFilter;

  const selectGroups = currentGroup && !groups.includes(currentGroup) ? [...groups, currentGroup] : groups;
  currentGroupSelect.innerHTML = [
    `<option value="">${UNGROUPED_LABEL}</option>`,
    ...selectGroups.map(group => `<option value="${escapeHtml(group)}">${escapeHtml(group)}</option>`)
  ].join('');
  currentGroupSelect.value = currentGroup;

  const managedGroup = getManagedGroupValue();
  manageGroupSelect.innerHTML = [
    `<option value="">选择一个分组</option>`,
    ...groups.map(group => `<option value="${escapeHtml(group)}">${escapeHtml(group)}</option>`)
  ].join('');
  manageGroupSelect.value = groups.includes(managedGroup) ? managedGroup : (groups[0] || '');
}

function updateGroupToolbarState() {
  renderGroupSelectors();
  const manageable = canManageGroup(currentDoc);
  const currentGroup = getDocGroup(currentDoc);
  const siblings = currentDoc ? getGroupSiblings(currentDoc) : [];
  const index = siblings.findIndex(doc => currentDoc && doc.path === currentDoc.path);

  groupInput.value = currentDoc ? currentGroup : '';
  applyGroupBtn.disabled = !manageable;
  clearGroupBtn.disabled = !manageable || !currentGroup;
  moveDocUpBtn.disabled = !manageable || index <= 0;
  moveDocDownBtn.disabled = !manageable || index === -1 || index >= siblings.length - 1;
  const managedGroup = getManagedGroupValue();
  const managedCount = managedGroup ? getGroupDocumentCount(managedGroup) : 0;
  renameGroupBtn.disabled = !managedGroup;
  deleteGroupBtn.disabled = !managedGroup || managedCount > 0;
  if (managedGroup) {
    if (!newGroupInput.value.trim()) {
      newGroupInput.value = managedGroup;
    }
    groupManageHint.textContent = managedCount > 0
      ? `分组“${managedGroup}”下还有 ${managedCount} 篇笔记，可重命名但不能删除。`
      : `分组“${managedGroup}”当前为空，可以删除。`;
  } else {
    newGroupInput.value = '';
    groupManageHint.textContent = '只有空分组可以删除；重命名会同步更新该分组下全部笔记。';
  }

  if (!currentDoc) {
    groupMetaText.textContent = '当前没有打开文档。';
    return;
  }
  if (!manageable) {
    groupMetaText.textContent = '临时导入内容可先保存，再加入分组。';
    return;
  }
  groupMetaText.textContent = `当前分组：${displayGroupName(currentGroup)}，组内位置：第 ${index + 1} / ${siblings.length} 篇。`;
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

function render(renderAnchors = true) {
  const processed = preprocess(editor.value);
  preview.innerHTML = marked.parse(processed);
  if (renderAnchors) attachAnchorIds();
  buildTOC();
  localStorage.setItem(currentCacheKey(), editor.value);
  if (window.MathJax?.typesetPromise) {
    window.MathJax.typesetPromise([preview]).catch(() => {});
  }
}

function htmlToMarkdown(html) {
  if (turndownService) {
    return turndownService.turndown(html || '').trim();
  }
  return editor.value;
}

function updateRichMode(enabled) {
  richMode = enabled;
  document.body.classList.toggle('rich-mode', enabled);
  richToolbar.classList.toggle('hidden', !enabled);
  richToolbar.setAttribute('aria-hidden', String(!enabled));
  preview.setAttribute('contenteditable', enabled ? 'true' : 'false');
  preview.setAttribute('spellcheck', enabled ? 'true' : 'false');
  toggleRichBtn.textContent = enabled ? '切换到纯 Markdown' : '切换到所见即所得';
  modeText.textContent = enabled ? '所见即所得模式（语雀风格）' : (editorDrawer.classList.contains('hidden') ? '阅读模式（源码隐藏）' : '编辑模式（源码显示）');
  if (enabled) {
    openEditor(false);
    render(false);
    preview.focus();
  } else {
    preview.removeAttribute('contenteditable');
    render(!editorDrawer.classList.contains('hidden'));
  }
}

function openEditor(force = true) {
  if (richMode && force) updateRichMode(false);
  editorDrawer.classList.toggle('hidden', !force);
  document.body.classList.toggle('reading-mode', !force);
  if (!richMode) modeText.textContent = force ? '编辑模式（源码显示）' : '阅读模式（源码隐藏）';
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
  const filtered = getFilteredLibrary();
  const visibleGroups = currentGroupFilter === ALL_GROUPS_VALUE
    ? getAvailableGroups()
    : [currentGroupFilter];
  if (!filtered.length && currentGroupFilter === ALL_GROUPS_VALUE) {
    docList.innerHTML = '<div class="empty-search">当前筛选条件下没有文档。</div>';
    docCount.textContent = String(library.length);
    return;
  }
  const groups = new Map();
  filtered.forEach(doc => {
    const key = getDocGroup(doc);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(doc);
  });
  visibleGroups.forEach(group => {
    const docs = groups.get(normalizeGroupName(group)) || [];
    if (!docs.length && currentGroupFilter === ALL_GROUPS_VALUE) return;
    const section = document.createElement('section');
    section.className = 'doc-group-section';
    section.dataset.group = group;
    const collapsed = isGroupCollapsed(group);
    section.innerHTML = `
      <button class="doc-group-head" data-action="toggle-group" aria-expanded="${String(!collapsed)}">
        <span class="doc-group-name">${escapeHtml(displayGroupName(group))}</span>
        <span class="doc-group-meta">
          <span class="doc-group-count">${docs.length}</span>
          <span class="doc-group-chevron">${collapsed ? '展开' : '收起'}</span>
        </span>
      </button>
      <div class="doc-group-body ${collapsed ? 'hidden' : ''}" data-group-body="${escapeHtml(group)}"></div>
    `;
    const header = section.querySelector('[data-action="toggle-group"]');
    const body = section.querySelector('[data-group-body]');
    header.addEventListener('click', () => toggleGroupCollapsed(group));
    body.addEventListener('dragover', handleDragOver);
    body.addEventListener('dragenter', handleDragEnter);
    body.addEventListener('dragleave', handleDragLeave);
    body.addEventListener('drop', evt => handleDropToGroup(evt, group));
    docs.forEach(doc => {
      const card = document.createElement('div');
      card.className = 'doc-card';
      card.dataset.path = doc.path;
      if (canManageGroup(doc)) {
        card.draggable = true;
      }
      const deletable = canDeleteDoc(doc);
      card.innerHTML = `
        <div class="doc-card-head">
          <button class="doc-open-btn" data-action="open" data-path="${escapeHtml(doc.path)}">
            <div class="doc-title">${escapeHtml(doc.title || doc.slug)}</div>
            <div class="doc-meta">${escapeHtml(displayGroupName(doc.group))} · ${escapeHtml(doc.path)} · ${doc.type || 'doc'}</div>
            <div class="doc-snippet">${escapeHtml((doc.sourceUrl || doc.remoteFallback || '本地文档').slice(0, 100))}</div>
          </button>
          ${deletable ? '<button class="doc-delete-btn" data-action="delete" title="删除这篇笔记" aria-label="删除这篇笔记">删除</button>' : ''}
        </div>
      `;
      if (canManageGroup(doc)) {
        card.addEventListener('dragstart', evt => handleDragStart(evt, doc));
        card.addEventListener('dragend', handleDragEnd);
        card.addEventListener('dragover', handleDragOver);
        card.addEventListener('dragenter', handleDragEnter);
        card.addEventListener('dragleave', handleDragLeave);
        card.addEventListener('drop', evt => handleDropToGroup(evt, group, doc.path));
      }
      card.querySelector('[data-action="open"]').addEventListener('click', () => openDocument(doc.path));
      if (deletable) {
        card.querySelector('[data-action="delete"]').addEventListener('click', evt => {
          evt.stopPropagation();
          deleteDocument(doc);
        });
      }
      body.appendChild(card);
    });
    docList.appendChild(section);
  });
  if (!docList.children.length) {
    docList.innerHTML = '<div class="empty-search">当前筛选条件下没有文档。</div>';
  }
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
  libraryGroups = (data.groups || []).map((group, index) => ({
    name: normalizeGroupName(group.name),
    order: Number.isFinite(Number(group.order)) ? Number(group.order) : index + 1
  })).filter(group => group.name);
  library = sortDocuments(data.documents || []);
  docSelect.innerHTML = '';
  library.forEach(doc => {
    const option = document.createElement('option');
    option.value = doc.path;
    option.textContent = `[${displayGroupName(doc.group)}] ${doc.title} (${doc.path})`;
    docSelect.appendChild(option);
  });
  if (!library.length) throw new Error('library.json 中没有文档条目');
  renderGroupSelectors();
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
  if (isGroupCollapsed(doc.group)) {
    collapsedGroups[groupStorageKey(doc.group)] = false;
    persistCollapsedGroups();
    renderLibraryList();
  }
  docSelect.value = doc.path;
  docTitleInput.value = doc.title || '';
  docSlugInput.value = doc.slug || slugify(doc.title || 'untitled');
  const text = await resolveDocContent(doc);
  originalContent = text;
  editor.value = localStorage.getItem(currentCacheKey()) || text;
  render(!richMode);
  docPath.textContent = doc.path;
  permalink.href = hashForDoc(doc);
  permalink.textContent = `#doc=${doc.slug}`;
  history.replaceState(null, '', hashForDoc(doc, section));
  syncActiveCard();
  updateDeleteButtonState();
  updateGroupToolbarState();
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
    type: currentDoc?.type === 'main' ? 'main' : 'import',
    group: getPendingGroupValue(),
    order: Number.isFinite(Number(currentDoc?.order)) ? Number(currentDoc.order) : undefined
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

async function updateDocumentMeta(path, meta) {
  return fetchJson('/api/update-document-meta', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path, ...meta })
  });
}

async function createGroup(name) {
  return fetchJson('/api/create-group', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name })
  });
}

async function renameGroup(oldName, newName) {
  return fetchJson('/api/rename-group', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ oldName, newName })
  });
}

async function deleteGroup(name) {
  return fetchJson('/api/delete-group', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name })
  });
}

async function createManagedGroup() {
  const name = normalizeGroupName(newGroupInput.value);
  if (!name) {
    alert('请先输入新分组名。');
    return;
  }
  await createGroup(name);
  newGroupInput.value = name;
  await loadLibrary();
  manageGroupSelect.value = name;
  updateGroupToolbarState();
  setStatus(`已新建分组：${name}`);
}

async function renameManagedGroup() {
  const oldName = getManagedGroupValue();
  const newName = normalizeGroupName(newGroupInput.value);
  if (!oldName) {
    alert('请先选择一个要重命名的分组。');
    return;
  }
  if (!newName) {
    alert('请输入新的分组名。');
    return;
  }
  await renameGroup(oldName, newName);
  if (currentGroupFilter === oldName) currentGroupFilter = newName;
  if (currentDoc && getDocGroup(currentDoc) === oldName) currentDoc.group = newName;
  newGroupInput.value = newName;
  await loadLibrary();
  manageGroupSelect.value = newName;
  updateGroupToolbarState();
  setStatus(`已重命名分组：${oldName} -> ${newName}`);
}

async function deleteManagedGroup() {
  const name = getManagedGroupValue();
  if (!name) {
    alert('请先选择一个要删除的分组。');
    return;
  }
  if (getGroupDocumentCount(name) > 0) {
    alert('这个分组下还有笔记，不能删除。请先移动或删除这些笔记。');
    return;
  }
  const ok = confirm(`确定删除空分组“${name}”吗？`);
  if (!ok) return;
  await deleteGroup(name);
  if (currentGroupFilter === name) currentGroupFilter = ALL_GROUPS_VALUE;
  newGroupInput.value = '';
  await loadLibrary();
  updateGroupToolbarState();
  setStatus(`已删除空分组：${name}`);
}

async function applyCurrentGroup() {
  if (!canManageGroup(currentDoc)) {
    alert('请先把当前临时导入内容保存到站点，再进行分组。');
    return;
  }
  const group = getPendingGroupValue();
  if (currentGroupFilter !== ALL_GROUPS_VALUE) {
    currentGroupFilter = group;
  }
  await updateDocumentMeta(currentDoc.path, { group });
  await loadLibrary();
  await openDocument(currentDoc.path);
  setStatus(`已更新分组：${displayGroupName(group)}`);
}

async function moveCurrentDocument(direction) {
  if (!canManageGroup(currentDoc)) {
    alert('请先保存当前文档，再进行顺序调整。');
    return;
  }
  const siblings = getGroupSiblings(currentDoc);
  const currentIndex = siblings.findIndex(doc => doc.path === currentDoc.path);
  const targetIndex = currentIndex + direction;
  if (currentIndex === -1 || targetIndex < 0 || targetIndex >= siblings.length) {
    setStatus(direction < 0 ? '当前已经是分组内第一篇' : '当前已经是分组内最后一篇');
    return;
  }
  const targetDoc = siblings[targetIndex];
  const currentOrder = Number.isFinite(Number(currentDoc.order)) ? Number(currentDoc.order) : currentIndex + 1;
  const targetOrder = Number.isFinite(Number(targetDoc.order)) ? Number(targetDoc.order) : targetIndex + 1;
  await updateDocumentMeta(currentDoc.path, { group: getDocGroup(currentDoc), order: targetOrder });
  await updateDocumentMeta(targetDoc.path, { group: getDocGroup(targetDoc), order: currentOrder });
  await loadLibrary();
  await openDocument(currentDoc.path);
  setStatus(direction < 0 ? '已上移当前文档' : '已下移当前文档');
}

async function deleteDocument(doc = currentDoc) {
  if (!canDeleteDoc(doc)) {
    alert('主笔记或未保存的临时导入内容不能删除。');
    return;
  }
  const ok = confirm(`确定删除《${doc.title || doc.slug}》吗？\n\n将会删除：\n- 文档文件\n- library.json 中的索引\n- content/assets/${doc.slug}/ 资源目录（如果存在）`);
  if (!ok) return;

  setStatus(`正在删除：${doc.title || doc.slug}…`);
  const wasCurrent = currentDoc && currentDoc.path === doc.path;
  const nextDoc = wasCurrent ? library.find(item => item.path !== doc.path) : currentDoc;
  await fetchJson('/api/delete-document', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path: doc.path })
  });
  localStorage.removeItem(cacheKeyForPath(doc.path));
  await loadLibrary();
  await rebuildSearchIndex();
  if (nextDoc) {
    await openDocument(nextDoc.path);
  } else {
    renderGroupSelectors();
    renderLibraryList();
    updateGroupToolbarState();
  }
  setStatus(`已删除：${doc.title || doc.slug}`);
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
    currentDoc = {
      path: '__adhoc__',
      title: data.title || '网址导入',
      slug: slugify(data.slug || data.title || 'imported'),
      type: 'adhoc',
      group: getPendingGroupValue()
    };
    originalContent = data.markdown;
    editor.value = data.markdown;
    render(!richMode);
    openEditor(true);
    docPath.textContent = 'adhoc / 未保存导入';
    updateGroupToolbarState();
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
      sourceUrl: url,
      group: getPendingGroupValue()
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
  if (!richMode) render(true);
});

docTitleInput.addEventListener('input', () => {
  if (!docSlugInput.value.trim()) docSlugInput.value = slugify(docTitleInput.value);
});

docSelect.addEventListener('change', async () => openDocument(docSelect.value));
searchInput.addEventListener('input', runSearch);
groupFilterSelect.addEventListener('change', () => {
  currentGroupFilter = groupFilterSelect.value;
  renderLibraryList();
});
currentGroupSelect.addEventListener('change', () => {
  groupInput.value = currentGroupSelect.value;
});
manageGroupSelect.addEventListener('change', () => {
  newGroupInput.value = manageGroupSelect.value;
  updateGroupToolbarState();
});
createGroupBtn.addEventListener('click', async () => {
  try {
    await createManagedGroup();
  } catch (err) {
    console.error(err);
    setStatus(`新建分组失败：${err.message}`, true);
    alert(`新建分组失败：${err.message}\n\n请确认当前是通过 python scripts/server.py 启动的本地站点。`);
  }
});
renameGroupBtn.addEventListener('click', async () => {
  try {
    await renameManagedGroup();
  } catch (err) {
    console.error(err);
    setStatus(`重命名分组失败：${err.message}`, true);
    alert(`重命名分组失败：${err.message}\n\n请确认当前是通过 python scripts/server.py 启动的本地站点。`);
  }
});
deleteGroupBtn.addEventListener('click', async () => {
  try {
    await deleteManagedGroup();
  } catch (err) {
    console.error(err);
    setStatus(`删除分组失败：${err.message}`, true);
    alert(`删除分组失败：${err.message}\n\n请确认当前是通过 python scripts/server.py 启动的本地站点。`);
  }
});
applyGroupBtn.addEventListener('click', async () => {
  try {
    await applyCurrentGroup();
  } catch (err) {
    console.error(err);
    setStatus(`分组更新失败：${err.message}`, true);
    alert(`分组更新失败：${err.message}\n\n请确认当前是通过 python scripts/server.py 启动的本地站点。`);
  }
});
clearGroupBtn.addEventListener('click', async () => {
  groupInput.value = '';
  currentGroupSelect.value = '';
  try {
    await applyCurrentGroup();
  } catch (err) {
    console.error(err);
    setStatus(`分组更新失败：${err.message}`, true);
    alert(`分组更新失败：${err.message}\n\n请确认当前是通过 python scripts/server.py 启动的本地站点。`);
  }
});
moveDocUpBtn.addEventListener('click', async () => {
  try {
    await moveCurrentDocument(-1);
  } catch (err) {
    console.error(err);
    setStatus(`顺序调整失败：${err.message}`, true);
    alert(`顺序调整失败：${err.message}\n\n请确认当前是通过 python scripts/server.py 启动的本地站点。`);
  }
});
moveDocDownBtn.addEventListener('click', async () => {
  try {
    await moveCurrentDocument(1);
  } catch (err) {
    console.error(err);
    setStatus(`顺序调整失败：${err.message}`, true);
    alert(`顺序调整失败：${err.message}\n\n请确认当前是通过 python scripts/server.py 启动的本地站点。`);
  }
});
refreshLibraryBtn.addEventListener('click', async () => {
  await loadLibrary();
  await rebuildSearchIndex();
  setStatus('文档库与搜索索引已刷新');
});

reloadBtn.addEventListener('click', () => {
  editor.value = originalContent;
  localStorage.removeItem(currentCacheKey());
  render(!richMode);
  setStatus('已恢复原始内容');
});

saveBtn.addEventListener('click', async () => {
  try {
    await saveCurrentDocument();
  } catch (err) {
    console.error(err);
    setStatus(`保存失败：${err.message}`, true);
    alert(`保存失败：${err.message}\n\n请确认当前是通过 python scripts/server.py 启动的本地站点。`);
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

deleteBtn.addEventListener('click', async () => {
  try {
    await deleteDocument();
  } catch (err) {
    console.error(err);
    setStatus(`删除失败：${err.message}`, true);
    alert(`删除失败：${err.message}\n\n请确认当前是通过 python scripts/server.py 启动的本地站点。`);
  }
});

importPreviewBtn.addEventListener('click', async () => {
  try {
    await importUrl('preview');
  } catch (err) {
    console.error(err);
    setStatus(`导入失败：${err.message}`, true);
    alert(`导入失败：${err.message}\n\n请确认当前是通过 python scripts/server.py 启动的本地站点。`);
  }
});

importSaveBtn.addEventListener('click', async () => {
  try {
    await importUrl('save');
  } catch (err) {
    console.error(err);
    setStatus(`导入保存失败：${err.message}`, true);
    alert(`导入保存失败：${err.message}\n\n请确认当前是通过 python scripts/server.py 启动的本地站点。`);
  }
});

editToggleBtn.addEventListener('click', () => openEditor(editorDrawer.classList.contains('hidden')));
closeEditorBtn.addEventListener('click', () => openEditor(false));
toggleLeftSidebarBtn.addEventListener('click', toggleLeftSidebar);
toggleRightSidebarBtn.addEventListener('click', toggleRightSidebar);
toggleRichBtn.addEventListener('click', () => updateRichMode(!richMode));
leftResizer.addEventListener('pointerdown', evt => startResize('left', evt));
rightResizer.addEventListener('pointerdown', evt => startResize('right', evt));
window.addEventListener('resize', applyLayoutState);

preview.addEventListener('input', () => {
  if (!richMode) return;
  editor.value = htmlToMarkdown(preview.innerHTML);
  localStorage.setItem(currentCacheKey(), editor.value);
  buildTOC();
});

richToolbar.addEventListener('click', evt => {
  const btn = evt.target.closest('button[data-cmd]');
  if (!btn || !richMode) return;
  const cmd = btn.dataset.cmd;
  preview.focus();
  if (cmd === 'h2') {
    document.execCommand('formatBlock', false, 'h2');
  } else if (cmd === 'blockquote') {
    document.execCommand('formatBlock', false, 'blockquote');
  } else if (cmd === 'code') {
    document.execCommand('insertHTML', false, '<code>代码</code>');
  } else if (cmd === 'createLink') {
    const link = prompt('请输入链接地址：', 'https://');
    if (link) document.execCommand('createLink', false, link);
  } else {
    document.execCommand(cmd, false, null);
  }
  editor.value = htmlToMarkdown(preview.innerHTML);
  localStorage.setItem(currentCacheKey(), editor.value);
  buildTOC();
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
  if (mod && evt.shiftKey && evt.key.toLowerCase() === 'e') {
    evt.preventDefault();
    updateRichMode(!richMode);
  }
});

async function init() {
  if (STATIC_HOST) {
    setStatus('当前是只读模式，保存和网址导入需要本地服务端。');
  }
  applyLayoutState();
  await loadLibrary();
  await rebuildSearchIndex();
  const { doc, section } = findDocByHash();
  await openDocument(doc.path, section);
  openEditor(false);
  document.body.classList.add('reading-mode');
  updateDeleteButtonState();
  updateGroupToolbarState();
}

init().catch(err => {
  console.error(err);
  editor.value = `初始化失败：${err.message}\n\n请使用 python scripts/server.py 启动本项目。`;
  render();
  setStatus(`初始化失败：${err.message}`, true);
});
