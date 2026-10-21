import { manilaToday, toCsv } from '@pesowise/shared';
import { Router } from 'express';
import { asyncHandler, parseInput, requireUser } from '../lib/http.js';
import { transactionDto } from '../lib/mappers.js';
import { prisma } from '../lib/prisma.js';
import { rangeQuerySchema } from '../lib/schemas.js';
import { hydrateBudgets } from '../services/budgets.js';
import { budgetMonthsInRange } from './budgets.js';
import { goalDto } from '../lib/mappers.js';
import { loadAnalytics } from '../services/reports.js';

export const dashboardRouter = Router();
export const reportsRouter = Router();

dashboardRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const user = requireUser(req);
    const range = parseInput(rangeQuerySchema.omit({ categoryId: true }), req.query);
    const analytics = await loadAnalytics(user.id, range.from, range.to);
    const periods = budgetMonthsInRange(range.from, range.to);
    const [budgetRows, goals, recent, anyTransaction] = await Promise.all([
      prisma.budget.findMany({
        where: { userId: user.id, OR: periods.map((period) => ({ year: period.year, month: period.month })) },
        include: { category: true },
        orderBy: [{ year: 'asc' }, { month: 'asc' }, { name: 'asc' }],
      }),
      prisma.savingsGoal.findMany({ where: { userId: user.id, archived: false }, orderBy: { createdAt: 'desc' } }),
      prisma.transaction.findMany({
        where: { userId: user.id, date: { gte: range.from, lte: range.to } },
        include: { category: true },
        orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
        take: 8,
      }),
      prisma.transaction.findFirst({ where: { userId: user.id }, select: { id: true } }),
    ]);
    res.json({
      range: { from: range.from, to: range.to },
      hasAnyTransactions: Boolean(anyTransaction),
      summary: analytics.summary,
      months: analytics.months,
      expenseByCategory: analytics.expenseByCategory,
      budgets: await hydrateBudgets(user.id, budgetRows, user.warningThreshold),
      goals: goals.map(goalDto).sort((a, b) => Number(a.completed) - Number(b.completed) || a.name.localeCompare(b.name)),
      recent: recent.map(transactionDto),
    });
  }),
);

reportsRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const user = requireUser(req);
    const query = parseInput(rangeQuerySchema, req.query);
    const analytics = await loadAnalytics(user.id, query.from, query.to, query.categoryId);
    res.json({
      range: { from: query.from, to: query.to },
      categoryId: query.categoryId ?? null,
      ...analytics,
    });
  }),
);

reportsRouter.get(
  '/export',
  asyncHandler(async (req, res) => {
    const user = requireUser(req);
    const query = parseInput(rangeQuerySchema, req.query);
    const view = req.query.view === 'category' ? 'category' : 'monthly';
    const analytics = await loadAnalytics(user.id, query.from, query.to, query.categoryId);
    const csv =
      view === 'category'
        ? toCsv(
            ['Category', 'Kind', 'Amount (PHP)'],
            [
              ...analytics.incomeByCategory.map((item) => [item.name, 'Income', item.amount]),
              ...analytics.expenseByCategory.map((item) => [item.name, 'Expense', item.amount]),
            ],
          )
        : toCsv(
            ['Month', 'Income (PHP)', 'Expenses (PHP)', 'Balance (PHP)', 'Savings Rate', 'Spending Change vs Previous Window'],
            analytics.months.map((month) => [
              month.partial ? `${month.label} (partial)` : month.label,
              month.income,
              month.expenses,
              month.balance,
              month.savingsRate === null ? '' : month.savingsRate.toFixed(2),
              month.spendingChange === null ? '' : month.spendingChange.toFixed(1),
            ]),
          );
    const filename = `pesowise-report-${view}-${manilaToday()}.csv`;
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csv);
  }),
);
