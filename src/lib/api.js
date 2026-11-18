// Client for the Myntra-clone Spring Boot backend.
//
// Auth is a HttpOnly `jwt_token` cookie set by POST /auth/login, so every call
// goes out with `credentials: 'include'`. The token is never readable from JS.
const BASE = (import.meta.env && import.meta.env.VITE_API_BASE) || '';

export class ApiError extends Error {
  constructor(message, { status = 0, code = 'INTERNAL' } = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

let unauthorizedHandler = null;

/** Called by session.js so a dead cookie drops the UI back to the login page. */
export function onUnauthorized(handler) {
  unauthorizedHandler = handler;
}

async function call(path, { method = 'GET', params, body } = {}) {
  const url = new URL(`${BASE}${path}`, window.location.origin);

  for (const [key, value] of Object.entries(params ?? {})) {
    if (value === undefined || value === null || value === '') continue;
    url.searchParams.set(key, String(value));
  }

  let response;
  try {
    response = await fetch(url, {
      method,
      credentials: 'include',
      headers: {
        Accept: 'application/json',
        ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError(
      'Cannot reach the backend. Is the Spring Boot app running on http://localhost:8080?',
      { code: 'NETWORK' },
    );
  }

  const text = await response.text();
  let payload = null;
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = text;
    }
  }

  // A dev server without the /gateway proxy answers with index.html, which
  // would otherwise look like a successful call.
  if (typeof payload === 'string' && payload.trimStart().startsWith('<')) {
    throw new ApiError(
      'The backend returned an HTML page instead of JSON. Restart `npm run dev` so the /auth and /gateway proxy rules apply.',
      { status: response.status, code: 'BAD_RESPONSE' },
    );
  }

  if (response.status === 401) {
    unauthorizedHandler?.();
    throw new ApiError('Your session has expired. Please sign in again.', {
      status: 401,
      code: 'UNAUTHORIZED',
    });
  }

  if (!response.ok) {
    const backendSilent = payload === null || payload === '';
    const message = backendSilent
      ? `The backend is not responding (HTTP ${response.status}). Is Spring Boot running on http://localhost:8080?`
      : (payload && typeof payload === 'object' && (payload.message || payload.error)) ||
        `Request failed (HTTP ${response.status})`;
    throw new ApiError(String(message), {
      status: response.status,
      code: backendSilent
        ? 'BACKEND_DOWN'
        : typeof payload?.error === 'string'
          ? payload.error
          : 'INTERNAL',
    });
  }

  return payload;
}

/* ------------------------------- auth ------------------------------- */

export async function signUp({ name, email, phone, password }) {
  await call('/auth/signup', { method: 'POST', body: { name, email, phone, password } });
}

export async function signIn({ email, password }) {
  try {
    const data = await call('/auth/login', { method: 'POST', body: { email, password } });
    return {
      email: data?.email ?? email,
      username: data?.username ?? email.split('@')[0],
      phone: data?.phone ?? '',
    };
  } catch (error) {
    // The backend throws a plain RuntimeException for bad credentials, which
    // surfaces as HTTP 500 with no useful message. Transport failures must not
    // be reported as wrong credentials.
    if (['NETWORK', 'BAD_RESPONSE', 'BACKEND_DOWN'].includes(error.code)) throw error;
    throw new ApiError('That email and password do not match an account.', {
      status: error.status,
      code: 'INVALID_CREDENTIALS',
    });
  }
}

export async function signOut() {
  await call('/auth/logout', { method: 'POST' });
}

/**
 * The backend has no /auth/me, so the cheapest authenticated probe is the
 * catalogue listing (its controller calls getCurrentUserId, which 401s without
 * a valid JWT). Returns false only for a real 401; a network failure throws.
 */
export async function hasSession() {
  const data = await call('/gateway/v4/search/s', { params: { rows: 1 } });
  // Only a real list envelope proves the cookie was accepted.
  return Array.isArray(data?.products);
}

/* ------------------------------ catalog ----------------------------- */

/**
 * GET /gateway/v4/search/{categorySlug}
 * The backend matches the slug with LIKE %slug%, so "s" returns every product.
 * Response: { total, page, pageSize, products: ProductSummary[] }
 */
export async function getCategoryProducts(slug, { page = 1, rows = 200, brand } = {}) {
  const data = await call(`/gateway/v4/search/${encodeURIComponent(slug)}`, {
    params: { p: page, rows, f: brand ? `Brand:${brand}` : undefined },
  });
  return {
    total: Number(data?.total ?? 0),
    products: Array.isArray(data?.products) ? data.products : [],
  };
}

/** GET /gateway/v1/search/autosuggest?q= → { total, suggestions: [{ text, count }] } */
export async function getAutosuggest(term) {
  const data = await call('/gateway/v1/search/autosuggest', { params: { q: term } });
  return Array.isArray(data?.suggestions) ? data.suggestions : [];
}

/** GET /gateway/v2/product/{id}/details */
export async function getProductDetails(id) {
  return call(`/gateway/v2/product/${encodeURIComponent(id)}/details`);
}
