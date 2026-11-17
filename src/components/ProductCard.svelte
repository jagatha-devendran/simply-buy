<script>
  import { onDestroy } from 'svelte';
  import { inr, count, rating } from '../lib/format.js';
  import { wishlist, toggleWishlist } from '../lib/wishlist.js';
  import { addToBag } from '../lib/bag.js';
  import { showToast } from '../lib/toast.js';
  import { navigate } from '../lib/router.js';

  let { product } = $props();

  const href = $derived(`/product/${product.productId ?? product.id}`);

  const images = $derived.by(() => {
    const raw = Array.isArray(product.images) && product.images.length > 0
      ? product.images
      : [product.image].filter(Boolean);
    const urls = raw
      .map((img) => (typeof img === 'string' ? img : img?.src || img?.imageURL || ''))
      .filter(Boolean);
    return urls.length > 0 ? urls.slice(0, 5) : ['/placeholder.svg'];
  });

  let active = $state(0);
  let isHovered = $state(false);
  let intervalId = null;

  const wishlisted = $derived(
    $wishlist.some(
      (item) => String(item.productId ?? item.id) === String(product.productId ?? product.id),
    ),
  );

  function startHoverCarousel() {
    isHovered = true;
    if (images.length <= 1) return;

    clearInterval(intervalId);
    intervalId = setInterval(() => {
      active = (active + 1) % images.length;
    }, 1100);
  }

  function stopHoverCarousel() {
    isHovered = false;
    if (intervalId) {
      clearInterval(intervalId);
      intervalId = null;
    }
    // Return smoothly to the first image
    active = 0;
  }

  function selectImage(index, event) {
    event?.preventDefault();
    event?.stopPropagation();
    active = index;
  }

  function handleWishlistClick(event) {
    event.preventDefault();
    event.stopPropagation();
    const added = toggleWishlist(product);
    showToast(
      added ? 'Added to your wishlist' : 'Removed from wishlist',
      { type: added ? 'success' : 'info' },
    );
  }

  function handleQuickAdd(event) {
    event.preventDefault();
    event.stopPropagation();
    const defaultSize = product.sizes?.[0] ?? (product.category?.toLowerCase().includes('shoe') ? 'UK 8' : 'Standard');
    addToBag(product, defaultSize, 1);
    showToast(`Added ${product.title} to your bag`, { type: 'success' });
  }

  function handleCardClick(event) {
    // If clicked on wishlist button, quick-add button, or progress dot, do not navigate
    if (
      event.target.closest('.card-wishlist-btn') ||
      event.target.closest('.quick-add-btn') ||
      event.target.closest('.progress-seg')
    ) {
      return;
    }
    navigate(href);
  }

  onDestroy(() => {
    if (intervalId) clearInterval(intervalId);
  });
</script>

<div
  class="card"
  class:is-hovered={isHovered}
  role="button"
  tabindex="0"
  onmouseenter={startHoverCarousel}
  onmouseleave={stopHoverCarousel}
  onclick={handleCardClick}
  onkeydown={(e) => e.key === 'Enter' && handleCardClick(e)}
>
  <div class="card-media-wrapper">
    <a class="card-media" href={href} aria-label={`View ${product.title}`}>
      {#each images as imgUrl, index (index)}
        <img
          src={imgUrl}
          alt={`${product.title} - view ${index + 1}`}
          loading={index === 0 ? 'lazy' : 'eager'}
          class="card-img"
          class:active={index === active}
          onerror={(e) => {
            e.currentTarget.onerror = null;
            e.currentTarget.src =
              'data:image/svg+xml;charset=UTF-8,%3Csvg xmlns="http://www.w3.org/2000/svg" width="300" height="400" viewBox="0 0 300 400" fill="%23f7f5f0"%3E%3Crect width="300" height="400" fill="%23f5f2eb"/%3E%3Cpath d="M150 170c-16.5 0-30 13.5-30 30s13.5 30 30 30 30-13.5 30-30-13.5-30-30-30zm0 46c-8.8 0-16-7.2-16-16s7.2-16 16-16 16 7.2 16 16-7.2 16-16 16z" fill="%23c5b9a8"/%3E%3Ctext x="150" y="245" font-family="sans-serif" font-size="12" fill="%23a09380" text-anchor="middle"%3ESimply Buy%3C/text%3E%3C/svg%3E';
          }}
        />
      {/each}
    </a>

    <!-- Floating Wishlist Button -->
    <button
      type="button"
      class="card-wishlist-btn"
      class:wishlisted
      onclick={handleWishlistClick}
      aria-label={wishlisted ? 'Remove from wishlist' : 'Save to wishlist'}
      title={wishlisted ? 'In Wishlist' : 'Add to Wishlist'}
    >
      <svg
        viewBox="0 0 24 24"
        width="18"
        height="18"
        fill={wishlisted ? 'currentColor' : 'none'}
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <path
          d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"
        ></path>
      </svg>
    </button>

    <!-- Auto-moving Story Progress Indicators on Hover -->
    {#if images.length > 1}
      <div class="card-progress" role="group" aria-label="Product photos">
        {#each images as _, index (index)}
          <button
            class="progress-seg"
            class:active={index === active}
            type="button"
            aria-label={`Photo ${index + 1} of ${images.length}`}
            onclick={(e) => selectImage(index, e)}
          >
            <span class="progress-fill"></span>
          </button>
        {/each}
      </div>
    {/if}

    <!-- Quick Add to Bag Bar -->
    <div class="card-quick-actions">
      <button
        type="button"
        class="quick-add-btn"
        onclick={handleQuickAdd}
      >
        <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path>
          <line x1="3" y1="6" x2="21" y2="6"></line>
          <path d="M16 10a4 4 0 0 1-8 0"></path>
        </svg>
        Quick Add to Bag
      </button>
    </div>
  </div>

  <div class="card-body">
    <div class="card-meta">
      <span class="brand">{product.brand}</span>
      {#if product.rating}
        <span class="rating-badge">
          <span class="star">★</span>
          <span>{rating(product.rating)}</span>
          <span class="rating-count">({count(product.ratingCount)})</span>
        </span>
      {/if}
    </div>

    <h3 class="title">
      <a href={href} title={product.title}>{product.title}</a>
    </h3>

    <div class="price-row">
      <span class="price">{inr(product.price)}</span>
      {#if Number(product.mrp) > Number(product.price)}
        <span class="mrp">{inr(product.mrp)}</span>
      {/if}
      {#if product.discountDisplayLabel}
        <span class="off-badge">{product.discountDisplayLabel}</span>
      {/if}
    </div>

    {#if product.primaryColour}
      <div class="card-footer-info">
        <span class="colour-dot"></span>
        <span class="colour-name">{product.primaryColour}</span>
      </div>
    {/if}
  </div>
</div>
