// Filtering, sorting and facet counting for the listing page.
// All of it runs in the browser because the backend exposes no sort or facet
// endpoints, and the whole catalogue is only ~141 products.

export const SORTS = [
  { value: 'recommended', label: 'Relevance' },
  { value: 'price_asc', label: 'Price: low to high' },
  { value: 'price_desc', label: 'Price: high to low' },
  { value: 'discount', label: 'Discount' },
  { value: 'rating', label: 'Rating' },
];

export const PRICE_BUCKETS = [
  { label: 'Under ₹500', min: 0, max: 499 },
  { label: '₹500 – ₹999', min: 500, max: 999 },
  { label: '₹1000 – ₹1999', min: 1000, max: 1999 },
  { label: '₹2000+', min: 2000, max: null },
];

export const FACET_GROUPS = [
  { key: 'brand', label: 'Brand', valueOf: (product) => product.brand },
  { key: 'gender', label: 'Gender', valueOf: (product) => product.gender },
  { key: 'colour', label: 'Colour', valueOf: (product) => product.primaryColour },
];

const toNumber = (value) =>
  value === '' || value === null || value === undefined ? null : Number(value);

export function discountPercent(product) {
  const mrp = Number(product.mrp);
  const price = Number(product.price);
  if (!mrp || mrp <= 0) return 0;
  return Math.round(((mrp - price) * 100) / mrp);
}

export function matchesPrice(product, filters) {
  const min = toNumber(filters.minPrice);
  const max = toNumber(filters.maxPrice);
  const price = Number(product.price);
  if (min !== null && Number.isFinite(min) && price < min) return false;
  if (max !== null && Number.isFinite(max) && price > max) return false;
  return true;
}

/** `ignore` leaves one facet group out, so its own counts don't collapse to 1. */
export function matchesFilters(product, filters, ignore = null) {
  if (ignore !== 'brand' && filters.brand?.length) {
    const brand = String(product.brand ?? '').toLowerCase();
    if (!filters.brand.some((value) => value.toLowerCase() === brand)) return false;
  }
  if (ignore !== 'gender' && filters.gender?.length) {
    const gender = String(product.gender ?? '').toLowerCase();
    if (!filters.gender.some((value) => value.toLowerCase() === gender)) return false;
  }
  if (ignore !== 'colour' && filters.colour?.length) {
    const colour = String(product.primaryColour ?? '').toLowerCase();
    if (!filters.colour.some((value) => value.toLowerCase() === colour)) return false;
  }
  if (ignore !== 'price' && !matchesPrice(product, filters)) return false;
  return true;
}

export function computeFacets(products, filters) {
  const facets = {};

  for (const group of FACET_GROUPS) {
    const rows = products.filter((product) => matchesFilters(product, filters, group.key));
    const counts = new Map();
    for (const product of rows) {
      const value = group.valueOf(product);
      if (!value) continue;
      counts.set(value, (counts.get(value) ?? 0) + 1);
    }
    facets[group.key] = [...counts]
      .map(([value, count]) => ({ value, count }))
      .sort((a, b) => b.count - a.count || a.value.localeCompare(b.value))
      .slice(0, 30);
  }

  const priceRows = products.filter((product) => matchesFilters(product, filters, 'price'));
  facets.price = PRICE_BUCKETS.map((bucket) => ({
    ...bucket,
    count: priceRows.filter((product) => {
      const price = Number(product.price);
      return price >= bucket.min && (bucket.max === null || price <= bucket.max);
    }).length,
  })).filter((bucket) => bucket.count > 0);

  return facets;
}

export function sortProducts(products, sort) {
  const list = [...products];
  const byRating = (a, b) =>
    Number(b.rating ?? 0) - Number(a.rating ?? 0) ||
    Number(b.ratingCount ?? 0) - Number(a.ratingCount ?? 0);

  switch (sort) {
    case 'price_asc':
      return list.sort((a, b) => Number(a.price) - Number(b.price));
    case 'price_desc':
      return list.sort((a, b) => Number(b.price) - Number(a.price));
    case 'discount':
      return list.sort((a, b) => discountPercent(b) - discountPercent(a));
    case 'rating':
    default:
      return list.sort(byRating);
  }
}
