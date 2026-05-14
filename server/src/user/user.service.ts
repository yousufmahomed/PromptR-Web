import { Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TIER_CONFIG, canRecord } from '../common/tier-config';

@Injectable()
export class UserService {
  constructor(private prisma: PrismaService) {}

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
    });
    const config = TIER_CONFIG[user.tier] || TIER_CONFIG.free;
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      tier: user.tier,
      videoCount: user.videoCount,
      maxVideos: config.maxVideos,
      canRecord: canRecord(user.tier, user.videoCount),
      watermark: config.watermark,
    };
  }

  async incrementVideoCount(userId: string) {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
    });
    const config = TIER_CONFIG[user.tier] || TIER_CONFIG.free;

    if (!canRecord(user.tier, user.videoCount)) {
      throw new ForbiddenException({
        error: 'Video limit reached',
        tier: user.tier,
        videoCount: user.videoCount,
        maxVideos: config.maxVideos,
      });
    }

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { videoCount: { increment: 1 } },
    });

    const newConfig = TIER_CONFIG[updated.tier] || TIER_CONFIG.free;
    return {
      videoCount: updated.videoCount,
      maxVideos: newConfig.maxVideos,
      canRecord: canRecord(updated.tier, updated.videoCount),
    };
  }

  async getTierInfo(userId: string) {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
    });
    const config = TIER_CONFIG[user.tier] || TIER_CONFIG.free;
    return {
      tier: user.tier,
      label: config.label,
      maxVideos: config.maxVideos,
      videoCount: user.videoCount,
      canRecord: canRecord(user.tier, user.videoCount),
      watermark: config.watermark,
      availableUpgrades: Object.entries(TIER_CONFIG)
        .filter(([key]) => key !== 'free' && key !== user.tier)
        .map(([key, val]) => ({
          tier: key,
          label: val.label,
          price: val.price,
          maxVideos: val.maxVideos,
        })),
    };
  }
}
