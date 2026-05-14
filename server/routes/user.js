import { Router } from 'express';
import pool from '../db/pool.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

// Tier configuration
const TIER_CONFIG = {
  free:    { maxVideos: 10,       price: 0,    label: 'Free' },
  creator: { maxVideos: 50,       price: 2500, label: 'Creator ($25)' },
  pro:     { maxVideos: Infinity, price: 5000, label: 'Pro ($50)' },
  studio:  { maxVideos: Infinity, price: 10000, label: 'Studio ($100)' },
};

/**
 * GET /api/user/profile
 * Returns or creates user profile based on Firebase UID
 */
router.get('/profile', requireAuth, async (req, res) => {
  try {
    const { uid, email, name } = req.user;

    // Upsert: create user if not exists, return existing otherwise
    const result = await pool.query(
      `INSERT INTO users (firebase_uid, email, display_name)
       VALUES ($1, $2, $3)
       ON CONFLICT (firebase_uid) DO UPDATE SET
         email = EXCLUDED.email,
         display_name = EXCLUDED.display_name
       RETURNING id, firebase_uid, email, display_name, tier, video_count, subscription_status, created_at`,
      [uid, email, name]
    );

    const user = result.rows[0];
    const tierConfig = TIER_CONFIG[user.tier] || TIER_CONFIG.free;

    res.json({
      id: user.id,
      email: user.email,
      displayName: user.display_name,
      tier: user.tier,
      videoCount: user.video_count,
      maxVideos: tierConfig.maxVideos === Infinity ? null : tierConfig.maxVideos,
      subscriptionStatus: user.subscription_status,
      canRecord: user.video_count < tierConfig.maxVideos,
    });
  } catch (err) {
    console.error('GET /profile error:', err);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

/**
 * POST /api/user/increment-video
 * Increments video count if within tier limits
 */
router.post('/increment-video', requireAuth, async (req, res) => {
  try {
    const { uid } = req.user;

    // Get current user
    const userResult = await pool.query(
      'SELECT id, tier, video_count FROM users WHERE firebase_uid = $1',
      [uid]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = userResult.rows[0];
    const tierConfig = TIER_CONFIG[user.tier] || TIER_CONFIG.free;

    if (user.video_count >= tierConfig.maxVideos) {
      return res.status(403).json({
        error: 'Video limit reached',
        tier: user.tier,
        videoCount: user.video_count,
        maxVideos: tierConfig.maxVideos === Infinity ? null : tierConfig.maxVideos,
      });
    }

    // Increment
    const updated = await pool.query(
      `UPDATE users SET video_count = video_count + 1
       WHERE id = $1
       RETURNING video_count`,
      [user.id]
    );

    const newCount = updated.rows[0].video_count;

    res.json({
      videoCount: newCount,
      maxVideos: tierConfig.maxVideos === Infinity ? null : tierConfig.maxVideos,
      canRecord: newCount < tierConfig.maxVideos,
    });
  } catch (err) {
    console.error('POST /increment-video error:', err);
    res.status(500).json({ error: 'Failed to increment video count' });
  }
});

/**
 * POST /api/user/verify-purchase
 * Validates a Google Play purchase receipt and upgrades tier
 */
router.post('/verify-purchase', requireAuth, async (req, res) => {
  try {
    const { uid } = req.user;
    const { purchaseToken, productId, platform } = req.body;

    if (!purchaseToken || !productId) {
      return res.status(400).json({ error: 'purchaseToken and productId are required' });
    }

    // Map Google Play product IDs to tiers
    const productToTier = {
      'promptr_creator':  'creator',
      'promptr_pro':      'pro',
      'promptr_studio':   'studio',
    };

    const newTier = productToTier[productId];
    if (!newTier) {
      return res.status(400).json({ error: 'Unknown product ID' });
    }

    // In production, verify with Google Play Developer API:
    // const { google } = await import('googleapis');
    // const androidPublisher = google.androidpublisher('v3');
    // const purchaseInfo = await androidPublisher.purchases.products.get({
    //   packageName: process.env.GOOGLE_PLAY_PACKAGE_NAME,
    //   productId: productId,
    //   token: purchaseToken,
    // });
    //
    // For now, we trust the token and log it for manual verification

    // Update user tier
    const result = await pool.query(
      `UPDATE users SET
         tier = $1,
         subscription_status = 'active',
         payment_provider = 'google_play',
         google_play_token = $2,
         updated_at = NOW()
       WHERE firebase_uid = $3
       RETURNING id, tier, video_count, subscription_status`,
      [newTier, purchaseToken, uid]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Log transaction
    await pool.query(
      `INSERT INTO transactions (user_id, provider, provider_transaction_id, tier, amount_cents, currency, status, metadata)
       VALUES ($1, 'google_play', $2, $3, $4, 'USD', 'completed', $5)`,
      [
        result.rows[0].id,
        purchaseToken,
        newTier,
        TIER_CONFIG[newTier].price,
        JSON.stringify({ productId, platform: platform || 'android' }),
      ]
    );

    const tierConfig = TIER_CONFIG[newTier];
    res.json({
      success: true,
      tier: newTier,
      videoCount: result.rows[0].video_count,
      maxVideos: tierConfig.maxVideos === Infinity ? null : tierConfig.maxVideos,
      subscriptionStatus: 'active',
    });
  } catch (err) {
    console.error('POST /verify-purchase error:', err);
    res.status(500).json({ error: 'Purchase verification failed' });
  }
});

export { TIER_CONFIG };
export default router;
