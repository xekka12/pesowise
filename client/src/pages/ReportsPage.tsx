import { formatPHP, rangeForPreset, type Category, type DatePresetId, type ReportResponse } from '@pesowise/shared';
import { useState } from 'react';
import { IncomeExpenseChart, SavingsRateChart, SpendingDonut } from '../components/Charts';
import { RangeFilter } from '../components/RangeFilter';
import { Button, Card, PageHeader, SelectInput } from '../components/ui';
import { useToast } from '../context/ToastContext';
import { api, downloadCsv, withQuery } from '../lib/api';
import { useApiData } from '../lib/hooks';

const initial = rangeForPreset('this-year');

export function ReportsPage() {
  const toast = useToast();
  const [preset, setPreset] = useState<DatePresetId>('this-year');
  const [from, setFrom] = useState(initial.from);
  const [to, setTo] = useState(initial.to);
  const [categoryId, setCategoryId] = useState('');
  const categories = useApiData(() => api<{ categories: Category[] }>('/api/categories?includeArchived=true'), []);
  const report = useApiData(() => api<ReportResponse>(withQuery('/api/reports', { from, to, categoryId })), [from, to, categoryId]);

  const download = async (view: 'monthly' | 'category') => {
    try {
      await downloadCsv(withQuery('/api/reports/export', { from, to, categoryId, view }), `pesowise-report-${view}.csv`);
    } catch (reason) {
      toast.error(reason instanceof Error ? reason.message : 'Could not export.');
    }
  };

  return (
    <div className="space-y-5">
      <PageHeader title="Reports" description="Monthly totals use the dates inside this range. Spending change compares each visible month with the same window one month earlier. A blank change means the previous window had no spending." action={<div className="flex gap-2"><Button variant="secondary" onClick={() => void download('monthly')}>Monthly CSV</Button><Button variant="secondary" onClick={() => void download('category')}>Category CSV</Button></div>} />
      <RangeFilter preset={preset} from={from} to={to} onChange={(next) => { setPreset(next.preset); setFrom(next.from); setTo(next.to); }} />
      <SelectInput className="max-w-xs" value={categoryId} onChange={(event) => setCategoryId(event.target.value)} aria-label="Filter by category">
        <option value="">All categories</option>
        {(categories.data?.categories ?? []).map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
      </SelectInput>
      {report.error ? <p className="text-sm text-rose-700">{report.error}</p> : null}
      {report.data ? (
        <>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Mini label="Income" value={formatPHP(report.data.summary.income)} />
            <Mini label="Expenses" value={formatPHP(report.data.summary.expenses)} />
            <Mini label="Balance" value={formatPHP(report.data.summary.balance)} />
            <Mini label="Savings rate" value={report.data.summary.savingsRate === null ? '—' : `${report.data.summary.savingsRate.toFixed(1)}%`} />
          </div>
          <Card><h2 className="mb-3 text-sm font-semibold">Income versus expenses</h2><IncomeExpenseChart months={report.data.months} /></Card>
          <div className="grid gap-4 lg:grid-cols-2">
            <Card><h2 className="mb-3 text-sm font-semibold">Spending by category</h2><SpendingDonut slices={report.data.expenseByCategory} /></Card>
            <Card><h2 className="mb-3 text-sm font-semibold">Savings rate trend</h2><SavingsRateChart months={report.data.months} /></Card>
          </div>
          <Card>
            <h2 className="mb-3 text-sm font-semibold">Highest-spending categories</h2>
            {report.data.expenseByCategory.length === 0 ? <p className="text-sm text-muted">No expenses in this range.</p> : (
              <ol className="space-y-2">
                {report.data.expenseByCategory.slice(0, 5).map((category, index) => (
                  <li key={category.categoryId} className="flex items-center justify-between text-sm">
                    <span>{index + 1}. {category.name}</span>
                    <span className="font-semibold">{formatPHP(category.amount)}</span>
                  </li>
                ))}
              </ol>
            )}
          </Card>
          <Card>
            <h2 className="mb-3 text-sm font-semibold">Month-over-month spending</h2>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-left text-sm">
                <caption className="sr-only">Monthly report</caption>
                <thead className="text-xs uppercase tracking-wide text-muted">
                  <tr>
                    <th className="py-2 font-medium">Month</th>
                    <th className="py-2 font-medium">Income</th>
                    <th className="py-2 font-medium">Expenses</th>
                    <th className="py-2 font-medium">Balance</th>
                    <th className="py-2 font-medium">Savings rate</th>
                    <th className="py-2 font-medium">Spending change</th>
                  </tr>
                </thead>
                <tbody>
                  {report.data.months.map((month) => (
                    <tr key={month.month} className="border-t border-line">
                      <td className="py-2">{month.label}{month.partial ? ' (partial)' : ''}</td>
                      <td className="py-2">{formatPHP(month.income)}</td>
                      <td className="py-2">{formatPHP(month.expenses)}</td>
                      <td className="py-2">{formatPHP(month.balance)}</td>
                      <td className="py-2">{month.savingsRate === null ? '—' : `${month.savingsRate.toFixed(1)}%`}</td>
                      <td className="py-2">{month.spendingChange === null ? '—' : `${month.spendingChange > 0 ? '+' : ''}${month.spendingChange.toFixed(1)}%`}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      ) : null}
    </div>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return <article className="rounded-xl border border-line bg-white p-4 shadow-card"><p className="text-sm text-muted">{label}</p><p className="mt-1 text-xl font-semibold">{value}</p></article>;
}
