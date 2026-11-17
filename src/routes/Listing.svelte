<script>
  import { onMount } from 'svelte';
  import { catalogue, categoriesOf, loadCatalogue, slugify } from '../lib/catalogue.js';
  import { SORTS, computeFacets, matchesFilters, sortProducts } from '../lib/filters.js';
  import { location, navigate } from '../lib/router.js';
  import { count, inr } from '../lib/format.js';
  import ProductCard from '../components/ProductCard.svelte';
  import FacetPanel from '../components/FacetPanel.svelte';
  import Pagination from '../components/Pagination.svelte';

  const PAGE_SIZE = 20;

  function parse(search) {
    const params = new URLSearchParams(search.replace(/^\?/, ''));
    const list = (key) =>
      (params.get(key) ?? '')
        .split(',')
        .map((entry) => entry.trim())
        .filter(Boolean);
    const sort = params.get('sort') ?? 'recommended';

    return {
      q: params.get('q') ?? '',
      category: params.get('category') ?? '',
      brand: list('brand'),
      colour: list('colour'),
      gender: list('gender'),
      minPrice: params.get('minPrice') ?? '',
      maxPrice: params.get('maxPrice') ?? '',
      sort: SORTS.some((option) => option.value === sort) ? sort : 'recommended',
      page: Math.max(1, Number(params.get('page')) || 1),
    };
  }

  function toSearch(state) {
    const params = new URLSearchParams();
    if (state.q) params.set('q', state.q);
    if (state.category) params.set('category', state.category);
    for (const key of ['brand', 'colour', 'gender']) {
      if (state[key]?.length) params.set(key, state[key].join(','));
    }
    if (state.minPrice !== '' && state.minPrice !== null) params.set('minPrice', state.minPrice);
    if (state.maxPrice !== '' && state.maxPrice !== null) params.set('maxPrice', state.maxPrice);
    if (state.sort !== 'recommended') params.set('sort', state.sort);
    if (state.page > 1) params.set('page', String(state.page));

    const query = params.toString();
    return query ? `?${query}` : '';
  }

  let filters = $state(parse(window.location.search));
  let priceError = $state(null);
  let lastUrl = '';

  onMount(() => {
    loadCatalogue().catch(() => {});
  });

  // URL -> state (back/forward, or a link from the header search).
  $effect(() => {
    const url = $location;
    if (url === lastUrl) return;
    lastUrl = url;
    if (url.split('?')[0] !== '/products') return;
    const parsed = parse(url.split('?')[1] ?? '');
    if (toSearch(parsed) !== toSearch(filters)) filters = parsed;
  });

  // state -> URL
  $effect(() => {
    navigate(`/products${toSearch(filters)}`);
  });

  const categories = $derived(categoriesOf($catalogue.products));

  const activeCategory = $derived(
    categories.find((category) => category.slug === filters.category) ?? null,
  );

  const inCategory = $derived.by(() => {
    if (!filters.category) return $catalogue.products;
    return $catalogue.products.filter(
      (product) => slugify(product.category) === filters.category,
    );
  });

  const searched = $derived.by(() => {
    const q = filters.q.trim().toLowerCase();
    if (!q) return inCategory;
    return inCategory.filter((product) =>
      `${product.title} ${product.brand} ${product.category}`.toLowerCase().includes(q),
    );
  });

  const matched = $derived(searched.filter((product) => matchesFilters(product, filters)));
  const sorted = $derived(sortProducts(matched, filters.sort));
  const total = $derived(sorted.length);
  const pageItems = $derived(sorted.slice((filters.page - 1) * PAGE_SIZE, filters.page * PAGE_SIZE));
  const facets = $derived(computeFacets(searched, filters));

  const heading = $derived.by(() => {
    if (filters.q) return `“${filters.q}”`;
    if (activeCategory) return activeCategory.name;
    if (filters.category) return 'Products';
    return 'All products';
  });

  const activeChips = $derived.by(() => {
    const chips = [];

    if (filters.q) {
      chips.push({
        key: 'q',
        label: `Search: ${filters.q}`,
        remove: () => setFilter({ q: '' }),
      });
    }

    for (const key of ['brand', 'colour', 'gender']) {
      for (const value of filters[key]) {
        chips.push({
          key: `${key}:${value}`,
          label: value,
          remove: () => toggle(key, value),
        });
      }
    }

    if (filters.minPrice !== '' || filters.maxPrice !== '') {
      chips.push({
        key: 'price',
        label: priceLabel(filters),
        remove: () => setFilter({ minPrice: '', maxPrice: '' }),
      });
    }

    return chips;
  });

  function priceLabel(state) {
    const min = state.minPrice;
    const max = state.maxPrice;
    if (min !== '' && max !== '') return `${inr(Number(min))} – ${inr(Number(max))}`;
    if (max !== '') return `Under ${inr(Number(max))}`;
    return `Over ${inr(Number(min))}`;
  }

  function setFilter(patch) {
    filters = { ...filters, ...patch, page: 1 };
  }

  function setPage(page) {
    filters = { ...filters, page };
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function toggle(key, value) {
    const current = filters[key] ?? [];
    const already = current.some((entry) => entry.toLowerCase() === value.toLowerCase());
    const next = already
      ? current.filter((entry) => entry.toLowerCase() !== value.toLowerCase())
      : [...current, value];
    setFilter({ [key]: next });
  }

  function applyPrice(minRaw, maxRaw) {
    const min = String(minRaw ?? '').trim();
    const max = String(maxRaw ?? '').trim();
    const minNumber = min === '' ? null : Number(min);
    const maxNumber = max === '' ? null : Number(max);

    const badNumber =
      (min !== '' && (!Number.isFinite(minNumber) || minNumber < 0)) ||
      (max !== '' && (!Number.isFinite(maxNumber) || maxNumber < 0));
    if (badNumber) {
      priceError = 'Enter a price in rupees, e.g. 500';
      return;
    }
    if (minNumber !== null && maxNumber !== null && minNumber > maxNumber) {
      priceError = 'Minimum price cannot be more than the maximum';
      return;
    }

    priceError = null;
    setFilter({ minPrice: min, maxPrice: max });
  }

  function resetFilters() {
    priceError = null;
    filters = {
      ...filters,
      brand: [],
      colour: [],
      gender: [],
      minPrice: '',
      maxPrice: '',
      sort: 'recommended',
      page: 1,
    };
  }
</script>

<div class="shell listing-page">
  <nav class="category-strip" aria-label="Categories">
    <button
      class="chip"
      class:on={!filters.category}
      type="button"
      onclick={() => setFilter({ category: '' })}
    >
      All
    </button>
    {#each categories as category (category.slug)}
      <button
        class="chip"
        class:on={filters.category === category.slug}
        type="button"
        onclick={() => setFilter({ category: category.slug })}
      >
        {category.name}
      </button>
    {/each}
  </nav>

  <div class="listing-head">
    <h1>{heading}</h1>
    <p>
      {#if $catalogue.loading}
        Loading products…
      {:else}
        {count(total)} {total === 1 ? 'product' : 'products'}{#if activeChips.length}
          matching {activeChips.length} filter{activeChips.length === 1 ? '' : 's'}{/if}
      {/if}
    </p>
  </div>

  <div class="listing-body">
    <FacetPanel
      {facets}
      {filters}
      ontoggle={toggle}
      onprice={applyPrice}
      onclear={resetFilters}
      {priceError}
    />

    <div>
      <div class="toolbar">
        <p class="muted small">
          {#if activeCategory}{activeCategory.name}{:else}All products{/if}
        </p>

        <label class="sort">
          Sort
          <select
            value={filters.sort}
            onchange={(event) => setFilter({ sort: event.currentTarget.value })}
          >
            {#each SORTS as option (option.value)}
              <option value={option.value}>{option.label}</option>
            {/each}
          </select>
        </label>
      </div>

      {#if activeChips.length > 0}
        <div class="active-filters">
          {#each activeChips as chip (chip.key)}
            <button class="chip removable" type="button" onclick={chip.remove}>
              {chip.label}
              <span aria-hidden="true">×</span>
            </button>
          {/each}
        </div>
      {/if}

      {#if $catalogue.error}
        <div class="state error">
          <h2>Could not load products</h2>
          <p>{$catalogue.error.message}</p>
          <button
            class="btn primary"
            type="button"
            onclick={() => loadCatalogue({ force: true }).catch(() => {})}
          >
            Try again
          </button>
        </div>
      {:else if $catalogue.loading}
        <div class="product-grid">
          {#each Array(12) as _, index (index)}
            <div class="sk">
              <div class="sk-media"></div>
              <div class="sk-lines">
                <div class="sk-line short"></div>
                <div class="sk-line"></div>
                <div class="sk-line short"></div>
              </div>
            </div>
          {/each}
        </div>
      {:else if pageItems.length === 0}
        <div class="state">
          <h2>No products match these filters</h2>
          <p>Remove a filter, widen the price range, or search for something else.</p>
          <button class="btn" type="button" onclick={resetFilters}>Clear all filters</button>
        </div>
      {:else}
        <div class="product-grid">
          {#each pageItems as product (product.productId)}
            <ProductCard {product} />
          {/each}
        </div>

        <Pagination {total} page={filters.page} pageSize={PAGE_SIZE} onpage={setPage} />
      {/if}
    </div>
  </div>
</div>
