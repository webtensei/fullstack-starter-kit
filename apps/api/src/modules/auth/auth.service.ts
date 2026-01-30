import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { LoginDto, RegisterDto, JwtPayload, Tokens, Token } from '@shared';
import { User, Token as PrismaToken } from '@prisma/client';
import { compareSync, hashSync } from 'bcrypt';
import { v4 } from 'uuid';
import { add } from 'date-fns';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly prismaService: PrismaService,
  ) {}

  async register(dto: RegisterDto): Promise<Omit<User, 'password'>> {
    const existingUser = await this.prismaService.user.findUnique({
      where: { username: dto.username },
    });

    if (existingUser) {
      throw new ConflictException('Пользователь с таким username уже зарегистрирован');
    }

    const hashedPassword = hashSync(dto.password, 10);
    const user = await this.prismaService.user.create({
      data: {
        username: dto.username,
        password: hashedPassword,
      },
      select: {
        id: true,
        username: true,
        is_activated: true,
        is_blocked: true,
        roles: true,
        name: true,
        surname: true,
        patronymic: true,
        phone: true,
        creation_date: true,
        updated_at: true,
      },
    });

    return user;
  }

  async login(dto: LoginDto, agent: string): Promise<Tokens> {
    const user = await this.prismaService.user.findUnique({
      where: { username: dto.username },
    });

    if (!user || !compareSync(dto.password, user.password)) {
      throw new UnauthorizedException('Неверный логин или пароль');
    }

    if (user.is_blocked) {
      throw new UnauthorizedException('Пользователь заблокирован');
    }

    return this.generateTokens(user, agent);
  }

  async refreshTokens(refreshToken: string, agent: string): Promise<Tokens> {
    const token = await this.prismaService.token.findUnique({
      where: { token: refreshToken },
      include: { user: true },
    });

    if (!token || new Date(token.expires_at) < new Date()) {
      throw new UnauthorizedException('Недействительный refresh token');
    }

    const user = token.user;
    if (user.is_blocked) {
      throw new UnauthorizedException('Пользователь заблокирован');
    }

    // Delete old token
    await this.prismaService.token.delete({
      where: { token: refreshToken },
    });

    return this.generateTokens(user, agent);
  }

  async deleteRefreshToken(token: string): Promise<void> {
    await this.prismaService.token.delete({
      where: { token },
    }).catch(() => {
      // Ignore if token doesn't exist
    });
  }

  private async generateTokens(user: User, agent: string): Promise<Tokens> {
    const payload: JwtPayload & { jti: string } = {
      id: user.id,
      username: user.username,
      roles: user.roles,
      jti: v4(),
    };

    const accessToken = 'Bearer ' + this.jwtService.sign(payload);
    const refreshToken = await this.getRefreshToken(user.id, agent);

    return {
      accessToken,
      refreshToken: this.mapTokenToDto(refreshToken),
    };
  }

  private async getRefreshToken(user_id: string, user_agent: string): Promise<PrismaToken> {
    const existingToken = await this.prismaService.token.findFirst({
      where: {
        user_id,
        user_agent,
      },
    });

    const expiresAt = add(new Date(), { months: 1 });

    if (existingToken) {
      return this.prismaService.token.update({
        where: { id: existingToken.id },
        data: {
          token: v4(),
          expires_at: expiresAt,
        },
      });
    }

    return this.prismaService.token.create({
      data: {
        token: v4(),
        expires_at: expiresAt,
        user_agent: user_agent,
        user_id: user_id,
      },
    });
  }

  private mapTokenToDto(token: PrismaToken): Token {
    return {
      id: token.id,
      token: token.token,
      expires_at: token.expires_at.toISOString(),
      creation_date: token.creation_date.toISOString(),
      user_id: token.user_id,
      user_agent: token.user_agent,
    };
  }
}
