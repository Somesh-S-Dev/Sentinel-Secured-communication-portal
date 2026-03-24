import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken, AdminTokenPayload, ReporterTokenPayload } from '../utils/jwt';
import prisma from '../config/prisma';
import { Role } from '@prisma/client';

declare global {
  namespace Express {
    interface Request {
      reporter?: ReporterTokenPayload & { sessionId: string };
      admin?:    AdminTokenPayload & { adminId: string };
    }
  }
}

function extractToken(req: Request): string | null {
  const auth = req.headers.authorization;
  if (auth?.startsWith('Bearer ')) return auth.slice(7);
  return null;
}

// Any authenticated user (reporter OR admin)
export async function authenticate(req: Request, res: Response, next: NextFunction) {
  const token = extractToken(req);
  if (!token) return res.status(401).json({ error: 'No token provided' });

  try {
    const payload = verifyAccessToken(token);

    if (payload.type === 'reporter') {
      const session = await prisma.reporterSession.findUnique({
        where: { id: payload.sub },
        select: { id: true },
      });
      if (!session) return res.status(401).json({ error: 'Session not found' });
      req.reporter = { ...payload, sessionId: session.id };
    } else {
      const admin = await prisma.admin.findUnique({
        where: { id: payload.sub },
        select: { id: true, isActive: true },
      });
      if (!admin || !admin.isActive) return res.status(401).json({ error: 'Admin not found or inactive' });
      req.admin = { ...payload, adminId: admin.id };
    }

    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

// Reporter only
export function requireReporter(req: Request, res: Response, next: NextFunction) {
  if (!req.reporter) return res.status(403).json({ error: 'Reporter access required' });
  next();
}

// Admin only
export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.admin) return res.status(403).json({ error: 'Admin access required' });
  next();
}

// Specific roles
export function requireRole(...roles: Role[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.admin) return res.status(403).json({ error: 'Admin access required' });
    if (!roles.includes(req.admin.role as Role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
}
