import { addDays, firstOnOrAfter, manilaToday, occurrencesThrough, type Frequency } from '@pesowise/shared';
import { Prisma } from '@prisma/client';
import { isUniqueConstraint } from '../lib/errors.js';
import { prisma } from '../lib/prisma.js';
import { notify } from './alerts.js';
import { syncBudgetEffects } from './alerts.js';

const LOCK_KEY = 842615;

export async function processDueRecurring(userId?: string): Promise<{ created: number; skipped: boolean }> {
  return prisma.$transaction(
    async (tx) => {
      const rows = await tx.$queryRaw<Array<{ locked: boolean }>>`SELECT pg_try_advisory_xact_lock(${LOCK_KEY}) AS locked`;
      if (!rows[0]?.locked) return { created: 0, skipped: true };
      const created = await generateDueTransactions(userId);
      return { created, skipped: false };
    },
    { timeout: 120_000, maxWait: 10_000 },
  );
}

export async function generateDueTransactions(userId?: string): Promise<number> {
  const today = manilaToday();
  const rules = await prisma.recurringTransaction.findMany({
    where: {
      status: 'ACTIVE',
      nextOccurrence: { lte: today },
      ...(userId ? { userId } : {}),
    },
  });

  let created = 0;
  for (const rule of rules) {
    if (!rule.nextOccurrence) continue;
    const dates = occurrencesThrough({
      startDate: rule.startDate.trim(),
      frequency: rule.frequency,
      fromDate: rule.nextOccurrence.trim(),
      throughDate: today,
      endDate: rule.endDate?.trim() ?? null,
      limit: 36,
    });

    for (const date of dates) {
      const occurrenceKey = `${rule.id}:${date}`;
      try {
        await prisma.transaction.create({
          data: {
            userId: rule.userId,
            categoryId: rule.categoryId,
            description: rule.description,
            amount: rule.amount,
            type: rule.type,
            date,
            paymentMethod: rule.paymentMethod,
            notes: rule.notes,
            recurringId: rule.id,
            occurrenceKey,
          },
        });
        created += 1;
        await notify({
          userId: rule.userId,
          type: 'RECURRING_GENERATED',
          title: 'Recurring transaction added',
          message: `${rule.description} was added for ${date}.`,
          dedupeKey: `recurring:${occurrenceKey}`,
        });
        if (rule.type === 'EXPENSE') {
          await syncBudgetEffects(rule.userId, null, { categoryId: rule.categoryId, date, type: 'EXPENSE' });
        }
      } catch (error) {
        if (!isUniqueConstraint(error)) throw error;
      }
    }

    const anchor = dates.length > 0 ? addDays(dates[dates.length - 1], 1) : addDays(today, 1);
    const next = firstOnOrAfter(rule.startDate.trim(), rule.frequency, anchor, rule.endDate?.trim() ?? null);
    await prisma.recurringTransaction.update({
      where: { id: rule.id },
      data: { nextOccurrence: next, lastProcessedAt: new Date() },
    });
  }
  return created;
}

export function initialNextOccurrence(startDate: string, frequency: Frequency, endDate: string | null): string | null {
  return firstOnOrAfter(startDate, frequency, startDate, endDate);
}

export function nextAfterEdit(input: {
  startDate: string;
  frequency: Frequency;
  endDate: string | null;
  previousNext: string | null;
}): string | null {
  if (!input.previousNext) return firstOnOrAfter(input.startDate, input.frequency, manilaToday(), input.endDate);
  return firstOnOrAfter(input.startDate, input.frequency, input.previousNext, input.endDate);
}

export function decimalAmount(value: string): Prisma.Decimal {
  return new Prisma.Decimal(value);
}
