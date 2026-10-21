import { Router } from 'express';
import { AppError, isUniqueConstraint } from '../lib/errors.js';
import { asyncHandler, parseInput, requireUser } from '../lib/http.js';
import { categoryDto } from '../lib/mappers.js';
import { prisma } from '../lib/prisma.js';
import { categorySchema } from '../lib/schemas.js';

export const categoriesRouter = Router();

categoriesRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const user = requireUser(req);
    const includeArchived = req.query.includeArchived === 'true';
    const categories = await prisma.category.findMany({
      where: { userId: user.id, ...(includeArchived ? {} : { archived: false }) },
      orderBy: [{ type: 'asc' }, { name: 'asc' }],
    });
    res.json({ categories: categories.map(categoryDto) });
  }),
);

categoriesRouter.post(
  '/',
  asyncHandler(async (req, res) => {
    const user = requireUser(req);
    const input = parseInput(categorySchema, req.body);
    try {
      const category = await prisma.category.create({
        data: { userId: user.id, name: input.name, type: input.type, icon: input.icon, color: input.color },
      });
      res.status(201).json({ category: categoryDto(category) });
    } catch (error) {
      if (isUniqueConstraint(error)) throw await duplicateCategoryError(user.id, input.name, input.type);
      throw error;
    }
  }),
);

categoriesRouter.patch(
  '/:id',
  asyncHandler(async (req, res) => {
    const user = requireUser(req);
    const input = parseInput(categorySchema, req.body);
    const existing = await prisma.category.findFirst({ where: { id: req.params.id, userId: user.id } });
    if (!existing) throw new AppError(404, 'Category not found.');
    if (existing.type !== input.type) {
      const [transactions, budgets, recurring] = await Promise.all([
        prisma.transaction.count({ where: { categoryId: existing.id } }),
        prisma.budget.count({ where: { categoryId: existing.id } }),
        prisma.recurringTransaction.count({ where: { categoryId: existing.id } }),
      ]);
      if (transactions + budgets + recurring > 0) {
        throw new AppError(400, 'This category already has records, so its type cannot change. Archive it and create a new one.');
      }
    }
    try {
      const category = await prisma.category.update({
        where: { id: existing.id },
        data: { name: input.name, type: input.type, icon: input.icon, color: input.color },
      });
      res.json({ category: categoryDto(category) });
    } catch (error) {
      if (isUniqueConstraint(error)) throw await duplicateCategoryError(user.id, input.name, input.type);
      throw error;
    }
  }),
);

categoriesRouter.post(
  '/:id/archive',
  asyncHandler(async (req, res) => {
    const category = await setArchived(requireUser(req).id, req.params.id, true);
    res.json({ category });
  }),
);

categoriesRouter.post(
  '/:id/restore',
  asyncHandler(async (req, res) => {
    const category = await setArchived(requireUser(req).id, req.params.id, false);
    res.json({ category });
  }),
);

categoriesRouter.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const user = requireUser(req);
    const existing = await prisma.category.findFirst({ where: { id: req.params.id, userId: user.id } });
    if (!existing) throw new AppError(404, 'Category not found.');
    const [transactions, budgets, recurring] = await Promise.all([
      prisma.transaction.count({ where: { categoryId: existing.id } }),
      prisma.budget.count({ where: { categoryId: existing.id } }),
      prisma.recurringTransaction.count({ where: { categoryId: existing.id } }),
    ]);
    if (transactions + budgets + recurring > 0) {
      throw new AppError(409, 'This category has transactions or plans. Archive it to keep that history.');
    }
    await prisma.category.delete({ where: { id: existing.id } });
    res.status(204).send();
  }),
);

async function setArchived(userId: string, id: string, archived: boolean) {
  const existing = await prisma.category.findFirst({ where: { id, userId } });
  if (!existing) throw new AppError(404, 'Category not found.');
  const category = await prisma.category.update({ where: { id }, data: { archived } });
  return categoryDto(category);
}

async function duplicateCategoryError(userId: string, name: string, type: 'INCOME' | 'EXPENSE') {
  const archived = await prisma.category.findFirst({ where: { userId, name, type, archived: true } });
  if (archived) return new AppError(409, 'That name belongs to an archived category. Restore it instead.');
  return new AppError(409, 'You already have a category with this name.');
}
