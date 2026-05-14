import {
  Injectable,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { TIER_CONFIG, canRecord } from '../common/tier-config';
import * as crypto from 'crypto';

@Injectable()
export class PurchaseService {
  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
  ) {}

  /**
   * Create a Yoco checkout session for web payments
   */
  async createYocoCheckout(userId: string, tier: string) {
    if (!tier || !TIER_CONFIG[tier] || tier === 'free') {
      throw new BadRequestException('Invalid tier selection');
    }

    const tierConfig = TIER_CONFIG[tier];
    const yocoSecretKey = this.config.get<string>('YOCO_SECRET_KEY');
    const frontendUrl = this.config.get<string>(
      'FRONTEND_URL',
      'http://localhost:5173',
    );

    if (!yocoSecretKey) {
      throw new InternalServerErrorException(
        'Yoco payment not configured on server',
      );
    }

    // Create Yoco checkout via their API
    const response = await fetch('https://payments.yoco.com/api/checkouts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${yocoSecretKey}`,
      },
      body: JSON.stringify({
        amount: tierConfig.price, // amount in cents
        currency: 'ZAR',
        metadata: {
          userId,
          tier,
        },
        successUrl: `${frontendUrl}?payment=success&tier=${tier}`,
        cancelUrl: `${frontendUrl}?payment=cancelled`,
        failureUrl: `${frontendUrl}?payment=failed`,
      }),
    });

    if (!response.ok) {
      const errData = await response.text();
      console.error('Yoco checkout creation failed:', errData);
      throw new InternalServerErrorException(
        'Failed to create checkout session',
      );
    }

    const checkout = await response.json();

    // Log pending transaction
    await this.prisma.purchase.create({
      data: {
        userId,
        tier,
        amount: tierConfig.price,
        paymentMethod: 'yoco',
        transactionId: checkout.id,
        status: 'pending',
      },
    });

    return {
      checkoutUrl: checkout.redirectUrl,
      checkoutId: checkout.id,
    };
  }

  /**
   * Handle Yoco webhook event
   */
  async handleYocoWebhook(rawBody: string, signature: string | undefined) {
    const webhookSecret = this.config.get<string>('YOCO_WEBHOOK_SECRET');

    // Verify signature if configured
    if (webhookSecret && signature) {
      const expectedSig = crypto
        .createHmac('sha256', webhookSecret)
        .update(rawBody)
        .digest('hex');

      if (signature !== expectedSig) {
        throw new BadRequestException('Invalid webhook signature');
      }
    }

    const event = JSON.parse(rawBody);
    console.log('Yoco webhook event:', event.type, event.id);

    if (event.type === 'payment.succeeded') {
      const metadata = event.payload?.metadata || event.metadata;

      if (!metadata?.userId || !metadata?.tier) {
        console.warn('Webhook missing metadata:', metadata);
        return { received: true };
      }

      const { userId, tier } = metadata;
      const tierConfig = TIER_CONFIG[tier];
      if (!tierConfig) {
        console.warn('Unknown tier in webhook:', tier);
        return { received: true };
      }

      // Upgrade user tier
      await this.prisma.user.update({
        where: { id: userId },
        data: { tier },
      });

      // Mark purchase completed
      await this.prisma.purchase.updateMany({
        where: {
          userId,
          paymentMethod: 'yoco',
          status: 'pending',
          tier,
        },
        data: { status: 'completed' },
      });

      console.log(`✅ User ${userId} upgraded to ${tier} via Yoco`);
    }

    return { received: true };
  }

  /**
   * Validate Google Play purchase and upgrade tier
   */
  async validateGooglePlayPurchase(
    userId: string,
    purchaseToken: string,
    productId: string,
  ) {
    // Map product IDs to tiers
    const productToTier: Record<string, string> = {
      promptr_creator: 'creator',
      promptr_pro: 'pro',
      promptr_studio: 'studio',
    };

    const newTier = productToTier[productId];
    if (!newTier) {
      throw new BadRequestException('Unknown product ID: ' + productId);
    }

    const tierConfig = TIER_CONFIG[newTier];

    // In production, verify with Google Play Developer API:
    // const { google } = await import('googleapis');
    // const androidPublisher = google.androidpublisher('v3');
    // const purchaseInfo = await androidPublisher.purchases.products.get({
    //   packageName: process.env.GOOGLE_PLAY_PACKAGE_NAME,
    //   productId: productId,
    //   token: purchaseToken,
    // });

    // Upgrade user tier
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: { tier: newTier },
    });

    // Log purchase
    await this.prisma.purchase.create({
      data: {
        userId,
        tier: newTier,
        amount: tierConfig.price,
        paymentMethod: 'google_play',
        transactionId: purchaseToken,
        status: 'completed',
      },
    });

    return {
      success: true,
      tier: newTier,
      videoCount: user.videoCount,
      maxVideos: tierConfig.maxVideos,
      canRecord: canRecord(newTier, user.videoCount),
    };
  }
}
