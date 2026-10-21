import { paymentLabel, toCsv, normalizeMoney, type TransactionType } from '@pesowise/shared';
import { Prisma } from '@prisma/client';
import { Router } from 'express';
import { AppError } from '../lib/errors.js';
import { asyncHandler, parseInput, requireUser } from '../lib/http.js';
import { transactionDto } from '../lib/mappers.js';
import { prisma } from '../lib/prisma.js';
import { isoDateSchema, transactionQuerySchema, transactionSchema } from '../lib/schemas.js';
import { assertCategoryMatches, requireCategory } from '../services/access.js';
import { syncBudgetEffects } from '../services/alerts.js';

export const transactionsRouter = Router();

const includeCategory = { category: true } as const;

transactionsRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const user = requireUser(req);
    const query = normalizeTransactionQuery(parseInput(transactionQuerySchema, req.query));
    validateOptionalDates(query.from, query.to);
    const where = transactionWhere(user.id, query);
    const orderBy: Prisma.TransactionOrderByWithRelationInput[] =
      query.sort === 'amount'
        ? [{ amount: query.order }, { date: 'desc' }]
        : [{ date: query.order }, { createdAt: query.order }];
    const skip = (query.page - 1) * query.pageSize;
    const [items, total] = await prisma.$transaction([
      prisma.transaction.findMany({ where, orderBy, skip, take: query.pageSize, include: includeCategory }),
      prisma.transaction.count({ where }),
    ]);
    res.json({
      items: items.map(transactionDto),
      page: query.page,
      pageSize: query.pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / query.pageSize)),
    });
  }),
);

transactionsRouter.get(
  '/export',
  asyncHandler(async (req, res) => {
    const user = requireUser(req);
    const query = normalizeTransactionQuery(parseInput(transactionQuerySchema, req.query));
    validateOptionalDates(query.from, query.to);
    const where = transactionWhere(user.id, query);
    const total = await prisma.transaction.count({ where });
    if (total > 10_000) throw new AppError(400, 'This export has more than 10,000 rows. Narrow the filters and try again.');
    const items = await prisma.transaction.findMany({
      where,
      orderBy: [{ date: 'asc' }, { createdAt: 'asc' }],
      include: includeCategory,
    });
    const csv = toCsv(
      ['Date', 'Description', 'Type', 'Category', 'Payment Method', 'Amount (PHP)', 'Notes'],
      items.map((item) => [
        item.date.trim(),
        item.description,
        item.type === 'INCOME' ? 'Income' : 'Expense',
        item.category.name,
        paymentLabel(item.paymentMethod),
        item.amount.toFixed(2),
        item.notes ?? '',
      ]),
    );
    const filename = `pesowise-transactions-${new Date().toISOString().slice(0, 10)}.csv`;
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csv);
  }),
);

transactionsRouter.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const user = requireUser(req);
    const transaction = await prisma.transaction.findFirst({
      where: { id: req.params.id, userId: user.id },
      include: includeCategory,
    });
    if (!transaction) throw new AppError(404, 'Transaction not found.');
    res.json({ transaction: transactionDto(transaction) });
  }),
);

transactionsRouter.post(
  '/',
  asyncHandler(async (req, res) => {
    const user = requireUser(req);
    const input = parseInput(transactionSchema, req.body);
    const category = await requireCategory(user.id, input.categoryId);
    assertCategoryMatches(category, input.type);
    const transaction = await prisma.transaction.create({
      data: {
        userId: user.id,
        categoryId: category.id,
        description: input.description,
        amount: normalizeMoney(input.amount)!,
        type: input.type,
        date: input.date,
        paymentMethod: input.paymentMethod,
        notes: input.notes,
      },
      include: includeCategory,
    });
    await syncBudgetEffects(user.id, null, { categoryId: category.id, date: input.date, type: input.type });
    res.status(201).json({ transaction: transactionDto(transaction) });
  }),
);

transactionsRouter.patch(
  '/:id',
  asyncHandler(async (req, res) => {
    const user = requireUser(req);
    const input = parseInput(transactionSchema, req.body);
    const existing = await prisma.transaction.findFirst({ where: { id: req.params.id, userId: user.id } });
    if (!existing) throw new AppError(404, 'Transaction not found.');
    const category = await requireCategory(user.id, input.categoryId);
    assertCategoryMatches(category, input.type, existing.categoryId);
    const transaction = await prisma.transaction.update({
      where: { id: existing.id },
      data: {
        categoryId: category.id,
        description: input.description,
        amount: normalizeMoney(input.amount)!,
        type: input.type,
        date: input.date,
        paymentMethod: input.paymentMethod,
        notes: input.notes,
      },
      include: includeCategory,
    });
    await syncBudgetEffects(
      user.id,
      { categoryId: existing.categoryId, date: existing.date.trim(), type: existing.type },
      { categoryId: category.id, date: input.date, type: input.type },
    );
    res.json({ transaction: transactionDto(transaction) });
  }),
);

transactionsRouter.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const user = requireUser(req);
    const existing = await prisma.transaction.findFirst({ where: { id: req.params.id, userId: user.id } });
    if (!existing) throw new AppError(404, 'Transaction not found.');
    await prisma.transaction.delete({ where: { id: existing.id } });
    await syncBudgetEffects(user.id, { categoryId: existing.categoryId, date: existing.date.trim(), type: existing.type }, null);
    res.status(204).send();
  }),
);

function normalizeTransactionQuery(query: {
  page?: number;
  pageSize?: number;
  sort?: 'date' | 'amount';
  order?: 'asc' | 'desc';
  search?: string;
  type?: '' | 'INCOME' | 'EXPENSE';
  categoryId?: string;
  paymentMethod?: '' | 'CASH' | 'GCASH' | 'MAYA' | 'BANK_TRANSFER' | 'CREDIT_CARD' | 'DEBIT_CARD' | 'OTHER';
  from?: string;
  to?: string;
}) {
  return {
    page: query.page ?? 1,
    pageSize: query.pageSize ?? 10,
    sort: query.sort ?? 'date',
    order: query.order ?? 'desc',
    search: query.search,
    type: query.type === 'INCOME' || query.type === 'EXPENSE' ? query.type : undefined,
    categoryId: query.categoryId,
    paymentMethod: query.paymentMethod || undefined,
    from: query.from,
    to: query.to,
  };
}

function validateOptionalDates(from?: string, to?: string): void {
  if (from && !isoDateSchema.safeParse(from).success) throw new AppError(400, 'Enter a valid start date.', { from: 'Enter a valid start date.' });
  if (to && !isoDateSchema.safeParse(to).success) throw new AppError(400, 'Enter a valid end date.', { to: 'Enter a valid end date.' });
  if (from && to && from > to) throw new AppError(400, 'The start date must be on or before the end date.');
}

function transactionWhere(userId: string, query: { search?: string; type?: TransactionType; categoryId?: string; paymentMethod?: string; from?: string; to?: string }): Prisma.TransactionWhereInput {
  return {
    userId,
    ...(query.type ? { type: query.type } : {}),
    ...(query.categoryId ? { categoryId: query.categoryId } : {}),
    ...(query.paymentMethod ? { paymentMethod: query.paymentMethod as Prisma.TransactionWhereInput['paymentMethod'] } : {}),
    ...(query.search ? { description: { contains: query.search, mode: 'insensitive' } } : {}),
    ...(query.from || query.to ? { date: { ...(query.from ? { gte: query.from } : {}), ...(query.to ? { lte: query.to } : {}) } } : {}),
  };
}
