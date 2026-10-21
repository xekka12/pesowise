import { formatPHP, monthBounds, monthLabel, parseISODate } from '@pesowise/shared';
import { Prisma } from '@prisma/client';
import { isUniqueConstraint } from '../lib/errors.js';
import { money } from '../lib/mappers.js';
import { prisma } from '../lib/prisma.js';

export async function notify(input: {
  userId: string;
  type: 'BUDGET_WARNING' | 'BUDGET_EXCEEDED' | 'GOAL_COMPLETED' | 'RECURRING_GENERATED' | 'ACCOUNT';
  title: string;
  message: string;
  dedupeKey?: string | null;
}): Promise<void> {
  try {
    await prisma.notification.create({
      data: {
        userId: input.userId,
        type: input.type,
        title: input.title,
        message: input.message,
        dedupeKey: input.dedupeKey ?? null,
      },
    });
  } catch (error) {
    if (!isUniqueConstraint(error)) throw error;
  }
}

export async function reconcileBudgetAlerts(userId: string, categoryId: string, year: number, month: number): Promise<void> {
  const [budget, user] = await Promise.all([
    prisma.budget.findUnique({
      where: { userId_categoryId_month_year: { userId, categoryId, month, year } },
    }),
    prisma.user.findUnique({ where: { id: userId }, select: { warningThreshold: true } }),
  ]);
  if (!budget || !user) return;

  const bounds = monthBounds(year, month);
  const sum = await prisma.transaction.aggregate({
    where: { userId, categoryId, type: 'EXPENSE', date: { gte: bounds.from, lte: bounds.to } },
    _sum: { amount: true },
  });
  const spent = money(sum._sum.amount);
  const limit = money(budget.limitAmount);
  const spentCents = new Prisma.Decimal(spent).times(100).toNumber();
  const limitCents = new Prisma.Decimal(limit).times(100).toNumber();
  const period = monthLabel(year, month);
  const stamp = `${year}-${String(month).padStart(2, '0')}`;

  if (limitCents > 0 && spentCents >= limitCents) {
    await notify({
      userId,
      type: 'BUDGET_EXCEEDED',
      title: 'Budget exceeded',
      message: `${budget.name} has reached ${formatPHP(spent)} of the ${formatPHP(limit)} limit for ${period}.`,
      dedupeKey: `budget:${budget.id}:${stamp}:EXCEEDED`,
    });
    return;
  }

  if (limitCents > 0 && spentCents * 100 >= limitCents * user.warningThreshold) {
    await notify({
      userId,
      type: 'BUDGET_WARNING',
      title: 'Budget almost used up',
      message: `${budget.name} has used ${formatPHP(spent)} of its ${formatPHP(limit)} limit for ${period}.`,
      dedupeKey: `budget:${budget.id}:${stamp}:WARNING`,
    });
  }
}

export async function syncBudgetEffects(
  userId: string,
  before: { categoryId: string; date: string; type: 'INCOME' | 'EXPENSE' } | null,
  after: { categoryId: string; date: string; type: 'INCOME' | 'EXPENSE' } | null,
): Promise<void> {
  const keys = new Set<string>();
  for (const item of [before, after]) {
    if (!item || item.type !== 'EXPENSE') continue;
    const parts = parseISODate(item.date);
    keys.add(`${item.categoryId}|${parts.year}|${parts.month}`);
  }
  for (const key of keys) {
    const [categoryId, year, month] = key.split('|');
    await reconcileBudgetAlerts(userId, categoryId, Number(year), Number(month));
  }
}

export async function syncGoalCompletion(goalId: string, userId: string): Promise<void> {
  const goal = await prisma.savingsGoal.findFirst({ where: { id: goalId, userId } });
  if (!goal) return;
  const saved = new Prisma.Decimal(money(goal.savedAmount));
  const target = new Prisma.Decimal(money(goal.targetAmount));
  if (saved.greaterThanOrEqualTo(target) && !goal.completedAt) {
    await prisma.savingsGoal.update({ where: { id: goal.id }, data: { completedAt: new Date() } });
    await notify({
      userId,
      type: 'GOAL_COMPLETED',
      title: 'Savings goal completed',
      message: `${goal.name} reached ${formatPHP(money(goal.targetAmount))}. This amount was entered by you. PesoWise does not connect to a bank.`,
      dedupeKey: `goal:${goal.id}:completed:${money(goal.targetAmount)}`,
    });
    return;
  }
  if (saved.lessThan(target) && goal.completedAt) {
    await prisma.savingsGoal.update({ where: { id: goal.id }, data: { completedAt: null } });
  }
}
