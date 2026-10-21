export const TRANSACTION_TYPES = ['INCOME', 'EXPENSE'] as const;
export const PAYMENT_METHOD_VALUES = ['CASH', 'GCASH', 'MAYA', 'BANK_TRANSFER', 'CREDIT_CARD', 'DEBIT_CARD', 'OTHER'] as const;
export const FREQUENCIES = ['WEEKLY', 'MONTHLY', 'YEARLY'] as const;
export const RECURRING_STATUSES = ['ACTIVE', 'PAUSED'] as const;

export const PAYMENT_METHODS: Array<{ value: (typeof PAYMENT_METHOD_VALUES)[number]; label: string }> = [
  { value: 'CASH', label: 'Cash' },
  { value: 'GCASH', label: 'GCash' },
  { value: 'MAYA', label: 'Maya' },
  { value: 'BANK_TRANSFER', label: 'Bank transfer' },
  { value: 'CREDIT_CARD', label: 'Credit card' },
  { value: 'DEBIT_CARD', label: 'Debit card' },
  { value: 'OTHER', label: 'Other' },
];

export const FREQUENCY_OPTIONS: Array<{ value: (typeof FREQUENCIES)[number]; label: string }> = [
  { value: 'WEEKLY', label: 'Weekly' },
  { value: 'MONTHLY', label: 'Monthly' },
  { value: 'YEARLY', label: 'Yearly' },
];

export const CATEGORY_ICONS = [
  'Banknote',
  'Wallet',
  'Laptop',
  'Briefcase',
  'TrendingUp',
  'CircleDollarSign',
  'UtensilsCrossed',
  'Bus',
  'GraduationCap',
  'Lightbulb',
  'ShoppingBag',
  'HeartPulse',
  'Clapperboard',
  'PiggyBank',
  'Tag',
  'House',
  'Wifi',
  'Coffee',
  'Car',
  'Gift',
  'Plane',
  'BookOpen',
  'Smartphone',
  'Dumbbell',
] as const;

export const CATEGORY_COLORS = [
  '#0F766E',
  '#047857',
  '#059669',
  '#0284C7',
  '#0369A1',
  '#1D4ED8',
  '#0B1F3A',
  '#B45309',
  '#C2410C',
  '#BE123C',
  '#BE185D',
  '#7C3AED',
  '#6D28D9',
  '#4F46E5',
  '#475569',
  '#0E7490',
] as const;

export interface DefaultCategory {
  name: string;
  type: 'INCOME' | 'EXPENSE';
  icon: (typeof CATEGORY_ICONS)[number];
  color: (typeof CATEGORY_COLORS)[number];
}

export const DEFAULT_CATEGORIES: DefaultCategory[] = [
  { name: 'Salary', type: 'INCOME', icon: 'Banknote', color: '#0F766E' },
  { name: 'Allowance', type: 'INCOME', icon: 'Wallet', color: '#0284C7' },
  { name: 'Freelance', type: 'INCOME', icon: 'Laptop', color: '#7C3AED' },
  { name: 'Business', type: 'INCOME', icon: 'Briefcase', color: '#1D4ED8' },
  { name: 'Investments', type: 'INCOME', icon: 'TrendingUp', color: '#047857' },
  { name: 'Other Income', type: 'INCOME', icon: 'CircleDollarSign', color: '#475569' },
  { name: 'Food', type: 'EXPENSE', icon: 'UtensilsCrossed', color: '#C2410C' },
  { name: 'Transportation', type: 'EXPENSE', icon: 'Bus', color: '#0369A1' },
  { name: 'Education', type: 'EXPENSE', icon: 'GraduationCap', color: '#6D28D9' },
  { name: 'Bills and Utilities', type: 'EXPENSE', icon: 'Lightbulb', color: '#B45309' },
  { name: 'Shopping', type: 'EXPENSE', icon: 'ShoppingBag', color: '#BE123C' },
  { name: 'Health', type: 'EXPENSE', icon: 'HeartPulse', color: '#BE185D' },
  { name: 'Entertainment', type: 'EXPENSE', icon: 'Clapperboard', color: '#7C3AED' },
  { name: 'Savings', type: 'EXPENSE', icon: 'PiggyBank', color: '#047857' },
  { name: 'Other Expenses', type: 'EXPENSE', icon: 'Tag', color: '#475569' },
];

export function isCategoryIcon(value: string): value is (typeof CATEGORY_ICONS)[number] {
  return (CATEGORY_ICONS as readonly string[]).includes(value);
}

export function isCategoryColor(value: string): value is (typeof CATEGORY_COLORS)[number] {
  return (CATEGORY_COLORS as readonly string[]).includes(value);
}

export function paymentLabel(value: string): string {
  return PAYMENT_METHODS.find((method) => method.value === value)?.label ?? value;
}

export function frequencyLabel(value: string): string {
  return FREQUENCY_OPTIONS.find((option) => option.value === value)?.label ?? value;
}

export const DEMO_EMAIL = 'demo@pesowise.app';
export const DEMO_PASSWORD = 'DemoPass123!';
export const TIMEZONE = 'Asia/Manila';
export const CURRENCY = 'PHP';
