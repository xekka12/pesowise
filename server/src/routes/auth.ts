import { DEFAULT_CATEGORIES } from '@pesowise/shared';
import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { config } from '../config.js';
import { AppError, isUniqueConstraint } from '../lib/errors.js';
import { asyncHandler, parseInput } from '../lib/http.js';
import { userDto } from '../lib/mappers.js';
import { hashPassword, verifyPassword } from '../lib/password.js';
import { prisma } from '../lib/prisma.js';
import { loginSchema, registerSchema } from '../lib/schemas.js';
import { clearSessionCookie, createSession, hashToken, setSessionCookie } from '../lib/session.js';
import { COOKIE_NAME } from '../config.js';
import { requireAuth } from '../middleware/auth.js';

export const authRouter = Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: config.authRateLimit,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => config.rateLimitDisabled,
  handler: (_req, res) => {
    res.status(429).json({ error: 'Too many attempts. Please wait and try again.' });
  },
});

authRouter.post(
  '/register',
  authLimiter,
  asyncHandler(async (req, res) => {
    const input = parseInput(registerSchema, req.body);
    const passwordHash = await hashPassword(input.password);
    try {
      const user = await prisma.$transaction(async (tx) => {
        const created = await tx.user.create({
          data: { name: input.name, email: input.email, passwordHash },
        });
        await tx.category.createMany({
          data: DEFAULT_CATEGORIES.map((category) => ({
            userId: created.id,
            name: category.name,
            type: category.type,
            icon: category.icon,
            color: category.color,
            isDefault: true,
          })),
        });
        await tx.notification.create({
          data: {
            userId: created.id,
            type: 'ACCOUNT',
            title: 'Welcome to PesoWise',
            message: 'Your categories are ready. Savings goals are amounts you enter yourself. PesoWise does not connect to a bank.',
            dedupeKey: 'account:welcome',
          },
        });
        return created;
      });
      const token = await createSession(user.id, req);
      setSessionCookie(res, token);
      res.status(201).json({ user: userDto(user) });
    } catch (error) {
      if (isUniqueConstraint(error)) throw new AppError(409, 'An account with this email already exists.');
      throw error;
    }
  }),
);

authRouter.post(
  '/login',
  authLimiter,
  asyncHandler(async (req, res) => {
    const input = parseInput(loginSchema, req.body);
    const user = await prisma.user.findUnique({ where: { email: input.email } });
    const valid = await verifyPassword(input.password, user?.passwordHash ?? null);
    if (!user || !valid) throw new AppError(401, 'Invalid email or password.');
    const token = await createSession(user.id, req);
    setSessionCookie(res, token);
    res.json({ user: userDto(user) });
  }),
);

authRouter.post(
  '/logout',
  asyncHandler(async (req, res) => {
    const token = req.cookies?.[COOKIE_NAME];
    if (typeof token === 'string' && token) {
      await prisma.session.deleteMany({ where: { tokenHash: hashToken(token) } });
    }
    clearSessionCookie(res);
    res.status(204).send();
  }),
);

authRouter.get(
  '/me',
  requireAuth,
  asyncHandler(async (req, res) => {
    res.json({ user: userDto(req.authUser!) });
  }),
);
