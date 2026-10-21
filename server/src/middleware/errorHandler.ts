import type { NextFunction, Request, Response } from 'express';
import { config } from '../config.js';
import { AppError, isUniqueConstraint } from '../lib/errors.js';

export function errorHandler(error: unknown, _req: Request, res: Response, _next: NextFunction): void {
  if (error instanceof AppError) {
    res.status(error.status).json({ error: error.message, ...(error.fields ? { fields: error.fields } : {}) });
    return;
  }
  if (error instanceof SyntaxError && 'body' in error) {
    res.status(400).json({ error: 'The request body is not valid JSON.' });
    return;
  }
  if (isUniqueConstraint(error)) {
    res.status(409).json({ error: 'That record already exists.' });
    return;
  }
  if (config.nodeEnv !== 'test') console.error(error);
  res.status(500).json({ error: 'Something went wrong. Please try again.' });
}
