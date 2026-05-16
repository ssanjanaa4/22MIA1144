import { Request, Response, NextFunction } from 'express';
import { logger } from '../logger/logger';

// Simple error handler middleware for Express.
// It logs the error and returns a consistent JSON response.
export function errorHandler(err: any, req: Request, res: Response, next: NextFunction) {
  const status = err.status || 500;
  const message = err.message || 'Internal Server Error';

  // Log stack for server-side debugging (not sent to clients)
  logger.error(`${req.method} ${req.originalUrl} - ${message}`);
  if (err.stack) {
    logger.debug(err.stack);
  }

  res.status(status).json({
    error: message,
  });
}

export default errorHandler;
