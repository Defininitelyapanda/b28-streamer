import { Injectable, NotFoundException } from '@nestjs/common';
import { UserStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateProfileDto } from './dto/users.dto';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        profile: true,
        roles: { include: { role: true } },
      },
    });

    if (!user || user.deletedAt) {
      throw new NotFoundException({ code: 'USER_NOT_FOUND', message: 'User not found.' });
    }

    return this.toPublicUser(user);
  }

  async updateMe(userId: string, dto: UpdateProfileDto) {
    await this.prisma.userProfile.upsert({
      where: { userId },
      create: {
        userId,
        displayName: dto.displayName,
        country: dto.country,
        timezone: dto.timezone,
        avatarUrl: dto.avatarUrl,
      },
      update: {
        displayName: dto.displayName,
        country: dto.country,
        timezone: dto.timezone,
        avatarUrl: dto.avatarUrl,
      },
    });

    return this.getMe(userId);
  }

  async deleteMe(userId: string) {
    const anonymizedEmail = `deleted-${userId}@deleted.local`;
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        email: anonymizedEmail,
        status: UserStatus.DELETED,
        deletedAt: new Date(),
        passwordHash: '',
      },
    });

    await this.prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });

    return { message: 'Account deleted.' };
  }

  async listUsers(page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      this.prisma.user.findMany({
        where: { deletedAt: null },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          profile: true,
          roles: { include: { role: true } },
        },
      }),
      this.prisma.user.count({ where: { deletedAt: null } }),
    ]);

    return {
      items: items.map((u) => this.toPublicUser(u)),
      total,
      page,
      limit,
    };
  }

  async getUserById(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        profile: true,
        roles: { include: { role: true } },
      },
    });

    if (!user || user.deletedAt) {
      throw new NotFoundException({ code: 'USER_NOT_FOUND', message: 'User not found.' });
    }

    return this.toPublicUser(user);
  }

  async updateUserStatus(id: string, status: 'ACTIVE' | 'SUSPENDED') {
    const user = await this.getUserById(id);
    const updated = await this.prisma.user.update({
      where: { id },
      data: {
        status: status as UserStatus,
        suspendedAt: status === 'SUSPENDED' ? new Date() : null,
      },
      include: {
        profile: true,
        roles: { include: { role: true } },
      },
    });

    return { before: user, after: this.toPublicUser(updated) };
  }

  async assignRoles(id: string, roleNames: string[]) {
    const user = await this.getUserById(id);
    const roles = await this.prisma.role.findMany({
      where: { name: { in: roleNames as never[] } },
    });

    if (roles.length !== roleNames.length) {
      throw new NotFoundException({ code: 'ROLE_NOT_FOUND', message: 'One or more roles not found.' });
    }

    await this.prisma.$transaction([
      this.prisma.userRole.deleteMany({ where: { userId: id } }),
      this.prisma.userRole.createMany({
        data: roles.map((role) => ({ userId: id, roleId: role.id })),
      }),
    ]);

    const after = await this.getUserById(id);
    return { before: user, after };
  }

  private toPublicUser(user: {
    id: string;
    email: string;
    status: UserStatus;
    emailVerifiedAt: Date | null;
    createdAt: Date;
    profile: { displayName: string | null; country: string | null; timezone: string | null; avatarUrl: string | null } | null;
    roles: { role: { name: string } }[];
  }) {
    return {
      id: user.id,
      email: user.email,
      status: user.status,
      emailVerified: !!user.emailVerifiedAt,
      displayName: user.profile?.displayName ?? null,
      country: user.profile?.country ?? null,
      timezone: user.profile?.timezone ?? null,
      avatarUrl: user.profile?.avatarUrl ?? null,
      roles: user.roles.map((r) => r.role.name),
      createdAt: user.createdAt,
    };
  }
}
