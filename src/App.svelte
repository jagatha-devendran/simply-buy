<script>
  import { onMount } from 'svelte';
  import Header from './components/Header.svelte';
  import Login from './routes/Login.svelte';
  import Home from './routes/Home.svelte';
  import Listing from './routes/Listing.svelte';
  import ProductDetail from './routes/ProductDetail.svelte';
  import Wishlist from './routes/Wishlist.svelte';
  import BagDrawer from './components/BagDrawer.svelte';
  import CheckoutModal from './components/CheckoutModal.svelte';
  import OrdersModal from './components/OrdersModal.svelte';
  import ToastContainer from './components/ToastContainer.svelte';
  import { location } from './lib/router.js';
  import { sessionChecked, restoreSession, user } from './lib/session.js';

  let checkoutOpen = $state(false);
  let ordersOpen = $state(false);

  const route = $derived(parseRoute($location));

  onMount(() => {
    restoreSession();
  });

  function parseRoute(url) {
    const pathname = url.split('?')[0];
    if (pathname === '/' || pathname === '') return { name: 'home' };
    if (pathname === '/products') return { name: 'listing' };
    if (pathname === '/wishlist') return { name: 'wishlist' };
    const detail = pathname.match(/^\/product\/([^/]+)$/);
    if (detail) return { name: 'product', id: detail[1] };
    return { name: 'missing' };
  }
</script>

{#if !$sessionChecked}
  <div class="boot">
    <div class="boot-spinner">
      <span class="logo-mark">SB</span>
    </div>
    <p class="muted small">Connecting to Simply Buy…</p>
  </div>
{:else if !$user}
  <Login />
{:else}
  <Header onopenorders={() => (ordersOpen = true)} />

  <main>
    {#if route.name === 'home'}
      <Home />
    {:else if route.name === 'listing'}
      <Listing />
    {:else if route.name === 'product'}
      <ProductDetail id={route.id} />
    {:else if route.name === 'wishlist'}
      <Wishlist />
    {:else}
      <div class="shell empty-page">
        <p class="eyebrow">404</p>
        <h1>Page not found</h1>
        <p class="muted">The address you requested is not part of Simply Buy.</p>
        <a class="btn primary" href="/">Back to home</a>
      </div>
    {/if}
  </main>

  <!-- Slide-over Bag Drawer -->
  <BagDrawer oncheckout={() => (checkoutOpen = true)} />

  <!-- Checkout Flow Modal -->
  <CheckoutModal open={checkoutOpen} onclose={() => (checkoutOpen = false)} />

  <!-- Orders History Modal -->
  <OrdersModal open={ordersOpen} onclose={() => (ordersOpen = false)} />

  <!-- Interactive Toast Notification Stack -->
  <ToastContainer />

  <footer class="site-footer">
    <div class="shell footer-grid">
      <div class="footer-col brand-col">
        <div class="logo">
          <span class="logo-mark">SB</span>
          <span class="logo-text">Simply<span class="logo-dot">.</span>Buy</span>
        </div>
        <p class="footer-tagline">
          Curated everyday fashion and luxury essentials at fair prices. No inflated markups, only honest craftsmanship.
        </p>
      </div>

      <div class="footer-col">
        <h4>Shop Categories</h4>
        <ul>
          <li><a href="/products?category=watches">Watches & Horology</a></li>
          <li><a href="/products?category=casual-shoes">Casual & Sport Shoes</a></li>
          <li><a href="/products?category=tshirts">T-Shirts & Polos</a></li>
          <li><a href="/products?category=dresses">Dresses & Occasion</a></li>
          <li><a href="/products?category=water-bottles">Lifestyle Essentials</a></li>
        </ul>
      </div>

      <div class="footer-col">
        <h4>Customer Care</h4>
        <ul>
          <li><a href="/products">Track Your Order</a></li>
          <li><a href="/products">14-Day Free Returns</a></li>
          <li><a href="/products">Authenticity Guarantee</a></li>
          <li><a href="/products">Size & Fit Guide</a></li>
        </ul>
      </div>

      <div class="footer-col">
        <h4>Experience</h4>
        <div class="footer-badges">
          <div class="badge-item">
            <span class="badge-icon">🚚</span>
            <span>Free Express Delivery over ₹999</span>
          </div>
          <div class="badge-item">
            <span class="badge-icon">🔒</span>
            <span>100% Encrypted & Secure Checkout</span>
          </div>
          <div class="badge-item">
            <span class="badge-icon">✨</span>
            <span>Hand-Inspected Quality Check</span>
          </div>
        </div>
      </div>
    </div>

    <div class="shell footer-bottom">
      <p>© 2026 Simply Buy. All rights reserved. Prices in INR, inclusive of taxes.</p>
      <div class="footer-meta-links">
        <a href="/">Privacy Policy</a>
        <span>·</span>
        <a href="/">Terms of Service</a>
        <span>·</span>
        <a href="/">Security</a>
      </div>
    </div>
  </footer>
{/if}
