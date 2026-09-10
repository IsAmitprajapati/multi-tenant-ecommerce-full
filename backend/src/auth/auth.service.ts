import { BadRequestException, ForbiddenException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { CreateAuthDto } from './dto/create-auth.dto.js';
import { UpdateAuthDto } from './dto/update-auth.dto.js';
import { UsersService } from '../users/users.service.js';
import { User } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { JwtAccessPayload, RefreshTokenPayload } from './types/jwt-payload.type.js';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import bcrypt from 'bcryptjs';

export interface LoginContext {
  ipAddress? : string
}

@Injectable()
export class AuthService {
  constructor(
    private readonly usersServices : UsersService,
    private readonly prisma : PrismaService,
    private readonly jwtService : JwtService,
    private readonly config : ConfigService
  ){}
  
  async login(
    email : string,
    password : string,
    context : LoginContext = {}
  ){

    /********Check User Exits in DB */
    const user:any = await this.usersServices.findByEmail(email)
    await this.passwordMatcheswithHash(user,password)

    if(!user){
        throw new BadRequestException('Email not available')
    }
    /******Check Status */
    if(user!.status !== 'ACTIVE'){
      throw new ForbiddenException('This account is not active')
    }

    /***Accesstoken and Rrefresh Token */
    const token = await this.issueTokenPair(user,context)

    /***Response */
    return {
      ...token,
      userType : user.userType
    }
  }

  async issueTokenPair(
    user : User,
    context : LoginContext = {}
  ){

    /***Refresh Token Expiredat ( 30 Days) */
    const expiredAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)


    /****Session */
    const session = await this.prisma.userSession.create({
      data : {
        userId : user.id,
        deviceLabel : 'Untitle',
        ipAddress : context?.ipAddress,
        refreshTokenHash : '',
        expiresAt : expiredAt
      }
    })

    const accessTokenPayload:JwtAccessPayload = {
      userId : user.id,
      email : user.email,
      userType : user.userType,
      sid : session.id
    }

    const refreshTokenPayload:RefreshTokenPayload = {
        userId : user.id,
        sessionId : session.id
    }

    /****Create Token */
    const [accessToken,refreshToken] = await Promise.all([
        this.jwtService.sign(
          accessTokenPayload,
          {
            secret : this.config.getOrThrow<string>('JWT_ACCESS_SECRET'),
            expiresIn : this.config.get<string>(
              'JWT_ACCESS_EXPIRES_IN',
              '15m'
            ) as never
          }
        ),

        this.jwtService.sign(
          refreshTokenPayload,
          {
            secret : this.config.getOrThrow<string>('JWT_REFRESH_SECRET'),
            expiresIn : this.config.get<string>(
              'JWT_REFRESH_EXPIRES_IN',
              '30'
            ) as never
          }
        )
    ])

    const refreshTokenHash = await bcrypt.hash(refreshToken,10)

    /***Update in DB */
    await this.prisma.userSession.update({
      where : {
        id : session.id
      },
      data : {
        refreshTokenHash : refreshTokenHash 
      }
    })

    return { 
      accessToken,
      refreshToken,
    }
  }

  private async passwordMatcheswithHash(
    user : User | null,
    password : string
  ):Promise<void>{

    const hash = user?.passwordHash as string

    const matches = await bcrypt.compare(password,hash)

    if(!user || !matches){
      throw new BadRequestException('Invalid email or password')
    }

  }

  async me(userId : string){
    const data:any = await this.prisma.user.findUnique({
      where : {
        id : userId
      }
    })
    const { passwordHash,twoFactorSecret, ...rest } = data

    return rest
  }

  async refresh(
    refreshToken : string,
    context : LoginContext = {}
  ){
     const decoded = this.verifyRefreshToken(refreshToken)

     const session = await this.prisma.userSession.findUnique({
      where : {
        id : decoded.sessionId
      }
     })

     if(!session || session.revokedAt || session.expiresAt < new Date()){
        throw new UnauthorizedException("Session no longer valid")
     }

     const matches = await bcrypt.compare(
      refreshToken,
      session.refreshTokenHash,
     )

     if(!matches){
      throw new UnauthorizedException('Invalid refresh token');
     }

     const user = await this.usersServices.findById(decoded.userId);
     if(!user || user.status !== "ACTIVE"){
        throw new UnauthorizedException("User no longer exits")
     }

     await this.prisma.userSession.update({
      where : { id : session.id },
      data : { revokedAt  : new Date() }
     })

     return this.issueTokenPair(user,{
        ipAddress : context?.ipAddress
     })
  }

  private verifyRefreshToken(refreshToken : string) : RefreshTokenPayload {
    try{
      return this.jwtService.verify<RefreshTokenPayload>(refreshToken,{
        secret : this.config.getOrThrow<string>('JWT_REFRESH_SECRET')
      })
    }catch{
      throw new UnauthorizedException('Invalid or expired refresh token')
    }
  }

  async revokeSession(userId : string, sessionId : string): Promise<void>{
    const session = await this.prisma.userSession.findUnique({
      where : {
        id : sessionId
      }
    })

    if(!session || session.userId !== userId){
      throw new BadRequestException("session not found")
    }

    await this.prisma.userSession.update({
      where : {
        id : sessionId
      },
      data : {
        revokedAt : new Date()
      }
    })
  }
  
}
