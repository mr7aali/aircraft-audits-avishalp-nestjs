import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { UpdateMyProfileDto } from './dto/update-my-profile.dto.js';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async getMyProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        uid: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        status: true,
        profileImageFileId: true,
        createdAt: true,
        lastSeenAt: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async updateMyProfile(userId: string, dto: UpdateMyProfileDto) {
    if (dto.removeProfileImage && dto.profileImageFileId) {
      throw new BadRequestException(
        'Remove profile image and new profile image cannot be submitted together',
      );
    }

    const data: {
      firstName?: string;
      lastName?: string;
      email?: string;
      phone?: string | null;
      profileImageFileId?: string | null;
    } = {};

    if ('firstName' in dto) {
      const firstName = dto.firstName?.trim() ?? '';
      if (!firstName) {
        throw new BadRequestException('First name is required');
      }
      data.firstName = firstName;
    }

    if ('lastName' in dto) {
      const lastName = dto.lastName?.trim() ?? '';
      if (!lastName) {
        throw new BadRequestException('Last name is required');
      }
      data.lastName = lastName;
    }

    if ('email' in dto) {
      const email = dto.email?.trim().toLowerCase() ?? '';
      if (!email) {
        throw new BadRequestException('Email is required');
      }

      const duplicateEmail = await this.prisma.user.findFirst({
        where: {
          email: { equals: email, mode: 'insensitive' },
          NOT: { id: userId },
        },
        select: { id: true },
      });

      if (duplicateEmail) {
        throw new BadRequestException('Email is already in use');
      }

      data.email = email;
    }

    if ('phone' in dto) {
      const phone = dto.phone?.trim() ?? '';
      data.phone = phone.length === 0 ? null : phone;
    }

    if (dto.profileImageFileId) {
      const imageFile = await this.prisma.file.findUnique({
        where: { id: dto.profileImageFileId },
        select: {
          id: true,
          fileCategory: true,
          uploadedByUserId: true,
        },
      });

      if (!imageFile || imageFile.fileCategory !== 'IMAGE') {
        throw new BadRequestException('Profile photo file is invalid');
      }

      if (imageFile.uploadedByUserId !== userId) {
        throw new BadRequestException(
          'Profile photo must be uploaded by the authenticated user',
        );
      }

      data.profileImageFileId = imageFile.id;
    } else if (dto.removeProfileImage) {
      data.profileImageFileId = null;
    }

    if (Object.keys(data).length === 0) {
      return this.getMyProfile(userId);
    }

    return this.prisma.user.update({
      where: { id: userId },
      data,
      select: {
        id: true,
        uid: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        status: true,
        profileImageFileId: true,
        createdAt: true,
        lastSeenAt: true,
      },
    });
  }

  async searchEmployees(query: string, stationId?: string) {
    const trimmed = query.trim();
    if (!trimmed) {
      return [];
    }
    const users = await this.prisma.user.findMany({
      where: {
        status: 'ACTIVE',
        OR: [
          { firstName: { contains: trimmed, mode: 'insensitive' } },
          { lastName: { contains: trimmed, mode: 'insensitive' } },
          { uid: { contains: trimmed, mode: 'insensitive' } },
          {
            email: { contains: trimmed, mode: 'insensitive' },
          },
        ],
        ...(stationId
          ? {
              stationAccesses: {
                some: {
                  stationId,
                  isActive: true,
                },
              },
            }
          : {}),
      },
      select: {
        id: true,
        uid: true,
        firstName: true,
        lastName: true,
        email: true,
      },
      take: 20,
      orderBy: [{ firstName: 'asc' }, { lastName: 'asc' }],
    });
    return users.map((user) => ({
      id: user.id,
      uid: user.uid,
      name: `${user.firstName} ${user.lastName}`,
      email: user.email,
    }));
  }
}
