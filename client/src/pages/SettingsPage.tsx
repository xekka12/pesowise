import type { UserProfile } from '@pesowise/shared';
import { useEffect, useState, type FormEvent } from 'react';
import { Button, Card, Field, PageHeader, TextInput } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { ApiError, api } from '../lib/api';

export function SettingsPage() {
  const { user, setUser } = useAuth();
  const toast = useToast();
  const [threshold, setThreshold] = useState(user?.warningThreshold ?? 80);
  const [error, setError] = useState('');

  useEffect(() => {
    if (user) setThreshold(user.warningThreshold);
  }, [user]);

  const save = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    try {
      const result = await api<{ user: UserProfile }>('/api/profile', { method: 'PATCH', body: JSON.stringify({ warningThreshold: Number(threshold) }) });
      setUser(result.user);
      toast.success('Settings saved.');
    } catch (reason) {
      const message = reason instanceof ApiError ? reason.fields?.warningThreshold ?? reason.message : 'Could not save settings.';
      setError(message);
    }
  };

  return (
    <div className="space-y-4">
      <PageHeader title="Settings" description="PesoWise uses Philippine pesos and Asia/Manila for dates. In-app notifications are on. Browser push notifications are not part of this version." />
      <Card>
        <form className="max-w-md space-y-3" onSubmit={save}>
          <Field label="Budget warning threshold (%)" error={error} hint="A budget shows a warning once spending reaches this percentage. The default is 80.">
            <TextInput type="number" min={50} max={95} value={threshold} onChange={(event) => setThreshold(Number(event.target.value))} />
          </Field>
          <Button type="submit">Save threshold</Button>
        </form>
      </Card>
      <Card>
        <h2 className="text-sm font-semibold">Currency and timezone</h2>
        <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
          <div><dt className="text-muted">Currency</dt><dd>Philippine peso (PHP)</dd></div>
          <div><dt className="text-muted">Timezone</dt><dd>Asia/Manila</dd></div>
        </dl>
      </Card>
      <Card>
        <h2 className="text-sm font-semibold">Recurring transactions</h2>
        <p className="mt-2 text-sm leading-6 text-muted">The server processes due rules about every 15 minutes and when you open the app. A unique occurrence key prevents duplicates if processing runs twice. Pausing a rule skips dates that pass while it is paused. If the server was offline, active rules catch up the next time they run.</p>
      </Card>
    </div>
  );
}
