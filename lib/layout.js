// lib/layout.js — Virtual scroll and density management

import { getSetting, saveSetting } from './storage.js';

/**
 * Initialize virtual scrolling using IntersectionObserver.
 * Only renders items as they come into view.
 */
export function initVirtualScroll(container, renderItem, batchSize = 50) {
  const items = [];
  let renderedCount = 0;
  let allItems = [];

  function setItems(newItems) {
    allItems = newItems;
    renderedCount = 0;
    container.textContent = '';

    // Create placeholder elements for all items
    allItems.forEach((item, index) => {
      const placeholder = document.createElement('div');
      placeholder.setAttribute('role', 'listitem');
      placeholder.setAttribute('data-index', String(index));
      placeholder.style.minHeight = '48px';
      placeholder.style.display = 'flex';
      placeholder.style.alignItems = 'center';
      placeholder.style.justifyContent = 'center';
      placeholder.textContent = '\u00A0';
      container.appendChild(placeholder);
      items.push(placeholder);
    });

    // Render first batch
    renderBatch();

    // Set up observer
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const index = Number(entry.target.getAttribute('data-index'));
            if (index >= renderedCount) {
              renderBatch();
            }
          }
        });
      },
      { root: container, rootMargin: '200px' }
    );

    items.forEach((el) => observer.observe(el));
  }

  function renderBatch() {
    const end = Math.min(renderedCount + batchSize, allItems.length);
    for (let i = renderedCount; i < end; i++) {
      const placeholder = items[i];
      const rendered = renderItem(allItems[i], i);
      if (rendered) {
        placeholder.textContent = '';
        placeholder.appendChild(rendered);
      }
    }
    renderedCount = end;
  }

  function clear() {
    container.textContent = '';
    items.length = 0;
    allItems = [];
    renderedCount = 0;
  }

  return { setItems, clear };
}

/**
 * Set density mode: 'compact' or 'comfortable'.
 */
export async function setDensity(mode) {
  if (mode !== 'compact' && mode !== 'comfortable') return;
  document.documentElement.setAttribute('data-density', mode);
  await saveSetting('density', mode);
}

/**
 * Get current density setting.
 */
export async function getDensity() {
  try {
    const density = await getSetting('density');
    return density || 'comfortable';
  } catch {
    return 'comfortable';
  }
}
