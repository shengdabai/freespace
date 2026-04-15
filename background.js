// background.js — MV3 Service Worker for FreeSpace (ES module)

import { isInternalUrl, isOwnDashboardUrl, extractRootDomain } from './lib/utils.js';
import { classifyTabs, loadCustomRules } from './lib/classifier.js';
import { extractKeyword } from './lib/summarizer.js';
import { saveSession } from './lib/storage.js';
import { setLastCollection } from './lib/undo.js';

let isCollecting = false;

/**
 * Known form-heavy sites that commonly have unsaved data.
 * Used as heuristic when scripting permission injection fails.
 */
const FORM_HEAVY_DOMAINS = new Set([
  'docs.google.com',
  'sheets.google.com',
  'slides.google.com',
  'forms.google.com',
  'mail.google.com',
  'notion.so',
  'figma.com',
  'trello.com',
  'airtable.com',
  'outlook.live.com',
  'calendar.google.com',
  'keep.google.com',
]);

/**
 * Check if a tab has beforeunload handler (unsaved form data).
 * Uses chrome.scripting.executeScript to inject a check.
 * Falls back to domain heuristic for known form-heavy sites.
 */
async function checkBeforeUnload(tab) {
  if (!tab.id || tab.id < 0) return false;

  try {
    const url = new URL(tab.url);
    if (FORM_HEAVY_DOMAINS.has(url.hostname)) {
      return true;
    }
  } catch {
    return false;
  }

  try {
    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => {
        const hasHandler = typeof window.onbeforeunload === 'function';
        const forms = document.querySelectorAll('form, textarea, input:not([type="hidden"]):not([type="submit"]):not([type="button"]):not([type="search"]):not([type="checkbox"]):not([type="radio"]):not([readonly]):not([disabled]), [contenteditable="true"]');
        return { hasHandler, hasUnsavedForms: forms.length > 0 };
      },
    });

    if (results && results.length > 0) {
      const { hasHandler, hasUnsavedForms } = results[0].result;
      return hasHandler || hasUnsavedForms;
    }
  } catch {}

  return false;
}

async function collectAllTabs() {
  if (isCollecting) return;
  isCollecting = true;

  try {
    // Keep service worker alive with alarm
    chrome.alarms.create('keepalive', { when: Date.now() + 25000 });

    // Query all tabs across ALL windows
    const allTabs = await chrome.tabs.query({});

    // Filter out invalid tabs
    const validTabs = allTabs.filter((tab) => {
      if (!tab.url) return false;
      if (isInternalUrl(tab.url)) return false;
      if (isOwnDashboardUrl(tab.url)) return false;
      return true;
    });

    if (validTabs.length === 0) {
      chrome.alarms.clear('keepalive');
      chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icons/icon48.png',
        title: 'FreeSpace',
        message: '没有可以整理的标签页。',
      });
      isCollecting = false;
      return;
    }

    // Group tabs by windowId for multi-window support
    const windowsMap = {};
    for (const tab of validTabs) {
      const wid = tab.windowId;
      if (!windowsMap[wid]) windowsMap[wid] = [];
      windowsMap[wid].push(tab);
    }

    // Collect all normal tabs (non-pinned) for audio/form checks
    const allNormalTabs = validTabs.filter((t) => !t.pinned);
    const allPinnedTabs = validTabs.filter((t) => t.pinned);

    // Check for audio-playing tabs
    const audioTabs = allNormalTabs.filter((t) => t.audible);
    if (audioTabs.length > 0) {
      const tabNames = audioTabs.map((t) => t.title || t.url).slice(0, 3);
      chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icons/icon48.png',
        title: 'FreeSpace',
        message: `即将关闭 ${audioTabs.length} 个正在播放音频的标签页：${tabNames.join(', ')}`,
        requireInteraction: true,
      });
      await new Promise((resolve) => setTimeout(resolve, 1500));
    }

    // Check for tabs with unsaved forms (beforeunload detection)
    const formTabs = [];
    for (const tab of allNormalTabs) {
      try {
        const hasUnsaved = await checkBeforeUnload(tab);
        if (hasUnsaved) {
          formTabs.push({ tab, hasUnsaved: true });
        }
      } catch {}
    }

    if (formTabs.length > 0) {
      const formTabNames = formTabs.map((ft) => ft.tab.title || ft.tab.url).slice(0, 3);
      const confirmed = await new Promise((resolve) => {
        chrome.notifications.create({
          type: 'basic',
          iconUrl: 'icons/icon48.png',
          title: 'FreeSpace',
          message: `${formTabs.length} 个标签页可能有未保存的数据：${formTabNames.join(', ')}。是否继续关闭？`,
          buttons: [{ title: '继续关闭' }, { title: '取消' }],
          requireInteraction: true,
        });

        chrome.notifications.onButtonClicked.addListener(function handler(notificationId, buttonIndex) {
          chrome.notifications.onButtonClicked.removeListener(handler);
          resolve(buttonIndex === 0);
        });

        setTimeout(() => {
          chrome.notifications.clear('freespace-confirm');
          resolve(false);
        }, 30000);
      });

      if (!confirmed) {
        chrome.alarms.clear('keepalive');
        const groups = await classifyTabs(validTabs, await loadCustomRules().catch(() => ({})));
        const windowsData = Object.entries(windowsMap).map(([wid, tabs]) => {
          const wTabs = tabs.map((t) => ({
            ...t,
            _keyword: extractKeyword(t.title || t.url),
            _domain: (() => { try { return extractRootDomain(new URL(t.url).hostname); } catch { return ''; } })(),
          }));
          const wGroups = [];
          const seen = new Set();
          for (const t of wTabs) {
            const g = groups.find((g) => g.tabs.some((gt) => gt.id === t.id));
            if (g && !seen.has(g.category)) {
              seen.add(g.category);
              wGroups.push({ ...g, tabs: g.tabs.filter((gt) => tabs.some((wt) => wt.id === gt.id)) });
            }
          }
          return { windowId: Number(wid), tabCount: tabs.length, groups: wGroups };
        });
        const session = {
          id: 'session_' + Date.now(),
          timestamp: Date.now(),
          schemaVersion: 2,
          tabCount: validTabs.length,
          pinnedCount: allPinnedTabs.length,
          windowCount: Object.keys(windowsMap).length,
          windows: windowsData,
          groups: windowsData.flatMap((w) => w.groups),
        };
        await saveSession(session).catch(console.error);
        isCollecting = false;
        return;
      }
    }

    // Load custom rules
    let customRules = {};
    try {
      customRules = await loadCustomRules();
    } catch (err) {
      console.error('Failed to load custom rules:', err);
    }

    // Classify and summarize all tabs
    const groups = await classifyTabs(validTabs, customRules);

    for (const group of groups) {
      for (const tab of group.tabs) {
        tab._keyword = extractKeyword(tab.title || tab.url);
        try {
          tab._domain = extractRootDomain(new URL(tab.url).hostname);
        } catch {
          tab._domain = '';
        }
      }
    }

    // Build per-window data for multi-window display
    const windowsData = Object.entries(windowsMap).map(([wid, tabs]) => {
      // For this window, find which groups contain its tabs
      const tabIds = new Set(tabs.map((t) => t.id));
      const wGroups = groups
        .map((g) => ({
          ...g,
          tabs: g.tabs.filter((t) => tabIds.has(t.id)),
        }))
        .filter((g) => g.tabs.length > 0);

      return {
        windowId: Number(wid),
        tabCount: tabs.length,
        groups: wGroups,
      };
    });

    // Build session object with multi-window data
    const session = {
      id: 'session_' + Date.now(),
      timestamp: Date.now(),
      schemaVersion: 2,
      tabCount: validTabs.length,
      pinnedCount: allPinnedTabs.length,
      windowCount: Object.keys(windowsMap).length,
      windows: windowsData,
      groups, // flat list for backward compat
    };

    // Save session to IndexedDB
    try {
      await saveSession(session);
    } catch (err) {
      console.error('Failed to save session:', err);
      chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icons/icon48.png',
        title: 'FreeSpace',
        message: '保存失败：' + (err.message || '未知错误'),
      });
      isCollecting = false;
      return;
    }

    // Set undo state (5 second window)
    setLastCollection(validTabs);

    // Remove non-pinned tabs across ALL windows
    for (const tab of allNormalTabs) {
      try {
        await chrome.tabs.remove(tab.id);
      } catch (err) {
        console.error('Failed to remove tab:', tab.id, err);
      }
    }

    // Open dashboard
    chrome.tabs.create({
      url: chrome.runtime.getURL('dashboard/index.html'),
    });

    // Clear keepalive alarm
    chrome.alarms.clear('keepalive');
  } catch (err) {
    console.error('collectAllTabs error:', err);
    chrome.alarms.clear('keepalive');
  } finally {
    isCollecting = false;
  }
}

// Action click handler
chrome.action.onClicked.addListener(() => {
  collectAllTabs();
});

// Command handler
chrome.commands.onCommand.addListener((command) => {
  if (command === 'collect-tabs') {
    collectAllTabs();
  }
});

// Alarm handler (keepalive)
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'keepalive') {
    // No-op, just keeps the worker alive
  }
});
