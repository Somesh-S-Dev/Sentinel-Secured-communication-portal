import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { Severity } from '@prisma/client';
import prisma from '../config/prisma';
import { encrypt, decrypt } from '../utils/encryption';
import { generateCaseNumber } from '../utils/caseNumber';
import { AppError } from '../middleware/error.middleware';
import { wsServer } from '../services/websocket.service';

const sendMessageSchema = z.object({
  content:  z.string().min(1).max(10000),
  severity: z.nativeEnum(Severity).default('INFO'),
  reportId: z.string().uuid().optional(),
});

// ─── Send a message ───────────────────────────────────────────────────────────
export async function sendMessage(req: Request, res: Response, next: NextFunction) {
  try {
    const { channelId } = z.object({ channelId: z.string().uuid() }).parse(req.params);
    const { content, severity, reportId } = sendMessageSchema.parse(req.body);

    const channel = await prisma.channel.findUnique({ where: { id: channelId } });
    if (!channel || !channel.isActive) throw new AppError(404, 'Channel not found');

    const { encrypted, iv, tag } = encrypt(content);
    const encryptedContent       = JSON.stringify({ encrypted, tag }); // store tag with ciphertext

    const isAdminMessage   = !!req.admin;
    const reporterSessionId = req.reporter?.sessionId ?? null;
    const adminId           = req.admin?.adminId ?? null;

    // Auto-create a report on first message if no reportId provided and it's a reporter
    let resolvedReportId = reportId ?? null;
    if (!resolvedReportId && !isAdminMessage) {
      const caseNumber = await generateCaseNumber(channel.type);
      const report = await prisma.report.create({
        data: {
          caseNumber,
          severity,
          channelId,
          reporterSessionId,
        },
      });
      resolvedReportId = report.id;

      // In-system notifications for all active admins in this channel type
      const admins = await prisma.admin.findMany({
        where: { isActive: true },
        select: { id: true },
      });
      await prisma.notification.createMany({
        data: admins.map(a => ({
          type:     'CASE_OPENED' as const,
          title:    `New ${severity} report: ${caseNumber}`,
          body:     `A new report has been submitted in #${channel.slug}`,
          reportId: report.id,
          adminId:  a.id,
        })),
      });
    }

    const message = await prisma.message.create({
      data: {
        channelId,
        reportId:         resolvedReportId,
        encryptedContent,
        iv,
        severity,
        isAdminMessage,
        reporterSessionId,
        adminId,
      },
      select: {
        id: true, channelId: true, reportId: true,
        severity: true, isAdminMessage: true, createdAt: true,
        reporterSession: { select: { anonId: true, avatarSeed: true } },
        admin:           { select: { displayName: true, role: true } },
      },
    });

    // Decrypt for response (never stored decrypted)
    const responseMessage = { ...message, content };

    // Broadcast via WebSocket to channel subscribers
    wsServer.broadcastToChannel(channelId, { type: 'NEW_MESSAGE', message: responseMessage });

    return res.status(201).json({ message: responseMessage, reportId: resolvedReportId });
  } catch (err) { next(err); }
}

// ─── Get messages for a channel ───────────────────────────────────────────────
export async function getChannelMessages(req: Request, res: Response, next: NextFunction) {
  try {
    const { channelId } = z.object({ channelId: z.string().uuid() }).parse(req.params);
    const { cursor, limit = '50' } = z.object({
      cursor: z.string().uuid().optional(),
      limit:  z.string().regex(/^\d+$/).optional(),
    }).parse(req.query);

    const take = Math.min(parseInt(limit, 10), 100);

    const messages = await prisma.message.findMany({
      where: {
        channelId,
        isDeleted: false,
        ...(cursor ? { id: { lt: cursor } } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take,
      select: {
        id: true, channelId: true, reportId: true, severity: true,
        isAdminMessage: true, createdAt: true, iv: true, encryptedContent: true,
        reporterSession: { select: { anonId: true, avatarSeed: true } },
        admin:           { select: { displayName: true, role: true } },
        attachments:     { select: { id: true, originalName: true, mimeType: true, sizeBytes: true } },
      },
    });

    // Decrypt content for authenticated callers
    const decrypted = messages.map(msg => {
      try {
        const { encrypted, tag } = JSON.parse(msg.encryptedContent) as { encrypted: string; tag: string };
        const content = decrypt({ encrypted, iv: msg.iv, tag });
        const { encryptedContent, iv, ...rest } = msg;
        return { ...rest, content };
      } catch {
        const { encryptedContent, iv, ...rest } = msg;
        return { ...rest, content: '[Decryption error]' };
      }
    });

    return res.json({ messages: decrypted.reverse(), hasMore: messages.length === take });
  } catch (err) { next(err); }
}

// ─── Get messages for a specific report/case ──────────────────────────────────
export async function getReportMessages(req: Request, res: Response, next: NextFunction) {
  try {
    const { reportId } = z.object({ reportId: z.string().uuid() }).parse(req.params);

    // Reporter can only see their own report messages
    if (req.reporter) {
      const report = await prisma.report.findUnique({ where: { id: reportId } });
      if (report?.reporterSessionId !== req.reporter.sessionId) {
        throw new AppError(403, 'Access denied');
      }
    }

    const messages = await prisma.message.findMany({
      where: { reportId, isDeleted: false },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true, reportId: true, severity: true, isAdminMessage: true, createdAt: true,
        iv: true, encryptedContent: true,
        reporterSession: { select: { anonId: true, avatarSeed: true } },
        admin:           { select: { displayName: true, role: true } },
        attachments:     { select: { id: true, originalName: true, mimeType: true, sizeBytes: true } },
      },
    });

    const decrypted = messages.map(msg => {
      try {
        const { encrypted, tag } = JSON.parse(msg.encryptedContent) as { encrypted: string; tag: string };
        const content = decrypt({ encrypted, iv: msg.iv, tag });
        const { encryptedContent, iv, ...rest } = msg;
        return { ...rest, content };
      } catch {
        const { encryptedContent, iv, ...rest } = msg;
        return { ...rest, content: '[Decryption error]' };
      }
    });

    return res.json({ messages: decrypted });
  } catch (err) { next(err); }
}
