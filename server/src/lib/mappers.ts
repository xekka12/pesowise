import { Prisma } from '@prisma/client';
import { budgetProgress, goalProgress, type Budget, type Category, type CategoryRef, type RecurringRule, type SavingsGoal, type Transaction, type UserProfile } from '@pesowise/shared';

export function money(value: Prisma.Decimal | string | number | null | undefined): string {
  if (value === null || value === undefined) return '0.00';
  return new Prisma.Decimal(value).toFixed(2);
}

export function calendarDate(value: string | null | undefined): string | null {
  if (!value) return null;
  return value.trim();
}

type CategoryRow = {
  id: string;
  name: string;
  type: 'INCOME' | 'EXPENSE';
  icon: string;
  color: string;
  archived: boolean;
  isDefault: boolean;
};

export function categoryDto(category: CategoryRow): Category {
  return {
    id: category.id,
    name: category.name,
    type: category.type,
    icon: category.icon,
    color: category.color,
    archived: category.archived,
    isDefault: category.isDefault,
  };
}

export function categoryRef(category: Pick<CategoryRow, 'id' | 'name' | 'type' | 'icon' | 'color'>): CategoryRef {
  return {
    id: category.id,
    name: category.name,
    type: category.type,
    icon: category.icon,
    color: category.color,
  };
}

export function userDto(user: { id: string; name: string; email: string; warningThreshold: number; createdAt: Date }): UserProfile {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    warningThreshold: user.warningThreshold,
    timezone: 'Asia/Manila',
    currency: 'PHP',
    createdAt: user.createdAt.toISOString(),
  };
}

type TransactionRow = {
  id: string;
  description: string;
  amount: Prisma.Decimal;
  type: 'INCOME' | 'EXPENSE';
  date: string;
  paymentMethod: Transaction['paymentMethod'];
  notes: string | null;
  recurringId: string | null;
  createdAt: Date;
  updatedAt: Date;
  category: Pick<CategoryRow, 'id' | 'name' | 'type' | 'icon' | 'color'>;
};

export function transactionDto(transaction: TransactionRow): Transaction {
  return {
    id: transaction.id,
    description: transaction.description,
    amount: money(transaction.amount),
    type: transaction.type,
    date: calendarDate(transaction.date) ?? transaction.date,
    paymentMethod: transaction.paymentMethod,
    notes: transaction.notes,
    category: categoryRef(transaction.category),
    recurringId: transaction.recurringId,
    createdAt: transaction.createdAt.toISOString(),
    updatedAt: transaction.updatedAt.toISOString(),
  };
}

export function budgetDto(input: {
  id: string;
  name: string;
  month: number;
  year: number;
  limitAmount: Prisma.Decimal;
  spent: string;
  threshold: number;
  category: Pick<CategoryRow, 'id' | 'name' | 'icon' | 'color'>;
}): Budget {
  const limit = money(input.limitAmount);
  const progress = budgetProgress(input.spent, limit, input.threshold);
  return {
    id: input.id,
    name: input.name,
    month: input.month,
    year: input.year,
    limit,
    spent: input.spent,
    remaining: progress.remaining,
    percent: progress.percent,
    status: progress.status,
    threshold: input.threshold,
    category: {
      id: input.category.id,
      name: input.category.name,
      icon: input.category.icon,
      color: input.category.color,
    },
  };
}

export function goalDto(goal: {
  id: string;
  name: string;
  targetAmount: Prisma.Decimal;
  savedAmount: Prisma.Decimal;
  targetDate: string | null;
  description: string | null;
  archived: boolean;
  completedAt: Date | null;
}): SavingsGoal {
  const targetAmount = money(goal.targetAmount);
  const savedAmount = money(goal.savedAmount);
  const progress = goalProgress(savedAmount, targetAmount);
  return {
    id: goal.id,
    name: goal.name,
    targetAmount,
    savedAmount,
    remaining: progress.remaining,
    percent: progress.percent,
    completed: progress.completed,
    targetDate: calendarDate(goal.targetDate),
    description: goal.description,
    archived: goal.archived,
    completedAt: goal.completedAt?.toISOString() ?? null,
  };
}

export function recurringDto(rule: {
  id: string;
  description: string;
  amount: Prisma.Decimal;
  type: 'INCOME' | 'EXPENSE';
  frequency: RecurringRule['frequency'];
  startDate: string;
  endDate: string | null;
  nextOccurrence: string | null;
  paymentMethod: RecurringRule['paymentMethod'];
  notes: string | null;
  status: RecurringRule['status'];
  category: Pick<CategoryRow, 'id' | 'name' | 'type' | 'icon' | 'color'>;
}): RecurringRule {
  return {
    id: rule.id,
    description: rule.description,
    amount: money(rule.amount),
    type: rule.type,
    frequency: rule.frequency,
    startDate: calendarDate(rule.startDate) ?? rule.startDate,
    endDate: calendarDate(rule.endDate),
    nextOccurrence: calendarDate(rule.nextOccurrence),
    paymentMethod: rule.paymentMethod,
    notes: rule.notes,
    status: rule.status,
    category: categoryRef(rule.category),
  };
}
