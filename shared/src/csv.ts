const FORMULA_PREFIX = /^[=+\-@\t\r]/;

/** Quote every cell and neutralize spreadsheet formulas in untrusted text. */
export function escapeCsvCell(value: string | number | null | undefined): string {
  let text = value === null || value === undefined ? '' : String(value);
  if (FORMULA_PREFIX.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}

export function toCsv(headers: string[], rows: Array<Array<string | number | null | undefined>>): string {
  const lines = [headers.map((header) => escapeCsvCell(header)).join(',')];
  for (const row of rows) lines.push(row.map((cell) => escapeCsvCell(cell)).join(','));
  return `\uFEFF${lines.join('\r\n')}\r\n`;
}
