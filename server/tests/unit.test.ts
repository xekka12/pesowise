import { buildAnalytics, escapeCsvCell, firstOnOrAfter, formatPHP, goalProgress, monthOverMonthChange, normalizeMoney, occurrenceOn, occurrencesThrough, previousComparisonWindow, rangeForPreset, savingsRate, budgetProgress, toCsv } from '@pesowise/shared';
import { describe, expect, it } from 'vitest';

describe('money and savings rate', () => {
  it('normalizes peso amounts and rejects invalid values', () => {
    expect(normalizeMoney('1200')).toBe('1200.00');
    expect(normalizeMoney('10.5')).toBe('10.50');
    expect(normalizeMoney('0')).toBeNull();
    expect(normalizeMoney('0', { allowZero: true })).toBe('0.00');
    expect(normalizeMoney('-5')).toBeNull();
    expect(normalizeMoney('1.234')).toBeNull();
    expect(formatPHP('1234.50')).toBe('₱1,234.50');
    expect(formatPHP('-20.00')).toBe('-₱20.00');
  });

  it('returns null savings rate when income is zero', () => {
    expect(savingsRate('0.00', '0.00')).toBeNull();
    expect(savingsRate('0.00', '25.00')).toBeNull();
    expect(savingsRate('100.00', '25.00')).toBe(75);
    expect(savingsRate('100.00', '150.00')).toBe(-50);
  });
});

describe('budgets and goals', () => {
  it('classifies warning and exceeded thresholds from actual cents', () => {
    expect(budgetProgress('79.99', '100.00', 80).status).toBe('normal');
    expect(budgetProgress('80.00', '100.00', 80).status).toBe('warning');
    expect(budgetProgress('99.99', '100.00', 80).status).toBe('warning');
    expect(budgetProgress('100.00', '100.00', 80)).toMatchObject({ status: 'exceeded', remaining: '0.00', percent: 100 });
    expect(budgetProgress('120.00', '100.00', 80).remaining).toBe('-20.00');
  });

  it('tracks goal completion without exceeding the displayed percent', () => {
    expect(goalProgress('0.00', '100.00')).toMatchObject({ percent: 0, remaining: '100.00', completed: false });
    expect(goalProgress('100.00', '100.00')).toMatchObject({ percent: 100, remaining: '0.00', completed: true });
    expect(goalProgress('150.00', '100.00').percent).toBe(100);
  });
});

describe('dates, recurrence, and comparisons', () => {
  it('builds Manila month presets and comparison windows', () => {
    expect(rangeForPreset('this-month', '2026-10-21')).toEqual({ from: '2026-10-01', to: '2026-10-21' });
    expect(rangeForPreset('last-month', '2026-10-21')).toEqual({ from: '2026-09-01', to: '2026-09-30' });
    expect(rangeForPreset('last-3-months', '2026-03-10')).toEqual({ from: '2026-01-01', to: '2026-03-10' });
    expect(previousComparisonWindow('2026-10-01', '2026-10-21')).toEqual({ from: '2026-09-01', to: '2026-09-21' });
    expect(previousComparisonWindow('2026-09-01', '2026-09-30')).toEqual({ from: '2026-08-01', to: '2026-08-31' });
  });

  it('clamps monthly occurrences without drifting off the original day', () => {
    expect(occurrenceOn('2026-01-31', 'MONTHLY', 0)).toBe('2026-01-31');
    expect(occurrenceOn('2026-01-31', 'MONTHLY', 1)).toBe('2026-02-28');
    expect(occurrenceOn('2026-01-31', 'MONTHLY', 2)).toBe('2026-03-31');
    expect(occurrenceOn('2024-02-29', 'YEARLY', 1)).toBe('2025-02-28');
    expect(occurrenceOn('2026-10-01', 'WEEKLY', 2)).toBe('2026-10-15');
    expect(firstOnOrAfter('2026-01-31', 'MONTHLY', '2026-02-01', null)).toBe('2026-02-28');
    expect(occurrencesThrough({ startDate: '2026-01-01', frequency: 'MONTHLY', fromDate: '2026-01-01', throughDate: '2026-03-01', limit: 10 })).toEqual(['2026-01-01', '2026-02-01', '2026-03-01']);
  });

  it('handles a zero previous spending window', () => {
    expect(monthOverMonthChange('0.00', '0.00')).toBe(0);
    expect(monthOverMonthChange('80.00', '0.00')).toBeNull();
    expect(monthOverMonthChange('150.00', '100.00')).toBe(50);
    const result = buildAnalytics(
      [{ amount: '80.00', type: 'EXPENSE', date: '2026-10-02', categoryId: 'food', categoryName: 'Food', color: '#000000', icon: 'Tag' }],
      '2026-10-01',
      '2026-10-21',
    );
    expect(result.summary.savingsRate).toBeNull();
    expect(result.summary.balance).toBe('-80.00');
    expect(result.months[0]?.spendingChange).toBeNull();
  });
});

describe('csv export', () => {
  it('escapes quotes, commas, and spreadsheet formulas', () => {
    expect(escapeCsvCell('say "hi", friend')).toBe('"say ""hi"", friend"');
    expect(escapeCsvCell('=SUM(1,1)')).toBe(`"'=SUM(1,1)"`);
    expect(escapeCsvCell('+cmd')).toBe(`"'+cmd"`);
    expect(escapeCsvCell('@evil')).toBe(`"'@evil"`);
    const csv = toCsv(['Description', 'Amount (PHP)'], [['=SUM(1,1)', '10.00'], ['plain', '0.00']]);
    expect(csv.charCodeAt(0)).toBe(0xfeff);
    expect(csv).toContain('Description');
    expect(csv).toContain(`"'=SUM(1,1)"`);
    expect(toCsv(['Date'], [])).toContain('"Date"');
  });
});
