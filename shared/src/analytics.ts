import { monthBounds, monthKey, monthLabel, monthsInRange, previousComparisonWindow } from './dates.js';
import { monthOverMonthChange, savingsRate } from './finance.js';
import { fromCents, toCents } from './money.js';

export interface NormalizedTransaction {
  amount: string;
  type: 'INCOME' | 'EXPENSE';
  date: string;
  categoryId: string;
  categoryName: string;
  color: string;
  icon: string;
}

export interface PeriodSummary {
  income: string;
  expenses: string;
  balance: string;
  savingsRate: number | null;
}

export interface MonthPoint {
  month: string;
  label: string;
  partial: boolean;
  income: string;
  expenses: string;
  balance: string;
  savingsRate: number | null;
  spendingChange: number | null;
}

export interface CategorySlice {
  categoryId: string;
  name: string;
  color: string;
  icon: string;
  amount: string;
}

export interface AnalyticsResult {
  summary: PeriodSummary;
  months: MonthPoint[];
  expenseByCategory: CategorySlice[];
  incomeByCategory: CategorySlice[];
}

export function sumRange(rows: NormalizedTransaction[], from: string, to: string): PeriodSummary {
  let income = 0;
  let expenses = 0;
  for (const row of rows) {
    if (row.date < from || row.date > to) continue;
    const cents = toCents(row.amount);
    if (row.type === 'INCOME') income += cents;
    else expenses += cents;
  }
  const incomeAmount = fromCents(income);
  const expenseAmount = fromCents(expenses);
  return {
    income: incomeAmount,
    expenses: expenseAmount,
    balance: fromCents(income - expenses),
    savingsRate: savingsRate(incomeAmount, expenseAmount),
  };
}

function byCategory(rows: NormalizedTransaction[], from: string, to: string, type: 'INCOME' | 'EXPENSE'): CategorySlice[] {
  const totals = new Map<string, { name: string; color: string; icon: string; cents: number }>();
  for (const row of rows) {
    if (row.type !== type || row.date < from || row.date > to) continue;
    const current = totals.get(row.categoryId) ?? { name: row.categoryName, color: row.color, icon: row.icon, cents: 0 };
    current.cents += toCents(row.amount);
    totals.set(row.categoryId, current);
  }
  return [...totals.entries()]
    .map(([categoryId, value]) => ({
      categoryId,
      name: value.name,
      color: value.color,
      icon: value.icon,
      amount: fromCents(value.cents),
    }))
    .sort((left, right) => toCents(right.amount) - toCents(left.amount) || left.name.localeCompare(right.name));
}

export function buildAnalytics(rows: NormalizedTransaction[], from: string, to: string): AnalyticsResult {
  const months = monthsInRange(from, to).map((month) => {
    const bounds = monthBounds(month.year, month.month);
    const sliceFrom = bounds.from > from ? bounds.from : from;
    const sliceTo = bounds.to < to ? bounds.to : to;
    const point = sumRange(rows, sliceFrom, sliceTo);
    const previousWindow = previousComparisonWindow(sliceFrom, sliceTo);
    const previous = sumRange(rows, previousWindow.from, previousWindow.to);
    return {
      month: monthKey(month.year, month.month),
      label: monthLabel(month.year, month.month),
      partial: sliceFrom !== bounds.from || sliceTo !== bounds.to,
      income: point.income,
      expenses: point.expenses,
      balance: point.balance,
      savingsRate: point.savingsRate,
      spendingChange: monthOverMonthChange(point.expenses, previous.expenses),
    };
  });

  return {
    summary: sumRange(rows, from, to),
    months,
    expenseByCategory: byCategory(rows, from, to, 'EXPENSE'),
    incomeByCategory: byCategory(rows, from, to, 'INCOME'),
  };
}
