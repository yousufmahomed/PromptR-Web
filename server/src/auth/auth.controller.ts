import { Controller, Post, Body } from '@nestjs/common';
import { AuthService } from './auth.service';
import { IsNotEmpty, IsString } from 'class-validator';

class GoogleLoginDto {
  @IsNotEmpty()
  @IsString()
  idToken: string;
}

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  /**
   * POST /auth/google
   * Accepts a Google ID token, validates it, upserts user, returns JWT
   */
  @Post('google')
  async googleLogin(@Body() dto: GoogleLoginDto) {
    const { token, user } = await this.authService.googleLogin(dto.idToken);
    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        tier: user.tier,
        videoCount: user.videoCount,
      },
    };
  }
}
