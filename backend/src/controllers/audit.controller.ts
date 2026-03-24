import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import prisma from '../config/prisma';

export async function getAuditLogs(req: Request, res: Response, next: NextFunction) {
  try {
    const query = z.object({
      adminId:  z.string().uuid().optional(),
      reportId: z.string().uuid().optional(),
      action:   z.string().optional(),
      page:     z.string().regex(/^\d+$/).default('1'),
      limit:    z.string().regex(/^\d+$/).default('50'),
    }).parse(req.query);

    const page  = parseInt(query.page, 10);
    const limit = Math.min(parseInt(query.limit, 10), 100);
    const skip  = (page - 1) * limit;

    const where = {
      ...(query.adminId  ? { adminId: query.adminId }   : {}),
      ...(query.reportId ? { reportId: query.reportId } : {}),
      ...(query.action   ? { action: query.action }     : {}),
    };

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip, take: limit,
        select: {
          id: true, action: true, entity: true, entityId: true,
          meta: true, createdAt: true, reportId: true,
          admin: { select: { displayName: true, role: true } },
        },
      }),
      prisma.auditLog.count({ where }),
    ]);

    return res.json({ logs, total, page, pages: Math.ceil(total / limit) });
  } catch (err) { next(err); }
}
