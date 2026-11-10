import { Controller, Get, Post, Body, Patch, Param, Delete, Ip, HttpStatus, HttpCode, UseGuards, Header } from '@nestjs/common';
import { AuthService } from './auth.service.js';
import { CreateAuthDto } from './dto/create-auth.dto.js';
import { UpdateAuthDto } from './dto/update-auth.dto.js';
import { forgotPasswordDto, LoginDTO, resetPasswordDto, SellerRegisterDto } from './dto/login.dto.js';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { type JwtAccessPayload } from './types/jwt-payload.type.js';
import { RefreshDto } from './dto/refresh.dto.js';
import { TwoFactorDto, TwoFactorVerifyLoginOtpDto } from './dto/two-factor.dto.js';
import { ParsedUserAgent } from '../common/decorators/user-agent.decorator.js';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) { }

  @Post("/login")
  @HttpCode(HttpStatus.OK)
  login(@Body() logintDto: LoginDTO, @Ip() ip: string, @ParsedUserAgent() ua: any) {
    return this.authService.login(
      logintDto.email,
      logintDto.password,
      {
        ipAddress: ip,
        browser: ua?.browser?.name,
        os: ua?.os?.name,
        device: ua?.device?.model
      },
      logintDto.panel
    );
  }

  /***Self-service seller signup (step 1): creates the account and signs in */
  @Post('/seller/register')
  @HttpCode(HttpStatus.CREATED)
  registerSeller(@Body() dto: SellerRegisterDto, @Ip() ip: string, @ParsedUserAgent() ua: any) {
    return this.authService.registerSeller(dto, {
      ipAddress: ip,
      browser: ua?.browser?.name,
      os: ua?.os?.name,
      device: ua?.device?.model
    })
  }

  @Get('/me')
  @UseGuards(JwtAuthGuard)
  async me(@CurrentUser() user: JwtAccessPayload) {
    const data = await this.authService.me(user.userId)
    return data
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  refresh(@Body() dto: RefreshDto, @Ip() ip: string, @ParsedUserAgent() ua: any) {
    return this.authService.refresh(
      dto.refreshToken,
      {
        ipAddress: ip,
        browser: ua?.browser?.name,
        os: ua?.os?.name,
        device: ua?.device?.model
      }
    )
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async logout(@CurrentUser() user: JwtAccessPayload) {
    await this.authService.revokeSession(user.userId, user.sid)

    return {
      success: true
    }
  }

  @Get('2fa-generate-otp')
  @UseGuards(JwtAuthGuard)
  async twoFactorEnable(@CurrentUser() user: JwtAccessPayload) {
    const response = await this.authService.twoFactorEnable(user?.userId)

    return response
  }

  @Post('2fa-verify-enable')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async twoFactorVerifyEnable(@CurrentUser() user: JwtAccessPayload, @Body() dto: TwoFactorDto) {
    const response = await this.authService.twoFactorVerifyEnable(user?.userId, dto.otp)

    return response
  }


  @Post('2fa-verify-login-otp')
  @HttpCode(HttpStatus.OK)
  async twoFactorVerifyLoginOtp(@Body() dto: TwoFactorVerifyLoginOtpDto, @Ip() ip: string, @ParsedUserAgent() ua: any) {
    const response = await this.authService.twoFactorVerifyLoginOtp(
      dto.twoFactorToken,
      dto.otp,
      {
        ipAddress: ip,
        browser: ua?.browser?.name,
        os: ua?.os?.name,
        device: ua?.device?.model
      }
    )

    return response
  }

  /***Get All The Sessions */
  @Get('sessions')
  @UseGuards(JwtAuthGuard)
  async sessions(@CurrentUser() user: JwtAccessPayload) {
    const sessions = await this.authService.listSessions(user.userId)
    return sessions.map((session) => {
      return {
        id: session.id,
        deviceLabel: session.deviceLabel,
        ipAddress: session.ipAddress,
        createdAt: session.createdAt,
        lastActiveAt: session.lastActiveAt,
        expiresAt: session.expiresAt,
        isCurrent: session?.id === user?.sid
      }
    })
  }

  /**Revoke session */
  @Post('sessions/:id/revoke')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async revokeSessions(@CurrentUser() user: JwtAccessPayload, @Param('id') sessionId: string) {
    console.log("sessionId", sessionId)
    await this.authService.revokeSession(user.userId, sessionId)
    return {
      success: true
    }
  }

  /***Revoke All Session */
  /**Revoke session */
  @Post('sessions/revoke-others')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async revokeOtherSessions(@CurrentUser() user: JwtAccessPayload) {
    await this.authService.revokeOtherSessions(user.userId, user.sid)

    return {
      success: true
    }
  }



  /***Forgot Password */
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  async forgotPassword(@Body() dto : forgotPasswordDto){
    const response = await  this.authService.forgotPassword(dto.email)
    return response
  }

  @Post('forgot-password-verify-otp')
  @HttpCode(HttpStatus.OK)
  async forgotPasswordVerifyOtp(@Body() dto : forgotPasswordDto){
    const response = await  this.authService.forgotPasswordOtpVerifycation(dto.email,dto?.otp)
    return response
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  async resetPassword(@Body() dto : resetPasswordDto){
    const response = await  this.authService.resetPassowrd(dto.email,dto?.resetToken,dto?.password)
    return response
  }




}
