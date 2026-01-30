import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { PrismaModule } from '../../common/prisma/prisma.module';
import { jwtModuleAsyncOptions } from './config/jwt-module-async-options';

@Module({
  imports: [
    PassportModule,
    ConfigModule,
    JwtModule.registerAsync(jwtModuleAsyncOptions()),
    PrismaModule,
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
  exports: [AuthService],
})
export class AuthModule {}
