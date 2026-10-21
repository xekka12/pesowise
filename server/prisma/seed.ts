import '../src/config.js';
import { DEFAULT_CATEGORIES, DEMO_EMAIL, addMonths, daysInMonth, formatISODate, manilaToday, parseISODate } from '@pesowise/shared';
import { Prisma } from '@prisma/client';
import { hashPassword } from '../src/lib/password.js';
import { prisma } from '../src/lib/prisma.js';
import { reconcileBudgetAlerts, syncGoalCompletion } from '../src/services/alerts.js';

const today = manilaToday();
const current = parseISODate(today);

function onDay(year: number, month: number, day: number): string | null {
  const iso = formatISODate(year, month, Math.min(day, daysInMonth(year, month)));
  return iso <= today ? iso : null;
}

async function main(): Promise<void> {
  const existing = await prisma.user.findUnique({ where: { email: DEMO_EMAIL } });
  if (existing) {
    await prisma.$transaction([
      prisma.notification.deleteMany({ where: { userId: existing.id } }),
      prisma.transaction.deleteMany({ where: { userId: existing.id } }),
      prisma.budget.deleteMany({ where: { userId: existing.id } }),
      prisma.recurringTransaction.deleteMany({ where: { userId: existing.id } }),
      prisma.savingsGoal.deleteMany({ where: { userId: existing.id } }),
      prisma.category.deleteMany({ where: { userId: existing.id } }),
      prisma.session.deleteMany({ where: { userId: existing.id } }),
      prisma.user.delete({ where: { id: existing.id } }),
    ]);
  }

  const user = await prisma.user.create({
    data: {
      name: 'Alex Rivera',
      email: DEMO_EMAIL,
      passwordHash: await hashPassword('DemoPass123!'),
      warningThreshold: 80,
    },
  });
  await prisma.category.createMany({
    data: DEFAULT_CATEGORIES.map((category) => ({
      userId: user.id,
      name: category.name,
      type: category.type,
      icon: category.icon,
      color: category.color,
      isDefault: true,
    })),
  });
  const categories = await prisma.category.findMany({ where: { userId: user.id } });
  const id = (name: string) => {
    const category = categories.find((item) => item.name === name);
    if (!category) throw new Error(`Missing demo category ${name}`);
    return category.id;
  };

  const rows: Prisma.TransactionCreateManyInput[] = [];
  const add = (date: string | null, type: 'INCOME' | 'EXPENSE', category: string, amount: string, description: string, payment: Prisma.TransactionCreateManyInput['paymentMethod'], notes?: string) => {
    if (!date) return;
    rows.push({ userId: user.id, date, type, categoryId: id(category), amount, description, paymentMethod: payment, notes });
  };

  for (const back of [1, 2, 3, 4, 5]) {
    const month = addMonths({ year: current.year, month: current.month, day: 1 }, -back);
    add(onDay(month.year, month.month, 1), 'INCOME', 'Allowance', '12000.00', 'Monthly allowance', 'GCASH');
    add(onDay(month.year, month.month, 15), 'INCOME', 'Salary', '18000.00', 'Part-time salary', 'BANK_TRANSFER');
    add(onDay(month.year, month.month, 3), 'EXPENSE', 'Food', (4200 + back * 80).toFixed(2), 'Groceries and meals', 'CASH');
    add(onDay(month.year, month.month, 6), 'EXPENSE', 'Transportation', '1400.00', 'Jeepney and train', 'GCASH');
    add(onDay(month.year, month.month, 1), 'EXPENSE', 'Bills and Utilities', '8000.00', 'Rent', 'BANK_TRANSFER');
    add(onDay(month.year, month.month, 5), 'EXPENSE', 'Bills and Utilities', '1699.00', 'Internet', 'MAYA');
    add(onDay(month.year, month.month, 18), 'EXPENSE', 'Shopping', (900 + back * 40).toFixed(2), 'Household items', 'DEBIT_CARD');
    add(onDay(month.year, month.month, 21), 'EXPENSE', 'Entertainment', '650.00', 'Movie night', 'CASH');
  }

  add(onDay(current.year, current.month, 1), 'INCOME', 'Allowance', '12000.00', 'Monthly allowance', 'GCASH');
  add(onDay(current.year, current.month, 1), 'INCOME', 'Salary', '18000.00', 'Part-time salary', 'BANK_TRANSFER');
  add(onDay(current.year, current.month, 1), 'INCOME', 'Freelance', '3500.00', 'Design gig', 'MAYA', 'Invoice 104, "logo set"');
  add(onDay(current.year, current.month, 1), 'EXPENSE', 'Food', '1800.00', 'Groceries', 'CASH');
  add(onDay(current.year, current.month, 1), 'EXPENSE', 'Food', '1500.00', 'Cafeteria', 'GCASH');
  add(onDay(current.year, current.month, 1), 'EXPENSE', 'Food', '1200.00', 'Weekend meals', 'CASH');
  add(onDay(current.year, current.month, 1), 'EXPENSE', 'Transportation', '900.00', 'Commute load', 'GCASH');
  add(onDay(current.year, current.month, 1), 'EXPENSE', 'Transportation', '800.00', 'Grab rides', 'MAYA');
  add(onDay(current.year, current.month, 1), 'EXPENSE', 'Shopping', '2700.00', 'Clothes', 'CREDIT_CARD');
  add(onDay(current.year, current.month, 1), 'EXPENSE', 'Bills and Utilities', '8000.00', 'Rent', 'BANK_TRANSFER');
  add(onDay(current.year, current.month, 1), 'EXPENSE', 'Bills and Utilities', '1500.00', 'Utilities', 'MAYA');
  add(onDay(current.year, current.month, 1), 'EXPENSE', 'Entertainment', '350.00', 'Streaming', 'DEBIT_CARD');
  add(onDay(current.year, current.month, 1), 'EXPENSE', 'Education', '500.00', 'Printing', 'CASH');

  await prisma.transaction.createMany({ data: rows });

  const budgets = [
    { name: 'Food budget', category: 'Food', limit: '8000.00' },
    { name: 'Transport budget', category: 'Transportation', limit: '2000.00' },
    { name: 'Shopping budget', category: 'Shopping', limit: '2500.00' },
    { name: 'Bills budget', category: 'Bills and Utilities', limit: '10000.00' },
    { name: 'Entertainment budget', category: 'Entertainment', limit: '1500.00' },
  ];
  for (const budget of budgets) {
    await prisma.budget.create({
      data: {
        userId: user.id,
        categoryId: id(budget.category),
        name: budget.name,
        limitAmount: budget.limit,
        month: current.month,
        year: current.year,
      },
    });
    await reconcileBudgetAlerts(user.id, id(budget.category), current.year, current.month);
  }

  const laptop = await prisma.savingsGoal.create({
    data: { userId: user.id, name: 'New Laptop', targetAmount: '45000.00', savedAmount: '45000.00', targetDate: shiftMonths(8), description: 'Replacement for school and freelance work.' },
  });
  await prisma.savingsGoal.create({
    data: { userId: user.id, name: 'Emergency Fund', targetAmount: '50000.00', savedAmount: '18500.00', targetDate: shiftMonths(6), description: 'Cash set aside manually. This is not a bank balance.' },
  });
  await prisma.savingsGoal.create({
    data: { userId: user.id, name: 'Tuition', targetAmount: '30000.00', savedAmount: '12000.00', targetDate: shiftMonths(8) },
  });
  await prisma.savingsGoal.create({
    data: { userId: user.id, name: 'Travel Fund', targetAmount: '20000.00', savedAmount: '2500.00', targetDate: shiftMonths(10), description: 'Weekend trip fund.' },
  });
  await syncGoalCompletion(laptop.id, user.id);

  const nextMonth = addMonths({ year: current.year, month: current.month, day: 1 }, 1);
  const nextDate = (day: number) => formatISODate(nextMonth.year, nextMonth.month, Math.min(day, daysInMonth(nextMonth.year, nextMonth.month)));
  await prisma.recurringTransaction.createMany({
    data: [
      { userId: user.id, categoryId: id('Salary'), description: 'Part-time salary', amount: '18000.00', type: 'INCOME', frequency: 'MONTHLY', startDate: nextDate(15), nextOccurrence: nextDate(15), paymentMethod: 'BANK_TRANSFER', status: 'ACTIVE' },
      { userId: user.id, categoryId: id('Allowance'), description: 'Monthly allowance', amount: '12000.00', type: 'INCOME', frequency: 'MONTHLY', startDate: nextDate(1), nextOccurrence: nextDate(1), paymentMethod: 'GCASH', status: 'ACTIVE' },
      { userId: user.id, categoryId: id('Bills and Utilities'), description: 'Rent', amount: '8000.00', type: 'EXPENSE', frequency: 'MONTHLY', startDate: nextDate(1), nextOccurrence: nextDate(1), paymentMethod: 'BANK_TRANSFER', status: 'ACTIVE' },
      { userId: user.id, categoryId: id('Bills and Utilities'), description: 'Internet bill', amount: '1699.00', type: 'EXPENSE', frequency: 'MONTHLY', startDate: nextDate(5), nextOccurrence: nextDate(5), paymentMethod: 'MAYA', status: 'ACTIVE' },
    ],
  });

  await prisma.notification.create({
    data: {
      userId: user.id,
      type: 'ACCOUNT',
      title: 'Welcome to PesoWise',
      message: 'Demo transactions, budgets, and goals are loaded. Savings amounts are entered by you. PesoWise does not connect to a bank.',
      dedupeKey: 'account:welcome',
    },
  });

  console.log(`Seeded ${DEMO_EMAIL} / DemoPass123!`);
}

function shiftMonths(count: number): string {
  const shifted = addMonths(current, count);
  return formatISODate(shifted.year, shifted.month, Math.min(current.day, daysInMonth(shifted.year, shifted.month)));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
