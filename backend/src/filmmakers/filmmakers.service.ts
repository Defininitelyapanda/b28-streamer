import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { FilmmakerApplicationStatus, RoleName } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from '../users/users.service';

export interface FilmmakerApplicationView {
  id: string;
  userId: string;
  status: FilmmakerApplicationStatus;
  message: string | null;
  reviewedAt: string | null;
  createdAt: string;
  email?: string;
  displayName?: string | null;
}

@Injectable()
export class FilmmakersService {
  constructor(
    private prisma: PrismaService,
    private usersService: UsersService,
  ) {}

  private toView(
    row: {
      id: string;
      userId: string;
      status: FilmmakerApplicationStatus;
      message: string | null;
      reviewedAt: Date | null;
      createdAt: Date;
      user?: { email: string; profile: { displayName: string | null } | null };
    },
  ): FilmmakerApplicationView {
    return {
      id: row.id,
      userId: row.userId,
      status: row.status,
      message: row.message,
      reviewedAt: row.reviewedAt?.toISOString() ?? null,
      createdAt: row.createdAt.toISOString(),
      email: row.user?.email,
      displayName: row.user?.profile?.displayName ?? null,
    };
  }

  async createApplication(userId: string, message?: string) {
    const existing = await this.prisma.filmmakerApplication.findUnique({
      where: { userId },
    });
    if (existing) {
      throw new BadRequestException({
        code: 'APPLICATION_EXISTS',
        message: 'Filmmaker application already submitted.',
      });
    }

    const application = await this.prisma.filmmakerApplication.create({
      data: {
        userId,
        message: message ?? null,
      },
      include: {
        user: { include: { profile: true } },
      },
    });

    return this.toView(application);
  }

  async getMyApplication(userId: string): Promise<FilmmakerApplicationView | null> {
    const application = await this.prisma.filmmakerApplication.findUnique({
      where: { userId },
      include: {
        user: { include: { profile: true } },
      },
    });
    return application ? this.toView(application) : null;
  }

  async listApplications(status?: FilmmakerApplicationStatus) {
    const rows = await this.prisma.filmmakerApplication.findMany({
      where: status ? { status } : undefined,
      orderBy: { createdAt: 'desc' },
      include: {
        user: { include: { profile: true } },
      },
    });
    return rows.map((row) => this.toView(row));
  }

  async approve(id: string) {
    const application = await this.prisma.filmmakerApplication.findUnique({
      where: { id },
    });
    if (!application) {
      throw new NotFoundException({
        code: 'APPLICATION_NOT_FOUND',
        message: 'Filmmaker application not found.',
      });
    }
    if (application.status === FilmmakerApplicationStatus.APPROVED) {
      throw new BadRequestException({
        code: 'ALREADY_APPROVED',
        message: 'Application is already approved.',
      });
    }

    await this.usersService.assignRoles(application.userId, [
      RoleName.FILMMAKER,
      RoleName.STREAMER,
    ]);

    const updated = await this.prisma.filmmakerApplication.update({
      where: { id },
      data: {
        status: FilmmakerApplicationStatus.APPROVED,
        reviewedAt: new Date(),
      },
      include: {
        user: { include: { profile: true } },
      },
    });

    return this.toView(updated);
  }

  async reject(id: string, message?: string) {
    const application = await this.prisma.filmmakerApplication.findUnique({
      where: { id },
    });
    if (!application) {
      throw new NotFoundException({
        code: 'APPLICATION_NOT_FOUND',
        message: 'Filmmaker application not found.',
      });
    }

    const updated = await this.prisma.filmmakerApplication.update({
      where: { id },
      data: {
        status: FilmmakerApplicationStatus.REJECTED,
        reviewedAt: new Date(),
        message: message ?? application.message,
      },
      include: {
        user: { include: { profile: true } },
      },
    });

    return this.toView(updated);
  }
}
