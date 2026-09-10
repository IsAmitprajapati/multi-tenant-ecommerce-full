import { Injectable } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto.js';
import { UpdateUserDto } from './dto/update-user.dto.js';
import { PrismaService } from '../prisma/prisma.service.js';

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

  update(id: string, data: UpdateUserDto) {
    const user = this.prisma.user.update({
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



}
