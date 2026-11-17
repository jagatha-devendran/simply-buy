<script>
  import { onMount } from 'svelte';
  import { catalogue, categoriesOf, loadCatalogue } from '../lib/catalogue.js';
  import { discountPercent } from '../lib/filters.js';
  import { count } from '../lib/format.js';
  import ProductCard from '../components/ProductCard.svelte';

  onMount(() => {
    loadCatalogue().catch(() => {});
  });

  const products = $derived($catalogue.products);
  const categories = $derived(categoriesOf(products));

  const topPickProduct = $derived(products[0] ?? null);
  const topPickHref = $derived(
    topPickProduct
      ? `/product/${topPickProduct.productId ?? topPickProduct.id}`
      : '/products?category=watches',
  );

  const deals = $derived(
    [...products]
      .filter((product) => Number(product.price) <= 1999)
      .sort((a, b) => discountPercent(b) - discountPercent(a))
      .slice(0, 8),
  );

  const topRated = $derived(
    [...products]
      .sort(
        (a, b) =>
          Number(b.rating ?? 0) - Number(a.rating ?? 0) ||
          Number(b.ratingCount ?? 0) - Number(a.ratingCount ?? 0),
      )
      .slice(0, 8),
  );

  async function retry() {
    try {
      await loadCatalogue({ force: true });
    } catch {
      /* handled */
    }
  }

  const categoryIcons = {
    watches: '⌚',
    'casual-shoes': '👟',
    tshirts: '👕',
    dresses: '👗',
    'water-bottles': '💧',
    handbags: '👜',
    sunglasses: '🕶️',
    'kurta-sets': '👘',
    earrings: '✨',
    'sports-shoes': '👟',
  };
</script>

{#if $catalogue.error && products.length === 0}
  <div class="shell">
    <div class="state error">
      <h2>Could not load the catalogue</h2>
      <p>{$catalogue.error.message}</p>
      <p class="small muted">Start the backend on port 8080, then try again.</p>
      <button class="btn primary" type="button" onclick={retry}>Try again</button>
    </div>
  </div>
{:else}
  <!-- Editorial Hero Section -->
  <section class="hero">
    <div class="shell hero-grid">
      <div class="hero-content">
        <div class="hero-tag-group">
          <span class="luxe-pill">NEW SEASON EDIT</span>
          <span class="hero-subtag">Curated Everyday Luxury</span>
        </div>

        <h1 class="hero-headline">
          Exceptional fashion, <br />
          <em>crafted for longevity.</em>
        </h1>

        <p class="hero-desc">
          {#if $catalogue.loading}
            Curating the season’s finest pieces…
          {:else}
            Explore our meticulously selected items across signature categories.
            Honest pricing, verified ratings, and seamless craftsmanship.
          {/if}
        </p>

        <div class="hero-actions">
          <a class="btn primary luxe-cta" href="/products">
            Explore All Products
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="5" y1="12" x2="19" y2="12"></line>
              <polyline points="12 5 19 12 12 19"></polyline>
            </svg>
          </a>
          <a class="btn secondary" href="/products?category=watches">Shop Watches</a>
          <a class="btn secondary" href="/products?category=casual-shoes">Casual Shoes</a>
        </div>

        <!-- Hover feature highlight callout -->
        <div class="hero-feature-hint">
          <span class="hint-dot"></span>
          <span><strong>Interactive Showcase:</strong> Hover over any product tile to see its photos cycle automatically!</span>
        </div>
      </div>

      <div class="hero-visual">
        <div class="hero-cards-stack">
          <!-- Clickable Top Pick Card -->
          <a
            class="hero-card-featured clickable-toppick"
            href={topPickHref}
            title={topPickProduct ? `View ${topPickProduct.title}` : 'View Top Pick'}
          >
            <div class="hero-img-box">
              <img
                src={topPickProduct?.images?.[0] ?? 'https://images.unsplash.com/photo-1524805444758-089113d48a6d?w=800&auto=format&fit=crop&q=80'}
                alt={topPickProduct?.title ?? 'Top Pick'}
                class="hero-card-img"
              />
              <span class="hero-card-badge">HOT PICK</span>
            </div>
            <div class="hero-card-details">
              <span class="hero-card-brand">{topPickProduct?.brand ?? 'FOSSIL'}</span>
              <h4>{topPickProduct?.title ?? 'Heritage Chronograph'}</h4>
              <p class="hero-card-price">
                ₹{topPickProduct?.price ?? '3,495'}
                {#if topPickProduct?.mrp}
                  <del>₹{topPickProduct.mrp}</del>
                {/if}
                {#if topPickProduct?.discountDisplayLabel}
                  <span class="off-pill">{topPickProduct.discountDisplayLabel}</span>
                {/if}
              </p>
            </div>
          </a>
        </div>
      </div>
    </div>
  </section>

  <!-- Shop by Category Section (Brought Up Directly Below Hero) -->
  <section class="shell section" style="margin-top: 24px;">
    <div class="section-head">
      <div>
        <span class="eyebrow">Discover by Department</span>
        <h2>Shop by Category</h2>
        <p>Refined essentials tailored for every occasion</p>
      </div>
      <a class="btn link view-all-link" href="/products">
        View Entire Catalogue →
      </a>
    </div>

    <div class="category-grid">
      {#if $catalogue.loading}
        {#each Array(6) as _, index (index)}
          <div class="sk" style="min-height:110px">
            <div class="sk-lines">
              <div class="sk-line short"></div>
              <div class="sk-line"></div>
            </div>
          </div>
        {/each}
      {:else}
        {#each categories as category (category.slug)}
          <a class="tile category-tile" href={`/products?category=${category.slug}`}>
            <div class="tile-head">
              <span class="category-icon">{categoryIcons[category.slug] ?? '🏷️'}</span>
              <span class="tile-swatch"></span>
            </div>
            <div class="tile-body">
              <h3>{category.name}</h3>
            </div>
          </a>
        {/each}
      {/if}
    </div>
  </section>

  <!-- Special Deals Section (Hover Carousel Active) -->
  <section class="shell section">
    <div class="section-head">
      <div>
        <span class="eyebrow">Limited Time Offers</span>
        <h2>Best Value & Deals</h2>
        <p>Highest discount percentages across all departments</p>
      </div>
      <a class="btn link view-all-link" href="/products?sort=discount">
        See All Deals →
      </a>
    </div>

    {#if $catalogue.loading}
      <div class="product-grid">
        {#each Array(8) as _, index (index)}
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
    {:else if deals.length > 0}
      <div class="product-grid">
        {#each deals as product (product.productId ?? product.id)}
          <ProductCard {product} />
        {/each}
      </div>
    {/if}
  </section>

  <!-- Top Rated Section -->
  <section class="shell section">
    <div class="section-head">
      <div>
        <span class="eyebrow">Customer Favorites</span>
        <h2>Top Rated & Highly Reviewed</h2>
        <p>Highest customer satisfaction ratings</p>
      </div>
      <a class="btn link view-all-link" href="/products?sort=rating">
        View All Top Rated →
      </a>
    </div>

    {#if $catalogue.loading}
      <div class="product-grid">
        {#each Array(8) as _, index (index)}
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
    {:else if topRated.length > 0}
      <div class="product-grid">
        {#each topRated as product (product.productId ?? product.id)}
          <ProductCard {product} />
        {/each}
      </div>
    {/if}
  </section>
{/if}
