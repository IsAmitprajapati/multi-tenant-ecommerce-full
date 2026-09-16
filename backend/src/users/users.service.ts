import { BadRequestException, Injectable } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto.js';
import { UpdateUserDto } from './dto/update-user.dto.js';
import { PrismaService } from '../prisma/prisma.service.js';
import bcrypt from 'bcryptjs';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) { }

  /****Find By User Email */
  findByEmail(email: string) {
    const data = this.prisma.user.findUnique({
      where: {
        email
      }
    })
    return data
  }


  findById(id: string) {
    const data = this.prisma.user.findUnique({
      where: {
        id
      }
    })
    return data
  }

  async update(id: string, data: UpdateUserDto) {
    const user = await this.prisma.user.update({
      where: {
        id: id
      },
      data: {
        fullName: data?.fullName,
        email: data?.email,
        phone: data?.phone
      },
      select: {
        fullName: true,
        email: true,
        phone: true,
        id: true
      }
    })
    return {
      success: true,
      message: "Update successfully",
      data: user
    }
  }

  async changePassword(id: string, data: UpdateUserDto) {
    if (!data.password) {
      throw new BadRequestException("Password is required")
    }
    const passswordHash = await bcrypt.hash(data.password!, 10)

    try {
      const user = await this.prisma.user.update({
        where: {
          id: id
        },
        data: {
          passwordHash: passswordHash
        }
      })

      return {
        success: true,
        message: "Password Change successfully"
      }
    }catch(error){
      throw new BadRequestException("Failed to change password")
    }
    
  }



}
