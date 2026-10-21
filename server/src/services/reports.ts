import { analyticsFetchStart, buildAnalytics, inclusiveDays, type AnalyticsResult, type NormalizedTransaction } from '@pesowise/shared';
import { AppError } from '../lib/errors.js';
import { money } from '../lib/mappers.js';
import { prisma } from '../lib/prisma.js';

export function assertRange(from: string, to: string): void {
  if (from > to) throw new AppError(400, 'The start date must be on or before the end date.');
  if (inclusiveDays(from, to) > 2200) throw new AppError(400, 'Choose a range of 6 years or less.');
}

export async function loadAnalytics(userId: string, from: string, to: string, categoryId?: string): Promise<AnalyticsResult> {
  assertRange(from, to);
  if (categoryId) {
    const category = await prisma.category.findFirst({ where: { id: categoryId, userId }, select: { id: true } });
    if (!category) throw new AppError(404, 'Category not found.');
  }
  const fetchFrom = analyticsFetchStart(from, to);
  const rows = await prisma.transaction.findMany({
    where: {
      userId,
      date: { gte: fetchFrom, lte: to },
      ...(categoryId ? { categoryId } : {}),
    },
    select: {
      amount: true,
      type: true,
      date: true,
      categoryId: true,
      category: { select: { name: true, color: true, icon: true } },
    },
  });
  const normalized: NormalizedTransaction[] = rows.map((row) => ({
    amount: money(row.amount),
    type: row.type,
    date: row.date.trim(),
    categoryId: row.categoryId,
    categoryName: row.category.name,
    color: row.category.color,
    icon: row.category.icon,
  }));
  return buildAnalytics(normalized, from, to);
}
