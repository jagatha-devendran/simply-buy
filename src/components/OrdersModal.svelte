<script>
  import { orders } from '../lib/orders.js';
  import { inr } from '../lib/format.js';
  import { navigate } from '../lib/router.js';

  let { open = false, onclose = () => {} } = $props();

  function formatDate(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    return d.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  }
</script>

{#if open}
  <div class="modal-backdrop" role="dialog" aria-modal="true" aria-label="Your Orders" tabindex="-1">
    <div class="modal-card orders-modal-card">
      <div class="modal-head">
        <div class="modal-title-wrap">
          <div class="icon-avatar">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect>
              <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path>
            </svg>
          </div>
          <div>
            <h2>Your Orders</h2>
            <p class="modal-subhead">Track shipments, view invoices, and repeat orders</p>
          </div>
        </div>
        <button type="button" class="close-btn" onclick={onclose} aria-label="Close">
          <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" stroke-width="2" fill="none">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>

      <div class="orders-body">
        {#if $orders.length === 0}
          <div class="orders-empty">
            <div class="empty-icon-wrap">
              <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="currentColor" stroke-width="1.5">
                <circle cx="12" cy="12" r="10"></circle>
                <path d="M8 12h8"></path>
              </svg>
            </div>
            <h3>No orders placed yet</h3>
            <p class="muted">Explore our curated collections and place your first order.</p>
            <button
              class="btn primary"
              type="button"
              onclick={() => {
                onclose();
                navigate('/products');
              }}
            >
              Start Shopping
            </button>
          </div>
        {:else}
          <div class="orders-list">
            {#each $orders as order (order.id)}
              <div class="order-card">
                <div class="order-header-strip">
                  <div class="order-meta">
                    <span class="order-id">Order <strong>#{order.id}</strong></span>
                    <span class="meta-dot">·</span>
                    <span class="order-date">Placed on {formatDate(order.date)}</span>
                  </div>
                  <div class="order-status-badge" class:in-transit={order.status === 'In Transit'}>
                    <span class="status-indicator"></span>
                    {order.status}
                  </div>
                </div>

                <div class="order-tracking-banner">
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="1" y="3" width="15" height="13"></rect>
                    <polygon points="16 8 20 8 23 11 23 16 16 16 16 8"></polygon>
                    <circle cx="5.5" cy="18.5" r="2.5"></circle>
                    <circle cx="18.5" cy="18.5" r="2.5"></circle>
                  </svg>
                  <span>{order.deliveryEstimate}</span>
                </div>

                <div class="order-items-preview">
                  {#each order.items as item (item.id)}
                    <div class="order-item-row">
                      {#if item.image}
                        <img
                          src={item.image}
                          alt={item.title}
                          class="order-item-img"
                          onerror={(e) => {
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                      {/if}
                      <div class="order-item-details">
                        <span class="order-item-brand">{item.brand}</span>
                        <h4 class="order-item-name">{item.title}</h4>
                        <div class="order-item-specs">
                          {#if item.size}
                            <span class="spec-pill">Size: {item.size}</span>
                          {/if}
                          <span class="spec-pill">Qty: {item.quantity}</span>
                          <span class="spec-price">{inr(item.price * item.quantity)}</span>
                        </div>
                      </div>
                    </div>
                  {/each}
                </div>

                <div class="order-footer">
                  <div class="delivery-address-snippet">
                    <span class="label">Delivering to:</span>
                    <span class="addr-text">
                      {order.shippingAddress?.fullName}, {order.shippingAddress?.city} ({order.shippingAddress?.pincode})
                    </span>
                  </div>
                  <div class="order-total-block">
                    <span class="total-label">Total Paid:</span>
                    <span class="total-val">{inr(order.totalAmount)}</span>
                  </div>
                </div>
              </div>
            {/each}
          </div>
        {/if}
      </div>
    </div>
  </div>
{/if}

<style>
  .orders-modal-card {
    max-width: 680px;
    width: 95%;
    max-height: 88vh;
    display: flex;
    flex-direction: column;
  }

  .icon-avatar {
    width: 38px;
    height: 38px;
    border-radius: 50%;
    background: #f0e6da;
    color: var(--burgundy);
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .modal-subhead {
    font-size: 0.8rem;
    color: var(--muted);
    margin: 2px 0 0;
  }

  .orders-body {
    overflow-y: auto;
    padding: 20px;
    max-height: calc(88vh - 80px);
  }

  .orders-empty {
    text-align: center;
    padding: 48px 24px;
  }

  .empty-icon-wrap {
    color: var(--muted);
    margin-bottom: 12px;
  }

  .orders-empty h3 {
    margin-bottom: 6px;
    font-size: 1.15rem;
  }

  .orders-empty .muted {
    margin-bottom: 20px;
  }

  .orders-list {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .order-card {
    border: 1px solid var(--line);
    border-radius: var(--radius-md);
    background: #fff;
    padding: 16px;
    box-shadow: 0 2px 6px rgba(0,0,0,0.02);
  }

  .order-header-strip {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding-bottom: 12px;
    border-bottom: 1px solid var(--line);
  }

  .order-meta {
    font-size: 0.85rem;
    color: var(--ink);
  }

  .meta-dot {
    margin: 0 6px;
    color: var(--line-strong);
  }

  .order-date {
    color: var(--muted);
  }

  .order-status-badge {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: 0.78rem;
    font-weight: 600;
    padding: 4px 10px;
    border-radius: 999px;
    background: #edf7ed;
    color: #1e4620;
  }

  .order-status-badge.in-transit {
    background: #eef4ff;
    color: #1d4ed8;
  }

  .status-indicator {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: currentColor;
  }

  .order-tracking-banner {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 0.82rem;
    color: #2b5c2a;
    background: #f4faf4;
    padding: 8px 12px;
    border-radius: var(--radius-sm);
    margin: 12px 0;
  }

  .order-items-preview {
    display: flex;
    flex-direction: column;
    gap: 12px;
    margin-bottom: 14px;
  }

  .order-item-row {
    display: flex;
    gap: 12px;
    align-items: center;
  }

  .order-item-img {
    width: 52px;
    height: 64px;
    object-fit: cover;
    border-radius: var(--radius-sm);
    border: 1px solid var(--line);
    flex-shrink: 0;
  }

  .order-item-details {
    flex: 1;
    min-width: 0;
  }

  .order-item-brand {
    font-size: 0.72rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--burgundy);
  }

  .order-item-name {
    font-size: 0.85rem;
    font-weight: 500;
    color: var(--ink);
    margin: 2px 0 6px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .order-item-specs {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 0.78rem;
  }

  .spec-pill {
    background: #f4f2ee;
    padding: 2px 6px;
    border-radius: 4px;
    color: #555;
  }

  .spec-price {
    font-weight: 600;
    color: var(--ink);
    margin-left: auto;
  }

  .order-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding-top: 12px;
    border-top: 1px dashed var(--line);
    font-size: 0.82rem;
  }

  .delivery-address-snippet .label {
    color: var(--muted);
    margin-right: 4px;
  }

  .delivery-address-snippet .addr-text {
    font-weight: 500;
    color: var(--ink);
  }

  .order-total-block {
    display: flex;
    align-items: baseline;
    gap: 6px;
  }

  .total-label {
    color: var(--muted);
  }

  .total-val {
    font-size: 1.05rem;
    font-weight: 700;
    color: var(--ink);
  }
</style>
