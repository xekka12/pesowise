import { Router } from 'express';
import { AppError } from '../lib/errors.js';
import { asyncHandler, requireUser } from '../lib/http.js';
import { prisma } from '../lib/prisma.js';

export const notificationsRouter = Router();

notificationsRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const user = requireUser(req);
    const [items, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: 'desc' },
        take: 100,
      }),
      prisma.notification.count({ where: { userId: user.id, read: false } }),
    ]);
    res.json({
      unreadCount,
      items: items.map((item) => ({
        id: item.id,
        type: item.type,
        title: item.title,
        message: item.message,
        read: item.read,
        createdAt: item.createdAt.toISOString(),
      })),
    });
  }),
);

notificationsRouter.patch(
  '/:id/read',
  asyncHandler(async (req, res) => {
    const user = requireUser(req);
    const existing = await prisma.notification.findFirst({ where: { id: req.params.id, userId: user.id } });
    if (!existing) throw new AppError(404, 'Notification not found.');
    const notification = await prisma.notification.update({ where: { id: existing.id }, data: { read: true } });
    res.json({
      notification: {
        id: notification.id,
        type: notification.type,
        title: notification.title,
        message: notification.message,
        read: notification.read,
        createdAt: notification.createdAt.toISOString(),
      },
    });
  }),
);

notificationsRouter.post(
  '/read-all',
  asyncHandler(async (req, res) => {
    const user = requireUser(req);
    await prisma.notification.updateMany({ where: { userId: user.id, read: false }, data: { read: true } });
    res.json({ ok: true });
  }),
);
