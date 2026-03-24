import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { CaseStatus, Severity } from '@prisma/client';
import prisma from '../config/prisma';
import { AppError } from '../middleware/error.middleware';
import { wsServer } from '../services/websocket.service';

// ─── List reports (admin) ─────────────────────────────────────────────────────
export async function listReports(req: Request, res: Response, next: NextFunction) {
  try {
    const query = z.object({
      status:   z.nativeEnum(CaseStatus).optional(),
      severity: z.nativeEnum(Severity).optional(),
      channel:  z.string().optional(),
      page:     z.string().regex(/^\d+$/).default('1'),
      limit:    z.string().regex(/^\d+$/).default('20'),
    }).parse(req.query);

    const page  = parseInt(query.page, 10);
    const limit = Math.min(parseInt(query.limit, 10), 50);
    const skip  = (page - 1) * limit;

    const where = {
      ...(query.status   ? { status: query.status }     : {}),
      ...(query.severity ? { severity: query.severity } : {}),
      ...(query.channel  ? { channel: { slug: query.channel } } : {}),
    };

    const [reports, total] = await Promise.all([
      prisma.report.findMany({
        where,
        orderBy: [{ severity: 'desc' }, { createdAt: 'desc' }],
        skip, take: limit,
        select: {
          id: true, caseNumber: true, severity: true, status: true,
          createdAt: true, updatedAt: true,
          channel:    { select: { slug: true, displayName: true, type: true } },
          assignments: { select: { admin: { select: { displayName: true, role: true } } } },
          _count:     { select: { messages: true, attachments: true } },
        },
      }),
      prisma.report.count({ where }),
    ]);

    return res.json({ reports, total, page, pages: Math.ceil(total / limit) });
  } catch (err) { next(err); }
}

// ─── Get single report (admin) ────────────────────────────────────────────────
export async function getReport(req: Request, res: Response, next: NextFunction) {
  try {
    const { reportId } = z.object({ reportId: z.string().uuid() }).parse(req.params);

    const report = await prisma.report.findUnique({
      where: { id: reportId },
      include: {
        channel:     true,
        assignments: { include: { admin: { select: { id: true, displayName: true, role: true } } } },
        attachments: { select: { id: true, originalName: true, mimeType: true, sizeBytes: true, uploadedAt: true } },
        _count:      { select: { messages: true } },
      },
    });

    if (!report) throw new AppError(404, 'Report not found');
    return res.json({ report });
  } catch (err) { next(err); }
}

// ─── Reporter: get own reports ────────────────────────────────────────────────
export async function getMyReports(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.reporter) throw new AppError(403, 'Forbidden');

    const reports = await prisma.report.findMany({
      where: { reporterSessionId: req.reporter.sessionId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true, caseNumber: true, severity: true, status: true,
        createdAt: true, updatedAt: true,
        channel:  { select: { slug: true, displayName: true } },
        _count:   { select: { messages: true } },
      },
    });

    return res.json({ reports });
  } catch (err) { next(err); }
}

// ─── Update report status (admin) ─────────────────────────────────────────────
export async function updateReportStatus(req: Request, res: Response, next: NextFunction) {
  try {
    const { reportId } = z.object({ reportId: z.string().uuid() }).parse(req.params);
    const { status, note } = z.object({
      status: z.nativeEnum(CaseStatus),
      note:   z.string().max(1000).optional(),
    }).parse(req.body);

    const report = await prisma.report.findUnique({ where: { id: reportId } });
    if (!report) throw new AppError(404, 'Report not found');

    const updated = await prisma.report.update({
      where: { id: reportId },
      data:  { status, updatedAt: new Date() },
    });

    // In-system notification to reporter
    await prisma.notification.create({
      data: {
        type:             'CASE_UPDATED',
        title:            `Your report ${report.caseNumber} has been updated`,
        body:             `Status changed to ${status}${note ? `: ${note}` : ''}`,
        reportId,
        reporterSessionId: report.reporterSessionId ?? undefined,
      },
    });

    // Broadcast status change via WebSocket
    wsServer.broadcastToChannel(report.channelId, {
      type: 'REPORT_STATUS_UPDATED',
      reportId,
      status,
    });

    return res.json({ report: updated });
  } catch (err) { next(err); }
}

// ─── Assign case to admin ─────────────────────────────────────────────────────
export async function assignReport(req: Request, res: Response, next: NextFunction) {
  try {
    const { reportId } = z.object({ reportId: z.string().uuid() }).parse(req.params);
    const { adminId, note } = z.object({
      adminId: z.string().uuid(),
      note:    z.string().max(500).optional(),
    }).parse(req.body);

    const [report, admin] = await Promise.all([
      prisma.report.findUnique({ where: { id: reportId } }),
      prisma.admin.findUnique({ where: { id: adminId } }),
    ]);

    if (!report) throw new AppError(404, 'Report not found');
    if (!admin)  throw new AppError(404, 'Admin not found');

    const assignment = await prisma.caseAssignment.upsert({
      where:  { reportId_adminId: { reportId, adminId } },
      update: { note: note ?? null },
      create: { reportId, adminId, note: note ?? null },
    });

    // Notify the assigned admin
    await prisma.notification.create({
      data: {
        type:     'CASE_ASSIGNED',
        title:    `Case ${report.caseNumber} assigned to you`,
        body:     note ?? `You have been assigned to case ${report.caseNumber}`,
        reportId,
        adminId,
      },
    });

    return res.json({ assignment });
  } catch (err) { next(err); }
}

// ─── Dashboard stats (admin) ──────────────────────────────────────────────────
export async function getDashboardStats(req: Request, res: Response, next: NextFunction) {
  try {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const [open, critical, resolvedMonth, avgResolveTime, byChannel, bySeverity] = await Promise.all([
      prisma.report.count({ where: { status: { in: ['OPEN', 'UNDER_REVIEW', 'ESCALATED'] } } }),
      prisma.report.count({ where: { severity: 'CRITICAL', status: { not: 'RESOLVED' } } }),
      prisma.report.count({ where: { status: 'RESOLVED', updatedAt: { gte: thirtyDaysAgo } } }),
      // Approximate avg resolution time in hours
      prisma.$queryRaw<[{ avg_hours: number }]>`
        SELECT EXTRACT(EPOCH FROM AVG(updated_at - created_at)) / 3600 AS avg_hours
        FROM reports WHERE status = 'RESOLVED'
      `,
      prisma.report.groupBy({ by: ['channelId'], _count: { id: true } }),
      prisma.report.groupBy({ by: ['severity'], _count: { id: true } }),
    ]);

    return res.json({
      open,
      critical,
      resolvedMonth,
      avgResolveHours: Math.round(avgResolveTime[0]?.avg_hours ?? 0),
      byChannel,
      bySeverity,
    });
  } catch (err) { next(err); }
}
