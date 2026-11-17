<script>
  import { signIn, signUp } from '../lib/api.js';
  import { setUser } from '../lib/session.js';
  import { navigate } from '../lib/router.js';

  let mode = $state('signin');
  let name = $state('');
  let email = $state('');
  let phone = $state('');
  let password = $state('');
  let busy = $state(false);
  let error = $state(null);

  const isSignUp = $derived(mode === 'signup');

  function switchMode(next) {
    if (busy) return;
    mode = next;
    error = null;
  }

  async function submit(event) {
    event.preventDefault();
    if (busy) return;
    error = null;

    if (isSignUp && name.trim().length < 2) {
      error = 'Enter your full name.';
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      error = 'Enter a valid email address.';
      return;
    }
    if (isSignUp && !/^[0-9]{10}$/.test(phone.trim())) {
      error = 'Enter a 10-digit phone number.';
      return;
    }
    if (password.length < 6) {
      error = 'Password must be at least 6 characters.';
      return;
    }

    busy = true;
    try {
      if (isSignUp) {
        await signUp({
          name: name.trim(),
          email: email.trim(),
          phone: phone.trim(),
          password,
        });
      }
      const account = await signIn({ email: email.trim(), password });
      setUser(account);
      navigate('/');
    } catch (caught) {
      error = caught.message;
    } finally {
      busy = false;
    }
  }
</script>

<div class="login-page">
  <div class="login-card">
    <div class="login-brand-head">
      <a class="logo login-logo" href="/">
        <span class="logo-mark">SB</span>
        <span class="logo-text">Simply<span class="logo-dot">.</span>Buy</span>
      </a>
      <span class="luxe-tag">STOREFRONT</span>
    </div>

    <h1>{isSignUp ? 'Create your account' : 'Sign in to shop'}</h1>
    <p class="muted small">
      {isSignUp
        ? 'Your bag, orders and wishlist are synced across your account.'
        : 'Sign in to access your bag, orders and curated collections.'}
    </p>

    <div class="segmented" role="tablist">
      <button
        type="button"
        role="tab"
        aria-selected={!isSignUp}
        class:on={!isSignUp}
        onclick={() => switchMode('signin')}
      >
        Sign in
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={isSignUp}
        class:on={isSignUp}
        onclick={() => switchMode('signup')}
      >
        Create account
      </button>
    </div>

    <form class="login-form" onsubmit={submit}>
      {#if isSignUp}
        <label class="field">
          <span>Full name</span>
          <input
            type="text"
            autocomplete="name"
            placeholder="Ada Lovelace"
            bind:value={name}
          />
        </label>
      {/if}

      <label class="field">
        <span>Email</span>
        <input
          type="email"
          autocomplete="email"
          placeholder="you@example.com"
          bind:value={email}
        />
      </label>

      {#if isSignUp}
        <label class="field">
          <span>Phone</span>
          <input
            type="tel"
            inputmode="numeric"
            maxlength="10"
            autocomplete="tel"
            placeholder="9876543210"
            bind:value={phone}
          />
        </label>
      {/if}

      <label class="field">
        <span>Password</span>
        <input
          type="password"
          autocomplete={isSignUp ? 'new-password' : 'current-password'}
          placeholder="••••••••"
          bind:value={password}
        />
      </label>

      {#if error}
        <p class="form-error" role="alert">{error}</p>
      {/if}

      <button class="btn primary login-submit" type="submit" disabled={busy}>
        {busy ? 'Please wait…' : isSignUp ? 'Create account and sign in' : 'Sign in'}
      </button>
    </form>

    <p class="muted small login-note">
      Sessions are kept in a secure HttpOnly cookie issued by the backend.
    </p>
  </div>
</div>
