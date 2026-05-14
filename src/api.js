import { auth } from './firebase.js';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';

/**
 * Helper to make authenticated API requests
 */
async function authFetch(path, options = {}) {
  const user = auth.currentUser;
  if (!user) throw new Error('Not authenticated');

  const token = await user.getIdToken();

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      ...(options.headers || {}),
    },
  });

  const data = await res.json();

  if (!res.ok) {
    const err = new Error(data.error || 'API request failed');
    err.status = res.status;
    err.data = data;
    throw err;
  }

  return data;
}

/**
 * Fetch user profile (creates user on first call)
 */
export async function fetchUserProfile() {
  return authFetch('/api/user/profile');
}

/**
 * Increment video count after recording
 */
export async function incrementVideoCount() {
  return authFetch('/api/user/increment-video', { method: 'POST' });
}

/**
 * Verify a Google Play purchase
 */
export async function verifyPurchase(purchaseToken, productId, platform = 'android') {
  return authFetch('/api/user/verify-purchase', {
    method: 'POST',
    body: JSON.stringify({ purchaseToken, productId, platform }),
  });
}

/**
 * Create a Yoco checkout session for web payments
 */
export async function createYocoCheckout(tier) {
  return authFetch('/api/yoco/create-checkout', {
    method: 'POST',
    body: JSON.stringify({ tier }),
  });
}
