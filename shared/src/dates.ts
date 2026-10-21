export interface DateParts {
  year: number;
  month: number;
  day: number;
}

export function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

export function formatISODate(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export function parseISODate(value: string): DateParts {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) throw new Error('Invalid date');
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (month < 1 || month > 12 || day < 1 || day > daysInMonth(year, month)) {
    throw new Error('Invalid date');
  }
  return { year, month, day };
}

export function isRealISODate(value: string): boolean {
  try {
    parseISODate(value);
    return true;
  } catch {
    return false;
  }
}

export function manilaToday(now = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Manila',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);
  const read = (type: string) => parts.find((part) => part.type === type)?.value ?? '';
  return `${read('year')}-${read('month')}-${read('day')}`;
}

export function formatManilaHeading(now = new Date()): string {
  return new Intl.DateTimeFormat('en-PH', {
    timeZone: 'Asia/Manila',
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(now);
}

export function formatLongDate(iso: string): string {
  const { year, month, day } = parseISODate(iso);
  return new Intl.DateTimeFormat('en-PH', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(year, month - 1, day)));
}

export function formatManilaTimestamp(iso: string): string {
  return new Intl.DateTimeFormat('en-PH', {
    timeZone: 'Asia/Manila',
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(iso));
}

export function addDays(iso: string, days: number): string {
  const { year, month, day } = parseISODate(iso);
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() + days);
  return formatISODate(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate());
}

export function addMonths(parts: DateParts, monthsToAdd: number): DateParts {
  const index = parts.month - 1 + monthsToAdd;
  const year = parts.year + Math.floor(index / 12);
  const month = ((index % 12) + 12) % 12;
  const day = Math.min(parts.day, daysInMonth(year, month + 1));
  return { year, month: month + 1, day };
}

export function monthKey(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, '0')}`;
}

export function monthLabel(year: number, month: number): string {
  return new Intl.DateTimeFormat('en-PH', {
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(year, month - 1, 1)));
}

export function monthBounds(year: number, month: number): { from: string; to: string } {
  return {
    from: formatISODate(year, month, 1),
    to: formatISODate(year, month, daysInMonth(year, month)),
  };
}

export function monthsInRange(from: string, to: string): DateParts[] {
  const start = parseISODate(from);
  const end = parseISODate(to);
  const months: DateParts[] = [];
  let year = start.year;
  let month = start.month;
  while (year < end.year || (year === end.year && month <= end.month)) {
    months.push({ year, month, day: 1 });
    month += 1;
    if (month === 13) {
      month = 1;
      year += 1;
    }
    if (months.length > 120) break;
  }
  return months;
}

export function inclusiveDays(from: string, to: string): number {
  const start = parseISODate(from);
  const end = parseISODate(to);
  const startUtc = Date.UTC(start.year, start.month - 1, start.day);
  const endUtc = Date.UTC(end.year, end.month - 1, end.day);
  return Math.round((endUtc - startUtc) / 86_400_000) + 1;
}

export const DATE_PRESETS = [
  { id: 'this-month', label: 'This Month' },
  { id: 'last-month', label: 'Last Month' },
  { id: 'last-3-months', label: 'Last 3 Months' },
  { id: 'this-year', label: 'This Year' },
  { id: 'custom', label: 'Custom' },
] as const;

export type DatePresetId = (typeof DATE_PRESETS)[number]['id'];

export function rangeForPreset(preset: Exclude<DatePresetId, 'custom'>, today = manilaToday()): { from: string; to: string } {
  const { year, month } = parseISODate(today);
  if (preset === 'this-month') return { from: formatISODate(year, month, 1), to: today };
  if (preset === 'last-month') {
    const previous = addMonths({ year, month, day: 1 }, -1);
    return monthBounds(previous.year, previous.month);
  }
  if (preset === 'last-3-months') {
    const start = addMonths({ year, month, day: 1 }, -2);
    return { from: formatISODate(start.year, start.month, 1), to: today };
  }
  return { from: formatISODate(year, 1, 1), to: today };
}

/** Same calendar window shifted one month earlier. Full months compare with the full previous month. */
export function previousComparisonWindow(sliceFrom: string, sliceTo: string): { from: string; to: string } {
  const start = parseISODate(sliceFrom);
  const end = parseISODate(sliceTo);
  const bounds = monthBounds(start.year, start.month);
  const previous = addMonths({ year: start.year, month: start.month, day: 1 }, -1);
  const previousBounds = monthBounds(previous.year, previous.month);
  const fullMonth = start.year === end.year && start.month === end.month && sliceFrom === bounds.from && sliceTo === bounds.to;
  if (fullMonth) return previousBounds;
  const lastDay = daysInMonth(previous.year, previous.month);
  return {
    from: formatISODate(previous.year, previous.month, Math.min(start.day, lastDay)),
    to: formatISODate(previous.year, previous.month, Math.min(end.day, lastDay)),
  };
}

export function analyticsFetchStart(from: string, to: string): string {
  let earliest = from;
  for (const month of monthsInRange(from, to)) {
    const bounds = monthBounds(month.year, month.month);
    const sliceFrom = bounds.from > from ? bounds.from : from;
    const sliceTo = bounds.to < to ? bounds.to : to;
    const previous = previousComparisonWindow(sliceFrom, sliceTo).from;
    if (previous < earliest) earliest = previous;
  }
  return earliest;
}
