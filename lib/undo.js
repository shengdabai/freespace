// lib/undo.js — Undo last collection within 5 seconds

let lastCollection = null;
let undoTimer = null;

/**
 * Store the last collected tabs for potential undo.
 */
export function setLastCollection(tabs) {
  lastCollection = {
    tabs: tabs.map((tab) => ({
      url: tab.url,
      title: tab.title,
      pinned: tab.pinned || false,
    })),
    timestamp: Date.now(),
  };

  // Auto-clear after 5 seconds
  if (undoTimer) {
    clearTimeout(undoTimer);
  }
  undoTimer = setTimeout(() => {
    clearUndo();
  }, 5000);
}

/**
 * Check if undo is still available (within 5 seconds).
 */
export function canUndo() {
  if (!lastCollection) return false;
  const elapsed = Date.now() - lastCollection.timestamp;
  return elapsed < 5000;
}

/**
 * Restore the last collection by reopening all tabs.
 */
export async function restoreLastSession() {
  if (!lastCollection) return;

  const tabs = lastCollection.tabs;
  for (const tab of tabs) {
    try {
      await new Promise((resolve, reject) => {
        chrome.tabs.create(
          {
            url: tab.url,
            active: false,
            pinned: tab.pinned,
          },
          (createdTab) => {
            if (chrome.runtime.lastError) {
              reject(chrome.runtime.lastError);
            } else {
              resolve(createdTab);
            }
          }
        );
      });
    } catch (err) {
      console.error('Failed to restore tab:', tab.url, err);
    }
  }

  clearUndo();
}

/**
 * Clear undo state.
 */
export function clearUndo() {
  lastCollection = null;
  if (undoTimer) {
    clearTimeout(undoTimer);
    undoTimer = null;
  }
}

/**
 * Get seconds remaining for undo window.
 */
export function getTimeRemaining() {
  if (!lastCollection) return 0;
  const elapsed = Date.now() - lastCollection.timestamp;
  const remaining = Math.max(0, 5000 - elapsed);
  return Math.ceil(remaining / 1000);
}
