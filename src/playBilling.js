import { Capacitor, registerPlugin } from '@capacitor/core';
import { verifyPurchase } from './api.js';

/**
 * PlayBilling — Capacitor native bridge for Google Play in-app purchases.
 * On web, falls back to Yoco payment flow (handled in App.jsx).
 */
const PlayBilling = Capacitor.isNativePlatform()
  ? registerPlugin('PlayBilling')
  : null;

// Product ID mapping to tier names
const PRODUCT_IDS = {
  creator: 'promptr_creator',
  pro: 'promptr_pro',
  studio: 'promptr_studio',
};

/**
 * Initiate a Google Play purchase on Android.
 * Returns the verified tier data from the backend, or throws on failure.
 */
export async function purchaseOnAndroid(tier) {
  if (!PlayBilling) {
    throw new Error('Google Play Billing is only available on Android');
  }

  const productId = PRODUCT_IDS[tier];
  if (!productId) {
    throw new Error(`Unknown tier: ${tier}`);
  }

  // Launch the native purchase flow
  const result = await PlayBilling.purchase({ productId });

  // Verify the purchase with the backend
  const verified = await verifyPurchase(
    result.purchaseToken,
    result.productId,
    'android'
  );

  return verified;
}

/**
 * Check if we're on native Android (for conditional UI logic)
 */
export function isAndroid() {
  return Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android';
}
