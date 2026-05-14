export interface TierInfo {
  maxVideos: number | null; // null = unlimited
  price: number; // in cents (USD)
  label: string;
  watermark: boolean;
}

export const TIER_CONFIG: Record<string, TierInfo> = {
  free: { maxVideos: 10, price: 0, label: 'Free', watermark: true },
  creator: { maxVideos: 50, price: 2500, label: 'Creator ($25)', watermark: false },
  pro: { maxVideos: null, price: 5000, label: 'Pro ($50)', watermark: false },
  studio: { maxVideos: null, price: 10000, label: 'Studio ($100)', watermark: false },
};

export function canRecord(tier: string, videoCount: number): boolean {
  const config = TIER_CONFIG[tier] || TIER_CONFIG.free;
  if (config.maxVideos === null) return true;
  return videoCount < config.maxVideos;
}
