// tests/classifier.test.js — Tests for classifier module

import { describe, it, expect } from 'vitest';

// Inline the classify logic for testing (no chrome dependency in tests)
function extractRootDomain(hostname) {
  if (!hostname) return '';
  let domain = hostname.toLowerCase();
  if (domain.startsWith('www.')) {
    domain = domain.slice(4);
  }
  return domain;
}

const DOMAIN_RULES = {
  'github.com': { category: 'Development', icon: '\u{1F4BB}' },
  'gmail.com': { category: 'Communication', icon: '\u{1F4AC}' },
  'twitter.com': { category: 'Social', icon: '\u{1F410}' },
  'chat.openai.com': { category: 'AI Tools', icon: '\u{1F916}' },
  'amazon.com': { category: 'Shopping', icon: '\u{1F6D2}' },
  'youtube.com': { category: 'Entertainment', icon: '\u{1F3AC}' },
  'notion.so': { category: 'Documents', icon: '\u{1F4C4}' },
  'figma.com': { category: 'Design', icon: '\u{1F3A8}' },
};

const CATEGORY_ORDER = [
  'Development', 'Communication', 'Social', 'AI Tools',
  'Documents', 'Design', 'Shopping', 'Entertainment',
];

function classifyTabsSimple(tabs, customRules = {}) {
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
      const isCustomString = typeof rawRule === 'string';
      const category = isCustomString ? rawRule : rawRule.category;
      const icon = isCustomString ? '\u{1F310}' : rawRule.icon;
      if (!groups[category]) {
        groups[category] = { category, icon, tabs: [] };
      }
      groups[category].tabs.push(tab);
    } else {
      // Unknown domain: group by domain (per-domain sub-groups)
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

  const sortedKeys = Object.keys(groups).sort((a, b) => {
    const ai = CATEGORY_ORDER.indexOf(a);
    const bi = CATEGORY_ORDER.indexOf(b);
    return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
  });

  const sortedDomains = Object.values(otherDomains).sort((a, b) => b.tabs.length - a.tabs.length);

  return [...sortedKeys.map((key) => groups[key]), ...sortedDomains];
}

describe('classifyTabs', () => {
  it('should classify tabs by known domain', () => {
    const tabs = [
      { id: 1, url: 'https://github.com/user/repo', title: 'GitHub Repo' },
      { id: 2, url: 'https://gmail.com/inbox', title: 'Gmail' },
      { id: 3, url: 'https://github.com/user/other', title: 'Another Repo' },
    ];

    const groups = classifyTabsSimple(tabs);
    expect(groups.length).toBe(2);

    const dev = groups.find((g) => g.category === 'Development');
    const comm = groups.find((g) => g.category === 'Communication');

    expect(dev).toBeDefined();
    expect(dev.tabs.length).toBe(2);
    expect(comm).toBeDefined();
    expect(comm.tabs.length).toBe(1);
  });

  it('should split unknown domains into per-domain sub-groups', () => {
    const tabs = [
      { id: 1, url: 'https://example.com/page1', title: 'Example 1' },
      { id: 2, url: 'https://example.com/page2', title: 'Example 2' },
      { id: 3, url: 'https://unknown.org/page', title: 'Unknown' },
    ];

    const groups = classifyTabsSimple(tabs);
    // Two domain groups: example.com and unknown.org (NOT one "Other" group)
    expect(groups.length).toBe(2);
    expect(groups[0].category).toBe('example.com');
    expect(groups[0].tabs.length).toBe(2);
    expect(groups[1].category).toBe('unknown.org');
    expect(groups[1].tabs.length).toBe(1);
  });

  it('should skip tabs with empty or invalid URLs', () => {
    const tabs = [
      { id: 1, url: '', title: 'No URL' },
      { id: 2, url: 'not-a-url', title: 'Bad URL' },
      { id: 3, url: 'https://github.com/valid', title: 'Valid' },
    ];

    const groups = classifyTabsSimple(tabs);
    const allTabs = groups.flatMap((g) => g.tabs);
    expect(allTabs.length).toBe(1);
    expect(allTabs[0].id).toBe(3);
  });

  it('should apply custom rules over default rules', () => {
    const tabs = [
      { id: 1, url: 'https://github.com/user/repo', title: 'GitHub' },
    ];

    const customRules = { 'github.com': 'Custom Category' };
    const groups = classifyTabsSimple(tabs, customRules);

    expect(groups.length).toBe(1);
    expect(groups[0].category).toBe('Custom Category');
  });

  it('should order known categories before domain sub-groups', () => {
    const tabs = [
      { id: 1, url: 'https://random.net/foo', title: 'Random' },
      { id: 2, url: 'https://gmail.com/inbox', title: 'Gmail' },
      { id: 3, url: 'https://github.com/user/repo', title: 'GitHub' },
    ];

    const groups = classifyTabsSimple(tabs);
    // Known categories come first, then domain sub-groups
    // Development (index 0) before Communication (index 1)
    expect(groups[0].category).toBe('Development'); // github
    expect(groups[1].category).toBe('Communication'); // gmail
    expect(groups[2].category).toBe('random.net'); // domain sub-group
  });
});
