import {
  FREQUENCIES,
  PAYMENT_METHOD_VALUES,
  TRANSACTION_TYPES,
  isCategoryColor,
  isCategoryIcon,
  isRealISODate,
  normalizeMoney,
} from '@pesowise/shared';
import { z } from 'zod';

export const isoDateSchema = z.string().trim().refine(isRealISODate, 'Enter a valid date.');

export const moneySchema = z.string().trim().refine((value) => normalizeMoney(value) !== null, 'Enter an amount greater than 0 with up to 2 decimal places.');

export const zeroMoneySchema = z
  .string()
  .trim()
  .refine((value) => normalizeMoney(value, { allowZero: true }) !== null, 'Enter 0 or more with up to 2 decimal places.');

export const passwordSchema = z
  .string()
  .min(8, 'Use at least 8 characters.')
  .max(72, 'Use at most 72 characters.')
  .regex(/[A-Za-z]/, 'Include a letter.')
  .regex(/\d/, 'Include a number.');

export const typeSchema = z.enum(TRANSACTION_TYPES);
export const paymentSchema = z.enum(PAYMENT_METHOD_VALUES);
export const frequencySchema = z.enum(FREQUENCIES);

const optionalText = z
  .string()
  .trim()
  .max(500, 'Use 500 characters or fewer.')
  .optional()
  .nullable()
  .transform((value) => (value ? value : null));

export const registerSchema = z.object({
  name: z.string().trim().min(1, 'Enter your name.').max(80, 'Use 80 characters or fewer.'),
  email: z.string().trim().email('Enter a valid email address.').max(254).transform((value) => value.toLowerCase()),
  password: passwordSchema,
});

export const loginSchema = z.object({
  email: z.string().trim().email('Enter a valid email address.').transform((value) => value.toLowerCase()),
  password: z.string().min(1, 'Enter your password.').max(72),
});

export const profileSchema = z
  .object({
    name: z.string().trim().min(1, 'Enter your name.').max(80).optional(),
    email: z.string().trim().email('Enter a valid email address.').max(254).transform((value) => value.toLowerCase()).optional(),
    warningThreshold: z.number().int().min(50, 'Use a threshold from 50 to 95.').max(95, 'Use a threshold from 50 to 95.').optional(),
  })
  .refine((value) => value.name !== undefined || value.email !== undefined || value.warningThreshold !== undefined, {
    message: 'Nothing to update.',
  });

export const passwordChangeSchema = z
  .object({
    currentPassword: z.string().min(1, 'Enter your current password.').max(72),
    newPassword: passwordSchema,
  })
  .refine((value) => value.currentPassword !== value.newPassword, {
    message: 'Choose a different password.',
    path: ['newPassword'],
  });

export const deleteAccountSchema = z.object({
  password: z.string().min(1, 'Enter your password.'),
  confirmation: z.literal('DELETE', { errorMap: () => ({ message: 'Type DELETE to confirm.' }) }),
});

export const categorySchema = z.object({
  name: z.string().trim().min(1, 'Enter a category name.').max(40, 'Use 40 characters or fewer.'),
  type: typeSchema,
  icon: z.string().refine(isCategoryIcon, 'Choose an icon.'),
  color: z.string().refine(isCategoryColor, 'Choose a color.'),
});

export const transactionSchema = z.object({
  description: z.string().trim().min(1, 'Enter a description.').max(140, 'Use 140 characters or fewer.'),
  amount: moneySchema,
  type: typeSchema,
  categoryId: z.string().min(1, 'Choose a category.'),
  date: isoDateSchema,
  paymentMethod: paymentSchema,
  notes: optionalText,
});

export const transactionQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(10),
  sort: z.enum(['date', 'amount']).default('date'),
  order: z.enum(['asc', 'desc']).default('desc'),
  search: z.string().trim().max(100).optional().transform((value) => value || undefined),
  type: z.enum(['INCOME', 'EXPENSE', '']).optional().transform((value) => (value ? value : undefined)),
  categoryId: z.string().optional().transform((value) => value || undefined),
  paymentMethod: z.enum(['', ...PAYMENT_METHOD_VALUES]).optional().transform((value) => (value ? value : undefined)),
  from: z.string().optional().transform((value) => value || undefined),
  to: z.string().optional().transform((value) => value || undefined),
});

export const budgetSchema = z.object({
  name: z.string().trim().min(1, 'Enter a budget name.').max(80),
  categoryId: z.string().min(1, 'Choose a category.'),
  limit: moneySchema,
  month: z.coerce.number().int().min(1).max(12),
  year: z.coerce.number().int().min(2000).max(2100),
});

export const goalSchema = z.object({
  name: z.string().trim().min(1, 'Enter a goal name.').max(80),
  targetAmount: moneySchema,
  savedAmount: zeroMoneySchema.default('0.00'),
  targetDate: z.union([isoDateSchema, z.literal(''), z.null()]).optional().transform((value) => value || null),
  description: optionalText,
});

export const goalContributionSchema = z.object({
  savedAmount: zeroMoneySchema,
});

export const recurringSchema = z.object({
  description: z.string().trim().min(1, 'Enter a description.').max(140),
  amount: moneySchema,
  type: typeSchema,
  categoryId: z.string().min(1, 'Choose a category.'),
  frequency: frequencySchema,
  startDate: isoDateSchema,
  endDate: z.union([isoDateSchema, z.literal(''), z.null()]).optional().transform((value) => value || null),
  paymentMethod: paymentSchema,
  notes: optionalText,
});

export const recurringUpdateSchema = recurringSchema.omit({ frequency: true, startDate: true });

export const rangeQuerySchema = z.object({
  from: isoDateSchema,
  to: isoDateSchema,
  categoryId: z.string().optional().transform((value) => value || undefined),
});
