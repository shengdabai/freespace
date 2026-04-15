// dashboard/app.js — FreeSpace main application

import { extractRootDomain, truncate, isInternalUrl, isOwnDashboardUrl } from '../lib/utils.js';
import { classifyTabs, loadCustomRules } from '../lib/classifier.js';
import { extractKeyword } from '../lib/summarizer.js';
import { getLatestSession, getSessions, deleteSession, getStorageUsage, getSetting, saveSetting } from '../lib/storage.js';
import { initVirtualScroll, setDensity, getDensity } from '../lib/layout.js';
import { canUndo, restoreLastSession, clearUndo, getTimeRemaining } from '../lib/undo.js';
import { t, setLanguage, detectLanguage, getLanguage } from '../lib/i18n.js';

// ===== DOM Elements =====
const searchInput = document.getElementById('search-input');
const groupsContainer = document.getElementById('groups-container');
const emptyState = document.getElementById('empty-state');
const errorState = document.getElementById('error-state');
const sessionCount = document.getElementById('session-count');
const sessionDate = document.getElementById('session-date');
const undoBanner = document.getElementById('undo-banner');
const undoText = document.getElementById('undo-text');
const undoBtn = document.getElementById('undo-btn');
const undoDismiss = document.getElementById('undo-dismiss');
const themeToggle = document.getElementById('theme-toggle');
const densityCompact = document.getElementById('density-compact');
const densityComfortable = document.getElementById('density-comfortable');
const settingsBtn = document.getElementById('settings-btn');
const settingsPanel = document.getElementById('settings-panel');
const settingsClose = document.getElementById('settings-close');
const storageInfo = document.getElementById('storage-info');
const clearDataBtn = document.getElementById('clear-data-btn');
const retryBtn = document.getElementById('retry-btn');
const toastContainer = document.getElementById('toast-container');
const sessionsList = document.getElementById('sessions-list');
const sessionTotal = document.getElementById('session-total');
const collapseAllBtn = document.getElementById('collapse-all-btn');
const windowSelector = document.getElementById('window-selector');
const windowTabs = document.getElementById('window-tabs');
const sessionHeader = document.getElementById('session-header');
const langEn = document.getElementById('lang-en');
const langZh = document.getElementById('lang-zh');

// ===== State =====
let currentSession = null;
let allSessions = [];
let collapsedGroups = new Set();
let searchQuery = '';
let searchDebounceTimer = null;
let undoInterval = null;
let activeWindowId = null; // null = show all windows
let allCollapsed = false;

// ===== Initialization =====
document.addEventListener('DOMContentLoaded', async () => {
  try {
    // Detect language from browser, then override with saved preference
    const browserLang = detectLanguage();
    const savedLang = await getSetting('language').catch(() => null);
    setLanguage(savedLang || browserLang);

    await initTheme();
    await initDensity();
    applyLanguage();
    updateLangButtons();
    await loadSessions();
    bindEvents();
  } catch (err) {
    console.error('Initialization failed:', err);
    showError();
  }
});

async function initTheme() {
  try {
    const theme = await getSetting('theme');
    if (theme === 'dark') {
      document.documentElement.setAttribute('data-theme', 'dark');
    }
  } catch {}
  updateThemeIcon();
}

function updateThemeIcon() {
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  themeToggle.textContent = isDark ? '\u2600' : '\u{1F319}';
  themeToggle.title = t('themeToggle');
  themeToggle.setAttribute('aria-label', t('themeToggle'));
}

async function initDensity() {
  const density = await getDensity();
  document.documentElement.setAttribute('data-density', density);
  updateDensityRadio(density);
}

function applyLanguage() {
  // Toolbar
  searchInput.placeholder = t('searchPlaceholder');
  searchInput.setAttribute('aria-label', t('searchLabel'));
  themeToggle.title = t('themeToggle');
  themeToggle.setAttribute('aria-label', t('themeToggle'));
  settingsBtn.title = t('settingsLabel');
  settingsBtn.setAttribute('aria-label', t('settingsLabel'));
  densityCompact.title = t('densityCompact');
  densityComfortable.title = t('densityComfortable');

  // Collapse button
  updateCollapseButton();

  // Undo
  undoBtn.textContent = t('undoBtn');

  // Empty state
  emptyState.querySelector('p:nth-child(2)').textContent = t('emptyTitle');
  emptyState.querySelector('p.muted').textContent = t('emptyHint');

  // Error state
  errorState.querySelector('p').textContent = t('errorTitle');
  retryBtn.textContent = t('retryBtn');

  // Settings
  settingsPanel.querySelector('h2').textContent = t('settingsLabel');
  const storageLabel = document.querySelector('.setting-row label[for="storage-info"]');
  if (storageLabel) storageLabel.textContent = t('storageLabel');
  clearDataBtn.textContent = t('clearDataBtn');
  settingsClose.textContent = t('closeBtn');
  document.getElementById('lang-label').textContent = t('langLabel');

  // Sidebar header
  document.querySelector('.sidebar-header h2').textContent = t('sessionListTitle');

  // Re-render sessions list with current language
  renderSessionList();
}

function updateLangButtons() {
  const lang = getLanguage();
  langEn.classList.toggle('active', lang === 'en');
  langZh.classList.toggle('active', lang === 'zh');
}

async function loadSessions() {
  try {
    allSessions = await getSessions();
    allSessions.sort((a, b) => b.timestamp - a.timestamp);
    renderSessionList();

    if (allSessions.length > 0) {
      currentSession = allSessions[0];
      renderSession(currentSession);
      highlightActiveSession(currentSession.id);
    } else {
      showEmpty();
    }
  } catch (err) {
    console.error('Failed to load sessions:', err);
    showError();
  }
}

// ===== Session List (OneTab style) =====
function renderSessionList() {
  sessionsList.textContent = '';
  sessionTotal.textContent = t('sessionBadge', allSessions.length);

  for (const session of allSessions) {
    const item = document.createElement('div');
    item.className = 'session-item';
    item.setAttribute('data-session-id', session.id);
    item.setAttribute('tabindex', '0');

    const date = new Date(session.timestamp);
    const dateStr = date.toLocaleDateString(getLanguage() === 'zh' ? 'zh-CN' : 'en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
    const timeStr = date.toLocaleTimeString(getLanguage() === 'zh' ? 'zh-CN' : 'en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });

    const winInfo = session.windowCount > 1 ? ' · ' + t('windowCount', session.windowCount) : '';
    const mainLine = document.createElement('div');
    mainLine.className = 'session-item-date';
    mainLine.textContent = dateStr + ' ' + timeStr;

    const metaLine = document.createElement('div');
    metaLine.className = 'session-item-meta';
    metaLine.textContent = t('tabCount', session.tabCount) + winInfo;

    const preview = document.createElement('div');
    preview.className = 'session-item-preview';
    const groupNames = session.groups.slice(0, 4).map((g) => g.icon + ' ' + g.category);
    preview.textContent = groupNames.join('  ');
    if (session.groups.length > 4) preview.textContent += ' ...';

    const delBtn = document.createElement('button');
    delBtn.className = 'session-item-delete';
    delBtn.textContent = '\u00d7';
    delBtn.setAttribute('aria-label', 'Delete session');

    const header = document.createElement('div');
    header.style.display = 'flex';
    header.style.justifyContent = 'space-between';
    header.style.alignItems = 'flex-start';
    header.appendChild(mainLine);
    header.appendChild(delBtn);

    item.appendChild(header);
    item.appendChild(metaLine);
    item.appendChild(preview);

    item.addEventListener('click', () => {
      currentSession = session;
      renderSession(session);
      highlightActiveSession(session.id);
    });

    item.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); item.click(); }
    });

    delBtn.addEventListener('click', async (e) => {
      e.stopPropagation();
      await deleteSession(session.id);
      allSessions = allSessions.filter((s) => s.id !== session.id);
      item.remove();
      sessionTotal.textContent = t('sessionBadge', allSessions.length);
      showToast(t('sessionDeleted'));

      if (currentSession && currentSession.id === session.id) {
        if (allSessions.length > 0) {
          currentSession = allSessions[0];
          renderSession(currentSession);
          highlightActiveSession(currentSession.id);
        } else {
          currentSession = null;
          showEmpty();
        }
      }
    });

    sessionsList.appendChild(item);
  }
}

function highlightActiveSession(id) {
  sessionsList.querySelectorAll('.session-item').forEach((el) => {
    el.classList.toggle('active', el.getAttribute('data-session-id') === id);
  });
}

// ===== Rendering =====
function renderSession(session) {
  showGroups();
  groupsContainer.textContent = '';
  collapsedGroups.clear();
  activeWindowId = null;
  allCollapsed = false;
  updateCollapseButton();

  const winCount = session.windowCount || 1;
  sessionCount.textContent = t('tabCount', session.tabCount) + (winCount > 1 ? ' · ' + t('windowCount', winCount) : '');
  const date = new Date(session.timestamp);
  sessionDate.textContent = date.toLocaleString(getLanguage() === 'zh' ? 'zh-CN' : 'en-US', {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  });

  updateUndoState();
  sessionHeader.hidden = false;

  if (session.windows && session.windows.length > 1) {
    renderWindowSelector(session.windows);
    renderAllWindows(session.windows);
  } else {
    windowSelector.hidden = true;
    const groups = filterGroups(session.groups);
    if (groups.length === 0) { showEmpty(); return; }
    for (const group of groups) {
      groupsContainer.appendChild(renderGroupCard(group));
    }
  }
}

// ===== Window Selector =====
function renderWindowSelector(windows) {
  windowSelector.hidden = false;
  windowTabs.textContent = '';

  const totalCount = windows.reduce((s, w) => s + w.tabCount, 0);
  const allTab = createWindowTab(t('allWindows') + ' (' + totalCount + ')', null, () => {
    activeWindowId = null;
    updateWindowTabSelection(allTab);
    renderAllWindows(windows);
  });
  windowTabs.appendChild(allTab);
  updateWindowTabSelection(allTab);

  windows.forEach((w) => {
    const tab = createWindowTab(w.tabCount + ' tabs', w.windowId, () => {
      activeWindowId = w.windowId;
      updateWindowTabSelection(tab);
      renderAllWindows(windows);
    });
    windowTabs.appendChild(tab);
  });
}

function createWindowTab(label, windowId, onClick) {
  const tab = document.createElement('button');
  tab.className = 'window-tab';
  tab.setAttribute('role', 'tab');
  tab.setAttribute('aria-selected', 'false');
  tab.textContent = label;
  tab.addEventListener('click', onClick);
  return tab;
}

function updateWindowTabSelection(selectedTab) {
  windowTabs.querySelectorAll('.window-tab').forEach((t) => t.setAttribute('aria-selected', 'false'));
  selectedTab.setAttribute('aria-selected', 'true');
}

function renderAllWindows(windows) {
  groupsContainer.textContent = '';
  const visible = activeWindowId ? windows.filter((w) => w.windowId === activeWindowId) : windows;

  for (const w of visible) {
    if (visible.length > 1) {
      const header = document.createElement('div');
      header.className = 'window-section-header';
      header.innerHTML = '<span class="window-icon">&#x1FA9F;</span><span>Window</span><span class="window-count">' + w.tabCount + ' tabs</span>';
      groupsContainer.appendChild(header);
    }

    for (const group of filterGroups(w.groups)) {
      groupsContainer.appendChild(renderGroupCard(group));
    }
  }
}

// ===== Group Card =====
function renderGroupCard(group) {
  const card = document.createElement('div');
  card.className = 'group-card';
  card.setAttribute('role', 'listitem');
  card.setAttribute('data-category', group.category);

  const header = document.createElement('div');
  header.className = 'group-header';
  header.setAttribute('role', 'button');
  header.setAttribute('aria-expanded', String(!collapsedGroups.has(group.category)));
  header.setAttribute('tabindex', '0');

  header.innerHTML =
    '<span class="group-icon">' + group.icon + '</span>' +
    '<span class="group-name">' + group.category + '</span>' +
    '<span class="group-count">' + group.tabs.length + '</span>' +
    '<span class="group-chevron">\u25BC</span>';

  header.addEventListener('click', () => {
    collapsedGroups.has(group.category) ? collapsedGroups.delete(group.category) : collapsedGroups.add(group.category);
    header.setAttribute('aria-expanded', String(!collapsedGroups.has(group.category)));
    tabList.hidden = collapsedGroups.has(group.category);
  });

  header.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); header.click(); }
  });

  const tabList = document.createElement('div');
  tabList.className = 'group-tabs';
  tabList.setAttribute('role', 'list');
  tabList.hidden = collapsedGroups.has(group.category);

  for (const tab of group.tabs) tabList.appendChild(renderTabItem(tab));

  const restoreRow = document.createElement('div');
  restoreRow.style.cssText = 'padding: 4px 8px 8px; display: flex; gap: 8px;';
  const restoreBtn = document.createElement('button');
  restoreBtn.className = 'btn-restore-group';
  restoreBtn.textContent = '\u{1F504} ' + t('restoreGroup');
  restoreBtn.addEventListener('click', async () => {
    try {
      for (const tb of group.tabs) {
        await new Promise((res, rej) => {
          chrome.tabs.create({ url: tb.url, active: false }, (c) => {
            if (chrome.runtime.lastError) rej(chrome.runtime.lastError); else res(c);
          });
        });
      }
      showToast(t('restored', group.tabs.length));
    } catch { showToast(t('restoreFailed')); }
  });
  restoreRow.appendChild(restoreBtn);
  tabList.appendChild(restoreRow);

  card.appendChild(header);
  card.appendChild(tabList);
  return card;
}

// ===== Tab Item =====
function renderTabItem(tab) {
  const item = document.createElement('div');
  item.className = 'tab-item';
  item.setAttribute('role', 'listitem');
  item.setAttribute('tabindex', '0');
  item.setAttribute('data-tab-id', String(tab.id || ''));

  const favicon = document.createElement('img');
  favicon.className = 'tab-favicon';
  favicon.src = tab.favIconUrl || '';
  favicon.alt = '';
  favicon.onerror = function () { this.style.display = 'none'; };

  const keyword = document.createElement('span');
  keyword.className = 'tab-keyword';
  keyword.textContent = tab._keyword || extractKeyword(tab.title || '');

  const titleEl = document.createElement('span');
  titleEl.className = 'tab-title';
  titleEl.textContent = truncate(tab.title || '', 60);

  const domain = document.createElement('span');
  domain.className = 'tab-domain';
  try { domain.textContent = extractRootDomain(new URL(tab.url).hostname); } catch { domain.textContent = ''; }

  const closeBtn = document.createElement('button');
  closeBtn.className = 'tab-close';
  closeBtn.textContent = '\u00d7';
  closeBtn.title = t('closeTitle');
  closeBtn.setAttribute('aria-label', t('closeLabel'));
  closeBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    if (tab.id) chrome.tabs.remove(tab.id);
    item.remove();
  });

  item.append(favicon, keyword, titleEl, domain, closeBtn);

  item.addEventListener('click', () => chrome.tabs.create({ url: tab.url, active: true }));
  item.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); item.click(); } });

  return item;
}

// ===== Search =====
function filterGroups(groups) {
  if (!searchQuery) return groups;
  const q = searchQuery.toLowerCase();
  return groups.map((g) => ({ ...g, tabs: g.tabs.filter((tb) => (tb.title || '').toLowerCase().includes(q) || (tb.url || '').toLowerCase().includes(q) || (tb._keyword || '').toLowerCase().includes(q)) })).filter((g) => g.tabs.length > 0);
}

// ===== State Views =====
function showGroups() { emptyState.hidden = true; errorState.hidden = true; groupsContainer.style.display = ''; }

function showEmpty() {
  groupsContainer.textContent = '';
  windowSelector.hidden = true;
  sessionHeader.hidden = true;
  emptyState.hidden = false;
  errorState.hidden = true;
}

function showError() {
  groupsContainer.textContent = '';
  windowSelector.hidden = true;
  sessionHeader.hidden = true;
  emptyState.hidden = true;
  errorState.hidden = false;
}

// ===== Undo =====
function updateUndoState() {
  if (canUndo()) {
    undoBanner.hidden = false;
    const remaining = getTimeRemaining();
    undoText.textContent = t('undoMessage', remaining);
    if (undoInterval) clearInterval(undoInterval);
    undoInterval = setInterval(() => {
      if (!canUndo()) { undoBanner.hidden = true; clearInterval(undoInterval); return; }
      undoText.textContent = t('undoMessage', getTimeRemaining());
    }, 1000);
  } else { undoBanner.hidden = true; }
}

// ===== Settings =====
async function openSettings() {
  settingsPanel.hidden = false;
  settingsPanel.setAttribute('aria-hidden', 'false');
  try {
    const usage = await getStorageUsage();
    storageInfo.textContent = usage.percentUsed + '% (' + formatBytes(usage.usage) + ' / ' + formatBytes(usage.quota) + ')';
  } catch { storageInfo.textContent = '—'; }
}

function closeSettings() { settingsPanel.hidden = true; settingsPanel.setAttribute('aria-hidden', 'true'); }

function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

// ===== Toast =====
function showToast(message) {
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = message;
  toastContainer.appendChild(toast);
  setTimeout(() => {
    toast.classList.add('toast-exit');
    setTimeout(() => { if (toast.parentNode) toast.parentNode.removeChild(toast); }, 300);
  }, 2000);
}

// ===== Density =====
function updateDensityRadio(mode) {
  densityCompact.setAttribute('aria-checked', String(mode === 'compact'));
  densityComfortable.setAttribute('aria-checked', String(mode === 'comfortable'));
}

// ===== Collapse Button =====
function updateCollapseButton() {
  collapseAllBtn.textContent = allCollapsed ? t('expandAll') : t('collapseAll');
}

// ===== Event Binding =====
function bindEvents() {
  searchInput.addEventListener('input', () => {
    if (searchDebounceTimer) clearTimeout(searchDebounceTimer);
    searchDebounceTimer = setTimeout(() => {
      searchQuery = searchInput.value.trim();
      if (currentSession) renderSession(currentSession);
    }, 150);
  });

  undoBtn.addEventListener('click', async () => {
    try {
      await restoreLastSession();
      undoBanner.hidden = true;
      if (undoInterval) clearInterval(undoInterval);
      showToast(t('undoSuccess'));
    } catch { showToast(t('undoFailed')); }
  });

  undoDismiss.addEventListener('click', () => {
    undoBanner.hidden = true;
    if (undoInterval) clearInterval(undoInterval);
    clearUndo();
  });

  themeToggle.addEventListener('click', async () => {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    if (isDark) {
      document.documentElement.removeAttribute('data-theme');
      try { await saveSetting('theme', 'light'); } catch {}
    } else {
      document.documentElement.setAttribute('data-theme', 'dark');
      try { await saveSetting('theme', 'dark'); } catch {}
    }
    updateThemeIcon();
  });

  densityCompact.addEventListener('click', () => { setDensity('compact'); updateDensityRadio('compact'); });
  densityComfortable.addEventListener('click', () => { setDensity('comfortable'); updateDensityRadio('comfortable'); });

  settingsBtn.addEventListener('click', () => openSettings());
  settingsClose.addEventListener('click', () => closeSettings());

  // Language toggle
  langEn.addEventListener('click', async () => {
    setLanguage('en');
    await saveSetting('language', 'en');
    updateLangButtons();
    applyLanguage();
  });

  langZh.addEventListener('click', async () => {
    setLanguage('zh');
    await saveSetting('language', 'zh');
    updateLangButtons();
    applyLanguage();
  });
  settingsPanel.addEventListener('click', (e) => { if (e.target === settingsPanel) closeSettings(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !settingsPanel.hidden) closeSettings(); });

  clearDataBtn.addEventListener('click', async () => {
    if (confirm(t('confirmClear'))) {
      try {
        const sessions = await getSessions();
        for (const s of sessions) await deleteSession(s.id);
        allSessions = [];
        currentSession = null;
        renderSessionList();
        showEmpty();
        closeSettings();
        showToast(t('cleared'));
      } catch { showToast(t('clearFailed')); }
    }
  });

  retryBtn.addEventListener('click', () => loadSessions());

  if (collapseAllBtn) {
    collapseAllBtn.addEventListener('click', () => {
      allCollapsed = !allCollapsed;
      if (allCollapsed) {
        collapsedGroups.clear();
        if (currentSession && currentSession.groups) {
          for (const g of currentSession.groups) collapsedGroups.add(g.category);
        }
      } else {
        collapsedGroups.clear();
      }
      updateCollapseButton();
      if (currentSession) renderSession(currentSession);
    });
  }
}
