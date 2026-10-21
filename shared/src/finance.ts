import { fromCents, toCents } from './money.js';

export type BudgetHealth = 'normal' | 'warning' | 'exceeded';

/** Null when income is zero, because a savings rate is undefined without income. */
export function savingsRate(income: string, expenses: string): number | null {
  const incomeCents = toCents(income);
  if (incomeCents <= 0) return null;
  const expenseCents = toCents(expenses);
  return Math.round(((incomeCents - expenseCents) / incomeCents) * 10000) / 100;
}

export function budgetProgress(spent: string, limit: string, thresholdPercent: number): {
  percent: number;
  remaining: string;
  status: BudgetHealth;
} {
  const spentCents = toCents(spent);
  const limitCents = toCents(limit);
  const percent = limitCents <= 0 ? 0 : Math.round((spentCents / limitCents) * 1000) / 10;
  const remaining = fromCents(limitCents - spentCents);
  let status: BudgetHealth = 'normal';
  if (spentCents >= limitCents && limitCents > 0) status = 'exceeded';
  else if (limitCents > 0 && spentCents * 100 >= limitCents * thresholdPercent) status = 'warning';
  return { percent, remaining, status };
}

export function goalProgress(saved: string, target: string): {
  percent: number;
  remaining: string;
  completed: boolean;
} {
  const savedCents = toCents(saved);
  const targetCents = toCents(target);
  const completed = targetCents > 0 && savedCents >= targetCents;
  const percent = targetCents <= 0 ? 0 : Math.min(100, Math.round((savedCents / targetCents) * 1000) / 10);
  const remaining = fromCents(Math.max(0, targetCents - savedCents));
  return { percent, remaining, completed };
}

/**
 * Percent change versus the previous period.
 * Returns 0 when both amounts are zero.
 * Returns null when the previous amount is zero and the current amount is not.
 */
export function monthOverMonthChange(current: string, previous: string): number | null {
  const currentCents = toCents(current);
  const previousCents = toCents(previous);
  if (previousCents === 0) return currentCents === 0 ? 0 : null;
  return Math.round(((currentCents - previousCents) / previousCents) * 1000) / 10;
}
