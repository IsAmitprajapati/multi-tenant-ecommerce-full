import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import type { NotificationCategory } from '../generated/prisma/enums.js';

/** In-app notifications for shoppers (My account › Notifications) */
@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  constructor(private readonly prisma: PrismaService) { }

  /** Never throws — a failed notification must not break the action that triggered it */
  async notify(userId: string, category: NotificationCategory, title: string, opts: { body?: string; link?: string } = {}) {
    try {
      const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { userType: true } });
      if (user?.userType !== 'CUSTOMER') return;
      await this.prisma.notification.create({ data: { userId, category, title, body: opts.body ?? null, link: opts.link ?? null } });
    } catch (err) {
      this.logger.warn(`Notification for ${userId} failed: ${(err as Error).message}`);
    }
  }
}
