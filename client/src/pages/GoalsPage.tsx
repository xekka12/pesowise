import { formatLongDate, formatPHP, normalizeMoney, type SavingsGoal } from '@pesowise/shared';
import { useState, type FormEvent } from 'react';
import { Badge, Button, EmptyState, Field, Modal, PageHeader, ProgressBar, TextArea, TextInput } from '../components/ui';
import { useConfirm } from '../context/ConfirmContext';
import { useToast } from '../context/ToastContext';
import { ApiError, api, withQuery } from '../lib/api';
import { useApiData } from '../lib/hooks';

export function GoalsPage() {
  const toast = useToast();
  const confirm = useConfirm();
  const [includeArchived, setIncludeArchived] = useState(false);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<SavingsGoal | null>(null);
  const [fields, setFields] = useState<Record<string, string>>({});
  const [form, setForm] = useState({ name: '', targetAmount: '', savedAmount: '0', targetDate: '', description: '' });
  const goals = useApiData(() => api<{ goals: SavingsGoal[] }>(withQuery('/api/goals', { includeArchived: includeArchived ? 'true' : undefined })), [includeArchived]);

  const save = async (event: FormEvent) => {
    event.preventDefault();
    const next: Record<string, string> = {};
    if (!form.name.trim()) next.name = 'Enter a goal name.';
    if (!normalizeMoney(form.targetAmount)) next.targetAmount = 'Enter a target greater than 0.';
    if (!normalizeMoney(form.savedAmount || '0', { allowZero: true })) next.savedAmount = 'Enter 0 or more.';
    setFields(next);
    if (Object.keys(next).length) return;
    try {
      await api(editing ? `/api/goals/${editing.id}` : '/api/goals', {
        method: editing ? 'PATCH' : 'POST',
        body: JSON.stringify({ ...form, savedAmount: form.savedAmount || '0', targetDate: form.targetDate || null, description: form.description || null }),
      });
      toast.success(editing ? 'Goal updated.' : 'Goal created.');
      setOpen(false);
      goals.reload();
    } catch (reason) {
      toast.error(reason instanceof Error ? reason.message : 'Could not save the goal.');
      if (reason instanceof ApiError) setFields(reason.fields ?? {});
    }
  };

  const updateSaved = async (goal: SavingsGoal, savedAmount: string) => {
    try {
      await api(`/api/goals/${goal.id}/saved`, { method: 'PATCH', body: JSON.stringify({ savedAmount }) });
      toast.success('Saved amount updated.');
      goals.reload();
    } catch (reason) {
      toast.error(reason instanceof Error ? reason.message : 'Could not update the saved amount.');
    }
  };

  const archive = async (goal: SavingsGoal) => {
    const ok = await confirm({ title: goal.archived ? 'Restore goal?' : 'Archive goal?', message: 'Archived goals stay in your account and leave the active list.', confirmLabel: goal.archived ? 'Restore' : 'Archive' });
    if (!ok) return;
    await api(`/api/goals/${goal.id}/${goal.archived ? 'restore' : 'archive'}`, { method: 'POST' });
    goals.reload();
  };

  return (
    <div>
      <PageHeader
        title="Savings goals"
        description="Track a target you are saving toward. Update the saved amount yourself. PesoWise does not connect to a bank and does not move money."
        action={<Button onClick={() => { setEditing(null); setForm({ name: '', targetAmount: '', savedAmount: '0', targetDate: '', description: '' }); setFields({}); setOpen(true); }}>New goal</Button>}
      />
      <label className="mb-4 flex items-center gap-2 text-sm">
        <input type="checkbox" checked={includeArchived} onChange={(event) => setIncludeArchived(event.target.checked)} />
        Show archived goals
      </label>
      {goals.data && goals.data.goals.length === 0 ? <EmptyState title="No savings goals yet" message="Examples: emergency fund, a laptop, tuition, or travel." /> : null}
      <div className="grid gap-3 lg:grid-cols-2">
        {goals.data?.goals.map((goal) => (
          <article key={goal.id} className="rounded-xl border border-line bg-white p-4 shadow-card">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h2 className="font-semibold">{goal.name}</h2>
                <p className="text-sm text-muted">{goal.targetDate ? `Target ${formatLongDate(goal.targetDate)}` : 'No target date'}{goal.archived ? ' · Archived' : ''}</p>
              </div>
              {goal.completed ? <Badge tone="good">Completed</Badge> : <Badge>{goal.percent.toFixed(1)}%</Badge>}
            </div>
            <div className="mt-3"><ProgressBar percent={goal.percent} /></div>
            <p className="mt-2 text-sm">{formatPHP(goal.savedAmount)} saved · {formatPHP(goal.remaining)} remaining of {formatPHP(goal.targetAmount)}</p>
            {goal.description ? <p className="mt-2 text-sm text-muted">{goal.description}</p> : null}
            <SavedEditor goal={goal} onSave={updateSaved} />
            <div className="mt-3 flex gap-2">
              <Button variant="secondary" onClick={() => { setEditing(goal); setForm({ name: goal.name, targetAmount: goal.targetAmount, savedAmount: goal.savedAmount, targetDate: goal.targetDate ?? '', description: goal.description ?? '' }); setOpen(true); }}>Edit</Button>
              <Button variant="ghost" onClick={() => void archive(goal)}>{goal.archived ? 'Restore' : 'Archive'}</Button>
            </div>
          </article>
        ))}
      </div>
      {open ? (
        <Modal title={editing ? 'Edit goal' : 'New goal'} onClose={() => setOpen(false)}>
          <form className="grid gap-3" onSubmit={save}>
            <Field label="Goal name" error={fields.name}><TextInput value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></Field>
            <Field label="Target amount" error={fields.targetAmount}><TextInput inputMode="decimal" value={form.targetAmount} onChange={(event) => setForm({ ...form, targetAmount: event.target.value })} /></Field>
            <Field label="Current saved amount" error={fields.savedAmount} hint="Cannot be greater than the target."><TextInput inputMode="decimal" value={form.savedAmount} onChange={(event) => setForm({ ...form, savedAmount: event.target.value })} /></Field>
            <Field label="Target date" error={fields.targetDate}><TextInput type="date" value={form.targetDate} onChange={(event) => setForm({ ...form, targetDate: event.target.value })} /></Field>
            <Field label="Description" error={fields.description}><TextArea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} /></Field>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit">Save</Button>
            </div>
          </form>
        </Modal>
      ) : null}
    </div>
  );
}

function SavedEditor({ goal, onSave }: { goal: SavingsGoal; onSave: (goal: SavingsGoal, amount: string) => Promise<void> }) {
  const [amount, setAmount] = useState(goal.savedAmount);
  return (
    <form className="mt-3 flex gap-2" onSubmit={(event) => { event.preventDefault(); void onSave(goal, amount); }}>
      <TextInput aria-label={`Saved amount for ${goal.name}`} inputMode="decimal" value={amount} onChange={(event) => setAmount(event.target.value)} />
      <Button type="submit" variant="secondary">Update saved</Button>
    </form>
  );
}
