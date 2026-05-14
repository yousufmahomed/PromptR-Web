import { Router } from 'express';
import crypto from 'crypto';
import pool from '../db/pool.js';
import { requireAuth } from '../middleware/auth.js';
import { TIER_CONFIG } from './user.js';

const router = Router();

/**
 * POST /api/yoco/create-checkout
 * Creates a Yoco checkout session for web payments
 * Requires authentication
 */
router.post('/create-checkout', requireAuth, async (req, res) => {
  try {
    const { uid, email } = req.user;
    const { tier } = req.body;

    if (!tier || !TIER_CONFIG[tier] || tier === 'free') {
      return res.status(400).json({ error: 'Invalid tier selection' });
    }

    const tierConfig = TIER_CONFIG[tier];

    // Get user from DB
    const userResult = await pool.query(
      'SELECT id FROM users WHERE firebase_uid = $1',
      [uid]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const userId = userResult.rows[0].id;

    // Create Yoco checkout via their API
    const response = await fetch('https://payments.yoco.com/api/checkouts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.YOCO_SECRET_KEY}`,
      },
      body: JSON.stringify({
        amount: tierConfig.price, // amount in cents
        currency: 'ZAR',
        metadata: {
          userId: userId,
          firebaseUid: uid,
          tier: tier,
        },
        successUrl: `${process.env.FRONTEND_URL}?payment=success&tier=${tier}`,
        cancelUrl: `${process.env.FRONTEND_URL}?payment=cancelled`,
        failureUrl: `${process.env.FRONTEND_URL}?payment=failed`,
      }),
    });

    if (!response.ok) {
      const errData = await response.text();
      console.error('Yoco checkout creation failed:', errData);
      return res.status(502).json({ error: 'Failed to create checkout session' });
    }

    const checkout = await response.json();

    // Log pending transaction
    await pool.query(
      `INSERT INTO transactions (user_id, provider, provider_transaction_id, tier, amount_cents, currency, status, metadata)
       VALUES ($1, 'yoco', $2, $3, $4, 'ZAR', 'pending', $5)`,
      [userId, checkout.id, tier, tierConfig.price, JSON.stringify({ checkoutId: checkout.id })]
    );

    res.json({
      checkoutUrl: checkout.redirectUrl,
      checkoutId: checkout.id,
    });
  } catch (err) {
    console.error('POST /yoco/create-checkout error:', err);
    res.status(500).json({ error: 'Failed to create payment session' });
  }
});

/**
 * POST /api/yoco/webhook
 * Yoco webhook handler for payment confirmations
 * No auth required – validated by webhook signature
 */
router.post('/webhook', async (req, res) => {
  try {
    // Verify webhook signature
    const signature = req.headers['yoco-signature'] || req.headers['x-yoco-signature'];
    const webhookSecret = process.env.YOCO_WEBHOOK_SECRET;

    if (webhookSecret && signature) {
      const rawBody = req.rawBody || JSON.stringify(req.body);
      const expectedSig = crypto
        .createHmac('sha256', webhookSecret)
        .update(rawBody)
        .digest('hex');

      if (signature !== expectedSig) {
        console.warn('Yoco webhook signature mismatch');
        return res.status(401).json({ error: 'Invalid webhook signature' });
      }
    }

    const event = req.body;
    console.log('Yoco webhook event:', event.type, event.id);

    // Handle payment.succeeded event
    if (event.type === 'payment.succeeded') {
      const { metadata } = event.payload || event;
      const checkoutId = event.payload?.metadata?.checkoutId || event.id;

      if (!metadata?.userId || !metadata?.tier) {
        console.warn('Webhook missing metadata:', metadata);
        return res.status(200).json({ received: true });
      }

      const { userId, tier, firebaseUid } = metadata;

      // Upgrade user
      await pool.query(
        `UPDATE users SET
           tier = $1,
           subscription_status = 'active',
           payment_provider = 'yoco',
           updated_at = NOW()
         WHERE id = $2`,
        [tier, userId]
      );

      // Update transaction status
      await pool.query(
        `UPDATE transactions SET status = 'completed'
         WHERE user_id = $1 AND provider = 'yoco' AND status = 'pending'
         AND tier = $2
         ORDER BY created_at DESC LIMIT 1`,
        [userId, tier]
      );

      console.log(`✅ User ${userId} upgraded to ${tier} via Yoco`);
    }

    res.status(200).json({ received: true });
  } catch (err) {
    console.error('Yoco webhook error:', err);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

export default router;
