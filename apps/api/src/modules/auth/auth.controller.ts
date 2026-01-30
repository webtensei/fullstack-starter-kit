import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Res,
  Get,
  UseGuards,
} from '@nestjs/common';
import { Response } from 'express';
import { AuthService } from './auth.service';
import { LoginDto, RegisterDto, Tokens } from '@shared';
import { Cookie } from '../../common/decorators/cookie.decorator';
import { UserAgent } from '../../common/decorators/user-agent.decorator';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtPayload } from '@shared';

const REFRESH_TOKEN = 'refreshtokenmarketplacertenseimp';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  async register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() dto: LoginDto,
    @UserAgent() agent: string,
    @Res() res: Response,
  ) {
    const tokens = await this.authService.login(dto, agent);
    this.setRefreshTokenToCookies(tokens, res);
    return res.json({ accessToken: tokens.accessToken });
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refreshTokens(
    @Cookie(REFRESH_TOKEN) refreshToken: string,
    @UserAgent() agent: string,
    @Res() res: Response,
  ) {
    if (!refreshToken) {
      return res.status(HttpStatus.UNAUTHORIZED).json({ message: 'Refresh token required' });
    }

    const tokens = await this.authService.refreshTokens(refreshToken, agent);
    this.setRefreshTokenToCookies(tokens, res);
    return res.json({ accessToken: tokens.accessToken });
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(@Cookie(REFRESH_TOKEN) refreshToken: string, @Res() res: Response) {
    if (refreshToken) {
      await this.authService.deleteRefreshToken(refreshToken);
    }
    res.cookie(REFRESH_TOKEN, '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      expires: new Date(),
      path: '/',
    });
    return res.json({ message: 'Logged out successfully' });
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async getMe(@CurrentUser() user: JwtPayload) {
    return user;
  }

  private setRefreshTokenToCookies(tokens: Tokens, res: Response) {
    if (!tokens) {
      throw new Error('Tokens are required');
    }

    const expiresAt = new Date(tokens.refreshToken.expires_at);
    res.cookie(REFRESH_TOKEN, tokens.refreshToken.token, {
      httpOnly: true,
      sameSite: 'lax',
      expires: expiresAt,
      secure: process.env.NODE_ENV === 'production',
      path: '/',
    });
  }
}
