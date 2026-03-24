import { Router } from 'express';
import rateLimit from 'express-rate-limit';

import {
  reporterSignup, reporterLogin,
  adminSignup, adminLogin,
  refreshTokens, getMe,
} from '../controllers/auth.controller';
import {
  sendMessage, getChannelMessages, getReportMessages,
} from '../controllers/message.controller';
import {
  listReports, getReport, getMyReports,
  updateReportStatus, assignReport, getDashboardStats,
} from '../controllers/report.controller';
import { getChannels }                             from '../controllers/channel.controller';
import { getNotifications, markRead, markAllRead } from '../controllers/notification.controller';
import { uploadAttachment, downloadAttachment, upload } from '../controllers/attachment.controller';
import { getAuditLogs }                            from '../controllers/audit.controller';
import {
  authenticate, requireAdmin, requireReporter, requireRole,
} from '../middleware/auth.middleware';
import { auditLog } from '../middleware/audit.middleware';

const router = Router();

// ─── Rate limiters ─────────────────────────────────────────────────────────────
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Too many attempts, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});

const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 20,
  message: { error: 'Upload limit reached' },
});

// ─── Auth ──────────────────────────────────────────────────────────────────────
router.post('/auth/reporter/signup',  authLimiter, reporterSignup);
router.post('/auth/reporter/login',   authLimiter, reporterLogin);
router.post('/auth/admin/login',      authLimiter, adminLogin);
router.post('/auth/admin/signup',
  authenticate, requireRole('SUPER_ADMIN'),
  adminSignup
);
router.post('/auth/refresh',  refreshTokens);
router.get('/auth/me',        authenticate, getMe);

// ─── Channels ─────────────────────────────────────────────────────────────────
router.get('/channels', authenticate, getChannels);

// ─── Messages ─────────────────────────────────────────────────────────────────
router.post(
  '/channels/:channelId/messages',
  authenticate,
  sendMessage
);
router.get(
  '/channels/:channelId/messages',
  authenticate,
  getChannelMessages
);
router.get(
  '/reports/:reportId/messages',
  authenticate,
  getReportMessages
);

// ─── Reports ──────────────────────────────────────────────────────────────────
// Reporter
router.get(
  '/reports/mine',
  authenticate, requireReporter,
  getMyReports
);

// Admin
router.get(
  '/reports',
  authenticate, requireAdmin,
  auditLog('REPORTS_LISTED', 'Report', () => 'bulk'),
  listReports
);
router.get(
  '/reports/dashboard',
  authenticate, requireAdmin,
  getDashboardStats
);
router.get(
  '/reports/:reportId',
  authenticate, requireAdmin,
  auditLog('CASE_VIEWED', 'Report', req => req.params.reportId),
  getReport
);
router.patch(
  '/reports/:reportId/status',
  authenticate, requireAdmin,
  auditLog('STATUS_CHANGED', 'Report', req => req.params.reportId),
  updateReportStatus
);
router.post(
  '/reports/:reportId/assign',
  authenticate, requireRole('SUPER_ADMIN', 'HR_ADMIN', 'LEGAL_ADMIN'),
  auditLog('CASE_ASSIGNED', 'Report', req => req.params.reportId),
  assignReport
);

// ─── Attachments ──────────────────────────────────────────────────────────────
router.post(
  '/attachments',
  authenticate,
  uploadLimiter,
  upload.single('file'),
  uploadAttachment
);
router.get(
  '/attachments/:attachmentId',
  authenticate,
  auditLog('ATTACHMENT_DOWNLOADED', 'Attachment', req => req.params.attachmentId),
  downloadAttachment
);

// ─── Notifications ────────────────────────────────────────────────────────────
router.get(  '/notifications',          authenticate, getNotifications);
router.patch('/notifications/read',     authenticate, markRead);
router.patch('/notifications/read-all', authenticate, markAllRead);

// ─── Audit Logs (SUPER_ADMIN only) ────────────────────────────────────────────
router.get(
  '/audit-logs',
  authenticate, requireRole('SUPER_ADMIN'),
  getAuditLogs
);

export default router;
