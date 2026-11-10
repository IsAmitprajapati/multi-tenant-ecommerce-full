import { BadRequestException, ConflictException, ForbiddenException, Injectable, InternalServerErrorException, NotFoundException, UnauthorizedException } from '@nestjs/common';
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
import { PermissionsService } from '../permissions/permissions.service.js';
import { type LoginPanel, SellerRegisterDto } from './dto/login.dto.js';

export interface LoginContext {
  ipAddress?: string
  browser?: string,
  os?: string,
  device?: string
}

@Injectable()
export class AuthService {
  constructor(
    private readonly usersServices: UsersService,
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
    private readonly emailService: EmailService,
    private readonly permissionsService: PermissionsService
  ) { }

  async login(
    email: string,
    password: string,
    context: LoginContext = {},
    panel?: LoginPanel
  ) {

    /********Check User Exits in DB */
    const user = await this.passwordMatcheswithHash(
      await this.usersServices.findByEmail(email),
      password
    )

    /******Check Status */
    if (user.status !== 'ACTIVE') {
      throw new ForbiddenException('This account is not active')
    }

    /******Each app only accepts its own accounts */
    await this.assertPanelAccess(user, panel)

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

  /** Platform admin app ↔ platform staff only; seller app ↔ seller users only (and not suspended sellers). */
  private async assertPanelAccess(user: User, panel?: LoginPanel) {
    if (!panel) return
    if (panel === 'PLATFORM' && user.userType !== 'PLATFORM_ADMIN') {
      throw new ForbiddenException("This account can't sign in to the platform admin console")
    }
    if (panel === 'SELLER') {
      if (user.userType !== 'SELLER') {
        throw new ForbiddenException("This account can't sign in to the seller dashboard")
      }
      if (user.sellerId) {
        const seller = await this.prisma.seller.findUnique({ where: { id: user.sellerId }, select: { status: true } })
        if (seller?.status === 'SUSPENDED') {
          throw new ForbiddenException('This seller account is suspended. Contact platform support.')
        }
      }
    }
  }

  /** Self-service seller signup: creates the owner account and signs them in. */
  async registerSeller(dto: SellerRegisterDto, context: LoginContext = {}) {
    if (await this.prisma.user.findUnique({ where: { email: dto.email }, select: { id: true } })) {
      throw new ConflictException('An account with this email already exists — sign in instead')
    }
    const role = await this.prisma.role.findFirst({
      where: { name: 'Seller Admin', userType: 'SELLER', status: 'ACTIVE' },
      select: { id: true },
    })
    if (!role) throw new InternalServerErrorException('Seller signup is not available right now')

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        fullName: dto.fullName,
        phone: dto.phone,
        passwordHash: await bcrypt.hash(dto.password, 10),
        userType: 'SELLER',
        roleId: role.id,
      },
    })

    const token = await this.issueTokenPair(user, context)
    return { ...token, userType: user.userType }
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
        deviceLabel: context?.device,
        ipAddress: context?.ipAddress,
        refreshTokenHash: '',
        expiresAt: expiredAt,
        os: context?.os,
        browser: context?.browser,
        device: context?.device
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
  ): Promise<User> {

    // Same message for unknown email and wrong password, so emails can't be enumerated
    if (!user?.passwordHash || !password) {
      throw new BadRequestException('Invalid email or password')
    }

    const matches = await bcrypt.compare(password, user.passwordHash)

    if (!matches) {
      throw new BadRequestException('Invalid email or password')
    }

    return user
  }

  async me(userId: string) {
    const data: any = await this.prisma.user.findUnique({
      where: {
        id: userId
      }
    })
    if (!data) {
      throw new UnauthorizedException('User no longer exists')
    }
    const { passwordHash, twoFactorSecret, ...rest } = data

    /***Role + effective module permissions for UI gating */
    const access = await this.permissionsService.getEffectiveAccess(userId)

    /***Seller users: the seller (business) they belong to */
    const seller = rest.sellerId
      ? await this.prisma.seller.findUnique({
        where: { id: rest.sellerId },
        select: { id: true, name: true, slug: true, logoUrl: true, brandColor: true, status: true, kycStatus: true, ownerId: true },
      })
      : null

    return {
      ...rest,
      role: access.role,
      permissions: access.permissions,
      seller: seller ? { ...seller, isOwner: seller.ownerId === userId } : null
    }
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
      ...context,
      ipAddress: context?.ipAddress,
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

    const twoFactorTokenPayload: ItwoFactorTokenPayload = {
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
    twoFactorToken: string,
    otp: string,
    context: LoginContext = {}
  ) {

    const decode: ItwoFactorTokenPayload = await this.jwtService.verifyAsync(twoFactorToken, {
      secret: this.config.getOrThrow('JWT_2FA_SECRET')
    })

    if (!decode) {
      throw new BadRequestException("session is expired")
    }

    const user = await this.prisma.user.findUnique({
      where: {
        id: decode?.userId
      }
    })

    if (!user) {
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

  async listSessions(userId: string) {
    const data = await this.prisma.userSession.findMany({
      where: { userId, revokedAt: null },
      orderBy: { lastActiveAt: 'desc' }
    })

    return data
  }

  async revokeOtherSessions(userId: string, currentSessionId: string): Promise<void> {
    await this.prisma.userSession.updateMany({
      where: {
        userId: userId,
        revokedAt: null,
        NOT: {
          id: currentSessionId
        }
      },
      data: {
        revokedAt: new Date()
      }
    })
  }


  /***Forgot Password */
  async forgotPassword(email: string) {
    if (!email) {
      throw new BadRequestException('Email is required')
    }

    const user = await this.prisma.user.findUnique({
      where: {
        email: email
      }
    })

    if (!user) {
      throw new BadRequestException('Invalid email id')
    }

    /**Generate OTP */
    const generateOtp = randomInt(100000, 1000000).toString()
    const hashOtp = await bcrypt.hash(generateOtp, 10)

    /**
     * 5 Min valid
     */
    const expiredAt = new Date((Date.now() + 5) * 60 * 60)

    const save = await this.prisma.passwordResetOtp.create({
      data: {
        userId: user.id,
        codeHash: hashOtp,
        expiresAt: expiredAt
      }
    })

    /***Email Services */
    this.emailService.sendOtpForgotPassword(
      user.fullName,
      user.email,
      generateOtp,
      "5 Min"
    )

    return {
      success: true,
      message: "Otp send to your email Id.",
      data: {
        createdAt: save?.createdAt
      }
    }


  }

  async forgotPasswordOtpVerifycation(email: string, otp: string) {
    if (!email) {
      throw new BadRequestException('Email is required')
    }

    const user = await this.prisma.user.findUnique({
      where: {
        email: email
      }
    })

    if (!user) {
      throw new BadRequestException('Invalid email id')
    }

    const dataotp = await this.prisma.passwordResetOtp.findFirst({
      where: {
        userId: user.id,
        consumedAt: null
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    if (!dataotp) {
      throw new BadRequestException('otp will be expired or invalid')
    }

    const decodehashOtp = await bcrypt.compare(otp, dataotp?.codeHash)

    if (!decodehashOtp) {
      throw new BadRequestException('otp will be expired')
    }

    const resetTokenPayload = {
      userId: user?.id
    }

    const resetToken = await this.jwtService.sign(
      resetTokenPayload,
      {
        secret: this.config.getOrThrow<string>('JWT_RESET_SECRET'),
        expiresIn: this.config.get<string>(
          'JWT_RESET_EXPIRES_IN',
          '5m'
        ) as never
      }
    )

    return {
      success: true,
      message: "Otp verify successfully",
      data: {
        resetToken
      }
    }

  }

  async resetPassowrd(email: string, resetToken: string, password: string) {
    if (!resetToken) {
      throw new BadRequestException("This link is invalid or has expired")
    }

    let decode: { userId?: string }
    try {
      decode = await this.jwtService.verifyAsync(resetToken, {
        secret: this.config.getOrThrow<string>('JWT_RESET_SECRET'),
      })
    } catch {
      throw new BadRequestException("This link is invalid or has expired — request a new one")
    }

    // Token must belong to the account being reset
    const user = decode?.userId ? await this.usersServices.findById(decode.userId) : null
    if (!user || (email && user.email.toLowerCase() !== email.trim().toLowerCase())) {
      throw new BadRequestException("This link is invalid or has expired — request a new one")
    }

    return this.usersServices.changePassword(user.id, { password })
  }

}
