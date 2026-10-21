import { manilaToday, normalizeMoney } from '@pesowise/shared';
import { Router } from 'express';
import { AppError } from '../lib/errors.js';
import { asyncHandler, parseInput, requireUser } from '../lib/http.js';
import { recurringDto } from '../lib/mappers.js';
import { prisma } from '../lib/prisma.js';
import { recurringSchema, recurringUpdateSchema } from '../lib/schemas.js';
import { assertCategoryMatches, requireCategory } from '../services/access.js';
import { initialNextOccurrence, nextAfterEdit, processDueRecurring } from '../services/recurring.js';

export const recurringRouter = Router();
const includeCategory = { category: true } as const;

recurringRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const user = requireUser(req);
    const rules = await prisma.recurringTransaction.findMany({
      where: { userId: user.id },
      include: includeCategory,
      orderBy: [{ status: 'asc' }, { nextOccurrence: 'asc' }],
    });
    res.json({ recurring: rules.map(recurringDto) });
  }),
);

recurringRouter.post(
  '/',
  asyncHandler(async (req, res) => {
    const user = requireUser(req);
    const input = parseInput(recurringSchema, req.body);
    const endDate = input.endDate ?? null;
    if (endDate && endDate < input.startDate) throw new AppError(400, 'The end date must be on or after the start date.');
    const category = await requireCategory(user.id, input.categoryId);
    assertCategoryMatches(category, input.type);
    const rule = await prisma.recurringTransaction.create({
      data: {
        userId: user.id,
        categoryId: category.id,
        description: input.description,
        amount: normalizeMoney(input.amount)!,
        type: input.type,
        frequency: input.frequency,
        startDate: input.startDate,
        endDate,
        nextOccurrence: initialNextOccurrence(input.startDate, input.frequency, endDate),
        paymentMethod: input.paymentMethod,
        notes: input.notes,
      },
      include: includeCategory,
    });
    res.status(201).json({ recurring: recurringDto(rule) });
  }),
);

recurringRouter.patch(
  '/:id',
  asyncHandler(async (req, res) => {
    const user = requireUser(req);
    const input = parseInput(recurringUpdateSchema, req.body);
    const existing = await prisma.recurringTransaction.findFirst({ where: { id: req.params.id, userId: user.id } });
    if (!existing) throw new AppError(404, 'Recurring transaction not found.');
    const endDate = input.endDate ?? null;
    if (endDate && endDate < existing.startDate.trim()) throw new AppError(400, 'The end date must be on or after the start date.');
    const category = await requireCategory(user.id, input.categoryId);
    assertCategoryMatches(category, input.type, existing.categoryId);
    const rule = await prisma.recurringTransaction.update({
      where: { id: existing.id },
      data: {
        categoryId: category.id,
        description: input.description,
        amount: normalizeMoney(input.amount)!,
        type: input.type,
        endDate,
        paymentMethod: input.paymentMethod,
        notes: input.notes,
        nextOccurrence:
          existing.status === 'ACTIVE'
            ? nextAfterEdit({
                startDate: existing.startDate.trim(),
                frequency: existing.frequency,
                endDate,
                previousNext: existing.nextOccurrence?.trim() ?? null,
              })
            : existing.nextOccurrence,
      },
      include: includeCategory,
    });
    res.json({ recurring: recurringDto(rule) });
  }),
);

recurringRouter.post(
  '/:id/pause',
  asyncHandler(async (req, res) => {
    const rule = await setStatus(requireUser(req).id, req.params.id, 'PAUSED');
    res.json({ recurring: rule });
  }),
);

recurringRouter.post(
  '/:id/resume',
  asyncHandler(async (req, res) => {
    const user = requireUser(req);
    const existing = await prisma.recurringTransaction.findFirst({ where: { id: req.params.id, userId: user.id } });
    if (!existing) throw new AppError(404, 'Recurring transaction not found.');
    const today = manilaToday();
    const next = nextAfterEdit({
      startDate: existing.startDate.trim(),
      frequency: existing.frequency,
      endDate: existing.endDate?.trim() ?? null,
      previousNext: today,
    });
    const rule = await prisma.recurringTransaction.update({
      where: { id: existing.id },
      data: { status: 'ACTIVE', nextOccurrence: next },
      include: includeCategory,
    });
    res.json({ recurring: recurringDto(rule) });
  }),
);

recurringRouter.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const user = requireUser(req);
    const existing = await prisma.recurringTransaction.findFirst({ where: { id: req.params.id, userId: user.id } });
    if (!existing) throw new AppError(404, 'Recurring transaction not found.');
    await prisma.recurringTransaction.delete({ where: { id: existing.id } });
    res.status(204).send();
  }),
);

recurringRouter.post(
  '/process',
  asyncHandler(async (req, res) => {
    const user = requireUser(req);
    const result = await processDueRecurring(user.id);
    res.json(result);
  }),
);

async function setStatus(userId: string, id: string, status: 'ACTIVE' | 'PAUSED') {
  const existing = await prisma.recurringTransaction.findFirst({ where: { id, userId } });
  if (!existing) throw new AppError(404, 'Recurring transaction not found.');
  const rule = await prisma.recurringTransaction.update({ where: { id }, data: { status }, include: includeCategory });
  return recurringDto(rule);
}
