import { writable, get } from 'svelte/store';

const KEY = 'simplybuy.wishlist';

function loadStored() {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/** Array of wishlisted products */
export const wishlist = writable(loadStored());

function save(items) {
  try {
    localStorage.setItem(KEY, JSON.stringify(items));
  } catch {
    /* ignore storage quota or access issues */
  }
}

export function isWishlisted(productId) {
  const items = get(wishlist);
  return items.some((item) => String(item.productId) === String(productId));
}

export function toggleWishlist(product) {
  const items = get(wishlist);
  const exists = items.some((item) => String(item.productId) === String(product.productId));
  let next;
  if (exists) {
    next = items.filter((item) => String(item.productId) !== String(product.productId));
  } else {
    next = [product, ...items];
  }
  wishlist.set(next);
  save(next);
  return !exists;
}

export function removeFromWishlist(productId) {
  const items = get(wishlist);
  const next = items.filter((item) => String(item.productId) !== String(productId));
  wishlist.set(next);
  save(next);
}
