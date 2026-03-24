import { Request, Response, NextFunction } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';
import { z } from 'zod';
import prisma from '../config/prisma';
import { encryptFile, decryptFile, generateChecksum } from '../utils/encryption';
import { AppError } from '../middleware/error.middleware';
import { config } from '../config/config';

const ALLOWED_MIMES = new Set([
  'image/jpeg', 'image/png', 'image/gif', 'image/webp',
  'application/pdf', 'video/mp4', 'audio/mpeg', 'audio/wav',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]);

const storage = multer.memoryStorage();

export const upload = multer({
  storage,
  limits: { fileSize: config.upload.maxSizeMB * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIMES.has(file.mimetype)) cb(null, true);
    else cb(new AppError(400, `File type ${file.mimetype} not allowed`));
  },
});

export async function uploadAttachment(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.file) throw new AppError(400, 'No file uploaded');

    const { reportId, messageId } = z.object({
      reportId:  z.string().uuid().optional(),
      messageId: z.string().uuid().optional(),
    }).parse(req.body);

    const buffer   = req.file.buffer;
    const checksum = generateChecksum(buffer);

    const { encryptedBuffer, iv, tag } = encryptFile(buffer);

    await fs.mkdir(config.upload.dir, { recursive: true });
    const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.enc`;
    const filepath = path.join(config.upload.dir, filename);
    await fs.writeFile(filepath, encryptedBuffer);

    const attachment = await prisma.attachment.create({
      data: {
        originalName:  req.file.originalname,
        encryptedPath: `${filepath}::${iv}::${tag}`,
        mimeType:      req.file.mimetype,
        sizeBytes:     req.file.size,
        checksum,
        ...(reportId  ? { reportId }  : {}),
        ...(messageId ? { messageId } : {}),
      },
      select: { id: true, originalName: true, mimeType: true, sizeBytes: true, uploadedAt: true },
    });

    return res.status(201).json({ attachment });
  } catch (err) { next(err); }
}

export async function downloadAttachment(req: Request, res: Response, next: NextFunction) {
  try {
    const { attachmentId } = z.object({ attachmentId: z.string().uuid() }).parse(req.params);

    const attachment = await prisma.attachment.findUnique({ where: { id: attachmentId } });
    if (!attachment) throw new AppError(404, 'Attachment not found');

    // Reporter can only download from own reports
    if (req.reporter && attachment.reportId) {
      const report = await prisma.report.findUnique({ where: { id: attachment.reportId } });
      if (report?.reporterSessionId !== req.reporter.sessionId) throw new AppError(403, 'Access denied');
    }

    const [filepath, iv, tag] = attachment.encryptedPath.split('::');
    const encryptedBuffer = await fs.readFile(filepath);
    const decrypted       = decryptFile(encryptedBuffer, iv, tag);

    res.setHeader('Content-Disposition', `attachment; filename="${attachment.originalName}"`);
    res.setHeader('Content-Type', attachment.mimeType);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    return res.send(decrypted);
  } catch (err) { next(err); }
}
