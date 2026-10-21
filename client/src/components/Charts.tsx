import { formatPHP, moneyToNumber, type CategorySlice, type MonthPoint } from '@pesowise/shared';
import { Cell, Legend, Line, LineChart, Pie, PieChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { usePrefersReducedMotion } from '../lib/hooks';

function Tip({ active, payload, label }: { active?: boolean; payload?: Array<{ name?: string; value?: number; color?: string; payload?: { incomeLabel?: string; expenseLabel?: string; amountLabel?: string } }>; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-line bg-white px-3 py-2 text-xs shadow-card">
      {label ? <p className="mb-1 font-semibold text-ink">{label}</p> : null}
      {payload.map((item) => (
        <p key={item.name} className="text-muted">
          <span style={{ color: item.color }}>{item.name}: </span>
          {formatPHP(item.payload?.incomeLabel && item.name === 'Income' ? item.payload.incomeLabel : item.payload?.expenseLabel && item.name === 'Expenses' ? item.payload.expenseLabel : item.payload?.amountLabel ?? item.value ?? 0)}
        </p>
      ))}
    </div>
  );
}

export function IncomeExpenseChart({ months }: { months: MonthPoint[] }) {
  const reduced = usePrefersReducedMotion();
  const data = months.map((month) => ({
    label: month.label,
    Income: moneyToNumber(month.income),
    Expenses: moneyToNumber(month.expenses),
    incomeLabel: month.income,
    expenseLabel: month.expenses,
  }));
  if (data.length === 0) return <p className="py-10 text-center text-sm text-muted">No months in this range.</p>;
  return (
    <div className="h-72">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} barGap={4}>
          <CartesianGrid stroke="#E6EAF0" vertical={false} />
          <XAxis dataKey="label" tick={{ fill: '#5C6B7A', fontSize: 12 }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fill: '#5C6B7A', fontSize: 12 }} axisLine={false} tickLine={false} width={56} />
          <Tooltip content={<Tip />} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Bar dataKey="Income" fill="#0B1F3A" radius={[4, 4, 0, 0]} isAnimationActive={!reduced} />
          <Bar dataKey="Expenses" fill="#059669" radius={[4, 4, 0, 0]} isAnimationActive={!reduced} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function SpendingDonut({ slices }: { slices: CategorySlice[] }) {
  const reduced = usePrefersReducedMotion();
  const data = slices.map((slice) => ({ name: slice.name, value: moneyToNumber(slice.amount), color: slice.color, amountLabel: slice.amount }));
  if (data.length === 0) return <p className="py-10 text-center text-sm text-muted">No expenses in this range.</p>;
  return (
    <div className="grid gap-4 md:grid-cols-[220px_1fr] md:items-center">
      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} dataKey="value" nameKey="name" innerRadius={58} outerRadius={82} paddingAngle={2} isAnimationActive={!reduced}>
              {data.map((entry) => (
                <Cell key={entry.name} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip content={<Tip />} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <ul className="space-y-2">
        {slices.map((slice) => (
          <li key={slice.categoryId} className="flex items-center justify-between gap-3 text-sm">
            <span className="flex min-w-0 items-center gap-2">
              <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: slice.color }} />
              <span className="truncate">{slice.name}</span>
            </span>
            <span className="font-semibold">{formatPHP(slice.amount)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function SpendingTrend({ months }: { months: MonthPoint[] }) {
  const reduced = usePrefersReducedMotion();
  const data = months.map((month) => ({ label: month.label, Spending: moneyToNumber(month.expenses), amountLabel: month.expenses }));
  if (data.every((item) => item.Spending === 0)) return <p className="py-10 text-center text-sm text-muted">Spending will appear here after you add expenses.</p>;
  return (
    <div className="h-72">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <CartesianGrid stroke="#E6EAF0" vertical={false} />
          <XAxis dataKey="label" tick={{ fill: '#5C6B7A', fontSize: 12 }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fill: '#5C6B7A', fontSize: 12 }} axisLine={false} tickLine={false} width={56} />
          <Tooltip content={<Tip />} />
          <Line type="monotone" dataKey="Spending" stroke="#0B1F3A" strokeWidth={2} dot={{ r: 3 }} isAnimationActive={!reduced} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function SavingsRateChart({ months }: { months: MonthPoint[] }) {
  const reduced = usePrefersReducedMotion();
  const data = months.map((month) => ({ label: month.label, 'Savings rate': month.savingsRate, amountLabel: month.savingsRate === null ? undefined : String(month.savingsRate) }));
  if (data.every((item) => item['Savings rate'] === null)) return <p className="py-10 text-center text-sm text-muted">A savings rate needs income in the selected months.</p>;
  return (
    <div className="h-72">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <CartesianGrid stroke="#E6EAF0" vertical={false} />
          <XAxis dataKey="label" tick={{ fill: '#5C6B7A', fontSize: 12 }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fill: '#5C6B7A', fontSize: 12 }} axisLine={false} tickLine={false} width={40} unit="%" />
          <Tooltip formatter={(value) => (value === null || value === undefined ? '—' : `${value}%`)} />
          <Line type="monotone" dataKey="Savings rate" stroke="#059669" strokeWidth={2} connectNulls={false} dot={{ r: 3 }} isAnimationActive={!reduced} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
