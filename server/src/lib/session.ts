import { createHmac, randomBytes } from 'node:crypto';
import type { Request, Response } from 'express';
import { COOKIE_NAME, config } from '../config.js';
import { prisma } from './prisma.js';

export function newSessionToken(): string {
  return randomBytes(32).toString('base64url');
}

export function hashToken(token: string): string {
  return createHmac('sha256', config.sessionSecret).update(token).digest('hex');
}

function baseCookieOptions() {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: config.cookieSecure,
    path: '/',
  };
}

export function cookieOptions() {
  return {
    ...baseCookieOptions(),
    maxAge: config.sessionDays * 24 * 60 * 60 * 1000,
  };
}

export async function createSession(userId: string, req: Request): Promise<string> {
  const token = newSessionToken();
  await prisma.session.create({
    data: {
      userId,
      tokenHash: hashToken(token),
      expiresAt: new Date(Date.now() + config.sessionDays * 24 * 60 * 60 * 1000),
      userAgent: req.get('user-agent')?.slice(0, 255),
      ipAddress: req.ip?.slice(0, 64),
    },
  });
  return token;
}

export function setSessionCookie(res: Response, token: string): void {
  res.cookie(COOKIE_NAME, token, cookieOptions());
}

export function clearSessionCookie(res: Response): void {
  res.clearCookie(COOKIE_NAME, baseCookieOptions());
}
