/**
 * PromptR API Client
 * Communicates with the NestJS backend using JWT authentication.
 */

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';

// JWT token stored in memory (and localStorage for persistence)
let jwtToken = localStorage.getItem('promptr_jwt') || null;

export function setToken(token) {
  jwtToken = token;
  if (token) {
    localStorage.setItem('promptr_jwt', token);
  } else {
    localStorage.removeItem('promptr_jwt');
  }
}

export function getToken() {
  return jwtToken;
}

export function clearToken() {
  jwtToken = null;
  localStorage.removeItem('promptr_jwt');
}

/**
 * Helper to make authenticated API requests
 */
async function authFetch(path, options = {}) {
  if (!jwtToken) throw new Error('Not authenticated');

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${jwtToken}`,
      ...(options.headers || {}),
    },
  });

  const data = await res.json();

  if (!res.ok) {
    const err = new Error(data.message || data.error || 'API request failed');
    err.status = res.status;
    err.data = data;
    throw err;
  }

  return data;
}

/**
 * POST /auth/google — Send Google ID token, get JWT + user
 */
export async function loginWithGoogle(idToken) {
  const res = await fetch(`${API_BASE}/auth/google`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ idToken }),
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.message || 'Google login failed');
  }

  // Store JWT
  setToken(data.token);
  return data;
}

/**
 * GET /user/me — Fetch current user profile
 */
export async function fetchUserProfile() {
  return authFetch('/user/me');
}

/**
 * POST /user/increment-video — Increment video count after recording
 */
export async function incrementVideoCount() {
  return authFetch('/user/increment-video', { method: 'POST' });
}

/**
 * GET /user/tier — Get tier info and entitlements
 */
export async function fetchTierInfo() {
  return authFetch('/user/tier');
}

/**
 * POST /purchase/yoco — Create Yoco checkout session
 */
export async function createYocoCheckout(tier) {
  return authFetch('/purchase/yoco', {
    method: 'POST',
    body: JSON.stringify({ tier }),
  });
}

/**
 * POST /purchase/google-play — Validate Google Play purchase
 */
export async function verifyPurchase(purchaseToken, productId, platform = 'android') {
  return authFetch('/purchase/google-play', {
    method: 'POST',
    body: JSON.stringify({ purchaseToken, productId, platform }),
  });
}
