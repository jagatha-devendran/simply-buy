<script>
  import SearchBox from './SearchBox.svelte';
  import { location, queryValue } from '../lib/router.js';
  import { user, signOut } from '../lib/session.js';
  import { wishlist } from '../lib/wishlist.js';
  import { bagSummary, openBag } from '../lib/bag.js';
  import { orders } from '../lib/orders.js';

  let profileOpen = $state(false);

  const searchTerm = $derived(queryValue($location.split('?')[1] ?? '', 'q'));

  const initials = $derived.by(() => {
    const name = $user?.username ?? $user?.email ?? '?';
    return name
      .split(/[\s.@_-]+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? '')
      .join('');
  });

  const wishlistCount = $derived($wishlist.length);
  const bagCount = $derived($bagSummary.itemCount);
  const currentPath = $derived($location.split('?')[0]);

  function toggleProfile(e) {
    e.stopPropagation();
    profileOpen = !profileOpen;
  }

  function closeProfile() {
    profileOpen = false;
  }

  function handleKeydown(e) {
    if (e.key === 'Escape') profileOpen = false;
  }
</script>

<svelte:window onclick={closeProfile} onkeydown={handleKeydown} />

<header class="site-header">
  <div class="shell header-inner">
    <a class="logo" href="/">
      <span class="logo-mark">SB</span>
      <span class="logo-text">Simply<span class="logo-dot">.</span>Buy</span>
    </a>

    <nav class="header-nav-links" aria-label="Main Navigation">
      <a class="nav-link" class:active={currentPath === '/'} href="/">Home</a>
      <a class="nav-link" class:active={currentPath === '/products'} href="/products">All Products</a>
      <a class="nav-link" href="/products?category=watches">Watches</a>
      <a class="nav-link" href="/products?category=casual-shoes">Shoes</a>
      <a class="nav-link" href="/products?category=tshirts">T-Shirts</a>
      <a class="nav-link" href="/products?category=dresses">Dresses</a>
    </nav>

    <SearchBox initialValue={searchTerm} />

    <div class="header-actions">
      <!-- Wishlist Link with Badge -->
      <a
        class="header-icon-btn"
        class:active={currentPath === '/wishlist'}
        href="/wishlist"
        aria-label={`Wishlist (${wishlistCount} items)`}
        title="Wishlist"
      >
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
        </svg>
        {#if wishlistCount > 0}
          <span class="header-badge">{wishlistCount}</span>
        {/if}
        <span class="icon-label">Wishlist</span>
      </a>

      <!-- Bag Button with Badge -->
      <button
        type="button"
        class="header-icon-btn bag-btn"
        onclick={openBag}
        aria-label={`Shopping Bag (${bagCount} items)`}
        title="Shopping Bag"
      >
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path>
          <line x1="3" y1="6" x2="21" y2="6"></line>
          <path d="M16 10a4 4 0 0 1-8 0"></path>
        </svg>
        {#if bagCount > 0}
          <span class="header-badge count-bounce">{bagCount}</span>
        {/if}
        <span class="icon-label">Bag</span>
      </button>

      <!-- Interactive Profile Dropdown Trigger -->
      <div class="profile-dropdown-wrapper">
        <button
          type="button"
          class="account-btn"
          class:open={profileOpen}
          onclick={toggleProfile}
          aria-haspopup="true"
          aria-expanded={profileOpen}
          aria-label="User profile and account menu"
        >
          <span class="avatar" aria-hidden="true">{initials}</span>
          <div class="account-details">
            <span class="account-name">{$user?.username ?? 'Guest'}</span>
            <span class="account-sub">My Account</span>
          </div>
          <svg class="chevron" class:rotated={profileOpen} viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5">
            <polyline points="6 9 12 15 18 9"></polyline>
          </svg>
        </button>

        {#if profileOpen}
          <!-- svelte-ignore a11y_click_events_have_key_events -->
          <!-- svelte-ignore a11y_no_static_element_interactions -->
          <div
            class="profile-popover"
            role="menu"
            tabindex="-1"
            onclick={(e) => e.stopPropagation()}
          >
            <!-- User Banner -->
            <div class="popover-user-card">
              <div class="user-avatar-lg">{initials}</div>
              <div class="user-meta">
                <span class="user-display-name">{$user?.username ?? 'Jagatha D'}</span>
                <span class="user-email">{$user?.email ?? 'jagathadevam965@gmail.com'}</span>
              </div>
            </div>

            <div class="menu-divider"></div>

            <!-- Menu List -->
            <div class="popover-nav">
              <!-- Your Orders -->
              <a
                href="/orders"
                class="menu-item"
                role="menuitem"
                onclick={() => (profileOpen = false)}
              >
                <span class="menu-icon orders-icon">
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect>
                    <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path>
                  </svg>
                </span>
                <div class="menu-text">
                  <span class="menu-title">Your Orders</span>
                  <span class="menu-desc">Track shipments & past orders</span>
                </div>
                {#if $orders.length > 0}
                  <span class="menu-badge count">{$orders.length}</span>
                {/if}
              </a>

              <!-- Wishlist -->
              <a
                href="/wishlist"
                class="menu-item"
                role="menuitem"
                onclick={() => (profileOpen = false)}
              >
                <span class="menu-icon wishlist-icon">
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
                  </svg>
                </span>
                <div class="menu-text">
                  <span class="menu-title">Wishlist</span>
                  <span class="menu-desc">Items you saved for later</span>
                </div>
                {#if wishlistCount > 0}
                  <span class="menu-badge count">{wishlistCount}</span>
                {/if}
              </a>

              <!-- Saved Addresses -->
              <a
                href="/addresses"
                class="menu-item"
                role="menuitem"
                onclick={() => (profileOpen = false)}
              >
                <span class="menu-icon address-icon">
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                    <circle cx="12" cy="10" r="3"></circle>
                  </svg>
                </span>
                <div class="menu-text">
                  <span class="menu-title">Saved Addresses</span>
                  <span class="menu-desc">Manage delivery locations</span>
                </div>
              </a>
            </div>

            <div class="menu-divider"></div>

            <!-- Logout Section -->
            <button
              type="button"
              class="menu-item logout-btn"
              role="menuitem"
              onclick={() => {
                profileOpen = false;
                signOut();
              }}
            >
              <span class="menu-icon logout-icon">
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                  <polyline points="16 17 21 12 16 7"></polyline>
                  <line x1="21" y1="12" x2="9" y2="12"></line>
                </svg>
              </span>
              <div class="menu-text">
                <span class="menu-title logout-text">Logout</span>
                <span class="menu-desc">Sign out from your account</span>
              </div>
            </button>
          </div>
        {/if}
      </div>
    </div>
  </div>
</header>

<style>
  .profile-dropdown-wrapper {
    position: relative;
  }

  .account-btn {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 4px 10px 4px 6px;
    border-radius: var(--radius);
    border: 1px solid transparent;
    background: transparent;
    cursor: pointer;
    transition: all 0.2s ease;
    user-select: none;
    text-align: left;
  }

  .account-btn:hover,
  .account-btn.open {
    background: var(--surface-alt);
    border-color: var(--line);
  }

  .account-details {
    display: flex;
    flex-direction: column;
    line-height: 1.2;
  }

  .account-name {
    font-size: 13px;
    font-weight: 600;
    color: var(--ink);
    max-width: 95px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .account-sub {
    font-size: 11px;
    color: var(--muted);
  }

  .chevron {
    color: var(--muted);
    transition: transform 0.2s ease;
    margin-left: 2px;
  }

  .chevron.rotated {
    transform: rotate(180deg);
  }

  /* Popover Menu */
  .profile-popover {
    position: absolute;
    top: calc(100% + 8px);
    right: 0;
    width: 290px;
    background: #ffffff;
    border-radius: var(--radius-md);
    box-shadow: 0 14px 40px rgba(0, 0, 0, 0.12), 0 4px 12px rgba(0, 0, 0, 0.06);
    border: 1px solid var(--line);
    padding: 10px 0;
    z-index: 1000;
    animation: popoverFadeIn 0.18s cubic-bezier(0.16, 1, 0.3, 1);
  }

  @keyframes popoverFadeIn {
    from {
      opacity: 0;
      transform: translateY(-6px) scale(0.98);
    }
    to {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
  }

  .popover-user-card {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 16px;
  }

  .user-avatar-lg {
    width: 44px;
    height: 44px;
    border-radius: 50%;
    background: linear-gradient(135deg, #f0e6da 0%, #e2d3c1 100%);
    color: var(--burgundy);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 15px;
    font-weight: 700;
    flex-shrink: 0;
    border: 2px solid #fff;
    box-shadow: 0 2px 6px rgba(0,0,0,0.08);
  }

  .user-meta {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
  }

  .user-display-name {
    font-size: 14px;
    font-weight: 700;
    color: var(--ink);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .user-email {
    font-size: 11.5px;
    color: var(--muted);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    margin: 1px 0 5px;
  }

  .menu-divider {
    height: 1px;
    background: var(--line);
    margin: 6px 0;
  }

  .popover-nav {
    display: flex;
    flex-direction: column;
  }

  .menu-item {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 9px 16px;
    width: 100%;
    border: none;
    background: transparent;
    cursor: pointer;
    text-align: left;
    text-decoration: none;
    transition: background 0.15s ease;
    box-sizing: border-box;
  }

  .menu-item:hover {
    background: #f8f6f2;
  }

  .menu-icon {
    width: 32px;
    height: 32px;
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #f4f2ee;
    color: var(--ink);
    flex-shrink: 0;
    transition: transform 0.15s ease;
  }

  .menu-item:hover .menu-icon {
    transform: scale(1.05);
  }

  .orders-icon {
    color: #0284c7;
    background: #f0f9ff;
  }

  .wishlist-icon {
    color: var(--accent);
    background: #fff1f2;
  }

  .address-icon {
    color: #16a34a;
    background: #f0fdf4;
  }

  .logout-icon {
    color: #dc2626;
    background: #fef2f2;
  }

  .menu-text {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
  }

  .menu-title {
    font-size: 13px;
    font-weight: 600;
    color: var(--ink);
  }

  .menu-desc {
    font-size: 11px;
    color: var(--muted);
  }

  .menu-badge.count {
    font-size: 11px;
    font-weight: 700;
    padding: 2px 7px;
    background: #f2eee6;
    color: var(--ink);
    border-radius: 999px;
  }

  .logout-btn:hover {
    background: #fff5f5;
  }

  .logout-text {
    color: #dc2626;
  }
</style>
