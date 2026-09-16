import { Controller, Get, Post, Body, Patch, Param, Delete, Ip, HttpStatus, HttpCode, UseGuards, Header } from '@nestjs/common';
import { AuthService } from './auth.service.js';
import { CreateAuthDto } from './dto/create-auth.dto.js';
import { UpdateAuthDto } from './dto/update-auth.dto.js';
import { LoginDTO } from './dto/login.dto.js';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { type JwtAccessPayload } from './types/jwt-payload.type.js';
import { RefreshDto } from './dto/refresh.dto.js';
import { TwoFactorDto, TwoFactorVerifyLoginOtpDto } from './dto/two-factor.dto.js';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post("/login")
  @HttpCode(HttpStatus.OK)
  login(@Body() logintDto : LoginDTO,@Ip() ip:string) {
    return this.authService.login(
      logintDto.email,
      logintDto.password,
      {
        ipAddress : ip
      }
    );
  }

  @Get('/me')
  @UseGuards(JwtAuthGuard)
  async me(@CurrentUser() user : JwtAccessPayload){
    console.log("user",user)
    const data = await this.authService.me(user.userId)
    return data
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  refresh(@Body() dto:RefreshDto,@Ip() ip:string){
    return this.authService.refresh(
      dto.refreshToken,
      {
        ipAddress : ip
      }
    )
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async logout(@CurrentUser() user : JwtAccessPayload){
      await  this.authService.revokeSession(user.userId,user.sid)

      return {
         success : true
      }
  }

  @Get('2fa-generate-otp')
  @UseGuards(JwtAuthGuard)
  async twoFactorEnable (@CurrentUser() user : JwtAccessPayload){
    const response = await this.authService.twoFactorEnable(user?.userId)

    return response
  }

  @Post('2fa-verify-enable')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async twoFactorVerifyEnable (@CurrentUser() user : JwtAccessPayload,@Body() dto:TwoFactorDto){
    const response = await this.authService.twoFactorVerifyEnable(user?.userId,dto.otp)

    return response
  }


  @Post('2fa-verify-login-otp')
  @HttpCode(HttpStatus.OK)
  async twoFactorVerifyLoginOtp (@Body() dto:TwoFactorVerifyLoginOtpDto,@Ip() ip:string){
    const response = await this.authService.twoFactorVerifyLoginOtp(
      dto.twoFactorToken,
      dto.otp,
      {
        ipAddress : ip
      }
    )

    return response
  }


}
