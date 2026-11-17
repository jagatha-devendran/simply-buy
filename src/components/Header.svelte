<script>
  import SearchBox from './SearchBox.svelte';
  import { location, queryValue } from '../lib/router.js';
  import { user, signOut } from '../lib/session.js';
  import { wishlist } from '../lib/wishlist.js';
  import { bagSummary, openBag } from '../lib/bag.js';

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
</script>

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

      <!-- Account Profile & Sign Out -->
      <div class="account">
        <span class="avatar" aria-hidden="true">{initials}</span>
        <div class="account-details">
          <span class="account-name">{$user?.username ?? 'Guest'}</span>
          <button class="signout-link" type="button" onclick={signOut}>Sign out</button>
        </div>
      </div>
    </div>
  </div>
</header>
