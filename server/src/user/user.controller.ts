import { Controller, Get, Post, UseGuards, Request } from '@nestjs/common';
import { UserService } from './user.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('user')
export class UserController {
  constructor(private userService: UserService) {}

  /**
   * GET /user/me — Get current user info
   */
  @UseGuards(JwtAuthGuard)
  @Get('me')
  async getMe(@Request() req: any) {
    return this.userService.getProfile(req.user.id);
  }

  /**
   * POST /user/increment-video — Increment video count and check limits
   */
  @UseGuards(JwtAuthGuard)
  @Post('increment-video')
  async incrementVideo(@Request() req: any) {
    return this.userService.incrementVideoCount(req.user.id);
  }

  /**
   * GET /user/tier — Get user's current tier and entitlements
   */
  @UseGuards(JwtAuthGuard)
  @Get('tier')
  async getTier(@Request() req: any) {
    return this.userService.getTierInfo(req.user.id);
  }
}
