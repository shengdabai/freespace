// lib/summarizer.js — Tab title summarization

import { truncate } from './utils.js';

const KNOWN_SUFFIXES = [
  ' - GitHub',
  ' | GitHub',
  ' - Stack Overflow',
  ' | Stack Overflow',
  ' - Wikipedia',
  ' | Wikipedia',
  ' - YouTube',
  ' | YouTube',
  ' - Google Docs',
  ' | Google Docs',
  ' - Slack',
  ' | Slack',
  ' - Gmail',
  ' | Gmail',
  ' - Reddit',
  ' | Reddit',
  ' - Twitter',
  ' | Twitter',
  ' - X',
  ' | X',
  ' - Medium',
  ' | Medium',
  ' - DEV Community',
  ' | DEV Community',
  ' - Chrome Web Store',
  ' | Chrome Web Store',
];

const NOTIFICATION_PATTERN = /^\(\d+\)\s*/;

/**
 * Extract a clean keyword/title from a tab title.
 */
export function extractKeyword(title) {
  if (!title || title.trim() === '') return 'Untitled';

  let result = title.trim();

  // Remove known suffixes
  for (const suffix of KNOWN_SUFFIXES) {
    if (result.endsWith(suffix)) {
      result = result.slice(0, result.length - suffix.length).trim();
      break;
    }
  }

  // Remove notification numbers like "(3) Gmail"
  result = result.replace(NOTIFICATION_PATTERN, '').trim();

  // Truncate to 50 chars
  result = truncate(result, 50);

  return result || 'Untitled';
}
