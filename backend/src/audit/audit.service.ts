import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Request } from 'express';
import { AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { PrismaService } from '../prisma/prisma.service';

export interface AuditLogInput {
  action: string;
  resource: string;
  resourceId?: string;
  before?: unknown;
  after?: unknown;
}

@Injectable()
export class AuditService {
  constructor(private prisma: PrismaService) {}

  async logFromRequest(req: Request & { user?: AuthenticatedUser }, input: AuditLogInput) {
    const user = req.user;
    return this.prisma.auditLog.create({
      data: {
        actorId: user?.id,
        actorRole: user?.roles?.[0] ?? null,
        action: input.action,
        resource: input.resource,
        resourceId: input.resourceId,
        before: input.before as Prisma.InputJsonValue,
        after: input.after as Prisma.InputJsonValue,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'] ?? null,
      },
    });
  }

  async listLogs(page = 1, limit = 50, filters?: { action?: string; resource?: string }) {
    const where: Prisma.AuditLogWhereInput = {};
    if (filters?.action) where.action = filters.action;
    if (filters?.resource) where.resource = filters.resource;

    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return { items, total, page, limit };
  }
}
