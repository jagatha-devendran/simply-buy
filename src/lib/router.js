import { writable } from 'svelte/store';

const currentUrl = () => window.location.pathname + window.location.search;

/** Current URL (pathname + query). Components derive their route from this. */
export const location = writable(currentUrl());

export function navigate(to, { replace = false } = {}) {
  if (to === currentUrl()) return;
  if (replace) {
    window.history.replaceState({}, '', to);
  } else {
    window.history.pushState({}, '', to);
  }
  location.set(currentUrl());
}

export function back() {
  window.history.back();
}

/**
 * Turns plain `<a href="/products">` links into client-side navigation, while
 * leaving modifier-clicks, new tabs and external links to the browser.
 */
export function installLinkHandler() {
  window.addEventListener('popstate', () => location.set(currentUrl()));

  document.addEventListener('click', (event) => {
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    ) {
      return;
    }
    const anchor = event.target instanceof Element ? event.target.closest('a[href]') : null;
    if (!anchor) return;
    const href = anchor.getAttribute('href') ?? '';
    if (!href.startsWith('/') || href.startsWith('//')) return;
    if (anchor.target === '_blank' || anchor.hasAttribute('download')) return;
    event.preventDefault();
    navigate(href);
  });
}

/** Reads a query parameter from a search string, returning '' when absent. */
export function queryValue(search, key) {
  return new URLSearchParams(search.replace(/^\?/, '')).get(key) ?? '';
}
