import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';

import { config }        from './config/config';
import prisma            from './config/prisma';
import routes            from './routes/index';
import { errorHandler, notFoundHandler } from './middleware/error.middleware';
import { wsServer }      from './services/websocket.service';
import logger            from './utils/logger';

const app = express();

// ─── Security headers ─────────────────────────────────────────────────────────
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'same-site' },
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc:  ["'self'"],
      styleSrc:   ["'self'", "'unsafe-inline'"],
      imgSrc:     ["'self'", 'data:'],
      connectSrc: ["'self'", `ws://localhost:${config.ws.port}`],
      frameSrc:   ["'none'"],
      objectSrc:  ["'none'"],
    },
  },
}));

// ─── CORS ─────────────────────────────────────────────────────────────────────
app.use(cors({
  origin:      config.server.corsOrigin,
  credentials: true,
  methods:     ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// ─── Global rate limiter ──────────────────────────────────────────────────────
app.use(rateLimit({
  windowMs:       config.rateLimit.windowMs,
  max:            config.rateLimit.max,
  standardHeaders: true,
  legacyHeaders:  false,
}));

// ─── Body & utils ────────────────────────────────────────────────────────────
app.use(compression());
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));
app.use(cookieParser());

if (config.server.isDev) {
  app.use(morgan('dev'));
}

// ─── Disable leaking headers ─────────────────────────────────────────────────
app.disable('x-powered-by');

// ─── Health check ────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => res.json({ status: 'ok', ts: new Date().toISOString() }));

// ─── API routes ───────────────────────────────────────────────────────────────
app.use('/api/v1', routes);

// ─── 404 & error handlers ─────────────────────────────────────────────────────
app.use(notFoundHandler);
app.use(errorHandler);

// ─── Boot ─────────────────────────────────────────────────────────────────────
async function bootstrap() {
  try {
    await prisma.$connect();
    logger.info('PostgreSQL connected via Prisma');

    const server = app.listen(config.server.port, () => {
      logger.info(`Sentinel API running on port ${config.server.port} [${config.server.nodeEnv}]`);
    });

    wsServer.init(server);
    wsServer.startHeartbeat();

    // Graceful shutdown
    const shutdown = async (signal: string) => {
      logger.info(`${signal} received — shutting down`);
      server.close(async () => {
        await prisma.$disconnect();
        logger.info('Server and DB connections closed');
        process.exit(0);
      });
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT',  () => shutdown('SIGINT'));

  } catch (err) {
    logger.error('Failed to start server:', err);
    process.exit(1);
  }
}

bootstrap();