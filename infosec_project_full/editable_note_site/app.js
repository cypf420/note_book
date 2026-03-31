const REMOTE_IMG_BASE = 'https://raw.githubusercontent.com/sqc-cyh/sqc-cyh.github.io/main/docs/LessonsNotes/D2CX_Xinanyuan/img/';
const LIBRARY_URL = './content/library.json';
const LOCAL_CACHE_PREFIX = 'editable-note-site-cache:';
const STATIC_HOST = !(location.hostname === '127.0.0.1' || location.hostname === 'localhost');

const editor = document.getElementById('editor');
const preview = document.getElementById('preview');
const openEditorsList = document.getElementById('openEditorsList');
const reloadBtn = document.getElementById('reloadBtn');
const saveBtn = document.getElementById('saveBtn');
const settingsSaveBtn = document.getElementById('settingsSaveBtn');
const deleteBtn = document.getElementById('deleteBtn');
const downloadBtn = document.getElementById('downloadBtn');
const clearLocalBtn = document.getElementById('clearLocalBtn');
const publishShareBtn = document.getElementById('publishShareBtn');
const browseShareBtn = document.getElementById('browseShareBtn');
const exitSiteBtn = document.getElementById('exitSiteBtn');
const importPreviewBtn = document.getElementById('importPreviewBtn');
const importSaveBtn = document.getElementById('importSaveBtn');
const refreshLibraryBtn = document.getElementById('refreshLibraryBtn');
const editToggleBtn = document.getElementById('editToggleBtn');
const toggleLeftSidebarBtn = document.getElementById('toggleLeftSidebarBtn');
const toggleRightSidebarBtn = document.getElementById('toggleRightSidebarBtn');
const toggleRichBtn = document.getElementById('toggleRichBtn');
const toggleThemeBtn = document.getElementById('toggleThemeBtn');
const toggleWidthBtn = document.getElementById('toggleWidthBtn');
const toggleFocusBtn = document.getElementById('toggleFocusBtn');
const newBlankBtn = document.getElementById('newBlankBtn');
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
const toggleTocBtn = document.getElementById('toggleTocBtn');
const docPath = document.getElementById('docPath');
const modeText = document.getElementById('modeText');
const permalink = document.getElementById('permalink');
const editorDrawer = document.getElementById('editorDrawer');
const richToolbar = document.getElementById('richToolbar');
const leftResizer = document.getElementById('leftResizer');
const rightResizer = document.getElementById('rightResizer');
const toggleTreeBtn = document.getElementById('toggleTreeBtn');
const closeTreeDrawerBtn = document.getElementById('closeTreeDrawerBtn');
const treeDrawer = document.getElementById('treeDrawer');
const topbar = document.querySelector('.topbar');
const explorerCreateBtn = document.getElementById('explorerCreateBtn');
const explorerCreateMenu = document.getElementById('explorerCreateMenu');
const explorerMenuImportBtn = document.getElementById('explorerMenuImportBtn');
const explorerNewFolderBtn = document.getElementById('explorerNewFolderBtn');
const activityExplorerBtn = document.getElementById('activityExplorerBtn');
const activitySearchBtn = document.getElementById('activitySearchBtn');
const activitySyncBtn = document.getElementById('activitySyncBtn');
const activitySourceBtn = document.getElementById('activitySourceBtn');
const activitySettingsBtn = document.getElementById('activitySettingsBtn');
const groupFilterSelect = document.getElementById('groupFilterSelect');
const currentGroupSelect = document.getElementById('currentGroupSelect');
const groupInput = document.getElementById('groupInput');
const applyGroupBtn = document.getElementById('applyGroupBtn');
const clearGroupBtn = document.getElementById('clearGroupBtn');
const moveDocUpBtn = document.getElementById('moveDocUpBtn');
const moveDocDownBtn = document.getElementById('moveDocDownBtn');
const groupMetaText = document.getElementById('groupMetaText');
const manageGroupSelect = document.getElementById('manageGroupSelect');
const parentGroupSelect = document.getElementById('parentGroupSelect');
const newGroupInput = document.getElementById('newGroupInput');
const createGroupBtn = document.getElementById('createGroupBtn');
const renameGroupBtn = document.getElementById('renameGroupBtn');
const updateGroupParentBtn = document.getElementById('updateGroupParentBtn');
const deleteGroupBtn = document.getElementById('deleteGroupBtn');
const groupManageHint = document.getElementById('groupManageHint');
const sharePublishModal = document.getElementById('sharePublishModal');
const closeSharePublishModalBtn = document.getElementById('closeSharePublishModalBtn');
const shareAuthorInput = document.getElementById('shareAuthorInput');
const shareAcademyInput = document.getElementById('shareAcademyInput');
const shareMajorInput = document.getElementById('shareMajorInput');
const shareYearInput = document.getElementById('shareYearInput');
const shareTagsInput = document.getElementById('shareTagsInput');
const shareSummaryInput = document.getElementById('shareSummaryInput');
const shareBranchPreview = document.getElementById('shareBranchPreview');
const sharePublishMeta = document.getElementById('sharePublishMeta');
const confirmSharePublishBtn = document.getElementById('confirmSharePublishBtn');
const sharedBrowseModal = document.getElementById('sharedBrowseModal');
const refreshSharedNotesBtn = document.getElementById('refreshSharedNotesBtn');
const closeSharedBrowseModalBtn = document.getElementById('closeSharedBrowseModalBtn');
const sharedSearchInput = document.getElementById('sharedSearchInput');
const sharedAcademyFilter = document.getElementById('sharedAcademyFilter');
const sharedMajorFilter = document.getElementById('sharedMajorFilter');
const sharedYearFilter = document.getElementById('sharedYearFilter');
const sharedNotesMeta = document.getElementById('sharedNotesMeta');
const sharedNotesSourceText = document.getElementById('sharedNotesSourceText');
const sharedNotesList = document.getElementById('sharedNotesList');
const explorerContextMenu = document.getElementById('explorerContextMenu');
const taskTray = document.getElementById('taskTray');
const shareUploadTask = document.getElementById('shareUploadTask');
const shareUploadTaskTitle = document.getElementById('shareUploadTaskTitle');
const shareUploadTaskMeta = document.getElementById('shareUploadTaskMeta');
const retryShareUploadBtn = document.getElementById('retryShareUploadBtn');
const dismissShareUploadBtn = document.getElementById('dismissShareUploadBtn');

let library = [];
let libraryGroups = [];
let searchIndex = [];
let currentDoc = null;
let originalContent = '';
let leftSidebarCollapsed = false;
let rightSidebarCollapsed = false;
let richMode = false;
let focusMode = false;
let tocVisible = true;
let darkTheme = false;
let readingDensity = 'standard';
let searchTimer = null;
let searchBuildToken = 0;
const LAYOUT_STORAGE_KEY = 'editable-note-site-layout';
const GROUP_COLLAPSE_STORAGE_KEY = 'editable-note-site-group-collapse';
const TREE_DRAWER_STORAGE_KEY = 'editable-note-site-tree-drawer-open';
const THEME_STORAGE_KEY = 'editable-note-site-theme';
const READING_DENSITY_STORAGE_KEY = 'editable-note-site-reading-density';
const FOCUS_MODE_STORAGE_KEY = 'editable-note-site-focus-mode';
const TOC_VISIBLE_STORAGE_KEY = 'editable-note-site-toc-visible';
const SHARE_PROFILE_STORAGE_KEY = 'editable-note-site-share-profile';
const ACTIVE_SIDEBAR_PANEL_STORAGE_KEY = 'editable-note-site-active-sidebar';
const DEFAULT_LAYOUT = { leftWidth: 310, rightWidth: 250 };
const layoutState = readLayoutState();
const turndownService = window.TurndownService ? new window.TurndownService({ headingStyle: 'atx', codeBlockStyle: 'fenced' }) : null;
if (turndownService) {
  turndownService.addRule('taskListItem', {
    filter(node) {
      return node.nodeName === 'LI' && node.getAttribute('data-task-item') === 'true';
    },
    replacement(content, node) {
      const checkbox = node.querySelector('input[type="checkbox"]');
      const checked = checkbox?.checked ? 'x' : ' ';
      const text = (node.querySelector('.task-item-text')?.textContent || node.textContent || '').trim();
      return `\n- [${checked}] ${text}`;
    }
  });
  turndownService.addRule('fencedCodeBlockWithLanguage', {
    filter(node) {
      return node.nodeName === 'PRE' && node.firstElementChild?.nodeName === 'CODE';
    },
    replacement(content, node) {
      const code = node.firstElementChild;
      const classMatch = (code.className || '').match(/language-([\w-]+)/);
      const lang = (code.getAttribute('data-language') || classMatch?.[1] || '').trim();
      const text = (code.textContent || '').replace(/\n$/, '');
      return `\n\n\`\`\`${lang}\n${text}\n\`\`\`\n\n`;
    }
  });
}
const ALL_GROUPS_VALUE = '__ALL_GROUPS__';
const UNGROUPED_LABEL = '未分组';
let currentGroupFilter = ALL_GROUPS_VALUE;
let collapsedGroups = readCollapsedGroups();
let draggedDocPath = null;
let treeDrawerOpen = readTreeDrawerState();
let applyingRichShortcut = false;
let sharedNotesCache = [];
let sharedNotesSource = null;
let shareDefaultsLoaded = false;
let topbarHidden = false;
let lastScrollY = window.scrollY || 0;
let activeSidebarPanel = localStorage.getItem(ACTIVE_SIDEBAR_PANEL_STORAGE_KEY) || 'explorer';
let selectedExplorerGroup = '';
let explorerContextState = null;
let shareUploadTaskState = { state: 'idle', payload: null, branchName: '', message: '', error: '' };

const GUIDE_GROUP_NAME = '新手引导';
const LEGACY_GUIDE_GROUP_NAME = '帮助';

marked.setOptions({ breaks: true, gfm: true });

function setStatus(text, isError = false) {
  statusText.textContent = text;
  statusText.classList.toggle('status-error', !!isError);
  statusText.classList.toggle('status-ok', !isError);
}

function showIllegalAction(message) {
  const text = `非法操作：${message}`;
  setStatus(text, true);
  alert(text);
}

function showRequestError(prefix, err) {
  console.error(err);
  const message = err?.message || String(err);
  setStatus(`${prefix}：${message}`, true);
  alert(`${prefix}：${message}\n\n请确认当前是通过 python scripts/server.py 或 begin.bat 启动的本地站点。`);
}

function normalizeShareField(value) {
  return (value || '')
    .trim()
    .replace(/\s+/g, '')
    .replace(/[^\w\u4e00-\u9fa5-]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^[._/-]+|[._/-]+$/g, '')
    .slice(0, 80);
}

function normalizeShareBranchPart(value) {
  return normalizeShareField(value).replace(/_+/g, '-');
}

function buildShareBranchName() {
  return buildShareBranchNameFromProfile({
    author: shareAuthorInput?.value || '',
    academy: shareAcademyInput?.value || '',
    major: shareMajorInput?.value || '',
    year: shareYearInput?.value || ''
  });
}

function updateShareBranchPreview() {
  if (!shareBranchPreview) return;
  const branchName = buildShareBranchName();
  shareBranchPreview.textContent = branchName || '未填写完整';
}

function readShareProfile() {
  try {
    return JSON.parse(localStorage.getItem(SHARE_PROFILE_STORAGE_KEY) || '{}');
  } catch (_) {
    return {};
  }
}

function persistShareProfile() {
  localStorage.setItem(SHARE_PROFILE_STORAGE_KEY, JSON.stringify({
    author: (shareAuthorInput?.value || '').trim(),
    academy: (shareAcademyInput?.value || '').trim(),
    major: (shareMajorInput?.value || '').trim(),
    year: (shareYearInput?.value || '').trim(),
    tags: (shareTagsInput?.value || '').trim(),
    summary: (shareSummaryInput?.value || '').trim(),
  }));
}

function applyShareProfile(profile = {}) {
  if (shareAuthorInput) shareAuthorInput.value = profile.author || '';
  if (shareAcademyInput) shareAcademyInput.value = profile.academy || '';
  if (shareMajorInput) shareMajorInput.value = profile.major || '';
  if (shareYearInput) shareYearInput.value = profile.year || '';
  if (shareTagsInput) shareTagsInput.value = profile.tags || '';
  if (shareSummaryInput) shareSummaryInput.value = profile.summary || '';
  updateShareBranchPreview();
}

async function ensureShareDefaultsLoaded() {
  if (shareDefaultsLoaded || STATIC_HOST) return;
  shareDefaultsLoaded = true;
  try {
    const data = await fetchJson('/api/share-profile-defaults');
    if (shareAuthorInput && !shareAuthorInput.value.trim()) {
      shareAuthorInput.value = data.author || '';
    }
    updateShareBranchPreview();
    if (sharePublishMeta && data.defaultBranch) {
      sharePublishMeta.innerHTML += `<br />默认分支：<code>${escapeHtml(data.defaultBranch)}</code>，中央索引会写回 <code>shared_notes/shared-index.json</code>。`;
    }
  } catch (_) {
  }
}

function setModalOpen(modal, open) {
  if (!modal) return;
  modal.classList.toggle('hidden', !open);
  modal.setAttribute('aria-hidden', String(!open));
}

function openSharePublishModal() {
  applyShareProfile(readShareProfile());
  if (sharePublishMeta) {
    sharePublishMeta.innerHTML = shareUploadTaskState.state === 'running'
      ? '当前已有后台上传任务在运行，你可以直接关闭这个窗口继续编辑。'
      : '上传会使用当前仓库的 <code>origin</code> 远程。如果本机没有 GitHub 凭据，推送会失败。作者为空时会优先读取本机 Git 身份。';
  }
  setModalOpen(sharePublishModal, true);
  void ensureShareDefaultsLoaded();
}

function closeSharePublishModal() {
  setModalOpen(sharePublishModal, false);
}

function openSharedBrowseModal() {
  setModalOpen(sharedBrowseModal, true);
}

function closeSharedBrowseModal() {
  setModalOpen(sharedBrowseModal, false);
}

function leaveAppPageAfterShutdown() {
  const html = `<!DOCTYPE html>
  <html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>本地站点已退出</title>
    <style>
      body {
        margin: 0;
        min-height: 100vh;
        display: grid;
        place-items: center;
        padding: 32px;
        background: linear-gradient(160deg, #f7f4ee 0%, #f1ece3 100%);
        color: #1a1a1a;
        font-family: "Inter", "Helvetica Neue", Arial, sans-serif;
      }
      main {
        width: min(560px, 100%);
        padding: 28px 32px;
        border: 1px solid #d9d3c7;
        border-radius: 18px;
        background: rgba(255, 253, 249, 0.96);
        box-shadow: 0 12px 28px rgba(26, 26, 26, 0.08);
        text-align: center;
      }
      h1 {
        margin: 0 0 12px;
        font-family: "Georgia", "Times New Roman", serif;
        font-size: clamp(30px, 4vw, 46px);
      }
      p {
        margin: 0;
        line-height: 1.8;
        color: #6e6a62;
        font-size: 16px;
      }
      button {
        margin-top: 18px;
        padding: 10px 14px;
        border-radius: 10px;
        border: 1px solid #d9d3c7;
        background: #fff;
        cursor: pointer;
        font-weight: 700;
      }
    </style>
  </head>
  <body>
    <main>
      <h1>本地站点已退出</h1>
      <p>服务已经停止。当前浏览器若未自动关闭，直接关闭此页即可。</p>
      <button id="closeBtn" type="button">关闭页面</button>
    </main>
    <script>
      const tryClose = () => {
        window.open('', '_self');
        window.close();
      };
      document.getElementById('closeBtn')?.addEventListener('click', tryClose);
      setTimeout(tryClose, 120);
      setTimeout(() => {
        if (!document.hidden) {
          document.body.setAttribute('data-close-blocked', '1');
        }
      }, 320);
    <\/script>
  </body>
  </html>`;
  window.location.replace(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);
}

async function requestShutdownSignal() {
  try {
    if (navigator.sendBeacon) {
      const accepted = navigator.sendBeacon('/api/shutdown', new Blob(['{}'], { type: 'application/json' }));
      if (accepted) return;
    }
  } catch (_) {
  }
  try {
    await fetch('/api/shutdown', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{}',
      cache: 'no-store',
      keepalive: true
    });
  } catch (_) {
    // The server may terminate before the browser receives a response.
  }
}

async function shutdownSite() {
  if (STATIC_HOST) {
    throw new Error('当前是静态只读模式，无法关闭本地服务');
  }
  if (exitSiteBtn) exitSiteBtn.disabled = true;
  setStatus('正在退出本地站点…');
  await requestShutdownSignal();
  leaveAppPageAfterShutdown();
}

function looksLikeIllegalAction(message) {
  return /分组名|请先|不能删除|不正确|只允许|非法|为空|层级|子分组|同名|位置|group name|not allowed|only http|cannot be empty|forbidden|is not empty/.test((message || '').toLowerCase());
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function normalizeGroupName(group) {
  const text = (group || '').replace(/\\/g, '/').trim();
  if (!text) return '';
  return text.split('/').map(part => part.trim()).filter(Boolean).join('/');
}

function migrateGuideGroupName(group) {
  const normalized = normalizeGroupName(group);
  if (!normalized) return '';
  if (normalized === LEGACY_GUIDE_GROUP_NAME) return GUIDE_GROUP_NAME;
  if (normalized.startsWith(`${LEGACY_GUIDE_GROUP_NAME}/`)) {
    return `${GUIDE_GROUP_NAME}/${normalized.slice(LEGACY_GUIDE_GROUP_NAME.length + 1)}`;
  }
  return normalized;
}

function compareGroupsForExplorer(a, b) {
  const normalizedA = migrateGuideGroupName(a);
  const normalizedB = migrateGuideGroupName(b);
  const guideRankA = normalizedA === GUIDE_GROUP_NAME ? 0 : 1;
  const guideRankB = normalizedB === GUIDE_GROUP_NAME ? 0 : 1;
  return guideRankA - guideRankB || normalizedA.localeCompare(normalizedB, 'zh-CN');
}

function validateGroupNameOrThrow(group) {
  const normalized = normalizeGroupName(group);
  if (!normalized) throw new Error('分组名不能为空');
  if (normalized.startsWith('/') || normalized.endsWith('/') || normalized.includes('//')) {
    throw new Error('分组层级格式不正确');
  }
  const parts = normalized.split('/');
  for (const part of parts) {
    if (part.length > 50) throw new Error('每级分组名不能超过 50 个字符');
    if (/[\\:*?"<>|]/.test(part)) throw new Error('分组名不能包含 \\ : * ? " < > |');
  }
  return normalized;
}

function splitGroupName(group) {
  const normalized = normalizeGroupName(group);
  return normalized ? normalized.split('/') : [];
}

function getGroupParentName(group) {
  const parts = splitGroupName(group);
  return parts.length > 1 ? parts.slice(0, -1).join('/') : '';
}

function getGroupLeafName(group) {
  const parts = splitGroupName(group);
  return parts.length ? parts[parts.length - 1] : '';
}

function getGroupDepth(group) {
  return splitGroupName(group).length;
}

function isGroupWithin(group, root) {
  const groupName = normalizeGroupName(group);
  const rootName = normalizeGroupName(root);
  if (!rootName) return true;
  return groupName === rootName || groupName.startsWith(`${rootName}/`);
}

function formatGroupOptionLabel(group) {
  const depth = Math.max(0, getGroupDepth(group) - 1);
  return `${'　'.repeat(depth)}${depth ? '└ ' : ''}${getGroupLeafName(group) || UNGROUPED_LABEL}`;
}

function validateUrlOrThrow(url) {
  const value = (url || '').trim();
  if (!value) throw new Error('请先输入网址');
  let parsed;
  try {
    parsed = new URL(value);
  } catch (_) {
    throw new Error('网址格式不正确');
  }
  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new Error('只允许导入 http 或 https 网页');
  }
  return value;
}

function displayGroupName(group) {
  return migrateGuideGroupName(group) || UNGROUPED_LABEL;
}

function getGroupOrderMap() {
  const map = new Map();
  libraryGroups.forEach((group, index) => {
    map.set(migrateGuideGroupName(group.name), Number.isFinite(Number(group.order)) ? Number(group.order) : index + 1);
  });
  return map;
}

function documentSortValue(doc) {
  const group = getDocGroup(doc);
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

function readTreeDrawerState() {
  const stored = localStorage.getItem(TREE_DRAWER_STORAGE_KEY);
  return stored == null ? true : stored === '1';
}

function persistLayoutState() {
  localStorage.setItem(LAYOUT_STORAGE_KEY, JSON.stringify(layoutState));
}

function persistCollapsedGroups() {
  localStorage.setItem(GROUP_COLLAPSE_STORAGE_KEY, JSON.stringify(collapsedGroups));
}

function persistTreeDrawerState() {
  localStorage.setItem(TREE_DRAWER_STORAGE_KEY, treeDrawerOpen ? '1' : '0');
}

function applyTheme(isDark) {
  darkTheme = Boolean(isDark);
  document.body.classList.toggle('theme-dark', darkTheme);
  if (toggleThemeBtn) {
    const tooltip = darkTheme ? '切换到浅色主题' : '切换到深色主题';
    toggleThemeBtn.dataset.tooltip = tooltip;
    toggleThemeBtn.setAttribute('aria-label', tooltip);
  }
  localStorage.setItem(THEME_STORAGE_KEY, darkTheme ? 'dark' : 'light');
}

function applySidebarPanelState() {
  document.querySelectorAll('.sidebar-view').forEach(view => {
    view.classList.toggle('is-active', view.dataset.panel === activeSidebarPanel);
  });
  document.querySelectorAll('[data-activity-panel]').forEach(btn => {
    btn.classList.toggle('is-active', btn.dataset.activityPanel === activeSidebarPanel);
  });
  localStorage.setItem(ACTIVE_SIDEBAR_PANEL_STORAGE_KEY, activeSidebarPanel);
}

function setActiveSidebarPanel(panel) {
  const next = ['explorer', 'search', 'sync', 'settings'].includes(panel) ? panel : 'explorer';
  activeSidebarPanel = next;
  if (leftSidebarCollapsed) {
    leftSidebarCollapsed = false;
    persistLayoutState();
  }
  applyLayoutState();
  applySidebarPanelState();
}

function setExplorerCreateMenuOpen(nextOpen) {
  if (!explorerCreateMenu) return;
  explorerCreateMenu.classList.toggle('hidden', !nextOpen);
  explorerCreateMenu.setAttribute('aria-hidden', String(!nextOpen));
  if (explorerCreateBtn) explorerCreateBtn.setAttribute('aria-expanded', String(nextOpen));
}

function closeExplorerContextMenu() {
  if (!explorerContextMenu) return;
  explorerContextMenu.classList.add('hidden');
  explorerContextMenu.setAttribute('aria-hidden', 'true');
  explorerContextState = null;
}

function openExplorerContextMenu(evt, state) {
  if (!explorerContextMenu) return;
  setExplorerCreateMenuOpen(false);
  const allowedActions = state.type === 'group'
    ? ['new-file', 'new-folder', 'import-url', 'rename', 'delete']
    : ['open', 'rename', 'delete', 'copy-path'];
  explorerContextMenu.querySelectorAll('[data-menu-action]').forEach(button => {
    const action = button.dataset.menuAction;
    let visible = allowedActions.includes(action);
    if (state.type === 'file' && action === 'delete') {
      visible = visible && canDeleteDoc(state.doc);
    }
    if (state.type === 'file' && action === 'rename') {
      visible = visible && canManageGroup(state.doc);
    }
    button.classList.toggle('hidden', !visible);
  });
  explorerContextState = state;
  explorerContextMenu.classList.remove('hidden');
  explorerContextMenu.setAttribute('aria-hidden', 'false');
  const maxX = Math.max(8, window.innerWidth - explorerContextMenu.offsetWidth - 8);
  const maxY = Math.max(8, window.innerHeight - explorerContextMenu.offsetHeight - 8);
  explorerContextMenu.style.left = `${Math.min(evt.clientX, maxX)}px`;
  explorerContextMenu.style.top = `${Math.min(evt.clientY, maxY)}px`;
}

function buildShareBranchNameFromProfile(profile = {}) {
  const author = normalizeShareBranchPart(profile.author || 'auto');
  const academy = normalizeShareBranchPart(profile.academy || '');
  const major = normalizeShareBranchPart(profile.major || '');
  const year = normalizeShareBranchPart(profile.year || '');
  if (!academy || !major || !year) return '';
  return `notes/${academy}-${major}-${year}-${author || 'auto'}`;
}

function renderShareUploadTask() {
  if (!taskTray || !shareUploadTask) return;
  const active = shareUploadTaskState.state !== 'idle';
  taskTray.classList.toggle('hidden', !active);
  shareUploadTask.classList.toggle('hidden', !active);
  shareUploadTask.dataset.state = shareUploadTaskState.state;
  if (!active) return;
  const branchText = shareUploadTaskState.branchName ? ` · ${shareUploadTaskState.branchName}` : '';
  shareUploadTaskTitle.textContent = `共享上传${branchText}`;
  shareUploadTaskMeta.textContent = shareUploadTaskState.message || '准备就绪';
  retryShareUploadBtn?.classList.toggle('hidden', shareUploadTaskState.state !== 'error');
  dismissShareUploadBtn?.classList.toggle('hidden', shareUploadTaskState.state === 'running');
}

function dismissShareUploadTask() {
  if (shareUploadTaskState.state === 'running') return;
  shareUploadTaskState = { state: 'idle', payload: null, branchName: '', message: '', error: '' };
  renderShareUploadTask();
}

async function startShareUploadTask(payload) {
  if (shareUploadTaskState.state === 'running') {
    setStatus('已有共享上传任务正在进行，请等待当前任务完成', true);
    return;
  }
  const branchName = buildShareBranchNameFromProfile(payload);
  shareUploadTaskState = {
    state: 'running',
    payload: { ...payload },
    branchName,
    message: `正在上传到 ${branchName || '共享分支'}，你可以继续编辑当前笔记。随后 GitHub Actions 会更新 shared-index.json。`,
    error: ''
  };
  renderShareUploadTask();
  setStatus(`共享上传已转入后台：${branchName || '未命名分支'}`);
  closeSharePublishModal();
  try {
    const result = await publishSharedNotes(payload);
    shareUploadTaskState = {
      state: 'success',
      payload: { ...payload },
      branchName: result.branchName || branchName,
      message: `上传完成：${result.branchName}，共同步 ${result.documentCount} 篇笔记，manifest 已写入 ${result.manifestPath || 'shared_notes/manifest.json'}。中央索引会在 Actions 执行后更新。`,
      error: ''
    };
    setStatus(`共享分支已上传：${result.branchName}`);
  } catch (err) {
    const message = err?.message || String(err);
    shareUploadTaskState = {
      state: 'error',
      payload: { ...payload },
      branchName,
      message: `上传失败：${message}`,
      error: message
    };
    setStatus(`共享上传失败：${message}`, true);
  } finally {
    renderShareUploadTask();
  }
}

function syncSourceActivityState() {
  if (!activitySourceBtn) return;
  const open = !editorDrawer.classList.contains('hidden');
  activitySourceBtn.classList.toggle('is-source-open', open);
  activitySourceBtn.dataset.tooltip = open ? '关闭 Markdown 源码' : '打开 Markdown 源码';
  activitySourceBtn.setAttribute('aria-label', activitySourceBtn.dataset.tooltip);
}

function applyReadingDensity(mode) {
  const next = ['compact', 'standard', 'wide'].includes(mode) ? mode : 'standard';
  readingDensity = next;
  document.body.classList.remove('density-compact', 'density-wide');
  if (next === 'compact') document.body.classList.add('density-compact');
  if (next === 'wide') document.body.classList.add('density-wide');
  if (toggleWidthBtn) {
    const labelMap = {
      compact: '阅读宽度：专栏窄栏',
      standard: '阅读宽度：标准',
      wide: '阅读宽度：沉浸宽幅'
    };
    toggleWidthBtn.textContent = labelMap[next];
  }
  localStorage.setItem(READING_DENSITY_STORAGE_KEY, next);
}

function cycleReadingDensity() {
  const order = ['compact', 'standard', 'wide'];
  const index = order.indexOf(readingDensity);
  const next = order[(index + 1) % order.length];
  applyReadingDensity(next);
  setStatus(`已切换阅读宽度：${next === 'compact' ? '专栏窄栏' : next === 'wide' ? '沉浸宽幅' : '标准宽度'}`);
}

function applyTocState() {
  if (!tocPanel) return;
  tocPanel.classList.toggle('hidden', !tocVisible);
  if (toggleTocBtn) {
    const tooltip = tocVisible ? '收起目录栏' : '展开目录栏';
    toggleTocBtn.dataset.tooltip = tooltip;
    toggleTocBtn.setAttribute('aria-label', tooltip);
    toggleTocBtn.setAttribute('aria-expanded', String(tocVisible));
  }
  localStorage.setItem(TOC_VISIBLE_STORAGE_KEY, tocVisible ? '1' : '0');
}

function setTocVisible(nextVisible) {
  tocVisible = Boolean(nextVisible);
  applyTocState();
}

function syncSidebarToggleButtons() {
  if (toggleLeftSidebarBtn) {
    const leftExpanded = !leftSidebarCollapsed;
    const tooltip = leftExpanded ? '收起左侧栏' : '展开左侧栏';
    toggleLeftSidebarBtn.dataset.tooltip = tooltip;
    toggleLeftSidebarBtn.setAttribute('aria-label', tooltip);
    toggleLeftSidebarBtn.setAttribute('aria-expanded', String(leftExpanded));
  }
  if (toggleRightSidebarBtn) {
    const rightExpanded = !rightSidebarCollapsed;
    const tooltip = rightExpanded ? '收起右侧栏' : '展开右侧栏';
    toggleRightSidebarBtn.dataset.tooltip = tooltip;
    toggleRightSidebarBtn.setAttribute('aria-label', tooltip);
    toggleRightSidebarBtn.setAttribute('aria-expanded', String(rightExpanded));
  }
}

function applyLayoutState() {
  document.documentElement.style.setProperty('--left-panel-width', `${layoutState.leftWidth}px`);
  document.documentElement.style.setProperty('--right-panel-width', `${layoutState.rightWidth}px`);
  document.body.classList.toggle('left-collapsed', leftSidebarCollapsed);
  document.body.classList.toggle('right-collapsed', rightSidebarCollapsed);
  document.body.classList.toggle('focus-mode', focusMode);
  syncSidebarToggleButtons();
  if (toggleFocusBtn) {
    toggleFocusBtn.textContent = focusMode ? '退出专注模式' : '专注模式';
    toggleFocusBtn.setAttribute('aria-expanded', String(!focusMode));
  }
  syncSourceActivityState();
}

function applyTreeDrawerState() {
  if (!treeDrawer || !toggleTreeBtn) return;
  treeDrawer.classList.toggle('hidden', !treeDrawerOpen);
  treeDrawer.setAttribute('aria-hidden', String(!treeDrawerOpen));
  toggleTreeBtn.setAttribute('aria-expanded', String(treeDrawerOpen));
  const tooltip = treeDrawerOpen ? '收起项目树' : '展开项目树';
  toggleTreeBtn.dataset.tooltip = tooltip;
  toggleTreeBtn.setAttribute('aria-label', tooltip);
}

function updateStickyOffset() {
  document.documentElement.style.setProperty('--sticky-top-offset', '24px');
}

function setTopbarHidden(nextHidden) {
  topbarHidden = false;
  document.body.classList.remove('topbar-hidden');
  updateStickyOffset();
}

function syncTopbarVisibility() {
  return;
}

function setTreeDrawerOpen(nextOpen) {
  treeDrawerOpen = Boolean(nextOpen);
  persistTreeDrawerState();
  applyTreeDrawerState();
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

function toggleFocusMode() {
  focusMode = !focusMode;
  localStorage.setItem(FOCUS_MODE_STORAGE_KEY, focusMode ? '1' : '0');
  applyLayoutState();
  setStatus(focusMode ? '已进入专注模式：左右栏已隐藏' : '已退出专注模式');
}

function startResize(side, evt) {
  if (evt.button !== 0 || window.innerWidth <= 900) return;
  if (focusMode) return;
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
  return migrateGuideGroupName(group) || '__ungrouped__';
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
  return migrateGuideGroupName(doc?.group);
}

function getAvailableGroups() {
  const names = [...libraryGroups.map(group => group.name), ...library.map(doc => getDocGroup(doc))];
  return [...new Set(names.filter(Boolean))].sort(compareGroupsForExplorer);
}

function getVisibleGroups() {
  const orderedGroups = libraryGroups
    .slice()
    .sort((a, b) => a.order - b.order || compareGroupsForExplorer(a.name, b.name))
    .map(group => group.name);
  const documentGroups = library
    .map(doc => getDocGroup(doc))
    .filter(Boolean)
    .filter(group => !orderedGroups.includes(group));
  const visible = [...orderedGroups, ...documentGroups];
  if (library.some(doc => !getDocGroup(doc))) {
    visible.unshift('');
  }
  return [...new Set(visible)];
}

function getChildGroups(parentGroup = '') {
  const normalizedParent = normalizeGroupName(parentGroup);
  return libraryGroups
    .filter(group => getGroupParentName(group.name) === normalizedParent)
    .sort((a, b) => a.order - b.order || compareGroupsForExplorer(a.name, b.name));
}

function getGroupSubtreeDocumentCount(group) {
  const normalized = normalizeGroupName(group);
  return library.filter(doc => isGroupWithin(getDocGroup(doc), normalized)).length;
}

function getChildGroupCount(group) {
  return getChildGroups(group).length;
}

function getFilteredLibrary() {
  if (currentGroupFilter === ALL_GROUPS_VALUE) return library;
  return library.filter(doc => isGroupWithin(getDocGroup(doc), currentGroupFilter));
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
  deleteBtn.title = deletable ? '删除当前已保存文档' : '未保存导入内容不可删除';
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
    ...groups.map(group => `<option value="${escapeHtml(group)}">${escapeHtml(formatGroupOptionLabel(group))}</option>`)
  ].join('');
  groupFilterSelect.value = currentGroupFilter;

  const selectGroups = currentGroup && !groups.includes(currentGroup) ? [...groups, currentGroup] : groups;
  currentGroupSelect.innerHTML = [
    `<option value="">${UNGROUPED_LABEL}</option>`,
    ...selectGroups.map(group => `<option value="${escapeHtml(group)}">${escapeHtml(formatGroupOptionLabel(group))}</option>`)
  ].join('');
  currentGroupSelect.value = currentGroup;

  const managedGroup = getManagedGroupValue();
  manageGroupSelect.innerHTML = [
    `<option value="">选择一个分组</option>`,
    ...groups.map(group => `<option value="${escapeHtml(group)}">${escapeHtml(formatGroupOptionLabel(group))}</option>`)
  ].join('');
  manageGroupSelect.value = groups.includes(managedGroup) ? managedGroup : (groups[0] || '');

  const selectedManagedGroup = groups.includes(managedGroup) ? managedGroup : (groups[0] || '');
  const blockedParents = new Set(
    selectedManagedGroup
      ? groups.filter(group => isGroupWithin(group, selectedManagedGroup))
      : []
  );
  parentGroupSelect.innerHTML = [
    `<option value="">顶层分组</option>`,
    ...groups
      .filter(group => !blockedParents.has(group))
      .map(group => `<option value="${escapeHtml(group)}">${escapeHtml(formatGroupOptionLabel(group))}</option>`)
  ].join('');
  const currentParent = getGroupParentName(selectedManagedGroup);
  parentGroupSelect.value = [...parentGroupSelect.options].some(option => option.value === currentParent) ? currentParent : '';
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
  const managedCount = managedGroup ? getGroupSubtreeDocumentCount(managedGroup) : 0;
  const childGroupCount = managedGroup ? getChildGroupCount(managedGroup) : 0;
  renameGroupBtn.disabled = !managedGroup;
  updateGroupParentBtn.disabled = !managedGroup;
  deleteGroupBtn.disabled = !managedGroup || managedCount > 0 || childGroupCount > 0;
  if (managedGroup) {
    if (!newGroupInput.value.trim()) {
      newGroupInput.value = getGroupLeafName(managedGroup);
    }
    if (managedCount > 0) {
      groupManageHint.textContent = `分组“${managedGroup}”所在子树下还有 ${managedCount} 篇笔记，可重命名和调整层级，但不能删除。`;
    } else if (childGroupCount > 0) {
      groupManageHint.textContent = `分组“${managedGroup}”下还有 ${childGroupCount} 个子分组，清空子分组后才可删除。`;
    } else {
      groupManageHint.textContent = `分组“${managedGroup}”当前为空叶子分组，可以删除。`;
    }
  } else {
    newGroupInput.value = '';
    groupManageHint.textContent = '支持在分组里继续新建子分组；只有空叶子分组可以删除。';
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

function formatShareTime(value) {
  if (!value) return '未知时间';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString('zh-CN');
}

function populateSharedFilterSelect(select, items, key, emptyLabel) {
  if (!select) return;
  const currentValue = select.value;
  const values = [...new Set(items.map(item => (item[key] || '').trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'zh-CN'));
  select.innerHTML = [`<option value="">${emptyLabel}</option>`, ...values.map(value => `<option value="${escapeHtml(value)}">${escapeHtml(value)}</option>`)].join('');
  select.value = values.includes(currentValue) ? currentValue : '';
}

function buildSharedSourceMessage(source = {}) {
  if (!source || !source.mode) return '';
  if (source.mode === 'shared-index') {
    const generatedAt = source.generatedAt ? `，生成时间 ${formatShareTime(source.generatedAt)}` : '';
    const indexPath = source.indexPath ? `，索引路径 ${source.indexPath}` : '';
    return `当前列表来自中央 shared-index.json${generatedAt}${indexPath}。`;
  }
  if (source.mode === 'scan') {
    return '当前列表来自远程共享分支的实时扫描结果。';
  }
  if (source.mode === 'scan-fallback') {
    const reason = source.fallbackReason ? ` 原因：${source.fallbackReason}` : '';
    return `中央 shared-index.json 不可用，当前列表来自远程共享分支实时扫描。${reason}`;
  }
  return '';
}

function filterSharedNotes(items = []) {
  const keyword = (sharedSearchInput?.value || '').trim().toLowerCase();
  const academy = (sharedAcademyFilter?.value || '').trim();
  const major = (sharedMajorFilter?.value || '').trim();
  const year = (sharedYearFilter?.value || '').trim();
  return items.filter(item => {
    if (academy && (item.academy || '') !== academy) return false;
    if (major && (item.major || '') !== major) return false;
    if (year && (item.year || '') !== year) return false;
    if (!keyword) return true;
    const haystack = [
      item.branchName,
      item.author,
      item.academy,
      item.major,
      item.year,
      item.summary,
      ...(item.tags || []),
      ...(item.documents || []).map(doc => `${doc.title || ''} ${doc.group || ''}`)
    ].join(' ').toLowerCase();
    return haystack.includes(keyword);
  });
}

function renderSharedNotesList(items = [], source = null) {
  if (!sharedNotesList || !sharedNotesMeta) return;
  sharedNotesCache = items;
  sharedNotesSource = source;
  populateSharedFilterSelect(sharedAcademyFilter, items, 'academy', '全部学院');
  populateSharedFilterSelect(sharedMajorFilter, items, 'major', '全部专业');
  populateSharedFilterSelect(sharedYearFilter, items, 'year', '全部年级');

  const filteredItems = filterSharedNotes(items);
  if (sharedNotesSourceText) {
    sharedNotesSourceText.textContent = buildSharedSourceMessage(source);
  }

  if (!items.length) {
    sharedNotesMeta.textContent = '还没有检测到可导入的共享笔记。';
    sharedNotesList.innerHTML = '<div class="empty-search">暂无共享笔记。上传共享笔记后，这里会在中央索引更新后展示列表。</div>';
    return;
  }

  sharedNotesMeta.textContent = filteredItems.length === items.length
    ? `当前共发现 ${items.length} 个共享贡献分支。点击“导入到本地”后会自动合并进本地文档库。`
    : `共发现 ${items.length} 个共享贡献分支，当前筛选后剩余 ${filteredItems.length} 个。`;

  if (!filteredItems.length) {
    sharedNotesList.innerHTML = '<div class="empty-search">当前筛选条件下没有匹配的共享笔记。</div>';
    return;
  }

  sharedNotesList.innerHTML = filteredItems.map(item => {
    const docs = (item.documents || []).slice(0, 6);
    const docsHtml = docs.length
      ? docs.map(doc => `
        <div class="shared-note-doc">
          <strong>${escapeHtml(doc.title || doc.slug || '未命名笔记')}</strong>
          <div class="doc-meta">${escapeHtml(doc.group || '未分组')}</div>
        </div>
      `).join('')
      : '<div class="empty-search">该贡献分支暂未写入文档摘要。</div>';
    const tagsHtml = (item.tags || []).length
      ? `<div class="shared-note-tags">${item.tags.map(tag => `<span class="tag-chip">${escapeHtml(tag)}</span>`).join('')}</div>`
      : '';
    return `
      <article class="shared-note-card">
        <div class="shared-note-head">
          <div>
            <div class="shared-note-title">${escapeHtml(item.author || '匿名贡献者')}</div>
            <div class="shared-note-meta">
              分支 ${escapeHtml(item.branchName || '未命名分支')}<br />
              ${escapeHtml(item.academy || '')} / ${escapeHtml(item.major || '')} / ${escapeHtml(item.year || '')}<br />
              笔记 ${Number(item.documentCount || 0)} 篇，分组 ${Number(item.groupCount || 0)} 个，更新时间 ${escapeHtml(formatShareTime(item.publishedAt))}
            </div>
          </div>
          <div class="mini-actions">
            <button class="shared-import-btn" data-branch="${escapeHtml(item.branchName || '')}">导入到本地</button>
          </div>
        </div>
        <div class="shared-note-summary">${escapeHtml(item.summary || '该贡献者尚未填写简介。')}</div>
        ${tagsHtml}
        <div class="shared-note-docs">${docsHtml}</div>
      </article>
    `;
  }).join('');
}

async function refreshSharedNotesList(options = {}) {
  if (!sharedNotesMeta || !sharedNotesList) return;
  sharedNotesMeta.textContent = options.forceScan ? '正在扫描远程共享分支…' : '正在读取中央 shared-index.json…';
  if (sharedNotesSourceText) {
    sharedNotesSourceText.textContent = '';
  }
  sharedNotesList.innerHTML = '<div class="empty-search">正在加载…</div>';
  const result = await fetchSharedNotesList(options);
  renderSharedNotesList(result.items || [], result.source || null);
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
    const base = slugify(getCleanHeadingText(h));
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

function getCleanHeadingText(heading) {
  const clone = heading.cloneNode(true);
  clone.querySelectorAll('.anchor-link, button, input, textarea, select, .explorer-icon').forEach(node => node.remove());
  return (clone.textContent || '')
    .replace(/[\u200B-\u200D\uFEFF]/g, ' ')
    .replace(/\u00B6/g, ' ')
    .replace(/\r?\n+/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/[#¶]+\s*$/g, '')
    .trim();
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
    a.textContent = getCleanHeadingText(h) || '未命名标题';
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
  decorateRichBlocks();
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

function decorateRichBlocks(root = preview) {
  root.querySelectorAll('pre').forEach(pre => {
    const code = pre.querySelector('code');
    if (!code) return;
    pre.classList.add('rich-code-block');
    const classMatch = (code.className || '').match(/language-([\w-]+)/);
    const label = (code.getAttribute('data-language') || classMatch?.[1] || 'CODE').trim();
    pre.dataset.label = label || 'CODE';
  });
}

function syncRichSource() {
  editor.value = htmlToMarkdown(preview.innerHTML);
  localStorage.setItem(currentCacheKey(), editor.value);
  buildTOC();
}

function getCurrentSelectionRange() {
  const selection = window.getSelection();
  if (!selection || !selection.rangeCount || !selection.isCollapsed) return null;
  const range = selection.getRangeAt(0);
  if (!preview.contains(range.startContainer)) return null;
  return range;
}

function setCaretAtEnd(node) {
  if (!node) return;
  const selection = window.getSelection();
  const range = document.createRange();
  range.selectNodeContents(node);
  range.collapse(false);
  selection.removeAllRanges();
  selection.addRange(range);
}

function setCaretAtStart(node) {
  if (!node) return;
  const selection = window.getSelection();
  const range = document.createRange();
  range.selectNodeContents(node);
  range.collapse(true);
  selection.removeAllRanges();
  selection.addRange(range);
}

function placeCaretAfterNode(node) {
  if (!node || !node.parentNode) return;
  const selection = window.getSelection();
  const range = document.createRange();
  range.setStartAfter(node);
  range.collapse(true);
  selection.removeAllRanges();
  selection.addRange(range);
}

function findEditableBlock(node) {
  let current = node?.nodeType === Node.TEXT_NODE ? node.parentNode : node;
  while (current && current !== preview) {
    if (/^(P|DIV|LI|BLOCKQUOTE|H1|H2|H3|H4|H5|H6|PRE)$/.test(current.nodeName)) {
      return current;
    }
    current = current.parentNode;
  }
  return null;
}

function isPlainTextBlock(block) {
  if (!block) return false;
  return [...block.childNodes].every(node => {
    if (node.nodeType === Node.TEXT_NODE) return true;
    return node.nodeType === Node.ELEMENT_NODE && node.nodeName === 'BR';
  });
}

function replaceNodePreservingCaret(target, replacement, caretTarget = null, caretMode = 'end') {
  if (!target?.parentNode) return false;
  const parent = target.parentNode;
  if (replacement instanceof DocumentFragment) {
    const nodes = [...replacement.childNodes];
    parent.insertBefore(replacement, target);
    parent.removeChild(target);
    const focusNode = caretTarget || nodes[nodes.length - 1];
    if (focusNode) {
      if (caretMode === 'start') setCaretAtStart(focusNode);
      else if (caretMode === 'after') placeCaretAfterNode(focusNode);
      else setCaretAtEnd(focusNode);
    }
    return true;
  }
  parent.replaceChild(replacement, target);
  if (caretTarget) {
    if (caretMode === 'start') setCaretAtStart(caretTarget);
    else if (caretMode === 'after') placeCaretAfterNode(caretTarget);
    else setCaretAtEnd(caretTarget);
  }
  return true;
}

function getClosestPreviewElement(node, selector) {
  const element = node?.nodeType === Node.ELEMENT_NODE ? node : node?.parentElement;
  if (!element) return null;
  const found = element.closest(selector);
  return found && preview.contains(found) ? found : null;
}

function createEmptyParagraph() {
  const paragraph = document.createElement('p');
  paragraph.appendChild(document.createElement('br'));
  return paragraph;
}

function isRangeAtBlockStart(range, block) {
  if (!range || !block) return false;
  const probe = range.cloneRange();
  probe.selectNodeContents(block);
  probe.setEnd(range.startContainer, range.startOffset);
  return !probe.toString().replace(/\u00a0/g, ' ').trim();
}

function isRangeAtBlockEnd(range, block) {
  if (!range || !block) return false;
  const probe = range.cloneRange();
  probe.selectNodeContents(block);
  probe.setStart(range.startContainer, range.startOffset);
  return !probe.toString().replace(/\u00a0/g, ' ').trim();
}

function isRichListItemEmpty(item) {
  if (!item) return false;
  if (item.getAttribute('data-task-item') === 'true') {
    return !(item.querySelector('.task-item-text')?.textContent || '').trim();
  }
  const clone = item.cloneNode(true);
  clone.querySelectorAll('ul, ol').forEach(node => node.remove());
  return !clone.textContent.replace(/\u00a0/g, ' ').trim();
}

function exitRichListItem(item) {
  if (!item?.parentNode) return false;
  const list = item.parentNode;
  if (!/^(UL|OL)$/.test(list.nodeName)) return false;
  const paragraph = createEmptyParagraph();
  const listHost = list.closest('li') || list;
  if (!listHost.parentNode) return false;
  listHost.parentNode.insertBefore(paragraph, listHost.nextSibling);
  item.remove();
  if (!list.children.length) {
    list.remove();
  }
  setCaretAtStart(paragraph);
  return true;
}

function liftParagraphFromBlockquote(paragraph, quote) {
  if (!paragraph || !quote?.parentNode) return false;
  const lifted = document.createElement('p');
  if (paragraph.innerHTML && paragraph.innerHTML !== '<br>') {
    lifted.innerHTML = paragraph.innerHTML;
  } else {
    lifted.appendChild(document.createElement('br'));
  }

  const parent = quote.parentNode;
  if (quote.children.length === 1) {
    parent.replaceChild(lifted, quote);
  } else if (paragraph === quote.firstElementChild) {
    parent.insertBefore(lifted, quote);
    paragraph.remove();
  } else {
    parent.insertBefore(lifted, quote.nextSibling);
    paragraph.remove();
  }
  setCaretAtStart(lifted);
  return true;
}

function handleRichEnterKey(evt) {
  if (evt.shiftKey) return false;
  const range = getCurrentSelectionRange();
  if (!range) return false;

  const listItem = getClosestPreviewElement(range.startContainer, 'li');
  if (listItem && isRichListItemEmpty(listItem)) {
    evt.preventDefault();
    if (exitRichListItem(listItem)) {
      syncRichSource();
      attachAnchorIds();
      return true;
    }
  }

  const heading = getClosestPreviewElement(range.startContainer, 'h1, h2, h3, h4, h5, h6');
  if (heading && isRangeAtBlockEnd(range, heading)) {
    evt.preventDefault();
    const paragraph = createEmptyParagraph();
    heading.parentNode.insertBefore(paragraph, heading.nextSibling);
    setCaretAtStart(paragraph);
    syncRichSource();
    attachAnchorIds();
    return true;
  }

  return false;
}

function handleRichBackspaceKey(evt) {
  const range = getCurrentSelectionRange();
  if (!range) return false;

  const heading = getClosestPreviewElement(range.startContainer, 'h1, h2, h3, h4, h5, h6');
  if (heading && isRangeAtBlockStart(range, heading)) {
    evt.preventDefault();
    const paragraph = document.createElement('p');
    paragraph.textContent = heading.textContent || '';
    replaceNodePreservingCaret(heading, paragraph, paragraph, 'start');
    syncRichSource();
    attachAnchorIds();
    return true;
  }

  const paragraph = getClosestPreviewElement(range.startContainer, 'p');
  const quote = paragraph?.parentElement?.nodeName === 'BLOCKQUOTE' ? paragraph.parentElement : null;
  if (paragraph && quote && isRangeAtBlockStart(range, paragraph)) {
    evt.preventDefault();
    if (liftParagraphFromBlockquote(paragraph, quote)) {
      syncRichSource();
      attachAnchorIds();
      return true;
    }
  }

  return false;
}

function handleRichTabKey(evt) {
  const range = getCurrentSelectionRange();
  if (!range) return false;
  const listItem = getClosestPreviewElement(range.startContainer, 'li');
  if (!listItem) return false;
  evt.preventDefault();
  execRichCommand(evt.shiftKey ? 'outdent' : 'indent');
  syncRichSource();
  attachAnchorIds();
  return true;
}

function handleRichKeydown(evt) {
  if (!richMode || preview.getAttribute('contenteditable') !== 'true') return;
  if (evt.key === 'Enter') {
    handleRichEnterKey(evt);
    return;
  }
  if (evt.key === 'Backspace') {
    handleRichBackspaceKey(evt);
    return;
  }
  if (evt.key === 'Tab') {
    handleRichTabKey(evt);
  }
}

function applyBlockMarkdownShortcut() {
  const range = getCurrentSelectionRange();
  if (!range) return false;
  const block = findEditableBlock(range.startContainer);
  if (!block || !['P', 'DIV'].includes(block.nodeName) || !isPlainTextBlock(block)) return false;
  const text = (block.textContent || '').replace(/\u00a0/g, ' ').trim();
  if (!text) return false;

  let match = text.match(/^(#{1,6})\s+(.+)$/);
  if (match) {
    const heading = document.createElement(`h${match[1].length}`);
    heading.textContent = match[2];
    return replaceNodePreservingCaret(block, heading, heading, 'end');
  }

  match = text.match(/^(([>》]\s*)+)(.+)$/);
  if (match) {
    const depth = Math.min(6, (match[1].match(/[>》]/g) || []).length);
    const content = match[3].trim();
    if (content) {
      let outerQuote = null;
      let currentQuote = null;
      for (let i = 0; i < depth; i++) {
        const quote = document.createElement('blockquote');
        if (!outerQuote) outerQuote = quote;
        if (currentQuote) currentQuote.appendChild(quote);
        currentQuote = quote;
      }
      const paragraph = document.createElement('p');
      paragraph.textContent = content;
      currentQuote.appendChild(paragraph);
      return replaceNodePreservingCaret(block, outerQuote, paragraph, 'end');
    }
  }

  match = text.match(/^[-*+]\s+\[( |x|X)\]\s+(.+)$/);
  if (match) {
    const list = document.createElement('ul');
    list.setAttribute('data-task-list', 'true');
    const item = document.createElement('li');
    item.setAttribute('data-task-item', 'true');
    const label = document.createElement('label');
    label.className = 'task-item-label';
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = match[1].toLowerCase() === 'x';
    const span = document.createElement('span');
    span.className = 'task-item-text';
    span.textContent = match[2];
    label.append(checkbox, span);
    item.appendChild(label);
    list.appendChild(item);
    return replaceNodePreservingCaret(block, list, span, 'end');
  }

  match = text.match(/^[-*+]\s+(.+)$/);
  if (match) {
    const list = document.createElement('ul');
    const item = document.createElement('li');
    item.textContent = match[1];
    list.appendChild(item);
    return replaceNodePreservingCaret(block, list, item, 'end');
  }

  match = text.match(/^\d+\.\s+(.+)$/);
  if (match) {
    const list = document.createElement('ol');
    const item = document.createElement('li');
    item.textContent = match[1];
    list.appendChild(item);
    return replaceNodePreservingCaret(block, list, item, 'end');
  }

  match = text.match(/^(```)([\w-]*)$/);
  if (match) {
    const pre = document.createElement('pre');
    pre.className = 'rich-code-block';
    pre.dataset.label = match[2] || 'CODE';
    const code = document.createElement('code');
    if (match[2]) {
      code.dataset.language = match[2];
      code.className = `language-${match[2]}`;
    }
    code.appendChild(document.createTextNode(''));
    pre.appendChild(code);
    return replaceNodePreservingCaret(block, pre, code, 'start');
  }

  if (/^(-{3,}|\*{3,}|_{3,})$/.test(text)) {
    const fragment = document.createDocumentFragment();
    const hr = document.createElement('hr');
    const paragraph = document.createElement('p');
    paragraph.appendChild(document.createElement('br'));
    fragment.append(hr, paragraph);
    return replaceNodePreservingCaret(block, fragment, paragraph, 'start');
  }

  return false;
}

function createInlineShortcutNode(type, match) {
  if (type === 'image') {
    const img = document.createElement('img');
    img.alt = match[1] || '';
    img.src = match[2];
    return img;
  }
  if (type === 'link') {
    const link = document.createElement('a');
    link.href = match[2];
    link.textContent = match[1];
    return link;
  }
  const tagMap = {
    bold: 'strong',
    italic: 'em',
    strike: 'del',
    code: 'code'
  };
  const node = document.createElement(tagMap[type]);
  node.textContent = match[1];
  return node;
}

function applyInlineMarkdownShortcut() {
  const range = getCurrentSelectionRange();
  if (!range || range.startContainer.nodeType !== Node.TEXT_NODE) return false;
  const textNode = range.startContainer;
  if (textNode.parentElement?.closest('pre, code, a')) return false;
  const original = textNode.textContent || '';
  const caret = range.startOffset;
  const before = original.slice(0, caret);
  const after = original.slice(caret);
  const rules = [
    { type: 'image', regex: /!\[([^\]]*)\]\(([^)\s]+)\)$/ },
    { type: 'link', regex: /\[([^\]]+)\]\(([^)\s]+)\)$/ },
    { type: 'bold', regex: /\*\*([^*\n]+)\*\*$/ },
    { type: 'bold', regex: /__([^_\n]+)__$/ },
    { type: 'strike', regex: /~~([^~\n]+)~~$/ },
    { type: 'code', regex: /`([^`\n]+)`$/ },
    { type: 'italic', regex: /\*([^*\n]+)\*$/ },
    { type: 'italic', regex: /_([^_\n]+)_$/ }
  ];

  for (const rule of rules) {
    const match = rule.regex.exec(before);
    if (!match) continue;
    const fragment = document.createDocumentFragment();
    const prefix = before.slice(0, match.index);
    if (prefix) fragment.appendChild(document.createTextNode(prefix));
    const created = createInlineShortcutNode(rule.type, match);
    fragment.appendChild(created);
    let trailingNode = null;
    if (after) {
      trailingNode = document.createTextNode(after);
      fragment.appendChild(trailingNode);
    }
    if (!textNode.parentNode) return false;
    textNode.parentNode.insertBefore(fragment, textNode);
    textNode.remove();
    if (trailingNode) {
      const selection = window.getSelection();
      const nextRange = document.createRange();
      nextRange.setStart(trailingNode, 0);
      nextRange.collapse(true);
      selection.removeAllRanges();
      selection.addRange(nextRange);
    } else {
      placeCaretAfterNode(created);
    }
    return true;
  }
  return false;
}

function applyRichMarkdownShortcuts() {
  if (!richMode || applyingRichShortcut) return;
  applyingRichShortcut = true;
  try {
    const changed = applyBlockMarkdownShortcut() || applyInlineMarkdownShortcut();
    syncRichSource();
    if (changed) attachAnchorIds();
  } finally {
    applyingRichShortcut = false;
  }
}

function insertRichCodeBlock() {
  const selection = window.getSelection();
  if (!selection || !selection.rangeCount) return false;
  const range = selection.getRangeAt(0);
  if (!preview.contains(range.commonAncestorContainer)) return false;

  const selectedText = selection.toString();
  const pre = document.createElement('pre');
  pre.className = 'rich-code-block';
  pre.dataset.label = 'CODE';
  const code = document.createElement('code');
  code.appendChild(document.createTextNode(selectedText || ''));
  pre.appendChild(code);

  range.deleteContents();
  range.insertNode(pre);

  if (selectedText) {
    placeCaretAfterNode(pre);
  } else {
    setCaretAtStart(code);
  }
  return true;
}

function buildQuoteParagraphs(text) {
  const lines = (text || '').split(/\n+/).map(item => item.trim()).filter(Boolean);
  if (!lines.length) {
    const paragraph = document.createElement('p');
    paragraph.appendChild(document.createElement('br'));
    return [paragraph];
  }
  return lines.map(line => {
    const paragraph = document.createElement('p');
    paragraph.textContent = line;
    return paragraph;
  });
}

function insertRichQuoteBlock() {
  const selection = window.getSelection();
  if (!selection || !selection.rangeCount) return false;
  const range = selection.getRangeAt(0);
  if (!preview.contains(range.commonAncestorContainer)) return false;

  const selectedText = selection.toString();
  const quote = document.createElement('blockquote');
  const paragraphs = buildQuoteParagraphs(selectedText);
  paragraphs.forEach(paragraph => quote.appendChild(paragraph));

  range.deleteContents();
  range.insertNode(quote);

  if (selectedText.trim()) {
    placeCaretAfterNode(quote);
  } else {
    setCaretAtStart(paragraphs[0]);
  }
  return true;
}

function execRichCommand(cmd, value = null) {
  if (typeof document.execCommand === 'function') {
    return document.execCommand(cmd, false, value);
  }
  if (cmd === 'insertHTML' && value) {
    const selection = window.getSelection();
    if (!selection || !selection.rangeCount) return false;
    const range = selection.getRangeAt(0);
    range.deleteContents();
    range.insertNode(range.createContextualFragment(value));
    return true;
  }
  return false;
}

function updateRichMode(enabled) {
  richMode = enabled;
  document.body.classList.toggle('rich-mode', enabled);
  richToolbar.classList.toggle('hidden', !enabled);
  richToolbar.setAttribute('aria-hidden', String(!enabled));
  preview.setAttribute('contenteditable', enabled ? 'true' : 'false');
  preview.setAttribute('spellcheck', enabled ? 'true' : 'false');
  if (toggleRichBtn) {
    toggleRichBtn.textContent = enabled ? '只看 Markdown 源码' : '返回所见即所得';
  }
  modeText.textContent = enabled
    ? (editorDrawer.classList.contains('hidden') ? '所见即所得模式' : '所见即所得 + Markdown 源码')
    : 'Markdown 源码模式';
  if (enabled) {
    render(false);
    preview.focus();
  } else {
    openEditor(true);
    preview.removeAttribute('contenteditable');
    render(true);
    setTimeout(() => editor.focus(), 40);
  }
  syncSourceActivityState();
}

function openEditor(force = true) {
  editorDrawer.classList.toggle('hidden', !force);
  document.body.classList.toggle('editor-open', force);
  document.body.classList.toggle('reading-mode', !richMode && !force);
  if (richMode) {
    modeText.textContent = force ? '所见即所得 + Markdown 源码' : '所见即所得模式';
  } else {
    modeText.textContent = 'Markdown 源码模式';
  }
  if (editToggleBtn) {
    editToggleBtn.textContent = force ? '关闭 Markdown 源码' : '打开 Markdown 源码';
  }
  editorDrawer.setAttribute('aria-hidden', String(!force));
  if (force) setTimeout(() => editor.focus(), 40);
  syncSourceActivityState();
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
    let message = text;
    if (text) {
      try {
        const data = JSON.parse(text);
        message = data.error || data.message || text;
      } catch (_) {
        message = text;
      }
    }
    throw new Error(message || `HTTP ${res.status}: ${url}`);
  }
  return res.json();
}

function renderOpenEditors() {
  if (!openEditorsList) return;
  if (!currentDoc) {
    openEditorsList.innerHTML = '<div class="empty-search">当前还没有打开的文档。</div>';
    return;
  }
  openEditorsList.innerHTML = `
    <button class="open-editor-row is-active" data-path="${escapeHtml(currentDoc.path)}">
      <span class="explorer-icon">M</span>
      <span class="explorer-label">${escapeHtml(currentDoc.title || currentDoc.slug || '未命名文档')}</span>
    </button>
  `;
  openEditorsList.querySelector('[data-path]')?.addEventListener('click', () => {
    if (currentDoc?.path && currentDoc.path !== '__adhoc__') openDocument(currentDoc.path);
  });
}

function renderLibraryList() {
  function buildIndent(level) {
    return '<span class="explorer-indent"></span>'.repeat(Math.max(0, level));
  }

  function renderDocNode(doc, targetGroup, level) {
    const row = document.createElement('div');
    row.className = 'explorer-node';
    row.dataset.path = doc.path;
    row.innerHTML = `
      <button class="explorer-row explorer-file-row ${currentDoc && currentDoc.path === doc.path ? 'is-active' : ''}" data-action="open" data-path="${escapeHtml(doc.path)}" role="treeitem" aria-level="${String(level)}">
        ${buildIndent(level - 1)}
        <span class="explorer-indent"></span>
        <span class="explorer-icon">M</span>
        <span class="explorer-label">${escapeHtml(doc.title || doc.slug)}</span>
      </button>
    `;
    const button = row.querySelector('[data-action="open"]');
    if (canManageGroup(doc)) {
      row.draggable = true;
      row.addEventListener('dragstart', evt => handleDragStart(evt, doc));
      row.addEventListener('dragend', handleDragEnd);
      row.addEventListener('dragover', handleDragOver);
      row.addEventListener('dragenter', handleDragEnter);
      row.addEventListener('dragleave', handleDragLeave);
      row.addEventListener('drop', evt => handleDropToGroup(evt, targetGroup, doc.path));
    }
    button.addEventListener('click', () => {
      selectedExplorerGroup = getDocGroup(doc);
      openDocument(doc.path);
    });
    button.addEventListener('contextmenu', evt => {
      evt.preventDefault();
      selectedExplorerGroup = getDocGroup(doc);
      openExplorerContextMenu(evt, { type: 'file', doc });
    });
    return row;
  }

  function renderGroupSection(group, docsByGroup, level = 1) {
    const docs = docsByGroup.get(group) || [];
    const childGroups = getChildGroups(group).map(item => item.name);
    const collapsed = isGroupCollapsed(group);
    const selected = normalizeGroupName(selectedExplorerGroup) === normalizeGroupName(group);
    const section = document.createElement('section');
    section.className = 'explorer-node';
    section.dataset.group = group;
    section.innerHTML = `
      <button class="explorer-row explorer-folder-row ${selected ? 'is-selected' : ''}" data-action="toggle-group" role="treeitem" aria-level="${String(level)}" aria-expanded="${String(!collapsed)}">
        ${buildIndent(level - 1)}
        <span class="explorer-chevron">${collapsed ? '▸' : '▾'}</span>
        <span class="explorer-icon">D</span>
        <span class="explorer-label">${escapeHtml(getGroupLeafName(group) || displayGroupName(group))}</span>
        <span class="explorer-meta">${getGroupSubtreeDocumentCount(group)}</span>
      </button>
      <div class="explorer-children ${collapsed ? 'hidden' : ''}" data-group-body="${escapeHtml(group)}" role="group"></div>
    `;
    const header = section.querySelector('[data-action="toggle-group"]');
    const body = section.querySelector('[data-group-body]');
    header.addEventListener('click', () => {
      selectedExplorerGroup = group;
      if (manageGroupSelect) manageGroupSelect.value = group;
      updateGroupToolbarState();
      toggleGroupCollapsed(group);
    });
    header.addEventListener('contextmenu', evt => {
      evt.preventDefault();
      selectedExplorerGroup = group;
      if (manageGroupSelect) manageGroupSelect.value = group;
      updateGroupToolbarState();
      openExplorerContextMenu(evt, { type: 'group', group });
    });
    body.addEventListener('dragover', handleDragOver);
    body.addEventListener('dragenter', handleDragEnter);
    body.addEventListener('dragleave', handleDragLeave);
    body.addEventListener('drop', evt => handleDropToGroup(evt, group));
    childGroups.forEach(childGroup => {
      body.appendChild(renderGroupSection(childGroup, docsByGroup, level + 1));
    });
    docs.forEach(doc => {
      body.appendChild(renderDocNode(doc, group, level + 1));
    });
    if (!childGroups.length && !docs.length) {
      const empty = document.createElement('div');
      empty.className = 'empty-search';
      empty.textContent = '这个文件夹还没有笔记。';
      body.appendChild(empty);
    }
    return section;
  }

  docList.innerHTML = '';
  const filtered = getFilteredLibrary();
  const docsByGroup = new Map();
  filtered.forEach(doc => {
    const key = getDocGroup(doc);
    if (!docsByGroup.has(key)) docsByGroup.set(key, []);
    docsByGroup.get(key).push(doc);
  });
  const rootGroups = currentGroupFilter === ALL_GROUPS_VALUE
    ? getChildGroups('').map(group => group.name)
    : currentGroupFilter
      ? [currentGroupFilter]
      : [];

  if (currentGroupFilter === ALL_GROUPS_VALUE) {
    rootGroups.forEach(group => {
      docList.appendChild(renderGroupSection(group, docsByGroup, 1));
    });
    (docsByGroup.get('') || []).forEach(doc => {
      docList.appendChild(renderDocNode(doc, '', 1));
    });
  } else if (currentGroupFilter === '') {
    (docsByGroup.get('') || []).forEach(doc => {
      docList.appendChild(renderDocNode(doc, '', 1));
    });
  } else if (currentGroupFilter) {
    docList.appendChild(renderGroupSection(currentGroupFilter, docsByGroup, 1));
  }

  if (!docList.children.length) {
    docList.innerHTML = '<div class="empty-search">当前筛选条件下没有文档。</div>';
  }
  syncActiveCard();
  docCount.textContent = String(library.length);
}

function syncActiveCard() {
  docList.querySelectorAll('.explorer-file-row').forEach(row => {
    row.classList.toggle('is-active', currentDoc && row.dataset.path === currentDoc.path);
  });
}

async function loadLibrary() {
  const data = await fetchJson(LIBRARY_URL);
  libraryGroups = (data.groups || []).map((group, index) => ({
    name: migrateGuideGroupName(group.name),
    order: Number.isFinite(Number(group.order)) ? Number(group.order) : index + 1
  })).filter(group => group.name);
  library = sortDocuments((data.documents || []).map((doc, index) => ({
    ...doc,
    group: migrateGuideGroupName(doc.group),
    order: Number.isFinite(Number(doc.order)) ? Number(doc.order) : index + 1
  })));
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
  selectedExplorerGroup = getDocGroup(doc);
  const groupParts = splitGroupName(getDocGroup(doc));
  if (groupParts.length) {
    let changed = false;
    for (let i = 1; i <= groupParts.length; i++) {
      const ancestor = groupParts.slice(0, i).join('/');
      if (isGroupCollapsed(ancestor)) {
        collapsedGroups[groupStorageKey(ancestor)] = false;
        changed = true;
      }
    }
    if (changed) {
      persistCollapsedGroups();
      renderLibraryList();
    }
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
  renderOpenEditors();
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

function hasUnsavedChanges() {
  if (!currentDoc) return false;
  return editor.value !== originalContent;
}

function createBlankDocument() {
  if (hasUnsavedChanges()) {
    const confirmed = confirm('当前文档还有未保存修改。确定要新建空白文档吗？');
    if (!confirmed) return;
  }
  const title = '未命名文档';
  const pendingGroup = normalizeGroupName(getPendingGroupValue());
  const blankMarkdown = buildFrontMatter(title);
  currentDoc = {
    path: '__adhoc__',
    title,
    slug: 'untitled',
    type: 'adhoc',
    group: pendingGroup
  };
  originalContent = blankMarkdown;
  docTitleInput.value = title;
  docSlugInput.value = 'untitled';
  editor.value = blankMarkdown;
  localStorage.removeItem(currentCacheKey());
  updateRichMode(true);
  render(false);
  openEditor(false);
  docPath.textContent = 'adhoc / 新建空白文档';
  permalink.href = '#';
  permalink.textContent = '未保存文档';
  history.replaceState(null, '', '#');
  syncActiveCard();
  renderOpenEditors();
  updateDeleteButtonState();
  updateGroupToolbarState();
  setStatus('已创建空白文档，编辑后点击“保存到站点”即可落盘');
}

async function saveCurrentDocument() {
  const title = docTitleInput.value.trim() || '未命名文档';
  const slug = slugify(docSlugInput.value.trim() || title);
  const body = editor.value.trim();
  const pendingGroup = getPendingGroupValue() ? validateGroupNameOrThrow(getPendingGroupValue()) : '';
  const payload = {
    path: currentDoc?.type === 'main' ? 'content/note.md' : `content/imports/${slug}.md`,
    title,
    slug,
    markdown: body.startsWith('---') ? body : buildFrontMatter(title) + body,
    type: currentDoc?.type === 'main' ? 'main' : 'import',
    group: pendingGroup,
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

async function createGroup(name, parent = '') {
  return fetchJson('/api/create-group', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, parent })
  });
}

async function renameGroup(oldName, newName) {
  return fetchJson('/api/rename-group', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ oldName, newName })
  });
}

async function updateGroupParent(name, parent = '') {
  return fetchJson('/api/update-group-parent', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, parent })
  });
}

async function deleteGroup(name) {
  return fetchJson('/api/delete-group', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name })
  });
}

async function renameDocumentRequest(path, title) {
  return fetchJson('/api/rename-document', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path, title })
  });
}

async function publishSharedNotes(payload) {
  return fetchJson('/api/publish-shared-notes', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
}

async function fetchSharedNotesList(options = {}) {
  const url = options.forceScan ? '/api/shared-notes?mode=scan' : '/api/shared-notes';
  return fetchJson(url);
}

async function importSharedNotesBranch(branchName) {
  return fetchJson('/api/import-shared-notes', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ branchName })
  });
}

async function createManagedGroup() {
  const leafName = validateGroupNameOrThrow(newGroupInput.value);
  if (leafName.includes('/')) {
    showIllegalAction('新建子分组时，请只输入这一层的名称，不要再包含 /');
    return;
  }
  const parent = normalizeGroupName(parentGroupSelect.value);
  const fullName = parent ? `${parent}/${leafName}` : leafName;
  await createGroup(leafName, parent);
  newGroupInput.value = leafName;
  await loadLibrary();
  manageGroupSelect.value = fullName;
  updateGroupToolbarState();
  setStatus(`已新建分组：${fullName}`);
}

function getExplorerTargetGroup() {
  return normalizeGroupName(selectedExplorerGroup || getManagedGroupValue() || getDocGroup(currentDoc));
}

async function createFolderFromExplorer() {
  const parent = getExplorerTargetGroup();
  const label = parent ? `在“${parent}”下新建文件夹` : '在顶层新建文件夹';
  const leafName = prompt(`${label}\n\n请输入文件夹名称：`, '');
  if (!leafName) return;
  const normalizedLeaf = validateGroupNameOrThrow(leafName);
  if (normalizedLeaf.includes('/')) {
    showIllegalAction('通过资源管理器新建文件夹时，请只输入当前这一层名称');
    return;
  }
  await createGroup(normalizedLeaf, parent);
  selectedExplorerGroup = parent ? `${parent}/${normalizedLeaf}` : normalizedLeaf;
  await loadLibrary();
  updateGroupToolbarState();
  setStatus(`已新建文件夹：${selectedExplorerGroup}`);
}

function createBlankDocumentFromExplorer() {
  const targetGroup = getExplorerTargetGroup();
  if (currentGroupSelect) currentGroupSelect.value = targetGroup;
  if (groupInput) groupInput.value = targetGroup;
  createBlankDocument();
}

async function importFromExplorerShortcut() {
  const input = prompt('请输入网页地址：', (urlInput?.value || '').trim());
  if (input == null) return;
  if (urlInput) urlInput.value = input.trim();
  const targetGroup = getExplorerTargetGroup();
  if (currentGroupSelect) currentGroupSelect.value = targetGroup;
  if (groupInput) groupInput.value = targetGroup;
  setActiveSidebarPanel('sync');
  await importUrl('preview');
}

async function renameGroupFromExplorer(group) {
  const oldName = normalizeGroupName(group);
  if (!oldName) {
    showIllegalAction('请先选择一个要重命名的文件夹');
    return;
  }
  const leafName = prompt(`重命名文件夹“${oldName}”\n\n请输入新的文件夹名称：`, getGroupLeafName(oldName));
  if (!leafName) return;
  const normalizedLeaf = validateGroupNameOrThrow(leafName);
  if (normalizedLeaf.includes('/')) {
    showIllegalAction('重命名文件夹时，请只输入当前这一层的新名称');
    return;
  }
  const parent = getGroupParentName(oldName);
  const newName = parent ? `${parent}/${normalizedLeaf}` : normalizedLeaf;
  await renameGroup(oldName, newName);
  if (currentGroupFilter === oldName) currentGroupFilter = newName;
  selectedExplorerGroup = newName;
  await loadLibrary();
  updateGroupToolbarState();
  setStatus(`已重命名文件夹：${oldName} -> ${newName}`);
}

async function deleteGroupFromExplorer(group) {
  const name = normalizeGroupName(group);
  if (!name) {
    showIllegalAction('请先选择一个要删除的文件夹');
    return;
  }
  const subtreeCount = getGroupSubtreeDocumentCount(name);
  const childGroupCount = getChildGroupCount(name);
  if (subtreeCount > 0) {
    showIllegalAction('这个文件夹或其子文件夹下还有笔记，不能删除');
    return;
  }
  if (childGroupCount > 0) {
    showIllegalAction('这个文件夹下还有子文件夹，不能删除');
    return;
  }
  const ok = confirm(`确定删除空文件夹“${name}”吗？`);
  if (!ok) return;
  await deleteGroup(name);
  if (currentGroupFilter === name) currentGroupFilter = ALL_GROUPS_VALUE;
  if (selectedExplorerGroup === name) selectedExplorerGroup = '';
  await loadLibrary();
  updateGroupToolbarState();
  setStatus(`已删除空文件夹：${name}`);
}

async function renameDocumentFromExplorer(doc) {
  if (!canManageGroup(doc)) {
    showIllegalAction('当前文档不能通过资源管理器重命名');
    return;
  }
  const nextTitle = prompt(`重命名文档“${doc.title || doc.slug}”\n\n请输入新的文件名：`, doc.title || doc.slug);
  if (!nextTitle) return;
  const cleanTitle = nextTitle.trim();
  if (!cleanTitle) return;
  const result = await renameDocumentRequest(doc.path, cleanTitle);
  localStorage.removeItem(cacheKeyForPath(doc.path));
  await loadLibrary();
  await rebuildSearchIndex();
  selectedExplorerGroup = getDocGroup(result.document);
  await openDocument(result.document.path);
  setStatus(`已重命名文档：${cleanTitle}`);
}

async function copyDocumentPath(doc) {
  const path = doc?.path || '';
  if (!path) return;
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(path);
      setStatus(`已复制路径：${path}`);
      return;
    }
  } catch (_) {
  }
  window.prompt('复制这个路径：', path);
}

async function handleExplorerContextAction(action, state) {
  if (!state) return;
  if (state.type === 'group') {
    selectedExplorerGroup = normalizeGroupName(state.group);
    if (manageGroupSelect) manageGroupSelect.value = selectedExplorerGroup;
    updateGroupToolbarState();
    if (action === 'new-file') {
      createBlankDocumentFromExplorer();
      return;
    }
    if (action === 'new-folder') {
      await createFolderFromExplorer();
      return;
    }
    if (action === 'import-url') {
      await importFromExplorerShortcut();
      return;
    }
    if (action === 'rename') {
      await renameGroupFromExplorer(state.group);
      return;
    }
    if (action === 'delete') {
      await deleteGroupFromExplorer(state.group);
    }
    return;
  }

  if (state.type === 'file') {
    if (action === 'open') {
      selectedExplorerGroup = getDocGroup(state.doc);
      await openDocument(state.doc.path);
      return;
    }
    if (action === 'rename') {
      await renameDocumentFromExplorer(state.doc);
      return;
    }
    if (action === 'delete') {
      await deleteDocument(state.doc);
      return;
    }
    if (action === 'copy-path') {
      await copyDocumentPath(state.doc);
    }
  }
}

async function renameManagedGroup() {
  const oldName = getManagedGroupValue();
  const leafName = validateGroupNameOrThrow(newGroupInput.value);
  if (leafName.includes('/')) {
    showIllegalAction('重命名时，请只输入当前这一层的新名称');
    return;
  }
  const parent = getGroupParentName(oldName);
  const newName = parent ? `${parent}/${leafName}` : leafName;
  if (!oldName) {
    showIllegalAction('请先选择一个要重命名的分组');
    return;
  }
  await renameGroup(oldName, newName);
  if (currentGroupFilter === oldName) currentGroupFilter = newName;
  if (currentDoc && getDocGroup(currentDoc) === oldName) currentDoc.group = newName;
  newGroupInput.value = leafName;
  await loadLibrary();
  manageGroupSelect.value = newName;
  updateGroupToolbarState();
  setStatus(`已重命名分组：${oldName} -> ${newName}`);
}

async function updateManagedGroupParent() {
  const name = getManagedGroupValue();
  if (!name) {
    showIllegalAction('请先选择一个要调整层级的分组');
    return;
  }
  const parent = normalizeGroupName(parentGroupSelect.value);
  const result = await updateGroupParent(name, parent);
  if (currentGroupFilter === name) currentGroupFilter = result.name;
  if (currentDoc && isGroupWithin(getDocGroup(currentDoc), name)) {
    const currentGroup = getDocGroup(currentDoc);
    currentDoc.group = currentGroup === name
      ? result.name
      : `${result.name}/${currentGroup.slice(name.length + 1)}`;
  }
  await loadLibrary();
  manageGroupSelect.value = result.name;
  newGroupInput.value = getGroupLeafName(result.name);
  updateGroupToolbarState();
  setStatus(`已调整分组层级：${result.name}`);
}

async function deleteManagedGroup() {
  const name = getManagedGroupValue();
  if (!name) {
    showIllegalAction('请先选择一个要删除的分组');
    return;
  }
  const subtreeCount = getGroupSubtreeDocumentCount(name);
  const childGroupCount = getChildGroupCount(name);
  if (subtreeCount > 0) {
    showIllegalAction('这个分组或它的子分组下还有笔记，不能删除。请先移动或删除这些笔记');
    return;
  }
  if (childGroupCount > 0) {
    showIllegalAction('这个分组下还有子分组，不能删除。请先清空或移动这些子分组');
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
    showIllegalAction('请先把当前临时导入内容保存到站点，再进行分组');
    return;
  }
  const rawGroup = getPendingGroupValue();
  const group = rawGroup ? validateGroupNameOrThrow(rawGroup) : '';
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
    showIllegalAction('请先保存当前文档，再进行顺序调整');
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
    showIllegalAction('未保存的临时导入内容不能删除');
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
    currentDoc = null;
    renderGroupSelectors();
    renderLibraryList();
    renderOpenEditors();
    updateGroupToolbarState();
  }
  setStatus(`已删除：${doc.title || doc.slug}`);
}

async function importUrl(mode) {
  const url = validateUrlOrThrow(urlInput.value);
  const pendingGroup = getPendingGroupValue() ? validateGroupNameOrThrow(getPendingGroupValue()) : '';
  setStatus('正在抓取网址内容，请稍候…');
  const data = await fetchJson(`/api/import-url?url=${encodeURIComponent(url)}`);
  const meta = data.meta || {};
  const imageStats = meta.images || { total: 0, downloaded: 0, failed: 0 };
  const importSummary = `类型: ${meta.detectedType || 'unknown'}；图片 ${imageStats.downloaded}/${imageStats.total}${imageStats.failed ? `，失败 ${imageStats.failed}` : ''}`;
  docTitleInput.value = data.title || docTitleInput.value;
  docSlugInput.value = slugify(data.slug || data.title || 'imported');
  if (mode === 'preview') {
    currentDoc = {
      path: '__adhoc__',
      title: data.title || '网址导入',
      slug: slugify(data.slug || data.title || 'imported'),
      type: 'adhoc',
      group: pendingGroup
    };
    originalContent = data.markdown;
    editor.value = data.markdown;
    updateRichMode(true);
    render(false);
    openEditor(false);
    docPath.textContent = 'adhoc / 未保存导入';
    renderOpenEditors();
    updateGroupToolbarState();
    setStatus(`已导入到编辑区：${data.title}（${importSummary}）`);
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
      group: pendingGroup
    })
  });
  await loadLibrary();
  await rebuildSearchIndex();
  await openDocument(saveResult.path);
  setStatus(`已导入并保存：${saveResult.path}（${importSummary}）`);
}

async function rebuildSearchIndex() {
  const total = library.length;
  const token = ++searchBuildToken;
  searchIndex = [];
  searchCount.textContent = '0';
  if (!total) {
    searchMeta.textContent = '文档库为空，暂无搜索索引';
    runSearch();
    return;
  }
  searchMeta.textContent = `正在建立搜索索引…0/${total}`;
  const batchSize = 6;
  for (let i = 0; i < total; i += batchSize) {
    const batch = library.slice(i, i + batchSize);
    const docs = await Promise.all(batch.map(async doc => {
      try {
        const md = await resolveDocContent(doc);
        return { ...doc, markdown: md, plain: plainText(md) };
      } catch (_) {
        return { ...doc, markdown: '', plain: '' };
      }
    }));
    if (token !== searchBuildToken) return;
    searchIndex.push(...docs);
    searchCount.textContent = String(searchIndex.length);
    searchMeta.textContent = `正在建立搜索索引…${searchIndex.length}/${total}`;
    await new Promise(resolve => setTimeout(resolve, 0));
  }
  if (token !== searchBuildToken) return;
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
  if (!richMode || !editorDrawer.classList.contains('hidden')) render(true);
});

docTitleInput.addEventListener('input', () => {
  if (!docSlugInput.value.trim()) docSlugInput.value = slugify(docTitleInput.value);
});

docSelect.addEventListener('change', async () => openDocument(docSelect.value));
searchInput.addEventListener('input', () => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(runSearch, 160);
});
document.querySelectorAll('[data-activity-panel]').forEach(btn => {
  btn.addEventListener('click', () => setActiveSidebarPanel(btn.dataset.activityPanel));
});
activitySourceBtn?.addEventListener('click', () => openEditor(editorDrawer.classList.contains('hidden')));
explorerCreateBtn?.addEventListener('click', evt => {
  evt.stopPropagation();
  setExplorerCreateMenuOpen(explorerCreateMenu.classList.contains('hidden'));
});
explorerMenuImportBtn?.addEventListener('click', async () => {
  setExplorerCreateMenuOpen(false);
  try {
    await importFromExplorerShortcut();
  } catch (err) {
    if (looksLikeIllegalAction(err.message)) showIllegalAction(err.message);
    else showRequestError('网页导入失败', err);
  }
});
explorerNewFolderBtn?.addEventListener('click', async () => {
  setExplorerCreateMenuOpen(false);
  try {
    await createFolderFromExplorer();
  } catch (err) {
    if (looksLikeIllegalAction(err.message)) showIllegalAction(err.message);
    else showRequestError('新建文件夹失败', err);
  }
});
document.addEventListener('click', evt => {
  const target = evt.target;
  if (explorerCreateMenu && explorerCreateBtn && !explorerCreateMenu.classList.contains('hidden')) {
    if (!(target instanceof Node) || (!explorerCreateMenu.contains(target) && !explorerCreateBtn.contains(target))) {
      setExplorerCreateMenuOpen(false);
    }
  }
  if (explorerContextMenu && !explorerContextMenu.classList.contains('hidden')) {
    if (!(target instanceof Node) || !explorerContextMenu.contains(target)) {
      closeExplorerContextMenu();
    }
  }
});
document.addEventListener('scroll', closeExplorerContextMenu, true);
explorerContextMenu?.addEventListener('click', async evt => {
  const button = evt.target.closest('[data-menu-action]');
  if (!button || !explorerContextState) return;
  const state = explorerContextState;
  const action = button.dataset.menuAction;
  closeExplorerContextMenu();
  try {
    await handleExplorerContextAction(action, state);
  } catch (err) {
    if (looksLikeIllegalAction(err.message)) showIllegalAction(err.message);
    else showRequestError('资源管理器操作失败', err);
  }
});
groupFilterSelect.addEventListener('change', () => {
  currentGroupFilter = groupFilterSelect.value;
  renderLibraryList();
});
currentGroupSelect.addEventListener('change', () => {
  groupInput.value = currentGroupSelect.value;
});
toggleTreeBtn.addEventListener('click', () => setTreeDrawerOpen(!treeDrawerOpen));
closeTreeDrawerBtn.addEventListener('click', () => setTreeDrawerOpen(false));
manageGroupSelect.addEventListener('change', () => {
  newGroupInput.value = getGroupLeafName(manageGroupSelect.value);
  updateGroupToolbarState();
});
createGroupBtn.addEventListener('click', async () => {
  try {
    await createManagedGroup();
  } catch (err) {
    if (looksLikeIllegalAction(err.message)) showIllegalAction(err.message);
    else showRequestError('新建分组失败', err);
  }
});
renameGroupBtn.addEventListener('click', async () => {
  try {
    await renameManagedGroup();
  } catch (err) {
    if (looksLikeIllegalAction(err.message)) showIllegalAction(err.message);
    else showRequestError('重命名分组失败', err);
  }
});
updateGroupParentBtn.addEventListener('click', async () => {
  try {
    await updateManagedGroupParent();
  } catch (err) {
    if (looksLikeIllegalAction(err.message)) showIllegalAction(err.message);
    else showRequestError('调整分组层级失败', err);
  }
});
deleteGroupBtn.addEventListener('click', async () => {
  try {
    await deleteManagedGroup();
  } catch (err) {
    if (looksLikeIllegalAction(err.message)) showIllegalAction(err.message);
    else showRequestError('删除分组失败', err);
  }
});
applyGroupBtn.addEventListener('click', async () => {
  try {
    await applyCurrentGroup();
  } catch (err) {
    if (looksLikeIllegalAction(err.message)) showIllegalAction(err.message);
    else showRequestError('分组更新失败', err);
  }
});
clearGroupBtn.addEventListener('click', async () => {
  groupInput.value = '';
  currentGroupSelect.value = '';
  try {
    await applyCurrentGroup();
  } catch (err) {
    if (looksLikeIllegalAction(err.message)) showIllegalAction(err.message);
    else showRequestError('分组更新失败', err);
  }
});
moveDocUpBtn.addEventListener('click', async () => {
  try {
    await moveCurrentDocument(-1);
  } catch (err) {
    if (looksLikeIllegalAction(err.message)) showIllegalAction(err.message);
    else showRequestError('顺序调整失败', err);
  }
});
moveDocDownBtn.addEventListener('click', async () => {
  try {
    await moveCurrentDocument(1);
  } catch (err) {
    if (looksLikeIllegalAction(err.message)) showIllegalAction(err.message);
    else showRequestError('顺序调整失败', err);
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
    if (looksLikeIllegalAction(err.message)) showIllegalAction(err.message);
    else showRequestError('保存失败', err);
  }
});

settingsSaveBtn?.addEventListener('click', async () => {
  try {
    await saveCurrentDocument();
  } catch (err) {
    if (looksLikeIllegalAction(err.message)) showIllegalAction(err.message);
    else showRequestError('保存失败', err);
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
if (publishShareBtn) {
  publishShareBtn.addEventListener('click', () => {
    if (STATIC_HOST) {
      setStatus('静态只读模式下无法上传共享笔记', true);
      return;
    }
    openSharePublishModal();
  });
}
if (browseShareBtn) {
  browseShareBtn.addEventListener('click', async () => {
    if (STATIC_HOST) {
      setStatus('静态只读模式下无法拉取共享笔记', true);
      return;
    }
    openSharedBrowseModal();
    try {
      await refreshSharedNotesList();
    } catch (err) {
      showRequestError('共享笔记列表加载失败', err);
    }
  });
}
if (closeSharePublishModalBtn) {
  closeSharePublishModalBtn.addEventListener('click', closeSharePublishModal);
}
if (closeSharedBrowseModalBtn) {
  closeSharedBrowseModalBtn.addEventListener('click', closeSharedBrowseModal);
}
if (refreshSharedNotesBtn) {
  refreshSharedNotesBtn.addEventListener('click', async () => {
    try {
      await refreshSharedNotesList({ forceScan: true });
    } catch (err) {
      showRequestError('共享笔记列表刷新失败', err);
    }
  });
}
[sharedSearchInput, sharedAcademyFilter, sharedMajorFilter, sharedYearFilter].forEach(input => {
  input?.addEventListener('input', () => renderSharedNotesList(sharedNotesCache, sharedNotesSource));
  input?.addEventListener('change', () => renderSharedNotesList(sharedNotesCache, sharedNotesSource));
});
[shareAuthorInput, shareAcademyInput, shareMajorInput, shareYearInput].forEach(input => {
  input?.addEventListener('input', updateShareBranchPreview);
  input?.addEventListener('change', persistShareProfile);
});
[shareTagsInput, shareSummaryInput].forEach(input => {
  input?.addEventListener('change', persistShareProfile);
});
if (confirmSharePublishBtn) {
  confirmSharePublishBtn.addEventListener('click', async () => {
    const author = (shareAuthorInput?.value || '').trim();
    const academy = (shareAcademyInput?.value || '').trim();
    const major = (shareMajorInput?.value || '').trim();
    const year = (shareYearInput?.value || '').trim();
    const tags = (shareTagsInput?.value || '').trim();
    const summary = (shareSummaryInput?.value || '').trim();
    if (!academy || !major || !year) {
      setStatus('请先填写学院、专业和年级', true);
      return;
    }
    persistShareProfile();
    sharePublishMeta.textContent = '上传任务已转入后台，关闭窗口后也会继续执行。';
    await startShareUploadTask({ author, academy, major, year, tags, summary });
  });
}
retryShareUploadBtn?.addEventListener('click', async () => {
  if (!shareUploadTaskState.payload) return;
  await startShareUploadTask(shareUploadTaskState.payload);
});
dismissShareUploadBtn?.addEventListener('click', dismissShareUploadTask);
if (exitSiteBtn) {
  exitSiteBtn.addEventListener('click', async () => {
    try {
      await shutdownSite();
    } catch (err) {
      exitSiteBtn.disabled = false;
      showRequestError('退出失败', err);
    }
  });
}

deleteBtn.addEventListener('click', async () => {
  try {
    await deleteDocument();
  } catch (err) {
    if (looksLikeIllegalAction(err.message)) showIllegalAction(err.message);
    else showRequestError('删除失败', err);
  }
});

importPreviewBtn.addEventListener('click', async () => {
  try {
    await importUrl('preview');
  } catch (err) {
    if (looksLikeIllegalAction(err.message)) {
      showIllegalAction(err.message);
    } else {
      showRequestError('导入失败', err);
    }
  }
});

importSaveBtn.addEventListener('click', async () => {
  try {
    await importUrl('save');
  } catch (err) {
    if (looksLikeIllegalAction(err.message)) {
      showIllegalAction(err.message);
    } else {
      showRequestError('导入保存失败', err);
    }
  }
});

editToggleBtn.addEventListener('click', () => openEditor(editorDrawer.classList.contains('hidden')));
closeEditorBtn.addEventListener('click', () => openEditor(false));
toggleLeftSidebarBtn.addEventListener('click', toggleLeftSidebar);
toggleRightSidebarBtn.addEventListener('click', toggleRightSidebar);
toggleRichBtn.addEventListener('click', () => updateRichMode(!richMode));
if (toggleThemeBtn) {
  toggleThemeBtn.addEventListener('click', () => applyTheme(!darkTheme));
}
if (toggleWidthBtn) {
  toggleWidthBtn.addEventListener('click', cycleReadingDensity);
}
if (toggleFocusBtn) {
  toggleFocusBtn.addEventListener('click', toggleFocusMode);
}
if (newBlankBtn) {
  newBlankBtn.addEventListener('click', () => {
    setExplorerCreateMenuOpen(false);
    createBlankDocumentFromExplorer();
  });
}
if (toggleTocBtn) {
  toggleTocBtn.addEventListener('click', () => setTocVisible(!tocVisible));
}
leftResizer.addEventListener('pointerdown', evt => startResize('left', evt));
rightResizer.addEventListener('pointerdown', evt => startResize('right', evt));
window.addEventListener('resize', () => {
  applyLayoutState();
  updateStickyOffset();
  closeExplorerContextMenu();
});
if (window.ResizeObserver && topbar) {
  new ResizeObserver(updateStickyOffset).observe(topbar);
}

preview.addEventListener('input', () => {
  if (!richMode) return;
  applyRichMarkdownShortcuts();
});

preview.addEventListener('change', evt => {
  if (!richMode) return;
  if (evt.target instanceof HTMLInputElement && evt.target.type === 'checkbox') {
    syncRichSource();
  }
});

richToolbar.addEventListener('click', evt => {
  const btn = evt.target.closest('button[data-cmd]');
  if (!btn || !richMode) return;
  const cmd = btn.dataset.cmd;
  preview.focus();
  if (/^h[1-6]$/.test(cmd)) {
    execRichCommand('formatBlock', cmd);
  } else if (cmd === 'blockquote') {
    insertRichQuoteBlock();
  } else if (cmd === 'code') {
    insertRichCodeBlock();
  } else if (cmd === 'createLink') {
    const link = prompt('请输入链接地址：', 'https://');
    if (link) execRichCommand('createLink', link);
  } else if (cmd === 'hr') {
    execRichCommand('insertHorizontalRule');
  } else {
    execRichCommand(cmd, null);
  }
  syncRichSource();
});

if (sharedNotesList) {
  sharedNotesList.addEventListener('click', async evt => {
    const btn = evt.target.closest('.shared-import-btn');
    if (!btn) return;
    const branchName = btn.dataset.branch || '';
    if (!branchName) return;
    btn.disabled = true;
    sharedNotesMeta.textContent = `正在导入 ${branchName} …`;
    try {
      const result = await importSharedNotesBranch(branchName);
      await loadLibrary();
      await rebuildSearchIndex();
      renderSharedNotesList(sharedNotesCache, sharedNotesSource);
      if (result.documents?.[0]?.path) {
        await openDocument(result.documents[0].path);
      }
      const removedCount = Number(result.removedCount || 0);
      const syncSummary = removedCount
        ? `已同步共享笔记：${branchName}（导入 ${result.documentCount} 篇，清理旧内容 ${removedCount} 篇）`
        : `已导入共享笔记：${branchName}（${result.documentCount} 篇）`;
      setStatus(syncSummary);
      sharedNotesMeta.textContent = removedCount
        ? `已同步 ${branchName}，导入 ${result.documentCount} 篇，清理旧内容 ${removedCount} 篇。`
        : `已导入 ${branchName}，共 ${result.documentCount} 篇笔记。`;
    } catch (err) {
      sharedNotesMeta.textContent = `导入 ${branchName} 失败。`;
      showRequestError('共享笔记导入失败', err);
    } finally {
      btn.disabled = false;
    }
  });
}

document.querySelectorAll('[data-close-modal]').forEach(node => {
  node.addEventListener('click', evt => {
    const modalId = evt.currentTarget.getAttribute('data-close-modal');
    if (!modalId) return;
    setModalOpen(document.getElementById(modalId), false);
  });
});



preview.addEventListener('keydown', handleRichKeydown);

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
  if (evt.key === 'Escape') {
    setExplorerCreateMenuOpen(false);
    openEditor(false);
    closeSharePublishModal();
    closeSharedBrowseModal();
  }
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
  applyTheme(localStorage.getItem(THEME_STORAGE_KEY) === 'dark');
  applyReadingDensity(localStorage.getItem(READING_DENSITY_STORAGE_KEY) || 'standard');
  focusMode = localStorage.getItem(FOCUS_MODE_STORAGE_KEY) === '1';
  tocVisible = localStorage.getItem(TOC_VISIBLE_STORAGE_KEY) !== '0';
  applyShareProfile(readShareProfile());
  renderShareUploadTask();
  if (exitSiteBtn) {
    exitSiteBtn.disabled = STATIC_HOST;
    exitSiteBtn.title = STATIC_HOST ? '静态只读模式下无法关闭本地服务' : '停止本地服务并关闭页面';
  }
  if (publishShareBtn) {
    publishShareBtn.disabled = STATIC_HOST;
    publishShareBtn.title = STATIC_HOST ? '静态只读模式下无法上传共享笔记' : '上传当前站点笔记到 GitHub 共享分支';
  }
  if (browseShareBtn) {
    browseShareBtn.disabled = STATIC_HOST;
    browseShareBtn.title = STATIC_HOST ? '静态只读模式下无法拉取共享笔记' : '浏览并导入 GitHub 上的共享笔记';
  }
  if (STATIC_HOST) {
    setStatus('当前是静态只读模式：可阅读、搜索、导航；保存和网址导入需要本地服务端。');
  }
  setTopbarHidden(false);
  lastScrollY = Math.max(window.scrollY || 0, 0);
  updateStickyOffset();
  applyLayoutState();
  applySidebarPanelState();
  applyTreeDrawerState();
  applyTocState();
  await loadLibrary();
  await rebuildSearchIndex();
  const { doc, section } = findDocByHash();
  await openDocument(doc.path, section);
  updateRichMode(true);
  openEditor(false);
  renderOpenEditors();
  document.body.classList.remove('reading-mode');
  updateDeleteButtonState();
  updateGroupToolbarState();
}

init().catch(err => {
  console.error(err);
  editor.value = `初始化失败：${err.message}\n\n请使用 python scripts/server.py 启动本项目。`;
  render();
  setStatus(`初始化失败：${err.message}`, true);
});
