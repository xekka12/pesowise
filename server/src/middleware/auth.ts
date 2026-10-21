import type { NextFunction, Request, Response } from 'express';
import { COOKIE_NAME } from '../config.js';
import { AppError } from '../lib/errors.js';
import { prisma } from '../lib/prisma.js';
import { hashToken } from '../lib/session.js';

export async function requireAuth(req: Request, _res: Response, next: NextFunction): Promise<void> {
  try {
    const token = req.cookies?.[COOKIE_NAME];
    if (typeof token !== 'string' || !token) throw new AppError(401, 'Sign in to continue.');
    const session = await prisma.session.findUnique({
      where: { tokenHash: hashToken(token) },
      include: {
        user: { select: { id: true, email: true, name: true, warningThreshold: true, createdAt: true } },
      },
    });
    if (!session || session.expiresAt.getTime() <= Date.now()) {
      if (session) await prisma.session.delete({ where: { id: session.id } }).catch(() => undefined);
      throw new AppError(401, 'Sign in to continue.');
    }
    req.authUser = session.user;
    next();
  } catch (error) {
    next(error);
  }
}

export function requireRequestHeader(req: Request, _res: Response, next: NextFunction): void {
  if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS') {
    next();
    return;
  }
  if (req.get('x-pesowise-request') !== '1') {
    next(new AppError(403, 'This request was blocked. Refresh the page and try again.'));
    return;
  }
  next();
}
