import type { CategorySlice, MonthPoint, PeriodSummary } from './analytics.js';
import type { BudgetHealth } from './finance.js';

export type TransactionType = 'INCOME' | 'EXPENSE';
export type PaymentMethod = 'CASH' | 'GCASH' | 'MAYA' | 'BANK_TRANSFER' | 'CREDIT_CARD' | 'DEBIT_CARD' | 'OTHER';
export type Frequency = 'WEEKLY' | 'MONTHLY' | 'YEARLY';
export type RecurringStatus = 'ACTIVE' | 'PAUSED';
export type NotificationType = 'BUDGET_WARNING' | 'BUDGET_EXCEEDED' | 'GOAL_COMPLETED' | 'RECURRING_GENERATED' | 'ACCOUNT';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  warningThreshold: number;
  timezone: 'Asia/Manila';
  currency: 'PHP';
  createdAt: string;
}

export interface Category {
  id: string;
  name: string;
  type: TransactionType;
  icon: string;
  color: string;
  archived: boolean;
  isDefault: boolean;
}

export interface CategoryRef {
  id: string;
  name: string;
  icon: string;
  color: string;
  type: TransactionType;
}

export interface Transaction {
  id: string;
  description: string;
  amount: string;
  type: TransactionType;
  date: string;
  paymentMethod: PaymentMethod;
  notes: string | null;
  category: CategoryRef;
  recurringId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PageResult<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface Budget {
  id: string;
  name: string;
  month: number;
  year: number;
  limit: string;
  spent: string;
  remaining: string;
  percent: number;
  status: BudgetHealth;
  threshold: number;
  category: Pick<CategoryRef, 'id' | 'name' | 'icon' | 'color'>;
}

export interface SavingsGoal {
  id: string;
  name: string;
  targetAmount: string;
  savedAmount: string;
  remaining: string;
  percent: number;
  completed: boolean;
  targetDate: string | null;
  description: string | null;
  archived: boolean;
  completedAt: string | null;
}

export interface RecurringRule {
  id: string;
  description: string;
  amount: string;
  type: TransactionType;
  frequency: Frequency;
  startDate: string;
  endDate: string | null;
  nextOccurrence: string | null;
  paymentMethod: PaymentMethod;
  notes: string | null;
  status: RecurringStatus;
  category: CategoryRef;
}

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
}

export interface NotificationList {
  items: AppNotification[];
  unreadCount: number;
}

export interface DashboardResponse {
  range: { from: string; to: string };
  hasAnyTransactions: boolean;
  summary: PeriodSummary;
  months: MonthPoint[];
  expenseByCategory: CategorySlice[];
  budgets: Budget[];
  goals: SavingsGoal[];
  recent: Transaction[];
}

export interface ReportResponse {
  range: { from: string; to: string };
  categoryId: string | null;
  summary: PeriodSummary;
  months: MonthPoint[];
  expenseByCategory: CategorySlice[];
  incomeByCategory: CategorySlice[];
}
