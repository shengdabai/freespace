// lib/classifier.js — Tab classification engine

import { extractRootDomain } from './utils.js';

const DOMAIN_RULES = {
  'github.com': { category: 'Development', icon: '\u{1F4BB}' },
  'gitlab.com': { category: 'Development', icon: '\u{1F4BB}' },
  'stackoverflow.com': { category: 'Development', icon: '\u{1F4BB}' },
  'npmjs.com': { category: 'Development', icon: '\u{1F4BB}' },
  'vercel.com': { category: 'Development', icon: '\u{1F4BB}' },
  'netlify.com': { category: 'Development', icon: '\u{1F4BB}' },
  'dev.to': { category: 'Development', icon: '\u{1F4BB}' },
  'medium.com': { category: 'Development', icon: '\u{1F4BB}' },
  'docs.google.com': { category: 'Documents', icon: '\u{1F4C4}' },
  'drive.google.com': { category: 'Documents', icon: '\u{1F4C4}' },
  'notion.so': { category: 'Documents', icon: '\u{1F4C4}' },
  'figma.com': { category: 'Design', icon: '\u{1F3A8}' },
  'dribbble.com': { category: 'Design', icon: '\u{1F3A8}' },
  'behance.net': { category: 'Design', icon: '\u{1F3A8}' },
  'slack.com': { category: 'Communication', icon: '\u{1F4AC}' },
  'teams.microsoft.com': { category: 'Communication', icon: '\u{1F4AC}' },
  'zoom.us': { category: 'Communication', icon: '\u{1F4AC}' },
  'gmail.com': { category: 'Communication', icon: '\u{1F4AC}' },
  'outlook.live.com': { category: 'Communication', icon: '\u{1F4AC}' },
  'mail.google.com': { category: 'Communication', icon: '\u{1F4AC}' },
  'twitter.com': { category: 'Social', icon: '\u{1F410}' },
  'x.com': { category: 'Social', icon: '\u{1F410}' },
  'reddit.com': { category: 'Social', icon: '\u{1F410}' },
  'facebook.com': { category: 'Social', icon: '\u{1F410}' },
  'instagram.com': { category: 'Social', icon: '\u{1F410}' },
  'linkedin.com': { category: 'Social', icon: '\u{1F410}' },
  'chat.openai.com': { category: 'AI Tools', icon: '\u{1F916}' },
  'claude.ai': { category: 'AI Tools', icon: '\u{1F916}' },
  'gemini.google.com': { category: 'AI Tools', icon: '\u{1F916}' },
  'copilot.microsoft.com': { category: 'AI Tools', icon: '\u{1F916}' },
  'amazon.com': { category: 'Shopping', icon: '\u{1F6D2}' },
  'taobao.com': { category: 'Shopping', icon: '\u{1F6D2}' },
  'jd.com': { category: 'Shopping', icon: '\u{1F6D2}' },
  'youtube.com': { category: 'Entertainment', icon: '\u{1F3AC}' },
  'bilibili.com': { category: 'Entertainment', icon: '\u{1F3AC}' },
  'netflix.com': { category: 'Entertainment', icon: '\u{1F3AC}' },
  'twitch.tv': { category: 'Entertainment', icon: '\u{1F3AC}' },
};

const CATEGORY_ORDER = [
  'Development',
  'Communication',
  'Social',
  'AI Tools',
  'Documents',
  'Design',
  'Shopping',
  'Entertainment',
];

/**
 * Classify and group tabs by category/domain.
 * "Other" tabs are split into per-domain sub-groups.
 */
export async function classifyTabs(tabs, customRules = {}) {
  const groups = {};
  const otherDomains = {};

  for (const tab of tabs) {
    if (!tab.url || tab.url.trim() === '') continue;

    let url;
    try {
      url = new URL(tab.url);
    } catch {
      continue;
    }

    const domain = extractRootDomain(url.hostname);
    const rawRule = customRules[domain] || DOMAIN_RULES[domain];

    if (rawRule) {
      // customRules stores string categories, DOMAIN_RULES stores {category, icon}
      const isCustomString = typeof rawRule === 'string';
      const category = isCustomString ? rawRule : rawRule.category;
      const icon = isCustomString ? '\u{1F310}' : rawRule.icon;

      if (!groups[category]) {
        groups[category] = {
          category,
          icon,
          tabs: [],
        };
      }
      groups[category].tabs.push(tab);
    } else {
      // Unknown domain: group by domain
      if (!otherDomains[domain]) {
        otherDomains[domain] = {
          category: domain,
          icon: domain.charAt(0).toUpperCase(),
          tabs: [],
        };
      }
      otherDomains[domain].tabs.push(tab);
    }
  }

  // Sort known categories by CATEGORY_ORDER
  const sortedKeys = Object.keys(groups).sort((a, b) => {
    const ai = CATEGORY_ORDER.indexOf(a);
    const bi = CATEGORY_ORDER.indexOf(b);
    return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
  });

  // Append domain sub-groups (sorted by tab count descending)
  const sortedDomains = Object.values(otherDomains).sort((a, b) => b.tabs.length - a.tabs.length);

  return [...sortedKeys.map((key) => groups[key]), ...sortedDomains];
}

/**
 * Save a custom classification rule.
 */
export async function saveCustomRule(domain, category) {
  return new Promise((resolve, reject) => {
    chrome.storage.local.get({ customRules: {} }, (result) => {
      const rules = result.customRules || {};
      rules[domain] = category;
      chrome.storage.local.set({ customRules: rules }, () => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve();
        }
      });
    });
  });
}

/**
 * Load custom classification rules.
 */
export async function loadCustomRules() {
  return new Promise((resolve, reject) => {
    chrome.storage.local.get({ customRules: {} }, (result) => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
      } else {
        resolve(result.customRules || {});
      }
    });
  });
}
