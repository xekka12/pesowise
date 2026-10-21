import { formatPHP, manilaToday, normalizeMoney, parseISODate, type Budget, type Category } from '@pesowise/shared';
import { useState, type FormEvent } from 'react';
import { Badge, Button, EmptyState, Field, Modal, PageHeader, ProgressBar, SelectInput, TextInput } from '../components/ui';
import { useConfirm } from '../context/ConfirmContext';
import { useToast } from '../context/ToastContext';
import { ApiError, api, withQuery } from '../lib/api';
import { useApiData } from '../lib/hooks';

export function BudgetsPage() {
  const today = parseISODate(manilaToday());
  const toast = useToast();
  const confirm = useConfirm();
  const [month, setMonth] = useState(today.month);
  const [year, setYear] = useState(today.year);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Budget | null>(null);
  const [fields, setFields] = useState<Record<string, string>>({});
  const [form, setForm] = useState({ name: '', categoryId: '', limit: '', month: today.month, year: today.year });
  const categories = useApiData(() => api<{ categories: Category[] }>('/api/categories'), []);
  const budgets = useApiData(() => api<{ budgets: Budget[] }>(withQuery('/api/budgets', { month, year })), [month, year], 'pesowise:refresh');
  const expenseCategories = (categories.data?.categories ?? []).filter((category) => category.type === 'EXPENSE' && !category.archived);

  const openCreate = () => {
    setEditing(null);
    setFields({});
    setForm({ name: '', categoryId: expenseCategories[0]?.id ?? '', limit: '', month, year });
    setOpen(true);
  };

  const save = async (event: FormEvent) => {
    event.preventDefault();
    const next: Record<string, string> = {};
    if (!form.name.trim()) next.name = 'Enter a budget name.';
    if (!form.categoryId) next.categoryId = 'Choose a category.';
    if (!normalizeMoney(form.limit)) next.limit = 'Enter an amount greater than 0 with up to 2 decimal places.';
    setFields(next);
    if (Object.keys(next).length) return;
    try {
      await api(editing ? `/api/budgets/${editing.id}` : '/api/budgets', {
        method: editing ? 'PATCH' : 'POST',
        body: JSON.stringify(form),
      });
      toast.success(editing ? 'Budget updated.' : 'Budget created.');
      setOpen(false);
      budgets.reload();
    } catch (reason) {
      toast.error(reason instanceof Error ? reason.message : 'Could not save the budget.');
      if (reason instanceof ApiError) setFields(reason.fields ?? {});
    }
  };

  const remove = async (budget: Budget) => {
    const ok = await confirm({ title: 'Delete budget?', message: 'Transactions stay in your history. Only this monthly limit is removed.', confirmLabel: 'Delete', tone: 'danger' });
    if (!ok) return;
    await api(`/api/budgets/${budget.id}`, { method: 'DELETE' });
    toast.success('Budget deleted.');
    budgets.reload();
  };

  return (
    <div>
      <PageHeader title="Budgets" description="One budget per expense category each month. Spending comes from expense transactions in that month." action={<Button onClick={openCreate}>New budget</Button>} />
      <div className="mb-4 flex flex-wrap gap-3">
        <label className="text-sm text-muted">Month
          <SelectInput className="mt-1" value={month} onChange={(event) => setMonth(Number(event.target.value))} aria-label="Budget month">
            {Array.from({ length: 12 }, (_, index) => <option key={index + 1} value={index + 1}>{index + 1}</option>)}
          </SelectInput>
        </label>
        <label className="text-sm text-muted">Year
          <TextInput className="mt-1" type="number" value={year} onChange={(event) => setYear(Number(event.target.value))} aria-label="Budget year" />
        </label>
      </div>
      {budgets.data && budgets.data.budgets.length === 0 ? <EmptyState title="No budgets for this month" message="Create a limit for food, transport, or another expense category." action={<Button onClick={openCreate}>New budget</Button>} /> : null}
      <div className="grid gap-3 lg:grid-cols-2">
        {budgets.data?.budgets.map((budget) => (
          <article key={budget.id} className="rounded-xl border border-line bg-white p-4 shadow-card">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="font-semibold">{budget.name}</h2>
                <p className="text-sm text-muted">{budget.category.name} · warning at {budget.threshold}%</p>
              </div>
              <Badge tone={budget.status === 'exceeded' ? 'bad' : budget.status === 'warning' ? 'warn' : 'good'}>{budget.status}</Badge>
            </div>
            <div className="mt-3"><ProgressBar percent={budget.percent} status={budget.status} /></div>
            <dl className="mt-3 grid grid-cols-3 gap-2 text-sm">
              <div><dt className="text-muted">Budget</dt><dd className="font-semibold">{formatPHP(budget.limit)}</dd></div>
              <div><dt className="text-muted">Spent</dt><dd className="font-semibold">{formatPHP(budget.spent)}</dd></div>
              <div><dt className="text-muted">Remaining</dt><dd className="font-semibold">{formatPHP(budget.remaining)}</dd></div>
            </dl>
            <p className="mt-2 text-xs text-muted">{budget.percent.toFixed(1)}% used</p>
            <div className="mt-3 flex gap-2">
              <Button variant="secondary" onClick={() => { setEditing(budget); setForm({ name: budget.name, categoryId: budget.category.id, limit: budget.limit, month: budget.month, year: budget.year }); setFields({}); setOpen(true); }}>Edit</Button>
              <Button variant="ghost" onClick={() => void remove(budget)}>Delete</Button>
            </div>
          </article>
        ))}
      </div>
      {open ? (
        <Modal title={editing ? 'Edit budget' : 'New budget'} onClose={() => setOpen(false)}>
          <form className="grid gap-3 sm:grid-cols-2" onSubmit={save}>
            <Field label="Budget name" error={fields.name}><TextInput value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></Field>
            <Field label="Category" error={fields.categoryId}>
              <SelectInput value={form.categoryId} onChange={(event) => setForm({ ...form, categoryId: event.target.value })}>
                <option value="">Choose</option>
                {expenseCategories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
              </SelectInput>
            </Field>
            <Field label="Monthly limit" error={fields.limit}><TextInput inputMode="decimal" value={form.limit} onChange={(event) => setForm({ ...form, limit: event.target.value })} /></Field>
            <Field label="Month" error={fields.month}>
              <SelectInput value={form.month} onChange={(event) => setForm({ ...form, month: Number(event.target.value) })}>
                {Array.from({ length: 12 }, (_, index) => <option key={index + 1} value={index + 1}>{index + 1}</option>)}
              </SelectInput>
            </Field>
            <Field label="Year" error={fields.year}><TextInput type="number" value={form.year} onChange={(event) => setForm({ ...form, year: Number(event.target.value) })} /></Field>
            <div className="flex justify-end gap-2 sm:col-span-2">
              <Button type="button" variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit">Save</Button>
            </div>
          </form>
        </Modal>
      ) : null}
    </div>
  );
}
