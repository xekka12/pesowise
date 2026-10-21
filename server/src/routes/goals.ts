import { normalizeMoney } from '@pesowise/shared';
import { Prisma } from '@prisma/client';
import { Router } from 'express';
import { AppError } from '../lib/errors.js';
import { asyncHandler, parseInput, requireUser } from '../lib/http.js';
import { goalDto } from '../lib/mappers.js';
import { prisma } from '../lib/prisma.js';
import { goalContributionSchema, goalSchema } from '../lib/schemas.js';
import { syncGoalCompletion } from '../services/alerts.js';

export const goalsRouter = Router();

goalsRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const user = requireUser(req);
    const includeArchived = req.query.includeArchived === 'true';
    const goals = await prisma.savingsGoal.findMany({
      where: { userId: user.id, ...(includeArchived ? {} : { archived: false }) },
      orderBy: [{ archived: 'asc' }, { createdAt: 'desc' }],
    });
    res.json({
      goals: goals.map(goalDto).sort((a, b) => Number(a.completed) - Number(b.completed) || a.name.localeCompare(b.name)),
    });
  }),
);

goalsRouter.post(
  '/',
  asyncHandler(async (req, res) => {
    const user = requireUser(req);
    const input = parseInput(goalSchema, req.body);
    assertWithinTarget(input.savedAmount ?? '0.00', input.targetAmount);
    const goal = await prisma.savingsGoal.create({
      data: {
        userId: user.id,
        name: input.name,
        targetAmount: input.targetAmount,
        savedAmount: input.savedAmount,
        targetDate: input.targetDate,
        description: input.description,
      },
    });
    await syncGoalCompletion(goal.id, user.id);
    const fresh = await prisma.savingsGoal.findFirstOrThrow({ where: { id: goal.id, userId: user.id } });
    res.status(201).json({ goal: goalDto(fresh) });
  }),
);

goalsRouter.patch(
  '/:id',
  asyncHandler(async (req, res) => {
    const user = requireUser(req);
    const input = parseInput(goalSchema, req.body);
    const existing = await ownedGoal(user.id, req.params.id);
    assertWithinTarget(input.savedAmount ?? '0.00', input.targetAmount);
    await prisma.savingsGoal.update({
      where: { id: existing.id },
      data: {
        name: input.name,
        targetAmount: input.targetAmount,
        savedAmount: input.savedAmount,
        targetDate: input.targetDate,
        description: input.description,
      },
    });
    await syncGoalCompletion(existing.id, user.id);
    const fresh = await prisma.savingsGoal.findFirstOrThrow({ where: { id: existing.id } });
    res.json({ goal: goalDto(fresh) });
  }),
);

goalsRouter.patch(
  '/:id/saved',
  asyncHandler(async (req, res) => {
    const user = requireUser(req);
    const input = parseInput(goalContributionSchema, req.body);
    const existing = await ownedGoal(user.id, req.params.id);
    assertWithinTarget(input.savedAmount, existing.targetAmount.toFixed(2));
    await prisma.savingsGoal.update({ where: { id: existing.id }, data: { savedAmount: input.savedAmount } });
    await syncGoalCompletion(existing.id, user.id);
    const fresh = await prisma.savingsGoal.findFirstOrThrow({ where: { id: existing.id } });
    res.json({ goal: goalDto(fresh) });
  }),
);

goalsRouter.post(
  '/:id/archive',
  asyncHandler(async (req, res) => {
    const user = requireUser(req);
    const existing = await ownedGoal(user.id, req.params.id);
    const goal = await prisma.savingsGoal.update({ where: { id: existing.id }, data: { archived: true } });
    res.json({ goal: goalDto(goal) });
  }),
);

goalsRouter.post(
  '/:id/restore',
  asyncHandler(async (req, res) => {
    const user = requireUser(req);
    const existing = await ownedGoal(user.id, req.params.id);
    const goal = await prisma.savingsGoal.update({ where: { id: existing.id }, data: { archived: false } });
    res.json({ goal: goalDto(goal) });
  }),
);

function assertWithinTarget(saved: string, target: string): void {
  const savedAmount = normalizeMoney(saved, { allowZero: true });
  const targetAmount = normalizeMoney(target);
  if (!savedAmount || !targetAmount) throw new AppError(400, 'Enter a valid amount.');
  if (new Prisma.Decimal(savedAmount).greaterThan(targetAmount)) {
    throw new AppError(400, 'Saved amount cannot be greater than the target. Increase the target first.', {
      savedAmount: 'Saved amount cannot be greater than the target.',
    });
  }
}

async function ownedGoal(userId: string, id: string) {
  const goal = await prisma.savingsGoal.findFirst({ where: { id, userId } });
  if (!goal) throw new AppError(404, 'Savings goal not found.');
  return goal;
}
