// lib/utils.js — Shared utilities for FreeSpace

/**
 * Extract root domain from a hostname.
 * Strips 'www.' prefix and returns the base domain.
 */
export function extractRootDomain(hostname) {
  if (!hostname) return '';
  let domain = hostname.toLowerCase();
  if (domain.startsWith('www.')) {
    domain = domain.slice(4);
  }
  return domain;
}

/**
 * Truncate a string to maxLen characters (Unicode-safe).
 */
export function truncate(str, maxLen) {
  if (!str) return '';
  const chars = Array.from(str);
  if (chars.length <= maxLen) return str;
  return chars.slice(0, maxLen - 1).join('') + '\u2026';
}

/**
 * Check if a URL is an internal/Chrome URL.
 */
export function isInternalUrl(url) {
  if (!url) return true;
  return (
    url.startsWith('chrome://') ||
    url.startsWith('about:') ||
    url.startsWith('extension://') ||
    url.startsWith('javascript:') ||
    url.startsWith('chrome-search://') ||
    url.startsWith('chrome-extension://')
  );
}

/**
 * Check if a URL points to FreeSpace's own dashboard.
 */
export function isOwnDashboardUrl(url) {
  if (!url) return false;
  try {
    const extUrl = chrome.runtime.getURL('dashboard/');
    return url.startsWith(extUrl);
  } catch {
    return false;
  }
}
