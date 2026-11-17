<script>
  import { onMount } from 'svelte';
  import { getProductDetails } from '../lib/api.js';
  import { catalogue, loadCatalogue } from '../lib/catalogue.js';
  import { inr, count, rating } from '../lib/format.js';
  import { addToBag } from '../lib/bag.js';
  import { wishlist, toggleWishlist } from '../lib/wishlist.js';
  import { showToast } from '../lib/toast.js';
  import ProductCard from '../components/ProductCard.svelte';

  let { id } = $props();

  let loading = $state(true);
  let error = $state(null);
  let product = $state(null);
  let activeImage = $state(0);
  let selectedSize = $state('');
  let quantity = $state(1);
  let pincode = $state('');
  let pincodeChecked = $state(false);
  let pincodeMessage = $state('');

  async function loadProduct() {
    loading = true;
    error = null;
    activeImage = 0;

    let prods = $catalogue.products;
    if (!prods || prods.length === 0 || !$catalogue.loaded) {
      try {
        prods = await loadCatalogue();
      } catch (err) {
        prods = $catalogue.products || [];
      }
    }

    // Find in loaded catalogue by productId or id
    let match = prods.find(
      (p) => String(p.productId ?? p.id) === String(id),
    );

    // If not found in catalogue, attempt direct details endpoint
    if (!match) {
      try {
        const data = await getProductDetails(id);
        if (data && (data.productId || data.id || data.title)) {
          match = data;
        }
      } catch (e) {
        // Fall through
      }
    }

    if (!match && prods.length > 0) {
      match = prods[0];
    }

    if (match) {
      product = match;
      const isShoes = String(match.category || '').toLowerCase().includes('shoe');
      const fallbackSizes = isShoes ? ['UK 7', 'UK 8', 'UK 9', 'UK 10'] : ['S', 'M', 'L', 'XL'];
      selectedSize = match.sizes?.[0] ?? fallbackSizes[0];
    } else {
      error = 'Product not found.';
    }

    loading = false;
  }

  onMount(() => {
    loadProduct();
  });

  $effect(() => {
    if (id) {
      loadProduct();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  });

  const images = $derived.by(() => {
    if (!product) return ['/placeholder.svg'];
    const raw = Array.isArray(product.images) && product.images.length > 0
      ? product.images
      : [product.image].filter(Boolean);
    const urls = raw
      .map((img) => (typeof img === 'string' ? img : img?.src || img?.imageURL || ''))
      .filter(Boolean);
    return urls.length > 0 ? urls : ['/placeholder.svg'];
  });

  const wishlisted = $derived(
    product
      ? $wishlist.some(
          (item) => String(item.productId ?? item.id) === String(product.productId ?? product.id),
        )
      : false,
  );

  const availableSizes = $derived.by(() => {
    if (product?.sizes && product.sizes.length > 0) return product.sizes;
    const cat = String(product?.category || '').toLowerCase();
    if (cat.includes('shoe')) return ['UK 7', 'UK 8', 'UK 9', 'UK 10'];
    if (cat.includes('watch') || cat.includes('bottle') || cat.includes('decor')) return ['Standard'];
    return ['S', 'M', 'L', 'XL'];
  });

  const similarProducts = $derived.by(() => {
    if (!product) return [];
    const cat = String(product.category || '').toLowerCase();
    const pid = String(product.productId ?? product.id);
    return $catalogue.products
      .filter((p) => String(p.category || '').toLowerCase() === cat && String(p.productId ?? p.id) !== pid)
      .slice(0, 4);
  });

  function handleAddToBag() {
    if (!product) return;
    addToBag(product, selectedSize || 'Standard', quantity);
    showToast(`Added ${product.title} to your bag!`, { type: 'success' });
  }

  function handleToggleWishlist() {
    if (!product) return;
    const added = toggleWishlist(product);
    showToast(
      added ? 'Saved to your wishlist' : 'Removed from wishlist',
      { type: added ? 'success' : 'info' },
    );
  }

  function checkPincode(e) {
    e.preventDefault();
    if (!/^[0-9]{6}$/.test(pincode.trim())) {
      pincodeMessage = 'Please enter a valid 6-digit Indian PIN code';
      pincodeChecked = false;
      return;
    }
    pincodeChecked = true;
    pincodeMessage = 'Express Delivery by Friday · Cash on Delivery available';
  }
</script>

<div class="shell product-detail-page">
  {#if loading}
    <div class="detail-skeleton">
      <div class="sk-gallery"></div>
      <div class="sk-info">
        <div class="sk-line short"></div>
        <div class="sk-line"></div>
        <div class="sk-line short"></div>
      </div>
    </div>
  {:else if error || !product}
    <div class="empty-page">
      <p class="eyebrow">Product Not Found</p>
      <h1>We couldn't find that product</h1>
      <p class="muted">The product you are looking for may have moved or is out of stock.</p>
      <a class="btn primary" href="/products">Browse Catalogue</a>
    </div>
  {:else}
    <!-- Breadcrumb -->
    <nav class="breadcrumb" aria-label="Breadcrumb">
      <a href="/">Home</a>
      <span class="sep">/</span>
      <a href={`/products?category=${encodeURIComponent(product.category?.toLowerCase() || '')}`}>
        {product.category || 'Products'}
      </a>
      <span class="sep">/</span>
      <span class="curr">{product.brand}</span>
    </nav>

    <div class="product-layout">
      <!-- Media Gallery -->
      <div class="gallery-column">
        <div class="hero-image-wrap">
          <img
            src={images[activeImage] ?? images[0]}
            alt={product.title}
            class="hero-image"
            onerror={(e) => {
              e.currentTarget.onerror = null;
              e.currentTarget.src =
                'data:image/svg+xml;charset=UTF-8,%3Csvg xmlns="http://www.w3.org/2000/svg" width="600" height="800" fill="%23f7f5f0"%3E%3Crect width="600" height="800" fill="%23f2eee6"/%3E%3Ctext x="300" y="400" font-family="sans-serif" font-size="18" fill="%23a09380" text-anchor="middle"%3ESimply Buy%3C/text%3E%3C/svg%3E';
            }}
          />

          {#if product.discountDisplayLabel}
            <span class="hero-badge">{product.discountDisplayLabel}</span>
          {/if}

          <span class="gallery-counter">
            {activeImage + 1} / {images.length}
          </span>
        </div>

        <!-- Thumbnails Reel -->
        {#if images.length > 1}
          <div class="thumbnails-reel">
            {#each images as img, index (index)}
              <button
                type="button"
                class="thumb-btn"
                class:active={index === activeImage}
                onclick={() => (activeImage = index)}
                onmouseenter={() => (activeImage = index)}
                aria-label={`View photo ${index + 1}`}
              >
                <img src={img} alt="" loading="lazy" />
              </button>
            {/each}
          </div>
        {/if}
      </div>

      <!-- Product Information Column -->
      <div class="info-column">
        <div class="product-header">
          <p class="brand-eyebrow">{product.brand}</p>
          <h1 class="product-name">{product.title}</h1>

          {#if product.rating}
            <div class="rating-strip">
              <span class="rating-score">
                <span class="star">★</span> {rating(product.rating)}
              </span>
              <span class="rating-divider">|</span>
              <span class="rating-votes">{count(product.ratingCount)} Verified Ratings</span>
            </div>
          {/if}
        </div>

        <div class="price-box">
          <div class="price-headline">
            <span class="final-price">{inr(product.price)}</span>
            {#if Number(product.mrp) > Number(product.price)}
              <span class="mrp-price">{inr(product.mrp)}</span>
              <span class="discount-pill">{product.discountDisplayLabel}</span>
            {/if}
          </div>
          <p class="tax-note">Inclusive of all taxes · Free shipping above ₹999</p>
        </div>

        {#if product.primaryColour}
          <div class="colour-row">
            <span class="row-label">Colour:</span>
            <span class="colour-val"><strong>{product.primaryColour}</strong></span>
          </div>
        {/if}

        <!-- Size Selection -->
        <div class="size-selection-box">
          <div class="size-head">
            <span class="row-label">Select Size</span>
            <span class="size-guide-hint">Standard fit</span>
          </div>
          <div class="size-pills">
            {#each availableSizes as sizeOption (sizeOption)}
              <button
                type="button"
                class="size-pill"
                class:selected={selectedSize === sizeOption}
                onclick={() => (selectedSize = sizeOption)}
              >
                {sizeOption}
              </button>
            {/each}
          </div>
        </div>

        <!-- Quantity & Urgency -->
        <div class="qty-urgency-row">
          <div class="qty-selector">
            <span class="row-label">Quantity:</span>
            <div class="qty-stepper">
              <button
                type="button"
                onclick={() => (quantity = Math.max(1, quantity - 1))}
                disabled={quantity <= 1}
              >
                −
              </button>
              <span class="qty-display">{quantity}</span>
              <button
                type="button"
                onclick={() => (quantity = Math.min(10, quantity + 1))}
              >
                +
              </button>
            </div>
          </div>
          <span class="urgency-badge">⚡ Only a few left in stock</span>
        </div>

        <!-- Call to Action Buttons -->
        <div class="cta-actions">
          <button
            type="button"
            class="btn primary add-bag-btn"
            onclick={handleAddToBag}
          >
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path>
              <line x1="3" y1="6" x2="21" y2="6"></line>
              <path d="M16 10a4 4 0 0 1-8 0"></path>
            </svg>
            Add to Bag
          </button>

          <button
            type="button"
            class="btn wishlist-toggle-btn"
            class:is-wishlisted={wishlisted}
            onclick={handleToggleWishlist}
          >
            <svg
              viewBox="0 0 24 24"
              width="18"
              height="18"
              fill={wishlisted ? 'currentColor' : 'none'}
              stroke="currentColor"
              stroke-width="2"
            >
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
            </svg>
            {wishlisted ? 'Saved to Wishlist' : 'Add to Wishlist'}
          </button>
        </div>

        <!-- Delivery & Services Check -->
        <div class="delivery-check-box">
          <div class="check-head">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="1" y="3" width="15" height="13"></rect>
              <polygon points="16 8 20 8 23 11 23 16 16 16 16 8"></polygon>
              <circle cx="5.5" cy="18.5" r="2.5"></circle>
              <circle cx="18.5" cy="18.5" r="2.5"></circle>
            </svg>
            <strong>Delivery Options</strong>
          </div>

          <form class="pincode-form" onsubmit={checkPincode}>
            <input
              type="text"
              placeholder="Enter PIN code (e.g. 560001)"
              maxlength="6"
              bind:value={pincode}
            />
            <button type="submit" class="btn link check-btn">Check</button>
          </form>

          {#if pincodeMessage}
            <p class="pincode-result" class:success={pincodeChecked}>
              {pincodeMessage}
            </p>
          {/if}

          <ul class="perks-list">
            <li>
              <span class="perk-icon">✓</span>
              <span>100% Genuine and Brand Certified products</span>
            </li>
            <li>
              <span class="perk-icon">✓</span>
              <span>14-day hassle-free return and exchange policy</span>
            </li>
            <li>
              <span class="perk-icon">✓</span>
              <span>Pay on delivery option available</span>
            </li>
          </ul>
        </div>

        <!-- Product Description & Specs -->
        <div class="description-section">
          <h3>Product Details</h3>
          <p class="desc-text">
            {product.description ||
              `${product.title} by ${product.brand}. Designed with high-precision craftsmanship and premium materials for long-lasting comfort and timeless style.`}
          </p>

          <div class="specs-grid">
            <div class="spec-cell">
              <span class="spec-label">Brand</span>
              <span class="spec-val">{product.brand}</span>
            </div>
            <div class="spec-cell">
              <span class="spec-label">Category</span>
              <span class="spec-val">{product.category}</span>
            </div>
            {#if product.gender}
              <div class="spec-cell">
                <span class="spec-label">Gender</span>
                <span class="spec-val">{product.gender}</span>
              </div>
            {/if}
            {#if product.primaryColour}
              <div class="spec-cell">
                <span class="spec-label">Primary Colour</span>
                <span class="spec-val">{product.primaryColour}</span>
              </div>
            {/if}
          </div>
        </div>
      </div>
    </div>

    <!-- Similar Products Section with Hover Carousel -->
    {#if similarProducts.length > 0}
      <section class="section similar-section">
        <div class="section-head">
          <div>
            <h2>You May Also Like</h2>
            <p>Curated recommendations in {product.category}</p>
          </div>
          <a class="btn link" href={`/products?category=${encodeURIComponent(product.category?.toLowerCase() || '')}`}>
            View More
          </a>
        </div>

        <div class="product-grid">
          {#each similarProducts as similar (similar.productId ?? similar.id)}
            <ProductCard product={similar} />
          {/each}
        </div>
      </section>
    {/if}
  {/if}
</div>
