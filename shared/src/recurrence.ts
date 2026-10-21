import { addDays, addMonths, daysInMonth, formatISODate, parseISODate } from './dates.js';
import type { Frequency } from './types.js';

/** Occurrence dates keep the start date's day and clamp short months, so Jan 31 moves to Feb 28 and back to Mar 31. */
export function occurrenceOn(startDate: string, frequency: Frequency, index: number): string {
  if (index < 0) throw new Error('Occurrence index must be zero or greater.');
  const start = parseISODate(startDate);
  if (frequency === 'WEEKLY') return addDays(startDate, index * 7);
  const shifted = addMonths(start, frequency === 'MONTHLY' ? index : index * 12);
  return formatISODate(shifted.year, shifted.month, Math.min(start.day, daysInMonth(shifted.year, shifted.month)));
}

export function firstOnOrAfter(startDate: string, frequency: Frequency, target: string, endDate?: string | null): string | null {
  for (let index = 0; index < 5000; index += 1) {
    const date = occurrenceOn(startDate, frequency, index);
    if (endDate && date > endDate) return null;
    if (date >= target) return date;
  }
  return null;
}

export function occurrencesThrough(options: {
  startDate: string;
  frequency: Frequency;
  fromDate: string;
  throughDate: string;
  endDate?: string | null;
  limit?: number;
}): string[] {
  const limit = options.limit ?? 36;
  const dates: string[] = [];
  for (let index = 0; index < 5000 && dates.length < limit; index += 1) {
    const date = occurrenceOn(options.startDate, options.frequency, index);
    if (date > options.throughDate) break;
    if (options.endDate && date > options.endDate) break;
    if (date >= options.fromDate) dates.push(date);
  }
  return dates;
}
