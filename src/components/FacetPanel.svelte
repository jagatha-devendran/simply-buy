<script>
  import { count } from '../lib/format.js';

  let { facets = null, filters, ontoggle, onprice, onclear, priceError = null } = $props();

  const GROUPS = [
    { key: 'brand', label: 'Brand' },
    { key: 'gender', label: 'Gender' },
    { key: 'colour', label: 'Colour' },
  ];

  let minInput = $state('');
  let maxInput = $state('');

  $effect(() => {
    minInput = filters.minPrice === '' || filters.minPrice === null ? '' : String(filters.minPrice);
    maxInput = filters.maxPrice === '' || filters.maxPrice === null ? '' : String(filters.maxPrice);
  });

  function selected(key, value) {
    return (filters[key] ?? []).some((entry) => entry.toLowerCase() === value.toLowerCase());
  }

  function bucketSelected(bucket) {
    const min = bucket.min === null || bucket.min === undefined ? '' : String(bucket.min);
    const max = bucket.max === null || bucket.max === undefined ? '' : String(bucket.max);
    return String(filters.minPrice ?? '') === min && String(filters.maxPrice ?? '') === max;
  }

  const hasFilters = $derived(
    (filters.brand?.length ?? 0) +
      (filters.colour?.length ?? 0) +
      (filters.gender?.length ?? 0) >
      0 ||
      filters.minPrice !== '' ||
      filters.maxPrice !== '',
  );

  function submitPrice(event) {
    event.preventDefault();
    onprice(minInput, maxInput);
  }
</script>

<aside class="facets" aria-label="Filters">
  <div class="facets-head">
    <h2>Filters</h2>
    <button class="btn link" type="button" onclick={onclear} disabled={!hasFilters}>Clear all</button>
  </div>

  {#if !facets}
    <p class="muted small" style="padding:14px 0">Filters load with the results.</p>
  {:else}
    {#each GROUPS as group (group.key)}
      {#if facets[group.key]?.length}
        <section class="facet-group">
          <h3>{group.label}</h3>
          {#each facets[group.key] as value (value.value)}
            <label class="check">
              <input
                type="checkbox"
                checked={selected(group.key, value.value)}
                onchange={() => ontoggle(group.key, value.value)}
              />
              <span>{value.value}</span>
              <span class="n">{count(value.count)}</span>
            </label>
          {/each}
        </section>
      {/if}
    {/each}

    {#if facets.price?.length}
      <section class="facet-group">
        <h3>Price</h3>
        {#each facets.price as bucket (bucket.label)}
          <label class="check">
            <input
              type="checkbox"
              checked={bucketSelected(bucket)}
              onchange={() =>
                bucketSelected(bucket)
                  ? onprice('', '')
                  : onprice(bucket.min ?? '', bucket.max ?? '')}
            />
            <span>{bucket.label}</span>
            <span class="n">{count(bucket.count)}</span>
          </label>
        {/each}

        <form class="price-form" onsubmit={submitPrice}>
          <input
            type="number"
            min="0"
            placeholder="Min ₹"
            aria-label="Minimum price"
            bind:value={minInput}
          />
          <input
            type="number"
            min="0"
            placeholder="Max ₹"
            aria-label="Maximum price"
            bind:value={maxInput}
          />
          <button class="btn" type="submit">Go</button>
        </form>
        {#if priceError}
          <p class="price-error">{priceError}</p>
        {/if}
      </section>
    {/if}
  {/if}
</aside>
