import {
  Controller,
  Post,
  Body,
  UseGuards,
  Request,
  Headers,
  Req,
} from '@nestjs/common';
import { PurchaseService } from './purchase.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { IsNotEmpty, IsString, IsOptional } from 'class-validator';

class CreateYocoCheckoutDto {
  @IsNotEmpty()
  @IsString()
  tier: string;
}

class GooglePlayPurchaseDto {
  @IsNotEmpty()
  @IsString()
  purchaseToken: string;

  @IsNotEmpty()
  @IsString()
  productId: string;

  @IsOptional()
  @IsString()
  platform?: string;
}

@Controller('purchase')
export class PurchaseController {
  constructor(private purchaseService: PurchaseService) {}

  /**
   * POST /purchase/yoco — Create Yoco checkout session
   */
  @UseGuards(JwtAuthGuard)
  @Post('yoco')
  async createYocoCheckout(
    @Request() req: any,
    @Body() dto: CreateYocoCheckoutDto,
  ) {
    return this.purchaseService.createYocoCheckout(req.user.id, dto.tier);
  }

  /**
   * POST /purchase/yoco/webhook — Yoco webhook handler (no auth)
   */
  @Post('yoco/webhook')
  async yocoWebhook(
    @Req() req: any,
    @Headers('yoco-signature') yocoSig?: string,
    @Headers('x-yoco-signature') xYocoSig?: string,
  ) {
    const rawBody = req.rawBody
      ? Buffer.from(req.rawBody).toString('utf8')
      : JSON.stringify(req.body);
    const signature = yocoSig || xYocoSig;
    return this.purchaseService.handleYocoWebhook(rawBody, signature);
  }

  /**
   * POST /purchase/google-play — Validate Google Play purchase
   */
  @UseGuards(JwtAuthGuard)
  @Post('google-play')
  async validateGooglePlayPurchase(
    @Request() req: any,
    @Body() dto: GooglePlayPurchaseDto,
  ) {
    return this.purchaseService.validateGooglePlayPurchase(
      req.user.id,
      dto.purchaseToken,
      dto.productId,
    );
  }
}
