import { Request, Response, NextFunction } from 'express';
import prisma from '../config/prisma';
import { hashIp } from '../utils/encryption';

export function auditLog(action: string, entity: string, getEntityId: (req: Request) => string) {
  return async (req: Request, _res: Response, next: NextFunction) => {
    try {
      const adminId   = req.admin?.adminId ?? null;
      const entityId  = getEntityId(req);
      const ipHash    = req.ip ? hashIp(req.ip) : null;
      await prisma.auditLog.create({
        data: {
          adminId,
          action,
          entity,
          entityId,
          meta:     { method: req.method, path: req.path },
          ipHash,
          reportId: req.params.reportId ?? null,
        },
      });
    } catch {
      // Non-blocking — audit failure must not break the request
    }
    next();
  };
}
