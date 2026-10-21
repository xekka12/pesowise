import { manilaToday, monthBounds, parseISODate, rangeForPreset } from '@pesowise/shared';
import type { Express } from 'express';
import request from 'supertest';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import { prisma } from '../src/lib/prisma.js';

const HEADER = 'x-pesowise-request';
let app: Express;

beforeAll(async () => {
  const rows = await prisma.$queryRaw<Array<{ name: string }>>`SELECT current_database() AS name`;
  if (rows[0]?.name !== 'pesowise_test') throw new Error(`Refusing to test against ${rows[0]?.name ?? 'an unknown database'}.`);
  app = createApp();
});

beforeEach(async () => {
  await prisma.notification.deleteMany();
  await prisma.transaction.deleteMany();
  await prisma.budget.deleteMany();
  await prisma.recurringTransaction.deleteMany();
  await prisma.savingsGoal.deleteMany();
  await prisma.category.deleteMany();
  await prisma.session.deleteMany();
  await prisma.user.deleteMany();
});

describe('authentication and isolation', () => {
  it('registers, logs in, and rejects a missing request header', async () => {
    const agent = request.agent(app);
    const created = await agent.post('/api/auth/register').set(HEADER, '1').send({ name: 'Ava Cruz', email: 'ava@example.com', password: 'TestPass123' });
    expect(created.status).toBe(201);
    expect(created.body.user.email).toBe('ava@example.com');
    expect(created.body.user.passwordHash).toBeUndefined();

    const missing = await request(app).post('/api/auth/login').send({ email: 'ava@example.com', password: 'TestPass123' });
    expect(missing.status).toBe(403);

    const bad = await request(app).post('/api/auth/login').set(HEADER, '1').send({ email: 'ava@example.com', password: 'wrong-password' });
    expect(bad.status).toBe(401);
    expect(bad.body.error).toBe('Invalid email or password.');

    const me = await agent.get('/api/auth/me');
    expect(me.status).toBe(200);
    await agent.post('/api/auth/logout').set(HEADER, '1');
    const after = await agent.get('/api/auth/me');
    expect(after.status).toBe(401);
  });

  it('hides another user\'s records', async () => {
    const owner = await register('owner@example.com');
    const other = await register('other@example.com');
    const category = await expenseCategory(owner);
    const created = await owner.post('/api/transactions').set(HEADER, '1').send(transactionBody(category, '100.00'));
    expect(created.status).toBe(201);
    const hidden = await other.get(`/api/transactions/${created.body.transaction.id}`);
    expect(hidden.status).toBe(404);
    const list = await other.get('/api/transactions');
    expect(list.body.items).toHaveLength(0);
    const stolen = await other.patch(`/api/transactions/${created.body.transaction.id}`).set(HEADER, '1').send(transactionBody(category, '50.00'));
    expect(stolen.status).toBe(404);
  });
});

describe('transactions, budgets, goals, and reports', () => {
  it('calculates totals, filters dates, and updates budgets when records change', async () => {
    const agent = await register('math@example.com');
    const food = await expenseCategory(agent, 'Food');
    const transport = await expenseCategory(agent, 'Transportation');
    const salary = await incomeCategory(agent);
    const today = manilaToday();
    const bounds = monthBounds(parseISODate(today).year, parseISODate(today).month);
    await agent.post('/api/transactions').set(HEADER, '1').send(transactionBody(salary, '100.00', 'INCOME', bounds.from));
    const expense = await agent.post('/api/transactions').set(HEADER, '1').send(transactionBody(food, '80.00', 'EXPENSE', bounds.from, 'Lunch'));
    expect(expense.status).toBe(201);
    const invalid = await agent.post('/api/transactions').set(HEADER, '1').send(transactionBody(food, '0', 'EXPENSE', bounds.from));
    expect(invalid.status).toBe(400);

    const budget = await agent.post('/api/budgets').set(HEADER, '1').send({ name: 'Food', categoryId: food, limit: '100.00', month: parseISODate(today).month, year: parseISODate(today).year });
    expect(budget.status).toBe(201);
    expect(budget.body.budget.status).toBe('warning');
    const duplicate = await agent.post('/api/budgets').set(HEADER, '1').send({ name: 'Food again', categoryId: food, limit: '90.00', month: parseISODate(today).month, year: parseISODate(today).year });
    expect(duplicate.status).toBe(409);

    const outside = '2020-01-15';
    await agent.post('/api/transactions').set(HEADER, '1').send(transactionBody(transport, '999.00', 'EXPENSE', outside, 'Old fare'));
    const filtered = await agent.get(`/api/transactions?from=${bounds.from}&to=${bounds.to}`);
    expect(filtered.body.total).toBe(2);
    expect(filtered.body.items.some((item: { description: string }) => item.description === 'Old fare')).toBe(false);

    const range = rangeForPreset('this-month', today);
    const dashboard = await agent.get(`/api/dashboard?from=${range.from}&to=${range.to}`);
    expect(dashboard.status).toBe(200);
    expect(dashboard.body.summary.income).toBe('100.00');
    expect(dashboard.body.summary.expenses).toBe('80.00');
    expect(dashboard.body.summary.balance).toBe('20.00');
    expect(dashboard.body.summary.savingsRate).toBe(20);

    const zeroIncome = await agent.get(`/api/dashboard?from=2020-01-01&to=2020-01-31`);
    expect(zeroIncome.body.summary.income).toBe('0.00');
    expect(zeroIncome.body.summary.savingsRate).toBeNull();

    await agent.patch(`/api/transactions/${expense.body.transaction.id}`).set(HEADER, '1').send(transactionBody(transport, '10.00', 'EXPENSE', bounds.from, 'Moved'));
    const refreshed = await agent.get(`/api/budgets?month=${parseISODate(today).month}&year=${parseISODate(today).year}`);
    const foodBudget = refreshed.body.budgets.find((item: { category: { id: string } }) => item.category.id === food);
    expect(foodBudget.spent).toBe('0.00');
    expect(foodBudget.status).toBe('normal');

    await agent.delete(`/api/transactions/${expense.body.transaction.id}`).set(HEADER, '1');
    const afterDelete = await agent.get(`/api/transactions/${expense.body.transaction.id}`);
    expect(afterDelete.status).toBe(404);

    const report = await agent.get(`/api/reports?from=${range.from}&to=${range.to}`);
    expect(report.body.months[0].spendingChange === null || typeof report.body.months[0].spendingChange === 'number').toBe(true);
    const quietMonth = await agent.get('/api/reports?from=2020-03-01&to=2020-03-31');
    expect(quietMonth.body.summary.expenses).toBe('0.00');
    expect(quietMonth.body.months[0].spendingChange).toBe(0);
  });

  it('deduplicates recurring transactions and budget alerts', async () => {
    const agent = await register('repeat@example.com');
    const rent = await expenseCategory(agent, 'Bills and Utilities');
    const today = manilaToday();
    const rule = await agent.post('/api/recurring').set(HEADER, '1').send({
      description: 'Rent',
      amount: '100.00',
      type: 'EXPENSE',
      categoryId: rent,
      frequency: 'MONTHLY',
      startDate: today,
      paymentMethod: 'BANK_TRANSFER',
    });
    expect(rule.status).toBe(201);
    const first = await agent.post('/api/recurring/process').set(HEADER, '1');
    const second = await agent.post('/api/recurring/process').set(HEADER, '1');
    expect(first.body.created).toBe(1);
    expect(second.body.created).toBe(0);
    const count = await prisma.transaction.count({ where: { occurrenceKey: `${rule.body.recurring.id}:${today}` } });
    expect(count).toBe(1);
    const notes = await agent.get('/api/notifications');
    expect(notes.body.items.filter((item: { type: string }) => item.type === 'RECURRING_GENERATED')).toHaveLength(1);

    const parts = parseISODate(today);
    await agent.post('/api/budgets').set(HEADER, '1').send({ name: 'Rent', categoryId: rent, limit: '100.00', month: parts.month, year: parts.year });
    await agent.post('/api/transactions').set(HEADER, '1').send(transactionBody(rent, '1.00', 'EXPENSE', today, 'Extra'));
    const alerts = await prisma.notification.count({ where: { type: 'BUDGET_EXCEEDED' } });
    await agent.post('/api/transactions').set(HEADER, '1').send(transactionBody(rent, '5.00', 'EXPENSE', today, 'Another'));
    const alertsAgain = await prisma.notification.count({ where: { type: 'BUDGET_EXCEEDED' } });
    expect(alerts).toBe(1);
    expect(alertsAgain).toBe(1);
  });

  it('validates savings goals and exports filtered csv safely', async () => {
    const agent = await register('export@example.com');
    const food = await expenseCategory(agent, 'Food');
    const today = manilaToday();
    await agent.post('/api/transactions').set(HEADER, '1').send({ ...transactionBody(food, '12.50', 'EXPENSE', today, '=SUM(1,1)'), notes: 'say "hi", friend' });
    const goal = await agent.post('/api/goals').set(HEADER, '1').send({ name: 'Emergency Fund', targetAmount: '100.00', savedAmount: '40.00' });
    expect(goal.status).toBe(201);
    expect(goal.body.goal.percent).toBe(40);
    expect(goal.body.goal.remaining).toBe('60.00');
    const tooMuch = await agent.patch(`/api/goals/${goal.body.goal.id}/saved`).set(HEADER, '1').send({ savedAmount: '150.00' });
    expect(tooMuch.status).toBe(400);
    const done = await agent.patch(`/api/goals/${goal.body.goal.id}/saved`).set(HEADER, '1').send({ savedAmount: '100.00' });
    expect(done.body.goal.completed).toBe(true);

    const csv = await agent.get(`/api/transactions/export?from=${today}&to=${today}&type=EXPENSE`);
    expect(csv.status).toBe(200);
    expect(csv.headers['content-type']).toContain('text/csv');
    expect(csv.text).toContain('Amount (PHP)');
    expect(csv.text).toContain(`"'=SUM(1,1)"`);
    expect(csv.text).toContain('say ""hi"", friend');
    expect(csv.text).not.toContain('999.00');

    const blocked = await agent.delete(`/api/categories/${food}`).set(HEADER, '1');
    expect(blocked.status).toBe(409);
    const stillThere = await agent.get('/api/transactions');
    expect(stillThere.body.total).toBe(1);
  });
});

async function register(email: string) {
  const agent = request.agent(app);
  const response = await agent.post('/api/auth/register').set(HEADER, '1').send({ name: 'Test User', email, password: 'TestPass123' });
  expect(response.status).toBe(201);
  return agent;
}

async function expenseCategory(agent: request.Agent, name = 'Food') {
  const response = await agent.get('/api/categories');
  const category = response.body.categories.find((item: { name: string; type: string }) => item.name === name && item.type === 'EXPENSE');
  expect(category).toBeTruthy();
  return category.id as string;
}

async function incomeCategory(agent: request.Agent) {
  const response = await agent.get('/api/categories');
  const category = response.body.categories.find((item: { type: string }) => item.type === 'INCOME');
  return category.id as string;
}

function transactionBody(categoryId: string, amount: string, type: 'INCOME' | 'EXPENSE' = 'EXPENSE', date = manilaToday(), description = 'Test item') {
  return { description, amount, type, categoryId, date, paymentMethod: 'CASH', notes: null };
}
