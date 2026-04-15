// lib/i18n.js — Bilingual support (EN/ZH) for FreeSpace

const DEFAULT_LANG = 'en';

const translations = {
  en: {
    appTitle: 'FreeSpace',
    searchPlaceholder: 'Search tabs...',
    searchLabel: 'Search tabs',
    collapseAll: 'Collapse All',
    expandAll: 'Expand All',
    undoMessage: (s) => `Tabs organized. Undo within ${s} seconds.`,
    undoBtn: 'Undo',
    themeToggle: 'Toggle theme',
    settingsLabel: 'Settings',
    storageLabel: 'Storage Usage',
    langLabel: 'Language',
    clearDataBtn: 'Clear All Data',
    closeBtn: 'Close',
    emptyTitle: 'No tabs collected yet.',
    emptyHint: 'Click the extension icon in the toolbar to start collecting.',
    errorTitle: 'Failed to load.',
    retryBtn: 'Retry',
    sessionListTitle: 'History',
    sessionBadge: (n) => `${n} saved`,
    tabCount: (n) => `${n} tabs`,
    windowCount: (n) => `${n} windows`,
    windowLabel: 'Window:',
    allWindows: 'All',
    restoreGroup: 'Restore this group',
    restored: (n) => `Restored ${n} tabs`,
    restoreFailed: 'Restore failed',
    confirmClear: 'Clear all session data? This cannot be undone.',
    cleared: 'Data cleared',
    clearFailed: 'Clear failed',
    undoSuccess: 'Undone',
    undoFailed: 'Undo failed',
    sessionLoaded: 'Session loaded',
    sessionDeleted: 'Session deleted',
    closeLabel: 'Close tab',
    closeTitle: 'Close',
    densityCompact: 'Compact',
    densityComfortable: 'Comfortable',
    readingList: 'Reading List',
    archived: 'Archived',
    historyLabel: 'History',
  },
  zh: {
    appTitle: 'FreeSpace',
    searchPlaceholder: '搜索标签页...',
    searchLabel: '搜索标签页',
    collapseAll: '折叠所有',
    expandAll: '展开所有',
    undoMessage: (s) => `标签页已整理，可在 ${s} 秒内撤回`,
    undoBtn: '撤回',
    themeToggle: '切换主题',
    settingsLabel: '设置',
    storageLabel: '存储用量',
    langLabel: '语言',
    clearDataBtn: '清除所有数据',
    closeBtn: '关闭',
    emptyTitle: '还没有收集标签页。',
    emptyHint: '点击浏览器工具栏的扩展图标即可开始收集。',
    errorTitle: '加载失败。',
    retryBtn: '重试',
    sessionListTitle: '历史会话',
    sessionBadge: (n) => `${n} 条`,
    tabCount: (n) => `${n} 个标签页`,
    windowCount: (n) => `${n} 个窗口`,
    windowLabel: '窗口：',
    allWindows: '全部',
    restoreGroup: '恢复此组',
    restored: (n) => `已恢复 ${n} 个标签页`,
    restoreFailed: '恢复失败',
    confirmClear: '确认清除所有会话数据？此操作不可恢复。',
    cleared: '数据已清除',
    clearFailed: '清除失败',
    undoSuccess: '已撤回',
    undoFailed: '撤回失败',
    sessionLoaded: '已加载历史会话',
    sessionDeleted: '已删除会话',
    closeLabel: '关闭标签页',
    closeTitle: '关闭',
    densityCompact: '紧凑',
    densityComfortable: '舒适',
    readingList: '阅读列表',
    archived: '归档',
    historyLabel: '历史会话',
  },
};

let currentLang = DEFAULT_LANG;

export function setLanguage(lang) {
  if (translations[lang]) currentLang = lang;
}

export function getLanguage() {
  return currentLang;
}

export function t(key, ...args) {
  const entry = translations[currentLang]?.[key] ?? translations.en[key];
  if (typeof entry === 'function') return entry(...args);
  return entry ?? key;
}

// Detect browser language on init
export function detectLanguage() {
  const nav = (typeof navigator !== 'undefined' && navigator.language) || '';
  const lang = nav.split('-')[0].toLowerCase();
  return translations[lang] ? lang : DEFAULT_LANG;
}
