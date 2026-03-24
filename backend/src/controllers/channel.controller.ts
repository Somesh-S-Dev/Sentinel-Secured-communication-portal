import { Request, Response, NextFunction } from 'express';
import prisma from '../config/prisma';

export async function getChannels(req: Request, res: Response, next: NextFunction) {
  try {
    const channels = await prisma.channel.findMany({
      where: { isActive: true },
      select: {
        id: true, slug: true, displayName: true, type: true, description: true,
        _count: { select: { messages: true, reports: true } },
      },
    });
    return res.json({ channels });
  } catch (err) { next(err); }
}
