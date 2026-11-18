<script>
  import { onMount } from 'svelte';
  import { orders, ordersLoading, fetchUserOrders, cancelUserOrder } from '../lib/orders.js';
  import { inr } from '../lib/format.js';
  import { addToBag, openBag } from '../lib/bag.js';
  import { showToast } from '../lib/toast.js';

  let filterTab = $state('all'); // 'all' | 'active' | 'delivered' | 'cancelled'
  let cancellingId = $state(null);
  let cancelConfirmId = $state(null);

  onMount(() => {
    fetchUserOrders();
  });

  const filteredOrders = $derived.by(() => {
    if (filterTab === 'active') {
      return $orders.filter((o) => o.status === 'PENDING' || o.status === 'CONFIRMED' || o.status === 'In Transit');
    }
    if (filterTab === 'delivered') {
      return $orders.filter((o) => o.status === 'DELIVERED');
    }
    if (filterTab === 'cancelled') {
      return $orders.filter((o) => o.status === 'CANCELLED');
    }
    return $orders;
  });

  function formatDate(iso) {
    if (!iso) return '';
    try {
      const d = new Date(iso);
      return d.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      });
    } catch {
      return iso;
    }
  }

  async function handleCancelOrder(orderId) {
    cancellingId = orderId;
    try {
      await cancelUserOrder(orderId);
      showToast('Order cancelled successfully.');
      cancelConfirmId = null;
    } catch (err) {
      showToast('Could not cancel order: ' + (err.message || 'Error occurred'));
    } finally {
      cancellingId = null;
    }
  }

  function handleReorder(order) {
    if (!order.items || order.items.length === 0) return;
    for (const it of order.items) {
      addToBag(
        {
          id: it.productId,
          title: it.productName,
          brand: 'Simply Buy',
          price: it.unitPrice,
          mrp: it.unitPrice * 1.3,
          images: it.imageUrl ? [it.imageUrl] : []
        },
        'M'
      );
    }
    showToast('Items re-added to your shopping bag.');
    openBag();
  }
</script>

<div class="shell orders-page">
  <div class="page-header">
    <div class="header-titles">
      <nav class="breadcrumb" aria-label="Breadcrumb">
        <a href="/">Home</a>
        <span class="sep">/</span>
        <span class="curr">My Orders</span>
      </nav>
      <h1>My Orders</h1>
      <p class="muted">Review order history, track live shipments, or manage cancellations.</p>
    </div>

    <div class="order-tabs">
      <button
        type="button"
        class="tab-btn"
        class:active={filterTab === 'all'}
        onclick={() => (filterTab = 'all')}
      >
        All Orders ({$orders.length})
      </button>
      <button
        type="button"
        class="tab-btn"
        class:active={filterTab === 'active'}
        onclick={() => (filterTab = 'active')}
      >
        Active ({$orders.filter((o) => o.status === 'PENDING' || o.status === 'CONFIRMED' || o.status === 'In Transit').length})
      </button>
      <button
        type="button"
        class="tab-btn"
        class:active={filterTab === 'delivered'}
        onclick={() => (filterTab = 'delivered')}
      >
        Delivered
      </button>
      <button
        type="button"
        class="tab-btn"
        class:active={filterTab === 'cancelled'}
        onclick={() => (filterTab = 'cancelled')}
      >
        Cancelled
      </button>
    </div>
  </div>

  {#if $ordersLoading}
    <div class="loading-state">
      <div class="spinner"></div>
      <p>Loading your orders…</p>
    </div>
  {:else if filteredOrders.length === 0}
    <div class="orders-empty-card">
      <div class="empty-icon-box">
        <svg viewBox="0 0 24 24" width="44" height="44" fill="none" stroke="currentColor" stroke-width="1.5">
          <rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect>
          <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path>
        </svg>
      </div>
      <h2>No orders found</h2>
      <p class="muted">
        {#if filterTab === 'all'}
          You haven't placed any orders yet. Discover trending styles and top picks now.
        {:else}
          No orders match the selected "{filterTab}" filter.
        {/if}
      </p>
      <a class="btn primary" href="/products">Explore Catalogue</a>
    </div>
  {:else}
    <div class="orders-stack">
      {#each filteredOrders as order (order.id)}
        <article class="order-card">
          <!-- Card Header Strip -->
          <div class="card-header">
            <div class="meta-group">
              <div class="meta-item">
                <span class="meta-label">ORDER PLACED</span>
                <span class="meta-value">{formatDate(order.date)}</span>
              </div>
              <div class="meta-item">
                <span class="meta-label">TOTAL AMOUNT</span>
                <span class="meta-value price">{inr(order.totalAmount)}</span>
              </div>
              <div class="meta-item">
                <span class="meta-label">PAYMENT METHOD</span>
                <span class="meta-value payment-badge">
                  {#if order.paymentMethod === 'COD'}
                    Cash on Delivery
                  {:else}
                    Online (Razorpay)
                  {/if}
                </span>
              </div>
              <div class="meta-item ship-to">
                <span class="meta-label">SHIP TO</span>
                <span class="meta-value">{order.shippingAddress?.recipientName}</span>
              </div>
            </div>

            <div class="order-id-group">
              <span class="meta-label">ORDER ID</span>
              <span class="order-number">#{order.orderNumber || order.id}</span>
            </div>
          </div>

          <!-- Card Body -->
          <div class="card-body">
            <!-- Status & Delivery Banner -->
            <div class="status-banner" class:banner-cancelled={order.status === 'CANCELLED'}>
              <div class="status-pill-wrap">
                <span
                  class="status-pill"
                  class:status-pending={order.status === 'PENDING' || order.status === 'In Transit'}
                  class:status-confirmed={order.status === 'CONFIRMED'}
                  class:status-delivered={order.status === 'DELIVERED'}
                  class:status-cancelled={order.status === 'CANCELLED'}
                >
                  <span class="dot"></span>
                  {order.status === 'PENDING'
                    ? 'Processing'
                    : order.status === 'CONFIRMED'
                      ? 'Confirmed'
                      : order.status === 'DELIVERED'
                        ? 'Delivered'
                        : order.status === 'CANCELLED'
                          ? 'Cancelled'
                          : order.status}
                </span>
                <span class="delivery-text">{order.deliveryEstimate || 'Standard delivery in 2-4 days'}</span>
              </div>

              <!-- Top-level Actions -->
              <div class="order-actions">
                {#if order.status === 'PENDING' || order.status === 'CONFIRMED' || order.status === 'In Transit'}
                  {#if cancelConfirmId === order.id}
                    <div class="cancel-confirm-box">
                      <span class="confirm-prompt">Cancel this order?</span>
                      <button
                        type="button"
                        class="btn danger-btn small"
                        disabled={cancellingId === order.id}
                        onclick={() => handleCancelOrder(order.id)}
                      >
                        {cancellingId === order.id ? 'Cancelling…' : 'Yes, Cancel'}
                      </button>
                      <button
                        type="button"
                        class="btn ghost small"
                        onclick={() => (cancelConfirmId = null)}
                      >
                        No
                      </button>
                    </div>
                  {:else}
                    <button
                      type="button"
                      class="btn outline cancel-btn"
                      onclick={() => (cancelConfirmId = order.id)}
                    >
                      Cancel Order
                    </button>
                  {/if}
                {:else if order.status === 'CANCELLED'}
                  <span class="cancelled-tag">Order Cancelled</span>
                {/if}

                <button
                  type="button"
                  class="btn outline reorder-btn"
                  onclick={() => handleReorder(order)}
                >
                  Buy Again
                </button>
              </div>
            </div>

            <!-- Items List -->
            <div class="items-list">
              {#each order.items as item (item.productId || item.sku || item.productName)}
                <div class="item-row">
                  <div class="item-visual">
                    {#if item.imageUrl}
                      <img
                        src={item.imageUrl}
                        alt={item.productName}
                        onerror={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    {:else}
                      <div class="img-placeholder">
                        <span>SB</span>
                      </div>
                    {/if}
                  </div>

                  <div class="item-info">
                    <h3 class="product-title">{item.productName}</h3>
                    <div class="product-specs">
                      {#if item.sku}
                        <span class="sku-tag">SKU: {item.sku}</span>
                      {/if}
                      <span class="qty-tag">Quantity: {item.quantity}</span>
                      <span class="price-tag">{inr(item.unitPrice)} each</span>
                    </div>
                  </div>

                  <div class="item-subtotal">
                    <span class="subtotal-amount">{inr(item.totalPrice || item.unitPrice * item.quantity)}</span>
                  </div>
                </div>
              {/each}
            </div>

            <!-- Shipping address snippet footer -->
            <div class="card-address-footer">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                <circle cx="12" cy="10" r="3"></circle>
              </svg>
              <span>
                Delivery Address: <strong>{order.shippingAddress?.recipientName}</strong> ·
                {order.shippingAddress?.streetAddress}, {order.shippingAddress?.city} - {order.shippingAddress?.pincode}
                {#if order.shippingAddress?.phone}
                  (Phone: +91 {order.shippingAddress.phone})
                {/if}
              </span>
            </div>
          </div>
        </article>
      {/each}
    </div>
  {/if}
</div>

<style>
  .orders-page {
    padding: 32px 0 60px;
    max-width: 1040px;
    margin: 0 auto;
  }

  .breadcrumb {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 0.85rem;
    color: var(--muted);
    margin-bottom: 8px;
  }

  .breadcrumb a {
    color: var(--muted);
    text-decoration: none;
  }

  .breadcrumb a:hover {
    color: var(--accent);
  }

  .breadcrumb .curr {
    color: var(--ink);
    font-weight: 600;
  }

  .page-header {
    display: flex;
    flex-direction: column;
    gap: 20px;
    margin-bottom: 28px;
  }

  .header-titles h1 {
    font-size: 1.85rem;
    color: var(--ink);
    margin: 0 0 4px;
    letter-spacing: -0.02em;
  }

  .order-tabs {
    display: flex;
    gap: 8px;
    border-bottom: 1px solid var(--line);
    padding-bottom: 8px;
    overflow-x: auto;
  }

  .tab-btn {
    padding: 8px 16px;
    background: transparent;
    border: none;
    border-radius: var(--radius);
    font-size: 0.9rem;
    font-weight: 600;
    color: var(--muted);
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .tab-btn:hover {
    color: var(--ink);
    background: var(--surface-alt);
  }

  .tab-btn.active {
    color: var(--ink);
    background: #f0e9df;
  }

  .loading-state {
    text-align: center;
    padding: 60px 0;
    color: var(--muted);
  }

  .spinner {
    width: 32px;
    height: 32px;
    border: 3px solid var(--line);
    border-top-color: var(--accent);
    border-radius: 50%;
    margin: 0 auto 12px;
    animation: spin 0.8s linear infinite;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  .orders-empty-card {
    background: #fff;
    border: 1px solid var(--line);
    border-radius: var(--radius-lg);
    padding: 56px 24px;
    text-align: center;
  }

  .empty-icon-box {
    width: 72px;
    height: 72px;
    border-radius: 50%;
    background: #f4f0ea;
    color: var(--burgundy);
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 0 auto 16px;
  }

  .orders-empty-card h2 {
    margin: 0 0 8px;
    font-size: 1.4rem;
  }

  .orders-empty-card .muted {
    margin-bottom: 24px;
  }

  .orders-stack {
    display: flex;
    flex-direction: column;
    gap: 24px;
  }

  .order-card {
    background: #fff;
    border: 1px solid var(--line);
    border-radius: var(--radius-md);
    overflow: hidden;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.03);
  }

  .card-header {
    background: #f8f6f2;
    padding: 14px 20px;
    border-bottom: 1px solid var(--line);
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: 16px;
  }

  .meta-group {
    display: flex;
    align-items: center;
    gap: 28px;
    flex-wrap: wrap;
  }

  .meta-item {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .meta-label {
    font-size: 0.68rem;
    font-weight: 700;
    letter-spacing: 0.06em;
    color: var(--muted);
    text-transform: uppercase;
  }

  .meta-value {
    font-size: 0.88rem;
    font-weight: 600;
    color: var(--ink);
  }

  .meta-value.price {
    font-weight: 700;
    color: var(--ink);
  }

  .payment-badge {
    color: #4338ca;
    background: #eef2ff;
    padding: 2px 8px;
    border-radius: 4px;
    font-size: 0.78rem;
  }

  .order-id-group {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
  }

  .order-number {
    font-family: monospace;
    font-size: 0.92rem;
    font-weight: 700;
    color: var(--ink);
  }

  .card-body {
    padding: 20px;
  }

  .status-banner {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding-bottom: 16px;
    border-bottom: 1px solid var(--line);
    margin-bottom: 16px;
    flex-wrap: wrap;
    gap: 12px;
  }

  .status-pill-wrap {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .status-pill {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 4px 10px;
    border-radius: 999px;
    font-size: 0.8rem;
    font-weight: 700;
    text-transform: capitalize;
  }

  .status-pill .dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: currentColor;
  }

  .status-pending {
    background: #e0f2fe;
    color: #0369a1;
  }

  .status-confirmed {
    background: #ecfdf5;
    color: #047857;
  }

  .status-delivered {
    background: #f1f5f9;
    color: #475569;
  }

  .status-cancelled {
    background: #fef2f2;
    color: #b91c1c;
  }

  .delivery-text {
    font-size: 0.88rem;
    font-weight: 600;
    color: var(--ink);
  }

  .order-actions {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .btn.outline {
    background: transparent;
    border: 1px solid var(--line-strong);
    color: var(--ink);
    padding: 6px 14px;
    font-size: 0.82rem;
    font-weight: 600;
    border-radius: var(--radius);
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .btn.outline:hover {
    background: var(--surface-alt);
    border-color: var(--ink);
  }

  .cancel-btn:hover {
    color: #dc2626;
    border-color: #dc2626;
    background: #fef2f2;
  }

  .cancel-confirm-box {
    display: flex;
    align-items: center;
    gap: 8px;
    background: #fff5f5;
    padding: 4px 10px;
    border-radius: var(--radius);
    border: 1px solid #fecaca;
  }

  .confirm-prompt {
    font-size: 0.8rem;
    font-weight: 600;
    color: #b91c1c;
  }

  .danger-btn {
    background: #dc2626;
    color: #fff;
    border: none;
    padding: 4px 10px;
    border-radius: var(--radius-sm);
    font-size: 0.78rem;
    font-weight: 600;
    cursor: pointer;
  }

  .danger-btn:hover {
    background: #b91c1c;
  }

  .cancelled-tag {
    font-size: 0.82rem;
    font-weight: 600;
    color: #b91c1c;
    background: #fef2f2;
    padding: 4px 10px;
    border-radius: var(--radius-sm);
  }

  .items-list {
    display: flex;
    flex-direction: column;
    gap: 16px;
    margin-bottom: 18px;
  }

  .item-row {
    display: flex;
    align-items: center;
    gap: 16px;
  }

  .item-visual {
    width: 68px;
    height: 84px;
    border-radius: var(--radius-sm);
    border: 1px solid var(--line);
    overflow: hidden;
    background: #f8f6f2;
    flex-shrink: 0;
  }

  .item-visual img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .img-placeholder {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.8rem;
    font-weight: 700;
    color: var(--muted);
  }

  .item-info {
    flex: 1;
    min-width: 0;
  }

  .product-title {
    font-size: 0.95rem;
    font-weight: 600;
    color: var(--ink);
    margin: 0 0 6px;
    line-height: 1.35;
  }

  .product-specs {
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 0.82rem;
    color: var(--muted);
  }

  .sku-tag,
  .qty-tag {
    background: #f3f0e8;
    padding: 2px 7px;
    border-radius: 4px;
    color: #444;
  }

  .item-subtotal {
    font-size: 1.05rem;
    font-weight: 700;
    color: var(--ink);
  }

  .card-address-footer {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 0.82rem;
    color: var(--muted);
    padding-top: 14px;
    border-top: 1px dashed var(--line);
  }

  .card-address-footer svg {
    color: var(--line-strong);
    flex-shrink: 0;
  }

  .card-address-footer strong {
    color: var(--ink);
  }
</style>
