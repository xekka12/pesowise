import {
  FREQUENCY_OPTIONS,
  PAYMENT_METHODS,
  formatLongDate,
  formatPHP,
  frequencyLabel,
  manilaToday,
  normalizeMoney,
  paymentLabel,
  type Category,
  type Frequency,
  type PaymentMethod,
  type RecurringRule,
  type TransactionType,
} from '@pesowise/shared';
import { useState, type FormEvent } from 'react';
import { Badge, Button, EmptyState, Field, Modal, PageHeader, SelectInput, TextArea, TextInput } from '../components/ui';
import { useConfirm } from '../context/ConfirmContext';
import { useToast } from '../context/ToastContext';
import { ApiError, api } from '../lib/api';
import { useApiData } from '../lib/hooks';

export function RecurringPage() {
  const toast = useToast();
  const confirm = useConfirm();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<RecurringRule | null>(null);
  const [fields, setFields] = useState<Record<string, string>>({});
  const [form, setForm] = useState(blank());
  const rules = useApiData(() => api<{ recurring: RecurringRule[] }>('/api/recurring'), [], 'pesowise:refresh');
  const categories = useApiData(() => api<{ categories: Category[] }>('/api/categories'), []);

  const save = async (event: FormEvent) => {
    event.preventDefault();
    const next: Record<string, string> = {};
    if (!form.description.trim()) next.description = 'Enter a description.';
    if (!normalizeMoney(form.amount)) next.amount = 'Enter an amount greater than 0 with up to 2 decimal places.';
    if (!form.categoryId) next.categoryId = 'Choose a category.';
    setFields(next);
    if (Object.keys(next).length) return;
    const payload = editing
      ? { description: form.description, amount: form.amount, type: form.type, categoryId: form.categoryId, endDate: form.endDate || null, paymentMethod: form.paymentMethod, notes: form.notes || null }
      : { ...form, endDate: form.endDate || null, notes: form.notes || null };
    try {
      await api(editing ? `/api/recurring/${editing.id}` : '/api/recurring', { method: editing ? 'PATCH' : 'POST', body: JSON.stringify(payload) });
      toast.success(editing ? 'Recurring transaction updated.' : 'Recurring transaction created.');
      setOpen(false);
      rules.reload();
    } catch (reason) {
      toast.error(reason instanceof Error ? reason.message : 'Could not save.');
      if (reason instanceof ApiError) setFields(reason.fields ?? {});
    }
  };

  const processNow = async () => {
    const result = await api<{ created: number }>('/api/recurring/process', { method: 'POST' });
    toast.info(result.created > 0 ? `${result.created} transaction${result.created === 1 ? '' : 's'} added.` : 'No recurring transactions were due.');
    if (result.created > 0) window.dispatchEvent(new Event('pesowise:refresh'));
    rules.reload();
  };

  const remove = async (rule: RecurringRule) => {
    const ok = await confirm({ title: 'Delete recurring transaction?', message: 'Transactions already generated stay in your history.', confirmLabel: 'Delete', tone: 'danger' });
    if (!ok) return;
    await api(`/api/recurring/${rule.id}`, { method: 'DELETE' });
    toast.success('Recurring transaction deleted.');
    rules.reload();
  };

  return (
    <div>
      <PageHeader
        title="Recurring transactions"
        description="Active rules are processed when the app loads and every 15 minutes on the server. Each occurrence is stored once. Pausing skips missed dates; downtime backfills dates that were still due."
        action={<div className="flex gap-2"><Button variant="secondary" onClick={() => void processNow()}>Process due</Button><Button onClick={() => { setEditing(null); setForm(blank()); setOpen(true); }}>New rule</Button></div>}
      />
      {rules.data && rules.data.recurring.length === 0 ? <EmptyState title="No recurring transactions" message="Add salary, allowance, rent, or a subscription." /> : null}
      <div className="grid gap-3">
        {rules.data?.recurring.map((rule) => (
          <article key={rule.id} className="rounded-xl border border-line bg-white p-4 shadow-card">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="font-semibold">{rule.description}</h2>
                <p className="text-sm text-muted">{frequencyLabel(rule.frequency)} · {rule.category.name} · {paymentLabel(rule.paymentMethod)}</p>
                <p className="mt-1 text-sm">{formatPHP(rule.amount)} · {rule.type === 'INCOME' ? 'Income' : 'Expense'}</p>
                <p className="mt-1 text-xs text-muted">Starts {formatLongDate(rule.startDate)}{rule.endDate ? ` · ends ${formatLongDate(rule.endDate)}` : ''} · next {rule.nextOccurrence ? formatLongDate(rule.nextOccurrence) : 'none'}</p>
              </div>
              <Badge tone={rule.status === 'ACTIVE' ? 'good' : 'neutral'}>{rule.status === 'ACTIVE' ? 'Active' : 'Paused'}</Badge>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button variant="secondary" onClick={() => { setEditing(rule); setForm({ description: rule.description, amount: rule.amount, type: rule.type, categoryId: rule.category.id, frequency: rule.frequency, startDate: rule.startDate, endDate: rule.endDate ?? '', paymentMethod: rule.paymentMethod, notes: rule.notes ?? '' }); setOpen(true); }}>Edit</Button>
              <Button variant="secondary" onClick={() => void api(`/api/recurring/${rule.id}/${rule.status === 'ACTIVE' ? 'pause' : 'resume'}`, { method: 'POST' }).then(() => rules.reload())}>{rule.status === 'ACTIVE' ? 'Pause' : 'Resume'}</Button>
              <Button variant="ghost" onClick={() => void remove(rule)}>Delete</Button>
            </div>
          </article>
        ))}
      </div>
      {open ? (
        <Modal title={editing ? 'Edit recurring transaction' : 'New recurring transaction'} onClose={() => setOpen(false)}>
          <form className="grid gap-3 sm:grid-cols-2" onSubmit={save}>
            <Field label="Description" error={fields.description}><TextInput value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} /></Field>
            <Field label="Amount" error={fields.amount}><TextInput inputMode="decimal" value={form.amount} onChange={(event) => setForm({ ...form, amount: event.target.value })} /></Field>
            <Field label="Type">
              <SelectInput value={form.type} disabled={Boolean(editing)} onChange={(event) => setForm({ ...form, type: event.target.value as TransactionType, categoryId: '' })}>
                <option value="EXPENSE">Expense</option>
                <option value="INCOME">Income</option>
              </SelectInput>
            </Field>
            <Field label="Category" error={fields.categoryId}>
              <SelectInput value={form.categoryId} onChange={(event) => setForm({ ...form, categoryId: event.target.value })}>
                <option value="">Choose</option>
                {(categories.data?.categories ?? []).filter((category) => category.type === form.type && !category.archived).map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
              </SelectInput>
            </Field>
            <Field label="Frequency" hint={editing ? 'Frequency stays fixed so past occurrences are not duplicated.' : undefined}>
              <SelectInput value={form.frequency} disabled={Boolean(editing)} onChange={(event) => setForm({ ...form, frequency: event.target.value as Frequency })}>
                {FREQUENCY_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </SelectInput>
            </Field>
            <Field label="Start date" hint={editing ? 'Start date stays fixed.' : undefined}>
              <TextInput type="date" value={form.startDate} disabled={Boolean(editing)} onChange={(event) => setForm({ ...form, startDate: event.target.value })} />
            </Field>
            <Field label="End date"><TextInput type="date" value={form.endDate} onChange={(event) => setForm({ ...form, endDate: event.target.value })} /></Field>
            <Field label="Payment method">
              <SelectInput value={form.paymentMethod} onChange={(event) => setForm({ ...form, paymentMethod: event.target.value as PaymentMethod })}>
                {PAYMENT_METHODS.map((method) => <option key={method.value} value={method.value}>{method.label}</option>)}
              </SelectInput>
            </Field>
            <div className="sm:col-span-2"><Field label="Notes"><TextArea value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} /></Field></div>
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

function blank() {
  return { description: '', amount: '', type: 'EXPENSE' as TransactionType, categoryId: '', frequency: 'MONTHLY' as Frequency, startDate: manilaToday(), endDate: '', paymentMethod: 'CASH' as PaymentMethod, notes: '' };
}
