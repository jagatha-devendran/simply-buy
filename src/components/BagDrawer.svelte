<script>
  import { inr, count } from '../lib/format.js';
  import {
    bagItems,
    bagOpen,
    bagSummary,
    closeBag,
    updateQuantity,
    removeFromBag,
    appliedCoupon,
    applyCoupon,
    removeCoupon,
  } from '../lib/bag.js';
  import { showToast } from '../lib/toast.js';

  let couponInput = $state('');
  let couponError = $state('');
  let { oncheckout = () => {} } = $props();

  function handleApplyCoupon(e) {
    e.preventDefault();
    couponError = '';
    const res = applyCoupon(couponInput);
    if (res.ok) {
      showToast(res.message, { type: 'success' });
      couponInput = '';
    } else {
      couponError = res.message;
    }
  }

  function handleRemoveCoupon() {
    removeCoupon();
    showToast('Coupon removed');
  }

  function proceedToCheckout() {
    closeBag();
    oncheckout();
  }
</script>

{#if $bagOpen}
  <div
    class="drawer-backdrop"
    role="presentation"
    onclick={closeBag}
    onkeydown={(e) => e.key === 'Escape' && closeBag()}
  >
    <div
      class="drawer-panel"
      role="dialog"
      aria-modal="true"
      aria-label="Shopping Bag"
      tabindex="-1"
      onclick={(e) => e.stopPropagation()}
      onkeydown={(e) => e.stopPropagation()}
    >
      <div class="drawer-header">
        <div class="drawer-title-group">
          <h2>Shopping Bag</h2>
          <span class="bag-count-pill">{$bagSummary.itemCount} { $bagSummary.itemCount === 1 ? 'item' : 'items' }</span>
        </div>
        <button
          type="button"
          class="close-btn"
          onclick={closeBag}
          aria-label="Close bag"
        >
          <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" stroke-width="2" fill="none">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>

      {#if $bagItems.length > 0}
        <!-- Free Shipping Incentive Progress Bar -->
        <div class="shipping-progress-banner">
          {#if $bagSummary.isFreeDelivery}
            <div class="shipping-status free">
              <span class="icon">✨</span>
              <span><strong>Congratulations!</strong> You have unlocked FREE Express Delivery</span>
            </div>
          {:else}
            <div class="shipping-status">
              <span class="icon">🚚</span>
              <span>Add <strong>{inr($bagSummary.amountToFreeDelivery)}</strong> more for <strong>FREE Delivery</strong></span>
            </div>
            <div class="progress-track">
              <div
                class="progress-bar"
                style="width: {Math.min(100, (($bagSummary.subtotal / 999) * 100))}%"
              ></div>
            </div>
          {/if}
        </div>

        <div class="drawer-content">
          <ul class="bag-items-list">
            {#each $bagItems as item (item.product.productId + '-' + item.size)}
              <li class="bag-item">
                <a
                  class="item-thumb"
                  href={`/product/${item.product.productId}`}
                  onclick={closeBag}
                >
                  <img
                    src={item.product.images?.[0] ?? ''}
                    alt={item.product.title}
                    onerror={(e) => {
                      e.currentTarget.onerror = null;
                      e.currentTarget.src =
                        'data:image/svg+xml;charset=UTF-8,%3Csvg xmlns="http://www.w3.org/2000/svg" width="80" height="100" fill="%23f7f5f0"%3E%3Crect width="80" height="100" fill="%23eee9e0"/%3E%3C/svg%3E';
                    }}
                  />
                </a>

                <div class="item-details">
                  <div class="item-head">
                    <span class="item-brand">{item.product.brand}</span>
                    <button
                      type="button"
                      class="remove-item-btn"
                      onclick={() => removeFromBag(item.product.productId, item.size)}
                      aria-label="Remove item"
                      title="Remove"
                    >
                      <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                      </svg>
                    </button>
                  </div>

                  <h4 class="item-title">
                    <a href={`/product/${item.product.productId}`} onclick={closeBag}>
                      {item.product.title}
                    </a>
                  </h4>

                  <div class="item-meta">
                    {#if item.size}
                      <span class="item-size">Size: <strong>{item.size}</strong></span>
                    {/if}
                    {#if item.product.primaryColour}
                      <span class="item-colour">{item.product.primaryColour}</span>
                    {/if}
                  </div>

                  <div class="item-foot">
                    <div class="qty-control">
                      <button
                        type="button"
                        class="qty-btn"
                        onclick={() => updateQuantity(item.product.productId, item.size, item.quantity - 1)}
                        aria-label="Decrease quantity"
                      >
                        −
                      </button>
                      <span class="qty-num">{item.quantity}</span>
                      <button
                        type="button"
                        class="qty-btn"
                        onclick={() => updateQuantity(item.product.productId, item.size, item.quantity + 1)}
                        aria-label="Increase quantity"
                      >
                        +
                      </button>
                    </div>

                    <div class="item-pricing">
                      <span class="item-price">{inr(item.product.price * item.quantity)}</span>
                      {#if Number(item.product.mrp) > Number(item.product.price)}
                        <span class="item-mrp">{inr(item.product.mrp * item.quantity)}</span>
                      {/if}
                    </div>
                  </div>
                </div>
              </li>
            {/each}
          </ul>

          <!-- Coupon Code Section -->
          <div class="coupon-section">
            {#if $appliedCoupon}
              <div class="applied-coupon-pill">
                <div class="coupon-info">
                  <span class="coupon-badge">APPLIED</span>
                  <strong>{$appliedCoupon.code}</strong>
                  <span class="coupon-desc">{$appliedCoupon.label}</span>
                </div>
                <button
                  type="button"
                  class="coupon-remove-btn"
                  onclick={handleRemoveCoupon}
                >
                  Remove
                </button>
              </div>
            {:else}
              <form class="coupon-form" onsubmit={handleApplyCoupon}>
                <input
                  type="text"
                  placeholder="Promo code (try ELEGANCE15)"
                  bind:value={couponInput}
                />
                <button type="submit" class="coupon-btn">Apply</button>
              </form>
              {#if couponError}
                <p class="coupon-error">{couponError}</p>
              {/if}
            {/if}
          </div>

          <!-- Bill Summary -->
          <div class="bill-summary">
            <h3>Price Details</h3>
            <div class="bill-row">
              <span>Total MRP</span>
              <span>{inr($bagSummary.totalMrp)}</span>
            </div>
            {#if $bagSummary.mrpDiscount > 0}
              <div class="bill-row savings">
                <span>Discount on MRP</span>
                <span>−{inr($bagSummary.mrpDiscount)}</span>
              </div>
            {/if}
            {#if $appliedCoupon}
              <div class="bill-row savings">
                <span>Coupon ({$appliedCoupon.code})</span>
                <span>−{inr($bagSummary.couponDiscount)}</span>
              </div>
            {/if}
            <div class="bill-row">
              <span>Delivery Fee</span>
              <span>
                {#if $bagSummary.deliveryFee === 0}
                  <span class="free-text">FREE</span>
                {:else}
                  {inr($bagSummary.deliveryFee)}
                {/if}
              </span>
            </div>
            <div class="bill-total-row">
              <span>Total Payable</span>
              <span class="total-amount">{inr($bagSummary.total)}</span>
            </div>
          </div>
        </div>

        <div class="drawer-footer">
          <div class="drawer-footer-total">
            <span class="foot-label">Total</span>
            <span class="foot-amount">{inr($bagSummary.total)}</span>
          </div>
          <button
            type="button"
            class="btn primary checkout-btn"
            onclick={proceedToCheckout}
          >
            Proceed to Checkout
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="5" y1="12" x2="19" y2="12"></line>
              <polyline points="12 5 19 12 12 19"></polyline>
            </svg>
          </button>
        </div>
      {:else}
        <div class="empty-bag-state">
          <div class="empty-bag-icon">
            <svg viewBox="0 0 24 24" width="56" height="56" fill="none" stroke="currentColor" stroke-width="1.5">
              <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path>
              <line x1="3" y1="6" x2="21" y2="6"></line>
              <path d="M16 10a4 4 0 0 1-8 0"></path>
            </svg>
          </div>
          <h3>Your bag is empty</h3>
          <p class="muted">Add items you love to your bag and start shopping.</p>
          <a
            class="btn primary empty-bag-cta"
            href="/products"
            onclick={closeBag}
          >
            Explore Catalogue
          </a>
        </div>
      {/if}
    </div>
  </div>
{/if}
