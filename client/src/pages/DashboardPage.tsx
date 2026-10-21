import { formatPHP, rangeForPreset, type DashboardResponse, type DatePresetId } from '@pesowise/shared';
import { ArrowDownRight, ArrowUpRight, PiggyBank, Scale } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { IncomeExpenseChart, SpendingDonut, SpendingTrend } from '../components/Charts';
import { CategoryIcon } from '../components/icons';
import { RangeFilter } from '../components/RangeFilter';
import { Badge, Card, EmptyState, MoneyText, ProgressBar, Skeleton } from '../components/ui';
import { api, withQuery } from '../lib/api';
import { useApiData } from '../lib/hooks';

const initial = rangeForPreset('this-month');

export function DashboardPage() {
  const [preset, setPreset] = useState<DatePresetId>('this-month');
  const [from, setFrom] = useState(initial.from);
  const [to, setTo] = useState(initial.to);
  const invalid = from > to;
  const { data, error, loading } = useApiData(
    () => api<DashboardResponse>(withQuery('/api/dashboard', { from, to })),
    [from, to],
    'pesowise:refresh',
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Overview</h1>
          <p className="mt-1.5 text-base text-muted">Totals follow the selected dates. They describe your recorded transactions, not a bank balance.</p>
        </div>
        <Link to="/transactions" className="rounded-lg bg-navy-900 px-4 py-2.5 text-base font-semibold text-white hover:bg-navy-800">
          Add or review transactions
        </Link>
      </div>
      <RangeFilter
        preset={preset}
        from={from}
        to={to}
        onChange={(next) => {
          setPreset(next.preset);
          setFrom(next.from);
          setTo(next.to);
        }}
      />
      {invalid ? <p className="text-sm text-rose-700">The start date must be on or before the end date.</p> : null}
      {error ? <p className="text-sm text-rose-700">{error}</p> : null}
      {loading && !data ? <DashboardSkeleton /> : null}
      {data && !invalid ? <DashboardBody data={data} /> : null}
    </div>
  );
}

function DashboardBody({ data }: { data: DashboardResponse }) {
  const rate = data.summary.savingsRate;
  return (
    <>
      {!data.hasAnyTransactions ? (
        <EmptyState title="No transactions yet" message="Add income and expenses to fill this overview. Demo data is available from the sign-in page if you want a populated account." />
      ) : null}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Summary label="Total income" value={formatPHP(data.summary.income)} icon={<ArrowUpRight className="h-4 w-4" />} hint="Recorded income in this range" />
        <Summary label="Total expenses" value={formatPHP(data.summary.expenses)} icon={<ArrowDownRight className="h-4 w-4" />} hint="Recorded expenses in this range" />
        <Summary label="Remaining balance" value={formatPHP(data.summary.balance)} icon={<Scale className="h-4 w-4" />} hint="Income minus expenses for this range" />
        <Summary label="Savings rate" value={rate === null ? '—' : `${rate.toFixed(1)}%`} icon={<PiggyBank className="h-4 w-4" />} hint={rate === null ? 'Add income to calculate a savings rate' : 'Share of income kept after expenses'} />
      </div>
      <div className="grid gap-4 xl:grid-cols-5">
        <Card className="xl:col-span-3">
          <h2 className="mb-3 text-base font-semibold">Income versus expenses</h2>
          <IncomeExpenseChart months={data.months} />
        </Card>
        <Card className="xl:col-span-2">
          <h2 className="mb-3 text-base font-semibold">Spending breakdown</h2>
          <SpendingDonut slices={data.expenseByCategory} />
        </Card>
      </div>
      <Card>
        <h2 className="mb-3 text-base font-semibold">Monthly spending trend</h2>
        <SpendingTrend months={data.months} />
      </Card>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold">Budget progress</h2>
            <Link to="/budgets" className="text-sm font-semibold text-navy-800">Manage</Link>
          </div>
          {data.budgets.length === 0 ? <p className="text-sm text-muted">No budgets overlap this range.</p> : (
            <ul className="space-y-4">
              {data.budgets.map((budget) => (
                <li key={budget.id}>
                  <div className="mb-1 flex items-center justify-between gap-2 text-sm">
                    <span className="font-medium">{budget.name}</span>
                    <Badge tone={budget.status === 'exceeded' ? 'bad' : budget.status === 'warning' ? 'warn' : 'good'}>{budget.status}</Badge>
                  </div>
                  <ProgressBar percent={budget.percent} status={budget.status} />
                  <p className="mt-1 text-xs text-muted">{formatPHP(budget.spent)} of {formatPHP(budget.limit)} · {budget.percent.toFixed(1)}%</p>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold">Savings goals</h2>
            <Link to="/goals" className="text-sm font-semibold text-navy-800">Manage</Link>
          </div>
          <p className="mb-3 text-xs text-muted">These amounts are updated manually.</p>
          {data.goals.length === 0 ? <p className="text-sm text-muted">Create a goal to track a target amount.</p> : (
            <ul className="space-y-3">
              {data.goals.slice(0, 4).map((goal) => (
                <li key={goal.id} className="rounded-lg border border-line px-3 py-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium">{goal.name}</span>
                    {goal.completed ? <Badge tone="good">Completed</Badge> : <span className="text-xs text-muted">{goal.percent.toFixed(1)}%</span>}
                  </div>
                  <ProgressBar percent={goal.percent} status={goal.completed ? 'normal' : 'normal'} />
                  <p className="mt-1 text-xs text-muted">{formatPHP(goal.savedAmount)} saved of {formatPHP(goal.targetAmount)}</p>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
      <Card>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold">Recent transactions</h2>
          <Link to="/transactions" className="text-sm font-semibold text-navy-800">View all</Link>
        </div>
        {data.recent.length === 0 ? <p className="text-sm text-muted">No transactions in this range.</p> : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <caption className="sr-only">Recent transactions</caption>
              <thead className="text-xs uppercase tracking-wide text-muted">
                <tr>
                  <th className="py-2 font-medium">Description</th>
                  <th className="py-2 font-medium">Category</th>
                  <th className="py-2 font-medium">Date</th>
                  <th className="py-2 font-medium">Type</th>
                  <th className="py-2 text-right font-medium">Amount</th>
                </tr>
              </thead>
              <tbody>
                {data.recent.map((transaction) => (
                  <tr key={transaction.id} className="border-t border-line">
                    <td className="py-2.5">{transaction.description}</td>
                    <td className="py-2.5">
                      <span className="inline-flex items-center gap-2">
                        <CategoryIcon name={transaction.category.icon} className="h-4 w-4" />
                        {transaction.category.name}
                      </span>
                    </td>
                    <td className="py-2.5 text-muted">{transaction.date}</td>
                    <td className="py-2.5"><Badge tone={transaction.type === 'INCOME' ? 'good' : 'neutral'}>{transaction.type === 'INCOME' ? 'Income' : 'Expense'}</Badge></td>
                    <td className="py-2.5 text-right font-semibold"><MoneyText value={transaction.amount} tone={transaction.type === 'INCOME' ? 'income' : 'expense'} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </>
  );
}

function Summary({ label, value, hint, icon }: { label: string; value: string; hint: string; icon: ReactNode }) {
  return (
    <article className="rounded-xl border border-line bg-white p-4 shadow-card">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-base text-muted">{label}</p>
          <p className="mt-1 text-[1.85rem] font-semibold tracking-tight">{value}</p>
          <p className="mt-1 text-sm text-muted">{hint}</p>
        </div>
        <span className="rounded-lg bg-navy-50 p-2 text-navy-800">{icon}</span>
      </div>
    </article>
  );
}

function DashboardSkeleton() {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {Array.from({ length: 4 }, (_, index) => <Skeleton key={index} className="h-28" />)}
    </div>
  );
}
