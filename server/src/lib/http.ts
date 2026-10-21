import type { NextFunction, Request, RequestHandler, Response } from 'express';
import { ZodError, type ZodType } from 'zod';
import { AppError } from './errors.js';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  warningThreshold: number;
  createdAt: Date;
}

declare module 'express-serve-static-core' {
  interface Request {
    authUser?: AuthUser;
  }
}

export function asyncHandler(handler: (req: Request, res: Response, next: NextFunction) => Promise<unknown>): RequestHandler {
  return (req, res, next) => {
    handler(req, res, next).catch(next);
  };
}

export function requireUser(req: Request): AuthUser {
  if (!req.authUser) throw new AppError(401, 'Sign in to continue.');
  return req.authUser;
}

function fieldErrors(error: ZodError): Record<string, string> {
  const fields: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.length > 0 ? issue.path.join('.') : 'form';
    if (!fields[key]) fields[key] = issue.message;
  }
  return fields;
}

export function parseInput<T>(schema: ZodType<T>, value: unknown): T {
  const result = schema.safeParse(value);
  if (!result.success) {
    throw new AppError(400, 'Please correct the highlighted fields.', fieldErrors(result.error));
  }
  return result.data;
}
