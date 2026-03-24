import jwt from 'jsonwebtoken';
import { config } from '../config/config';

export type TokenType = 'reporter' | 'admin' | 'refresh';

export interface ReporterTokenPayload {
  sub:       string; // reporterSession.id
  anonId:    string;
  type:      'reporter';
}

export interface AdminTokenPayload {
  sub:      string; // admin.id
  username: string;
  role:     string;
  type:     'admin';
}

export type TokenPayload = ReporterTokenPayload | AdminTokenPayload;

export function signReporterToken(payload: Omit<ReporterTokenPayload, 'type'>): string {
  return jwt.sign(
    { ...payload, type: 'reporter' },
    config.jwt.secret,
    { expiresIn: config.jwt.reporterExpiry } as jwt.SignOptions
  );
}

export function signAdminToken(payload: Omit<AdminTokenPayload, 'type'>): string {
  return jwt.sign(
    { ...payload, type: 'admin' },
    config.jwt.secret,
    { expiresIn: config.jwt.adminExpiry } as jwt.SignOptions
  );
}

export function signRefreshToken(sub: string): string {
  return jwt.sign(
    { sub },
    config.jwt.refreshSecret,
    { expiresIn: config.jwt.refreshExpiry } as jwt.SignOptions
  );
}

export function verifyAccessToken(token: string): TokenPayload {
  return jwt.verify(token, config.jwt.secret) as TokenPayload;
}

export function verifyRefreshToken(token: string): { sub: string } {
  return jwt.verify(token, config.jwt.refreshSecret) as { sub: string };
}

export function generateAnonId(): string {
  const num = Math.floor(1000 + Math.random() * 9000);
  return `Anon-${num}`;
}

export function generateAvatarSeed(): string {
  return Math.random().toString(36).substring(2, 10);
}
