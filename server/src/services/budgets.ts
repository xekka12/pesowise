import { fromCents, monthBounds, parseISODate, toCents, type Budget } from '@pesowise/shared';
import type { Category, Budget as BudgetRow } from '@prisma/client';
import { budgetDto } from '../lib/mappers.js';
import { prisma } from '../lib/prisma.js';

type BudgetWithCategory = BudgetRow & { category: Pick<Category, 'id' | 'name' | 'icon' | 'color'> };

export async function hydrateBudgets(userId: string, budgets: BudgetWithCategory[], threshold: number): Promise<Budget[]> {
  if (budgets.length === 0) return [];
  const sorted = [...budgets].sort((a, b) => a.year - b.year || a.month - b.month);
  const first = monthBounds(sorted[0].year, sorted[0].month);
  const last = monthBounds(sorted[sorted.length - 1].year, sorted[sorted.length - 1].month);
  const expenses = await prisma.transaction.findMany({
    where: {
      userId,
      type: 'EXPENSE',
      categoryId: { in: [...new Set(budgets.map((budget) => budget.categoryId))] },
      date: { gte: first.from, lte: last.to },
    },
    select: { categoryId: true, date: true, amount: true },
  });

  return budgets.map((budget) => {
    const bounds = monthBounds(budget.year, budget.month);
    let cents = 0;
    for (const expense of expenses) {
      const date = expense.date.trim();
      if (expense.categoryId === budget.categoryId && date >= bounds.from && date <= bounds.to) {
        cents += toCents(expense.amount.toFixed(2));
      }
    }
    return budgetDto({
      id: budget.id,
      name: budget.name,
      month: budget.month,
      year: budget.year,
      limitAmount: budget.limitAmount,
      spent: fromCents(cents),
      threshold,
      category: budget.category,
    });
  });
}

export function monthOf(date: string): { year: number; month: number } {
  const parts = parseISODate(date);
  return { year: parts.year, month: parts.month };
}
