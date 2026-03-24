import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import prisma from '../config/prisma';
import {
  signReporterToken, signAdminToken, signRefreshToken,
  verifyRefreshToken, generateAnonId, generateAvatarSeed,
} from '../utils/jwt';
import { AppError } from '../middleware/error.middleware';

// ─── Zod schemas ─────────────────────────────────────────────────────────────
const signupSchema = z.object({
  username: z.string().min(3).max(30).regex(/^[a-zA-Z0-9_-]+$/, 'Username may only contain letters, numbers, _ and -'),
  password: z.string().min(8).max(128),
});

const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

// ─── Reporter Auth ────────────────────────────────────────────────────────────
export async function reporterSignup(req: Request, res: Response, next: NextFunction) {
  try {
    const { username, password } = signupSchema.parse(req.body);

    const existing = await prisma.reporterSession.findUnique({ where: { username } });
    if (existing) throw new AppError(409, 'Username already taken');

    const passwordHash = await bcrypt.hash(password, 12);
    const anonId       = generateAnonId();
    const avatarSeed   = generateAvatarSeed();

    const session = await prisma.reporterSession.create({
      data: { username, passwordHash, anonId, avatarSeed },
    });

    const accessToken  = signReporterToken({ sub: session.id, anonId: session.anonId });
    const refreshToken = signRefreshToken(session.id);

    return res.status(201).json({
      accessToken,
      refreshToken,
      profile: { anonId: session.anonId, avatarSeed: session.avatarSeed },
    });
  } catch (err) { next(err); }
}

export async function reporterLogin(req: Request, res: Response, next: NextFunction) {
  try {
    const { username, password } = loginSchema.parse(req.body);

    const session = await prisma.reporterSession.findUnique({ where: { username } });
    if (!session) throw new AppError(401, 'Invalid credentials');

    const valid = await bcrypt.compare(password, session.passwordHash);
    if (!valid) throw new AppError(401, 'Invalid credentials');

    await prisma.reporterSession.update({
      where: { id: session.id },
      data:  { lastSeenAt: new Date() },
    });

    const accessToken  = signReporterToken({ sub: session.id, anonId: session.anonId });
    const refreshToken = signRefreshToken(session.id);

    return res.json({
      accessToken,
      refreshToken,
      profile: { anonId: session.anonId, avatarSeed: session.avatarSeed },
    });
  } catch (err) { next(err); }
}

// ─── Admin Auth ───────────────────────────────────────────────────────────────
export async function adminSignup(req: Request, res: Response, next: NextFunction) {
  try {
    // Only SUPER_ADMIN can create other admins — enforced in route middleware
    const body = z.object({
      username:    z.string().min(3).max(30).regex(/^[a-zA-Z0-9_-]+$/),
      password:    z.string().min(10).max(128),
      displayName: z.string().min(1).max(60),
      role:        z.enum(['HR_ADMIN', 'LEGAL_ADMIN', 'IT_ADMIN', 'SUPER_ADMIN']).default('HR_ADMIN'),
    }).parse(req.body);

    const existing = await prisma.admin.findUnique({ where: { username: body.username } });
    if (existing) throw new AppError(409, 'Username already taken');

    const passwordHash = await bcrypt.hash(body.password, 12);

    const admin = await prisma.admin.create({
      data: {
        username:    body.username,
        passwordHash,
        displayName: body.displayName,
        role:        body.role,
      },
      select: { id: true, username: true, displayName: true, role: true, createdAt: true },
    });

    return res.status(201).json({ admin });
  } catch (err) { next(err); }
}

export async function adminLogin(req: Request, res: Response, next: NextFunction) {
  try {
    const { username, password } = loginSchema.parse(req.body);

    const admin = await prisma.admin.findUnique({ where: { username } });
    if (!admin || !admin.isActive) throw new AppError(401, 'Invalid credentials');

    const valid = await bcrypt.compare(password, admin.passwordHash);
    if (!valid) throw new AppError(401, 'Invalid credentials');

    await prisma.admin.update({
      where: { id: admin.id },
      data:  { lastLoginAt: new Date() },
    });

    const accessToken  = signAdminToken({ sub: admin.id, username: admin.username, role: admin.role });
    const refreshToken = signRefreshToken(admin.id);

    return res.json({
      accessToken,
      refreshToken,
      profile: { id: admin.id, username: admin.username, displayName: admin.displayName, role: admin.role },
    });
  } catch (err) { next(err); }
}

// ─── Token Refresh ────────────────────────────────────────────────────────────
export async function refreshTokens(req: Request, res: Response, next: NextFunction) {
  try {
    const { refreshToken } = z.object({ refreshToken: z.string() }).parse(req.body);
    const decoded = verifyRefreshToken(refreshToken);

    // Try reporter first, then admin
    const reporter = await prisma.reporterSession.findUnique({ where: { id: decoded.sub } });
    if (reporter) {
      const accessToken   = signReporterToken({ sub: reporter.id, anonId: reporter.anonId });
      const newRefresh    = signRefreshToken(reporter.id);
      return res.json({ accessToken, refreshToken: newRefresh });
    }

    const admin = await prisma.admin.findUnique({ where: { id: decoded.sub } });
    if (admin && admin.isActive) {
      const accessToken = signAdminToken({ sub: admin.id, username: admin.username, role: admin.role });
      const newRefresh  = signRefreshToken(admin.id);
      return res.json({ accessToken, refreshToken: newRefresh });
    }

    throw new AppError(401, 'Invalid refresh token');
  } catch (err) { next(err); }
}

// ─── Me ───────────────────────────────────────────────────────────────────────
export async function getMe(req: Request, res: Response) {
  if (req.reporter) {
    const session = await prisma.reporterSession.findUnique({
      where: { id: req.reporter.sessionId },
      select: { anonId: true, avatarSeed: true, createdAt: true },
    });
    return res.json({ type: 'reporter', ...session });
  }
  if (req.admin) {
    const admin = await prisma.admin.findUnique({
      where: { id: req.admin.adminId },
      select: { id: true, username: true, displayName: true, role: true, lastLoginAt: true },
    });
    return res.json({ type: 'admin', ...admin });
  }
  return res.status(401).json({ error: 'Not authenticated' });
}
