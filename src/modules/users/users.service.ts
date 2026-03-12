import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

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
