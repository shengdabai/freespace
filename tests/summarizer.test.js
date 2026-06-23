// tests/summarizer.test.js — Tests for summarizer module

import { describe, it, expect } from 'vitest';
import { extractKeyword } from '../lib/summarizer.js';

describe('extractKeyword', () => {
  it('should return "Untitled" for null/empty titles', () => {
    expect(extractKeyword(null)).toBe('Untitled');
    expect(extractKeyword('')).toBe('Untitled');
    expect(extractKeyword('   ')).toBe('Untitled');
  });

  it('should remove known suffixes', () => {
    expect(extractKeyword('React Tutorial - GitHub')).toBe('React Tutorial');
    expect(extractKeyword('Inbox | Gmail')).toBe('Inbox');
    expect(extractKeyword('How to fix bugs | Stack Overflow')).toBe('How to fix bugs');
  });

  it('should remove notification number prefixes', () => {
    expect(extractKeyword('(3) Gmail')).toBe('Gmail');
    expect(extractKeyword('(12) Slack')).toBe('Slack');
    expect(extractKeyword('(1) Inbox | Gmail')).toBe('Inbox');
  });

  it('should truncate long titles to 50 characters', () => {
    const longTitle = 'This is a very long title that should definitely be truncated because it goes on and on';
    const result = extractKeyword(longTitle);
    expect(result.length).toBe(50);
    expect(result.endsWith('…')).toBe(true);
  });

  it('should preserve short titles unchanged', () => {
    expect(extractKeyword('Hello')).toBe('Hello');
    expect(extractKeyword('feat: add login page')).toBe('feat: add login page');
  });
});
