import { BadRequestException, ForbiddenException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { CreateAuthDto } from './dto/create-auth.dto.js';
import { UpdateAuthDto } from './dto/update-auth.dto.js';
import { UsersService } from '../users/users.service.js';
import { User } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { ItwoFactorTokenPayload, JwtAccessPayload, RefreshTokenPayload } from './types/jwt-payload.type.js';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import bcrypt from 'bcryptjs';
import { randomInt } from 'crypto'
import { EmailService } from '../email/email.service.js';

export interface LoginContext {
  ipAddress?: string
}

@Injectable()
export class AuthService {
  constructor(
    private readonly usersServices: UsersService,
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
    private readonly emailService: EmailService
  ) { }

  async login(
    email: string,
    password: string,
    context: LoginContext = {}
  ) {

    /********Check User Exits in DB */
    const user: any = await this.usersServices.findByEmail(email)
    await this.passwordMatcheswithHash(user, password)

    if (!user) {
      throw new BadRequestException('Email not available')
    }
    /******Check Status */
    if (user!.status !== 'ACTIVE') {
      throw new ForbiddenException('This account is not active')
    }

    /***2FA is Enabled */
    if (user?.twoFactorEnabled) {
      const result = await this.twoFactorCreateOtpToken(user?.id)

      return {
        requiredsTwoFactor: true,
        twoFactorToken: result?.twoFactorToken,
        message: result?.message
      }
    }

    /***Accesstoken and Rrefresh Token */
    const token = await this.issueTokenPair(user, context)

    /***Response */
    return {
      ...token,
      userType: user.userType
    }
  }

  async issueTokenPair(
    user: User,
    context: LoginContext = {}
  ) {

    /***Refresh Token Expiredat ( 30 Days) */
    const expiredAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)


    /****Session */
    const session = await this.prisma.userSession.create({
      data: {
        userId: user.id,
        deviceLabel: 'Untitle',
        ipAddress: context?.ipAddress,
        refreshTokenHash: '',
        expiresAt: expiredAt
      }
    })

    const accessTokenPayload: JwtAccessPayload = {
      userId: user.id,
      email: user.email,
      userType: user.userType,
      sid: session.id
    }

    const refreshTokenPayload: RefreshTokenPayload = {
      userId: user.id,
      sessionId: session.id
    }

    /****Create Token */
    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.sign(
        accessTokenPayload,
        {
          secret: this.config.getOrThrow<string>('JWT_ACCESS_SECRET'),
          expiresIn: this.config.get<string>(
            'JWT_ACCESS_EXPIRES_IN',
            '15m'
          ) as never
        }
      ),

      this.jwtService.sign(
        refreshTokenPayload,
        {
          secret: this.config.getOrThrow<string>('JWT_REFRESH_SECRET'),
          expiresIn: this.config.get<string>(
            'JWT_REFRESH_EXPIRES_IN',
            '30'
          ) as never
        }
      )
    ])

    const refreshTokenHash = await bcrypt.hash(refreshToken, 10)

    /***Update in DB */
    await this.prisma.userSession.update({
      where: {
        id: session.id
      },
      data: {
        refreshTokenHash: refreshTokenHash
      }
    })

    return {
      accessToken,
      refreshToken,
    }
  }

  private async passwordMatcheswithHash(
    user: User | null,
    password: string
  ): Promise<void> {

    const hash = user?.passwordHash as string

    const matches = await bcrypt.compare(password, hash)

    if (!user || !matches) {
      throw new BadRequestException('Invalid email or password')
    }

  }

  async me(userId: string) {
    const data: any = await this.prisma.user.findUnique({
      where: {
        id: userId
      }
    })
    const { passwordHash, twoFactorSecret, ...rest } = data

    return rest
  }

  async refresh(
    refreshToken: string,
    context: LoginContext = {}
  ) {
    const decoded = this.verifyRefreshToken(refreshToken)

    const session = await this.prisma.userSession.findUnique({
      where: {
        id: decoded.sessionId
      }
    })

    if (!session || session.revokedAt || session.expiresAt < new Date()) {
      throw new UnauthorizedException("Session no longer valid")
    }

    const matches = await bcrypt.compare(
      refreshToken,
      session.refreshTokenHash,
    )

    if (!matches) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const user = await this.usersServices.findById(decoded.userId);
    if (!user || user.status !== "ACTIVE") {
      throw new UnauthorizedException("User no longer exits")
    }

    await this.prisma.userSession.update({
      where: { id: session.id },
      data: { revokedAt: new Date() }
    })

    return this.issueTokenPair(user, {
      ipAddress: context?.ipAddress
    })
  }

  private verifyRefreshToken(refreshToken: string): RefreshTokenPayload {
    try {
      return this.jwtService.verify<RefreshTokenPayload>(refreshToken, {
        secret: this.config.getOrThrow<string>('JWT_REFRESH_SECRET')
      })
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token')
    }
  }

  async revokeSession(userId: string, sessionId: string): Promise<void> {
    const session = await this.prisma.userSession.findUnique({
      where: {
        id: sessionId
      }
    })

    if (!session || session.userId !== userId) {
      throw new BadRequestException("session not found")
    }

    await this.prisma.userSession.update({
      where: {
        id: sessionId
      },
      data: {
        revokedAt: new Date()
      }
    })
  }

  async twoFactorEnable(userId: string) {

    /***Checking user exits */
    const user = await this.prisma.user.findUnique({
      where: {
        id: userId
      }
    })

    if (!user) {
      throw new BadRequestException("Invalid User Id")
    }

    const generateOtp = randomInt(100000, 1000000).toString();
    const otpHash = await bcrypt.hash(generateOtp, 10)

    /***5 Min expires */
    const expiredAt = new Date((Date.now() + 5) * 60 * 60)

    await this.prisma.twoFactorOtp.create({
      data: {
        userId: user.id,
        otpHash: otpHash,
        expiresAt: expiredAt
      }
    })

    this.emailService.sendOtp2FA(
      user.fullName,
      user.email,
      generateOtp,
      "5 min"
    )

    return {
      success: true,
      message: "Otp send successfully"
    }

  }


  /***Enable and Disable Two Factor */
  async twoFactorVerifyEnable(userId: string, otp: string) {

    /***Checking user exits */
    const user = await this.prisma.user.findUnique({
      where: {
        id: userId
      }
    })

    if (!user) {
      throw new BadRequestException("Invalid User Id")
    }

    const otpData = await this.prisma.twoFactorOtp.findFirst({
      where: {
        userId: user.id,
        verifiedAt: null,
        expiresAt: {
          gt: new Date()
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    console.log("otpData", otpData)

    if (!otpData) {
      throw new BadRequestException('Otp expired or invalid')
    }

    if (otpData.attempts >= 5) {
      throw new BadRequestException('Too many verification attempts')
    }

    const isValid = await bcrypt.compare(otp, otpData.otpHash)

    if (!isValid) {
      await this.prisma.twoFactorOtp.update({
        where: {
          id: otpData.id
        },
        data: {
          attempts: {
            increment: 1
          }
        }
      })

      throw new BadRequestException("Invalid OTP")
    }

    await this.prisma.twoFactorOtp.update({
      where: {
        id: otpData.id
      },
      data: {
        verifiedAt: new Date()
      }
    })

    await this.prisma.user.update({
      where: {
        id: user.id
      },
      data: {
        twoFactorEnabled: !user.twoFactorEnabled
      }
    })

    return {
      success: true,
      message: `Two-Factor ${user.twoFactorEnabled ? "Disable" : "Enable"}`,
      data: {
        twoFactorEnabled: !user.twoFactorEnabled
      }
    }

  }


  /***At the time of login Sending the otp */
  async twoFactorCreateOtpToken(userId: string) {

    const twoFactorTokenPayload:ItwoFactorTokenPayload = {
      userId: userId,
    }
    /****Create Token */
    const [twoFactorToken] = await Promise.all([
      this.jwtService.sign(
        twoFactorTokenPayload,
        {
          secret: this.config.getOrThrow<string>('JWT_2FA_SECRET'),
          expiresIn: this.config.get<string>(
            'JWT_2FA_EXPIRES_IN',
            '15m'
          ) as never
        }
      ),
    ])

    await this.twoFactorEnable(userId)

    return {
      twoFactorToken: twoFactorToken,
      message: "Otp send successfully"
    }

  }


  /***Verify 2fa Otp at the time of login */
  async twoFactorVerifyLoginOtp(
    twoFactorToken : string,
    otp : string,
    context: LoginContext = {}
  ){

    const decode:ItwoFactorTokenPayload = await this.jwtService.verifyAsync(twoFactorToken,{
      secret : this.config.getOrThrow('JWT_2FA_SECRET')
    })

    if(!decode){
        throw new BadRequestException("session is expired")
    }

    const user = await this.prisma.user.findUnique({
      where : {
        id : decode?.userId
      }
    })

    if(!user){
      throw new BadRequestException("Something went wrong")
    }

    const otpData = await this.prisma.twoFactorOtp.findFirst({
      where: {
        userId: decode.userId,
        verifiedAt: null,
        expiresAt: {
          gt: new Date()
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    if (!otpData) {
      throw new BadRequestException('Otp expired or invalid')
    }

    if (otpData.attempts >= 5) {
      throw new BadRequestException('Too many verification attempts')
    }

    const isValid = await bcrypt.compare(otp, otpData.otpHash)

    if (!isValid) {
      await this.prisma.twoFactorOtp.update({
        where: {
          id: otpData.id
        },
        data: {
          attempts: {
            increment: 1
          }
        }
      })

      throw new BadRequestException("Invalid OTP")
    }

    /***Accesstoken and Rrefresh Token */
    const token = await this.issueTokenPair(user, context)

    /***Response */
    return {
      ...token,
      userType: user.userType
    }

  }



}
