<script>
  import { onMount } from 'svelte';
  import { orders, ordersLoading, fetchUserOrders, cancelUserOrder } from '../lib/orders.js';
  import { inr } from '../lib/format.js';
  import { addToBag, openBag } from '../lib/bag.js';
  import { showToast } from '../lib/toast.js';

  let filterTab = $state('all'); // 'all' | 'confirmed' | 'cancelled' | 'delivered'
  let cancellingId = $state(null);
  let cancelConfirmId = $state(null);
  let trackingOrderId = $state(null);

  onMount(() => {
    fetchUserOrders();
  });

  const allOrdersList = $derived(Array.isArray($orders) ? $orders : []);

  const confirmedCount = $derived(
    allOrdersList.filter(
      (o) => o && (o.status === 'CONFIRMED' || o.status === 'PENDING' || o.status === 'IN TRANSIT')
    ).length
  );

  const cancelledCount = $derived(
    allOrdersList.filter((o) => o && o.status === 'CANCELLED').length
  );

  const deliveredCount = $derived(
    allOrdersList.filter((o) => o && o.status === 'DELIVERED').length
  );

  const filteredOrders = $derived.by(() => {
    if (filterTab === 'confirmed') {
      return allOrdersList.filter(
        (o) => o && (o.status === 'CONFIRMED' || o.status === 'PENDING' || o.status === 'IN TRANSIT')
      );
    }
    if (filterTab === 'cancelled') {
      return allOrdersList.filter((o) => o && o.status === 'CANCELLED');
    }
    if (filterTab === 'delivered') {
      return allOrdersList.filter((o) => o && o.status === 'DELIVERED');
    }
    return allOrdersList;
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
      return String(iso);
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
    if (!order || !Array.isArray(order.items) || order.items.length === 0) return;
    for (const it of order.items) {
      addToBag(
        {
          id: it.productId || it.id || 1,
          title: it.productName || it.title || 'Product',
          brand: 'Simply Buy',
          price: it.unitPrice || it.price || 399,
          mrp: (it.unitPrice || it.price || 399) * 1.3,
          images: it.imageUrl ? [it.imageUrl] : []
        },
        'M'
      );
    }
    showToast('Items added to your shopping bag.');
    openBag();
  }

  function copyOrderNumber(num) {
    navigator.clipboard?.writeText(num);
    showToast(`Order ID #${num} copied to clipboard!`);
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
      <div class="title-row">
        <h1>My Orders</h1>
        <span class="orders-count-badge">{allOrdersList.length} Total</span>
      </div>
      <p class="muted">Review order history, live shipment tracking, invoices, and cancellations.</p>
    </div>

    <!-- Elegant Tabs Bar with Tab for Confirmed & Cancelled -->
    <div class="order-tabs" role="tablist">
      <button
        type="button"
        role="tab"
        aria-selected={filterTab === 'all'}
        class="tab-btn"
        class:active={filterTab === 'all'}
        onclick={() => (filterTab = 'all')}
      >
        <span class="tab-label">All Orders</span>
        <span class="tab-badge">{allOrdersList.length}</span>
      </button>

      <button
        type="button"
        role="tab"
        aria-selected={filterTab === 'confirmed'}
        class="tab-btn"
        class:active={filterTab === 'confirmed'}
        onclick={() => (filterTab = 'confirmed')}
      >
        <span class="tab-label">Confirmed</span>
        <span class="tab-badge badge-confirmed">{confirmedCount}</span>
      </button>

      <button
        type="button"
        role="tab"
        aria-selected={filterTab === 'cancelled'}
        class="tab-btn"
        class:active={filterTab === 'cancelled'}
        onclick={() => (filterTab = 'cancelled')}
      >
        <span class="tab-label">Cancelled</span>
        <span class="tab-badge badge-cancelled">{cancelledCount}</span>
      </button>

      <button
        type="button"
        role="tab"
        aria-selected={filterTab === 'delivered'}
        class="tab-btn"
        class:active={filterTab === 'delivered'}
        onclick={() => (filterTab = 'delivered')}
      >
        <span class="tab-label">Delivered</span>
        <span class="tab-badge">{deliveredCount}</span>
      </button>
    </div>
  </div>

  {#if $ordersLoading && allOrdersList.length === 0}
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
      <h2>No orders found in this tab</h2>
      <p class="muted">
        {#if filterTab === 'confirmed'}
          You currently have no active or confirmed orders.
        {:else if filterTab === 'cancelled'}
          You have not cancelled any orders.
        {:else if filterTab === 'delivered'}
          No orders have been marked as delivered yet.
        {:else}
          You haven't placed any orders yet. Discover trending styles now.
        {/if}
      </p>
      {#if filterTab !== 'all'}
        <button class="btn outline" type="button" onclick={() => (filterTab = 'all')}>
          View All Orders
        </button>
      {:else}
        <a class="btn primary" href="/products">Explore Catalogue</a>
      {/if}
    </div>
  {:else}
    <div class="orders-stack">
      {#each filteredOrders as order, orderIdx (order.orderNumber || order.id || `order-${orderIdx}`)}
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
                <span class="meta-value payment-badge" class:rzp-pay={order.paymentMethod !== 'COD'}>
                  {#if order.paymentMethod === 'COD'}
                    💵 Cash on Delivery
                  {:else}
                    ⚡ Online (Razorpay)
                  {/if}
                </span>
              </div>
              <div class="meta-item ship-to">
                <span class="meta-label">SHIP TO</span>
                <span class="meta-value">{order.shippingAddress?.recipientName || 'Customer'}</span>
              </div>
            </div>

            <div class="order-id-group">
              <span class="meta-label">ORDER ID</span>
              <button
                type="button"
                class="order-number-btn"
                title="Click to copy Order ID"
                onclick={() => copyOrderNumber(order.orderNumber || order.id)}
              >
                #{order.orderNumber || order.id}
                <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                </svg>
              </button>
            </div>
          </div>

          <!-- Card Body -->
          <div class="card-body">
            <!-- Status & Delivery Banner -->
            <div
              class="status-banner"
              class:banner-cancelled={order.status === 'CANCELLED'}
              class:banner-confirmed={order.status === 'CONFIRMED' || order.status === 'PENDING' || order.status === 'IN TRANSIT'}
            >
              <div class="status-pill-wrap">
                <span
                  class="status-pill"
                  class:status-pending={order.status === 'PENDING' || order.status === 'IN TRANSIT'}
                  class:status-confirmed={order.status === 'CONFIRMED'}
                  class:status-delivered={order.status === 'DELIVERED'}
                  class:status-cancelled={order.status === 'CANCELLED'}
                >
                  <span class="pulse-dot"></span>
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

              <!-- Action Buttons -->
              <div class="order-actions">
                {#if order.status === 'PENDING' || order.status === 'CONFIRMED' || order.status === 'IN TRANSIT'}
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
                  class="btn outline track-btn"
                  onclick={() => (trackingOrderId = trackingOrderId === order.id ? null : order.id)}
                >
                  {trackingOrderId === order.id ? 'Hide Details' : 'Track Order'}
                </button>

                <button
                  type="button"
                  class="btn outline reorder-btn"
                  onclick={() => handleReorder(order)}
                >
                  Buy Again
                </button>
              </div>
            </div>

            <!-- Expandable Shipment Timeline -->
            {#if trackingOrderId === order.id}
              <div class="timeline-tracker">
                <div class="tracker-step" class:completed={order.status !== 'CANCELLED'}>
                  <div class="step-icon">✓</div>
                  <div class="step-label">Order Placed</div>
                  <div class="step-date">{formatDate(order.date)}</div>
                </div>
                <div class="tracker-line" class:completed={order.status === 'CONFIRMED' || order.status === 'DELIVERED'}></div>
                <div class="tracker-step" class:completed={order.status === 'CONFIRMED' || order.status === 'DELIVERED'}>
                  <div class="step-icon">✓</div>
                  <div class="step-label">Confirmed</div>
                  <div class="step-date">{order.status === 'CANCELLED' ? 'N/A' : 'Processed'}</div>
                </div>
                <div class="tracker-line" class:completed={order.status === 'DELIVERED'}></div>
                <div class="tracker-step" class:completed={order.status === 'DELIVERED'} class:cancelled={order.status === 'CANCELLED'}>
                  <div class="step-icon">{order.status === 'CANCELLED' ? '✕' : '🚚'}</div>
                  <div class="step-label">{order.status === 'CANCELLED' ? 'Cancelled' : 'In Transit'}</div>
                  <div class="step-date">{order.status === 'CANCELLED' ? 'Void' : 'On Schedule'}</div>
                </div>
                <div class="tracker-line" class:completed={order.status === 'DELIVERED'}></div>
                <div class="tracker-step" class:completed={order.status === 'DELIVERED'}>
                  <div class="step-icon">📦</div>
                  <div class="step-label">Delivered</div>
                  <div class="step-date">{order.status === 'DELIVERED' ? 'Complete' : 'Expected'}</div>
                </div>
              </div>
            {/if}

            <!-- Items List -->
            <div class="items-list">
              {#each (order.items || []) as item, itemIdx (item.productId || item.sku || `item-${itemIdx}`)}
                <div class="item-row">
                  <div class="item-visual">
                    {#if item.imageUrl}
                      <img
                        src={item.imageUrl}
                        alt={item.productName || 'Product'}
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
                    <span class="item-brand-label">SIMPLY BUY CURATED</span>
                    <h3 class="product-title">{item.productName || 'Curated Product'}</h3>
                    <div class="product-specs">
                      {#if item.sku}
                        <span class="sku-tag">SKU: {item.sku}</span>
                      {/if}
                      <span class="qty-tag">Qty: {item.quantity || 1}</span>
                      <span class="price-tag">{inr(item.unitPrice || 0)} each</span>
                    </div>
                  </div>

                  <div class="item-subtotal">
                    <span class="subtotal-amount">
                      {inr(item.totalPrice || (item.unitPrice || 0) * (item.quantity || 1))}
                    </span>
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
                Shipping to: <strong>{order.shippingAddress?.recipientName || 'Customer'}</strong> ·
                {order.shippingAddress?.streetAddress || ''}, {order.shippingAddress?.city || ''}
                {#if order.shippingAddress?.pincode}
                  - {order.shippingAddress.pincode}
                {/if}
                {#if order.shippingAddress?.phone}
                  (Contact: +91 {order.shippingAddress.phone})
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

  .title-row {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .header-titles h1 {
    font-size: 2rem;
    font-family: 'Playfair Display', Georgia, serif;
    color: var(--ink);
    margin: 0;
    letter-spacing: -0.02em;
  }

  .orders-count-badge {
    font-size: 0.78rem;
    font-weight: 700;
    color: var(--burgundy);
    background: #fdf2f2;
    padding: 3px 10px;
    border-radius: 999px;
    border: 1px solid #fecaca;
  }

  /* Elegant Tabs */
  .order-tabs {
    display: flex;
    gap: 10px;
    border-bottom: 1.5px solid var(--line);
    padding-bottom: 8px;
    overflow-x: auto;
  }

  .tab-btn {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 9px 18px;
    background: transparent;
    border: none;
    border-radius: var(--radius);
    font-size: 0.92rem;
    font-weight: 600;
    color: var(--muted);
    cursor: pointer;
    transition: all 0.18s ease;
  }

  .tab-btn:hover {
    color: var(--ink);
    background: var(--surface-alt);
  }

  .tab-btn.active {
    color: var(--ink);
    background: #f3ede2;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  }

  .tab-badge {
    font-size: 0.72rem;
    font-weight: 700;
    padding: 2px 7px;
    border-radius: 999px;
    background: #e8e2d8;
    color: var(--ink);
  }

  .tab-btn.active .tab-badge {
    background: var(--ink);
    color: #fff;
  }

  .tab-badge.badge-confirmed {
    background: #ecfdf5;
    color: #047857;
  }

  .tab-btn.active .tab-badge.badge-confirmed {
    background: #047857;
    color: #fff;
  }

  .tab-badge.badge-cancelled {
    background: #fef2f2;
    color: #b91c1c;
  }

  .tab-btn.active .tab-badge.badge-cancelled {
    background: #b91c1c;
    color: #fff;
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
    font-size: 1.35rem;
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
    border-radius: var(--radius-lg);
    overflow: hidden;
    box-shadow: 0 3px 12px rgba(0, 0, 0, 0.03);
    transition: transform 0.15s ease, box-shadow 0.15s ease;
  }

  .order-card:hover {
    box-shadow: 0 6px 20px rgba(0, 0, 0, 0.05);
  }

  .card-header {
    background: #f9f7f4;
    padding: 14px 22px;
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
    font-size: 0.95rem;
    color: var(--ink);
  }

  .payment-badge {
    color: #4338ca;
    background: #eef2ff;
    padding: 2px 8px;
    border-radius: 4px;
    font-size: 0.78rem;
  }

  .payment-badge.rzp-pay {
    color: #0369a1;
    background: #e0f2fe;
    font-weight: 700;
  }

  .order-id-group {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
  }

  .order-number-btn {
    border: none;
    background: transparent;
    font-family: monospace;
    font-size: 0.95rem;
    font-weight: 700;
    color: var(--ink);
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 2px 6px;
    border-radius: 4px;
    transition: background 0.15s ease;
  }

  .order-number-btn:hover {
    background: #ede8df;
    color: var(--burgundy);
  }

  .card-body {
    padding: 22px;
  }

  .status-banner {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px 16px;
    background: #fbfbfb;
    border: 1px solid var(--line);
    border-radius: var(--radius-md);
    margin-bottom: 20px;
    flex-wrap: wrap;
    gap: 12px;
  }

  .status-banner.banner-confirmed {
    background: #f6fcf9;
    border-color: #d1fae5;
  }

  .status-banner.banner-cancelled {
    background: #fff8f8;
    border-color: #fee2e2;
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
    padding: 4px 12px;
    border-radius: 999px;
    font-size: 0.8rem;
    font-weight: 700;
    text-transform: capitalize;
  }

  .pulse-dot {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: currentColor;
    animation: pulse 1.8s infinite;
  }

  @keyframes pulse {
    0% { transform: scale(0.95); opacity: 0.8; }
    50% { transform: scale(1.2); opacity: 1; }
    100% { transform: scale(0.95); opacity: 0.8; }
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
    font-size: 0.9rem;
    font-weight: 600;
    color: var(--ink);
  }

  .order-actions {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .btn.outline {
    background: #fff;
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

  /* Interactive Shipment Timeline */
  .timeline-tracker {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px 20px;
    background: #faf8f5;
    border-radius: var(--radius-md);
    margin-bottom: 20px;
    border: 1px dashed var(--line);
  }

  .tracker-step {
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
  }

  .step-icon {
    width: 28px;
    height: 28px;
    border-radius: 50%;
    background: #e2e8f0;
    color: #64748b;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.8rem;
    font-weight: 700;
    margin-bottom: 6px;
  }

  .tracker-step.completed .step-icon {
    background: #047857;
    color: #fff;
  }

  .tracker-step.cancelled .step-icon {
    background: #dc2626;
    color: #fff;
  }

  .step-label {
    font-size: 0.78rem;
    font-weight: 600;
    color: var(--ink);
  }

  .step-date {
    font-size: 0.7rem;
    color: var(--muted);
  }

  .tracker-line {
    flex: 1;
    height: 3px;
    background: #e2e8f0;
    margin: 0 10px 18px;
  }

  .tracker-line.completed {
    background: #047857;
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
    width: 72px;
    height: 88px;
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
    transition: transform 0.25s ease;
  }

  .item-visual:hover img {
    transform: scale(1.05);
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

  .item-brand-label {
    display: block;
    font-size: 0.68rem;
    font-weight: 700;
    letter-spacing: 0.08em;
    color: var(--burgundy);
    margin-bottom: 2px;
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
