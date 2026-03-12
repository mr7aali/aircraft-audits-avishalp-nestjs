import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { AuthService } from './auth.service.js';
import { LoginDto } from './dto/login.dto.js';
import { RefreshTokenDto } from './dto/refresh-token.dto.js';
import { LogoutDto } from './dto/logout.dto.js';
import { ForgotPasswordRequestDto } from './dto/forgot-password-request.dto.js';
import { ForgotPasswordConfirmDto } from './dto/forgot-password-confirm.dto.js';
import { ForgotUidRequestDto } from './dto/forgot-uid-request.dto.js';
import { Public } from '../../common/decorators/public.decorator.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { AuthenticatedUser } from '../../common/types/authenticated-user.type.js';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { ttl: 60_000, limit: 10 } })
  @Post('login')
  async login(@Body() dto: LoginDto, @Req() request: Request) {
    return this.authService.login(dto, request);
  }

  @Public()
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { ttl: 60_000, limit: 15 } })
  @Post('refresh')
  async refresh(@Body() dto: RefreshTokenDto) {
    return this.authService.refresh(dto);
  }

  @ApiBearerAuth()
  @Post('logout')
  @HttpCode(200)
  async logout(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: LogoutDto,
  ): Promise<{ success: boolean }> {
    await this.authService.logout(user, dto);
    return { success: true };
  }

  @ApiBearerAuth()
  @Get('me')
  async me(@CurrentUser() user: AuthenticatedUser) {
    return this.authService.me(user);
  }

  @Public()
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { ttl: 60_000, limit: 10 } })
  @Post('forgot-password/request')
  async forgotPasswordRequest(@Body() dto: ForgotPasswordRequestDto) {
    await this.authService.forgotPasswordRequest(dto);
    return {
      message: 'If the email is registered, recovery details were sent.',
    };
  }

  @Public()
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { ttl: 60_000, limit: 10 } })
  @Post('forgot-password/confirm')
  async forgotPasswordConfirm(@Body() dto: ForgotPasswordConfirmDto) {
    await this.authService.forgotPasswordConfirm(dto);
    return { message: 'Password reset successful.' };
  }

  @Public()
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { ttl: 60_000, limit: 10 } })
  @Post('forgot-uid/request')
  async forgotUidRequest(@Body() dto: ForgotUidRequestDto) {
    await this.authService.forgotUidRequest(dto);
    return {
      message: 'If the email is registered, the User ID has been sent.',
    };
  }

  @Public()
  @Get('no-email-access-message')
  getNoEmailAccessMessage() {
    return {
      success: true,
      statusCode: 200,
      message: this.authService.noEmailAccessMessage(),
      data: null,
    };
  }
}
