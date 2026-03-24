import { z }    from 'zod';
import * as dotenv from 'dotenv';
import * as path   from 'path';

// Load .env from the project root (two levels up from src/config/)
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const envSchema = z.object({
  DATABASE_URL:          z.string().min(1),
  JWT_SECRET:            z.string().min(32),
  JWT_REPORTER_EXPIRY:   z.string().default('7d'),
  JWT_ADMIN_EXPIRY:      z.string().default('8h'),
  JWT_REFRESH_SECRET:    z.string().min(32),
  JWT_REFRESH_EXPIRY:    z.string().default('30d'),
  ENCRYPTION_KEY:        z.string().min(32),
  PORT:                  z.string().default('3000'),
  NODE_ENV:              z.enum(['development', 'production', 'test']).default('development'),
  CORS_ORIGIN:           z.string().default('http://localhost:4200'),
  RATE_LIMIT_WINDOW_MS:  z.string().default('900000'),
  RATE_LIMIT_MAX:        z.string().default('100'),
  UPLOAD_DIR:            z.string().default('./uploads/encrypted'),
  MAX_FILE_SIZE_MB:      z.string().default('25'),
  ALLOWED_MIME_TYPES:    z.string().default('image/jpeg,image/png,image/gif,application/pdf,video/mp4,audio/mpeg'),
  WS_PORT:               z.string().default('3001'),
  LOG_LEVEL:             z.string().default('info'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Invalid environment variables:', parsed.error.format());
  process.exit(1);
}

export const config = {
  db: {
    url: parsed.data.DATABASE_URL,
  },
  jwt: {
    secret:          parsed.data.JWT_SECRET,
    reporterExpiry:  parsed.data.JWT_REPORTER_EXPIRY,
    adminExpiry:     parsed.data.JWT_ADMIN_EXPIRY,
    refreshSecret:   parsed.data.JWT_REFRESH_SECRET,
    refreshExpiry:   parsed.data.JWT_REFRESH_EXPIRY,
  },
  encryption: {
    key: parsed.data.ENCRYPTION_KEY,
  },
  server: {
    port:           parseInt(parsed.data.PORT, 10),
    nodeEnv:        parsed.data.NODE_ENV,
    corsOrigin:     parsed.data.CORS_ORIGIN,
    isDev:          parsed.data.NODE_ENV === 'development',
  },
  rateLimit: {
    windowMs: parseInt(parsed.data.RATE_LIMIT_WINDOW_MS, 10),
    max:      parseInt(parsed.data.RATE_LIMIT_MAX, 10),
  },
  upload: {
    dir:         parsed.data.UPLOAD_DIR,
    maxSizeMB:   parseInt(parsed.data.MAX_FILE_SIZE_MB, 10),
  },
  ws: {
    port: parseInt(parsed.data.WS_PORT, 10),
  },
  log: {
    level: parsed.data.LOG_LEVEL,
  },
} as const;