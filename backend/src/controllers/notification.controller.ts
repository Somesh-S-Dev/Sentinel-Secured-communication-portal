import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import prisma from '../config/prisma';
import { AppError } from '../middleware/error.middleware';

export async function getNotifications(req: Request, res: Response, next: NextFunction) {
  try {
    const where = req.admin
      ? { adminId: req.admin.adminId }
      : { reporterSessionId: req.reporter?.sessionId };

    const notifications = await prisma.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: { id: true, type: true, title: true, body: true, isRead: true, createdAt: true, reportId: true },
    });

    const unreadCount = notifications.filter(n => !n.isRead).length;
    return res.json({ notifications, unreadCount });
  } catch (err) { next(err); }
}

export async function markRead(req: Request, res: Response, next: NextFunction) {
  try {
    const { ids } = z.object({ ids: z.array(z.string().uuid()) }).parse(req.body);
    const where = req.admin
      ? { id: { in: ids }, adminId: req.admin.adminId }
      : { id: { in: ids }, reporterSessionId: req.reporter?.sessionId };

    await prisma.notification.updateMany({ where, data: { isRead: true } });
    return res.json({ success: true });
  } catch (err) { next(err); }
}

export async function markAllRead(req: Request, res: Response, next: NextFunction) {
  try {
    const where = req.admin
      ? { adminId: req.admin.adminId, isRead: false }
      : { reporterSessionId: req.reporter?.sessionId, isRead: false };

    await prisma.notification.updateMany({ where, data: { isRead: true } });
    return res.json({ success: true });
  } catch (err) { next(err); }
}
