import { writable, get } from 'svelte/store';
import { hasSession, onUnauthorized, signOut as apiSignOut } from './api.js';

// Only the display name is stored; the JWT itself stays in the HttpOnly cookie.
const KEY = 'simplybuy.user';

function read() {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

const stored = read();

export const user = writable(stored);
// Nothing to verify when there is no stored session.
export const sessionChecked = writable(!stored);

export function setUser(account) {
  localStorage.setItem(KEY, JSON.stringify(account));
  user.set(account);
  sessionChecked.set(true);
}

export function clearUser() {
  localStorage.removeItem(KEY);
  user.set(null);
  sessionChecked.set(true);
}

// A 401 from any request means the cookie is gone or expired.
onUnauthorized(() => {
  const current = get(user);
  if (!current?.isDemo) {
    clearUser();
  }
});

/**
 * localStorage can outlive the JWT cookie, so a stored name alone must never be
 * treated as a session for real backend users. Probe the API before the app renders anything private.
 */
export async function restoreSession() {
  const current = get(user);
  if (!current) {
    sessionChecked.set(true);
    return;
  }

  // Preserve demo guest session without requiring Spring Boot backend
  if (current.isDemo) {
    sessionChecked.set(true);
    return;
  }

  try {
    const valid = await hasSession();
    if (!valid) clearUser();
  } catch {
    // Unreachable backend, HTML fallback, expired cookie
    clearUser();
  }
  sessionChecked.set(true);
}

export async function signOut() {
  const current = get(user);
  if (!current?.isDemo) {
    try {
      await apiSignOut();
    } catch {
      // The cookie may already be invalid; clearing local state is enough.
    }
  }
  clearUser();
}
