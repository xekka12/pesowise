import { manilaToday, monthsInRange, normalizeMoney, parseISODate } from '@pesowise/shared';
import { Router } from 'express';
import { AppError, isUniqueConstraint } from '../lib/errors.js';
import { asyncHandler, parseInput, requireUser } from '../lib/http.js';
import { prisma } from '../lib/prisma.js';
import { budgetSchema } from '../lib/schemas.js';
import { assertCategoryMatches, requireCategory } from '../services/access.js';
import { reconcileBudgetAlerts } from '../services/alerts.js';
import { hydrateBudgets } from '../services/budgets.js';

export const budgetsRouter = Router();

budgetsRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const user = requireUser(req);
    const month = req.query.month ? Number(req.query.month) : undefined;
    const year = req.query.year ? Number(req.query.year) : undefined;
    if ((month !== undefined && (!Number.isInteger(month) || month < 1 || month > 12)) || (year !== undefined && (!Number.isInteger(year) || year < 2000 || year > 2100))) {
      throw new AppError(400, 'Enter a valid month and year.');
    }
    const budgets = await prisma.budget.findMany({
      where: { userId: user.id, ...(month ? { month } : {}), ...(year ? { year } : {}) },
      include: { category: true },
      orderBy: [{ year: 'desc' }, { month: 'desc' }, { name: 'asc' }],
    });
    res.json({ budgets: await hydrateBudgets(user.id, budgets, user.warningThreshold) });
  }),
);

budgetsRouter.post(
  '/',
  asyncHandler(async (req, res) => {
    const user = requireUser(req);
    const input = parseInput(budgetSchema, req.body);
    const category = await requireCategory(user.id, input.categoryId);
    assertCategoryMatches(category, 'EXPENSE');
    try {
      const budget = await prisma.budget.create({
        data: {
          userId: user.id,
          categoryId: category.id,
          name: input.name,
          limitAmount: normalizeMoney(input.limit)!,
          month: input.month,
          year: input.year,
        },
        include: { category: true },
      });
      await reconcileBudgetAlerts(user.id, category.id, input.year, input.month);
      const [hydrated] = await hydrateBudgets(user.id, [budget], user.warningThreshold);
      res.status(201).json({ budget: hydrated });
    } catch (error) {
      if (isUniqueConstraint(error)) throw new AppError(409, 'A budget for this category and month already exists.');
      throw error;
    }
  }),
);

budgetsRouter.patch(
  '/:id',
  asyncHandler(async (req, res) => {
    const user = requireUser(req);
    const input = parseInput(budgetSchema, req.body);
    const existing = await prisma.budget.findFirst({ where: { id: req.params.id, userId: user.id } });
    if (!existing) throw new AppError(404, 'Budget not found.');
    const category = await requireCategory(user.id, input.categoryId);
    assertCategoryMatches(category, 'EXPENSE');
    try {
      const budget = await prisma.budget.update({
        where: { id: existing.id },
        data: {
          categoryId: category.id,
          name: input.name,
          limitAmount: normalizeMoney(input.limit)!,
          month: input.month,
          year: input.year,
        },
        include: { category: true },
      });
      await reconcileBudgetAlerts(user.id, existing.categoryId, existing.year, existing.month);
      await reconcileBudgetAlerts(user.id, category.id, input.year, input.month);
      const [hydrated] = await hydrateBudgets(user.id, [budget], user.warningThreshold);
      res.json({ budget: hydrated });
    } catch (error) {
      if (isUniqueConstraint(error)) throw new AppError(409, 'A budget for this category and month already exists.');
      throw error;
    }
  }),
);

budgetsRouter.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const user = requireUser(req);
    const existing = await prisma.budget.findFirst({ where: { id: req.params.id, userId: user.id } });
    if (!existing) throw new AppError(404, 'Budget not found.');
    await prisma.budget.delete({ where: { id: existing.id } });
    res.status(204).send();
  }),
);

export function currentBudgetPeriod(today = manilaToday()): { month: number; year: number } {
  const parts = parseISODate(today);
  return { month: parts.month, year: parts.year };
}

export function budgetMonthsInRange(from: string, to: string): Array<{ month: number; year: number }> {
  return monthsInRange(from, to).map((month) => ({ month: month.month, year: month.year }));
}
