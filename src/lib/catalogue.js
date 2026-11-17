import { writable, get } from 'svelte/store';
import { getCategoryProducts } from './api.js';
import { DEMO_PRODUCTS } from './demoData.js';

export const CATALOG_SLUG = 's';

export const catalogue = writable({
  products: DEMO_PRODUCTS,
  loading: false,
  loaded: false,
  error: null,
  isDemo: false,
});

let inFlight = null;

export function loadCatalogue({ force = false } = {}) {
  const current = get(catalogue);
  if (!force && current.loaded) return Promise.resolve(current.products);
  if (inFlight) return inFlight;

  catalogue.set({ ...current, loading: true, error: null });

  inFlight = getCategoryProducts(CATALOG_SLUG, { rows: 300 })
    .then(({ products }) => {
      const finalProducts = products && products.length > 0 ? products : DEMO_PRODUCTS;
      catalogue.set({
        products: finalProducts,
        loading: false,
        loaded: true,
        error: null,
        isDemo: !products || products.length === 0,
      });
      return finalProducts;
    })
    .catch((error) => {
      // Graceful fallback to rich demo catalog if backend is not running
      catalogue.set({
        products: DEMO_PRODUCTS,
        loading: false,
        loaded: true,
        error: null,
        isDemo: true,
      });
      return DEMO_PRODUCTS;
    })
    .finally(() => {
      inFlight = null;
    });

  return inFlight;
}

export function slugify(name) {
  return String(name || '')
    .toLowerCase()
    .replace(/&/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** [{ name: 'Casual Shoes', slug: 'casual-shoes', count: 6 }, ...] biggest first. */
export function categoriesOf(products) {
  const counts = new Map();
  for (const product of products || []) {
    if (!product.category) continue;
    counts.set(product.category, (counts.get(product.category) ?? 0) + 1);
  }
  return [...counts]
    .map(([name, count]) => ({ name, slug: slugify(name), count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}

export function getProductById(id) {
  const all = get(catalogue).products;
  return all.find((p) => String(p.productId) === String(id)) || null;
}
