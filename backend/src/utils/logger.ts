import winston from 'winston';
import { config } from '../config/config';

const { combine, timestamp, errors, json, colorize, simple } = winston.format;

export const logger = winston.createLogger({
  level: config.log.level,
  format: combine(timestamp(), errors({ stack: true }), json()),
  defaultMeta: { service: 'sentinel-api' },
  transports: [
    new winston.transports.File({ filename: 'logs/error.log',   level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' }),
  ],
});

if (config.server.isDev) {
  logger.add(new winston.transports.Console({
    format: combine(colorize(), simple()),
  }));
}

export default logger;
