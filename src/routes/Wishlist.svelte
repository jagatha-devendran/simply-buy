<script>
  import { wishlist, removeFromWishlist } from '../lib/wishlist.js';
  import { addToBag } from '../lib/bag.js';
  import { showToast } from '../lib/toast.js';
  import ProductCard from '../components/ProductCard.svelte';
  import { count } from '../lib/format.js';

  function moveToBag(product) {
    const size = product.sizes?.[0] ?? 'Standard';
    addToBag(product, size, 1);
    removeFromWishlist(product.productId);
    showToast(`Moved ${product.title} to your bag`, { type: 'success' });
  }
</script>

<div class="shell wishlist-page">
  <div class="wishlist-head">
    <div>
      <p class="eyebrow">Saved Collections</p>
      <h1>My Wishlist</h1>
      <p class="muted">
        {count($wishlist.length)} { $wishlist.length === 1 ? 'item' : 'items' } saved for later
      </p>
    </div>
    {#if $wishlist.length > 0}
      <a class="btn" href="/products">Continue Browsing</a>
    {/if}
  </div>

  {#if $wishlist.length > 0}
    <div class="product-grid">
      {#each $wishlist as product (product.productId)}
        <div class="wishlist-card-wrapper">
          <ProductCard {product} />
          <div class="wishlist-actions">
            <button
              type="button"
              class="btn primary full-width move-bag-btn"
              onclick={() => moveToBag(product)}
            >
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path>
                <line x1="3" y1="6" x2="21" y2="6"></line>
                <path d="M16 10a4 4 0 0 1-8 0"></path>
              </svg>
              Move to Bag
            </button>
          </div>
        </div>
      {/each}
    </div>
  {:else}
    <div class="empty-state-box">
      <div class="empty-icon-circle">
        <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="currentColor" stroke-width="1.5">
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
        </svg>
      </div>
      <h2>Your wishlist is empty</h2>
      <p class="muted">
        Save items that catch your eye by clicking the heart on any product tile.
      </p>
      <a class="btn primary" href="/products">Explore Catalogue</a>
    </div>
  {/if}
</div>
