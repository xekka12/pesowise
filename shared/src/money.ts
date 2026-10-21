const MONEY_PATTERN = /^\d+(\.\d{1,2})?$/;

export function fromCents(cents: number): string {
  const negative = cents < 0;
  const absolute = Math.abs(cents);
  const whole = Math.floor(absolute / 100);
  const fraction = absolute % 100;
  return `${negative ? '-' : ''}${whole}.${String(fraction).padStart(2, '0')}`;
}

export function toCents(amount: string): number {
  const negative = amount.startsWith('-');
  const raw = negative ? amount.slice(1) : amount;
  if (!/^\d+\.\d{2}$/.test(raw)) {
    throw new Error(`Invalid money value: ${amount}`);
  }
  const [whole, fraction] = raw.split('.');
  const cents = Number(whole) * 100 + Number(fraction);
  return negative ? -cents : cents;
}

export function normalizeMoney(input: string, options?: { allowZero?: boolean }): string | null {
  const trimmed = input.trim();
  if (!MONEY_PATTERN.test(trimmed)) return null;
  const [whole, fraction = ''] = trimmed.split('.');
  if (whole.length > 9) return null;
  if (whole.length > 1 && whole.startsWith('0')) return null;
  const cents = Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
  if (!Number.isSafeInteger(cents) || cents < 0) return null;
  if (cents === 0 && !options?.allowZero) return null;
  return fromCents(cents);
}

export function formatPHP(amount: string | number | null | undefined): string {
  if (amount === null || amount === undefined || amount === '') return '—';
  try {
    const cents = typeof amount === 'number' ? Math.round(amount * 100) : toCents(amount.includes('.') ? ensureScale(amount) : `${amount}.00`);
    const negative = cents < 0;
    const absolute = Math.abs(cents);
    const whole = Math.floor(absolute / 100).toString();
    const fraction = String(absolute % 100).padStart(2, '0');
    const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return `${negative ? '-' : ''}₱${grouped}.${fraction}`;
  } catch {
    return '—';
  }
}

function ensureScale(amount: string): string {
  const negative = amount.startsWith('-');
  const raw = negative ? amount.slice(1) : amount;
  const [whole, fraction = ''] = raw.split('.');
  return `${negative ? '-' : ''}${whole}.${fraction.padEnd(2, '0').slice(0, 2)}`;
}

export function moneyToNumber(amount: string): number {
  return toCents(amount) / 100;
}
