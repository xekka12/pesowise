import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { config } from '../config.js';
import { AppError, isUniqueConstraint } from '../lib/errors.js';
import { asyncHandler, parseInput, requireUser } from '../lib/http.js';
import { userDto } from '../lib/mappers.js';
import { hashPassword, verifyPassword } from '../lib/password.js';
import { prisma } from '../lib/prisma.js';
import { deleteAccountSchema, passwordChangeSchema, profileSchema } from '../lib/schemas.js';
import { clearSessionCookie } from '../lib/session.js';
import { notify } from '../services/alerts.js';

export const profileRouter = Router();

const passwordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: config.authRateLimit,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => config.rateLimitDisabled,
  handler: (_req, res) => {
    res.status(429).json({ error: 'Too many attempts. Please wait and try again.' });
  },
});

profileRouter.patch(
  '/',
  asyncHandler(async (req, res) => {
    const user = requireUser(req);
    const input = parseInput(profileSchema, req.body);
    try {
      const updated = await prisma.user.update({
        where: { id: user.id },
        data: {
          name: input.name,
          email: input.email,
          warningThreshold: input.warningThreshold,
        },
      });
      res.json({ user: userDto(updated) });
    } catch (error) {
      if (isUniqueConstraint(error)) throw new AppError(409, 'An account with this email already exists.');
      throw error;
    }
  }),
);

profileRouter.post(
  '/password',
  passwordLimiter,
  asyncHandler(async (req, res) => {
    const user = requireUser(req);
    const input = parseInput(passwordChangeSchema, req.body);
    const existing = await prisma.user.findUnique({ where: { id: user.id } });
    const valid = await verifyPassword(input.currentPassword, existing?.passwordHash ?? null);
    if (!existing || !valid) throw new AppError(400, 'The current password is incorrect.', { currentPassword: 'The current password is incorrect.' });
    await prisma.user.update({ where: { id: user.id }, data: { passwordHash: await hashPassword(input.newPassword) } });
    await notify({
      userId: user.id,
      type: 'ACCOUNT',
      title: 'Password changed',
      message: 'Your PesoWise password was changed. If this was not you, reset access from a device you trust.',
      dedupeKey: `account:password:${new Date().toISOString()}`,
    });
    res.json({ ok: true });
  }),
);

profileRouter.delete(
  '/',
  asyncHandler(async (req, res) => {
    const user = requireUser(req);
    const input = parseInput(deleteAccountSchema, req.body);
    const existing = await prisma.user.findUnique({ where: { id: user.id } });
    const valid = await verifyPassword(input.password, existing?.passwordHash ?? null);
    if (!existing || !valid) throw new AppError(400, 'The password is incorrect.', { password: 'The password is incorrect.' });
    await prisma.$transaction([
      prisma.notification.deleteMany({ where: { userId: user.id } }),
      prisma.transaction.deleteMany({ where: { userId: user.id } }),
      prisma.budget.deleteMany({ where: { userId: user.id } }),
      prisma.recurringTransaction.deleteMany({ where: { userId: user.id } }),
      prisma.savingsGoal.deleteMany({ where: { userId: user.id } }),
      prisma.category.deleteMany({ where: { userId: user.id } }),
      prisma.session.deleteMany({ where: { userId: user.id } }),
      prisma.user.delete({ where: { id: user.id } }),
    ]);
    clearSessionCookie(res);
    res.status(204).send();
  }),
);
