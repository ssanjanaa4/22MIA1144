import winston from 'winston';
import { Request, Response, NextFunction } from 'express';

// Create a basic Winston logger with timestamp and console transport.
// This is lightweight and easy for beginners to extend.
const { combine, timestamp, printf, colorize } = winston.format;

const logFormat = printf(({ level, message, timestamp }) => {
  return `${timestamp} [${level}]: ${message}`;
});

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: combine(colorize(), timestamp(), logFormat),
  transports: [new winston.transports.Console()],
});

// Express middleware to log incoming requests and responses.
export function requestLogger(req: Request, res: Response, next: NextFunction) {
  const start = Date.now();
  const { method, originalUrl } = req;

  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info(`${method} ${originalUrl} ${res.statusCode} - ${duration}ms`);
  });

  next();
}

export default logger;
