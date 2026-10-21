import { formatManilaTimestamp, type UserProfile } from '@pesowise/shared';
import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Card, ErrorNote, Field, PageHeader, TextInput } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { ApiError, api } from '../lib/api';

export function ProfilePage() {
  const { user, setUser } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [name, setName] = useState(user?.name ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [profileError, setProfileError] = useState('');
  const [fields, setFields] = useState<Record<string, string>>({});
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [deletePassword, setDeletePassword] = useState('');
  const [confirmation, setConfirmation] = useState('');

  useEffect(() => {
    if (user) {
      setName(user.name);
      setEmail(user.email);
    }
  }, [user]);

  const saveProfile = async (event: FormEvent) => {
    event.preventDefault();
    setProfileError('');
    setFields({});
    try {
      const result = await api<{ user: UserProfile }>('/api/profile', { method: 'PATCH', body: JSON.stringify({ name, email }) });
      setUser(result.user);
      toast.success('Profile updated.');
    } catch (reason) {
      if (reason instanceof ApiError) {
        setProfileError(reason.message);
        setFields(reason.fields ?? {});
      }
    }
  };

  const savePassword = async (event: FormEvent) => {
    event.preventDefault();
    setFields({});
    try {
      await api('/api/profile/password', { method: 'POST', body: JSON.stringify({ currentPassword, newPassword }) });
      setCurrentPassword('');
      setNewPassword('');
      toast.success('Password updated.');
    } catch (reason) {
      if (reason instanceof ApiError) setFields(reason.fields ?? { form: reason.message });
    }
  };

  const deleteAccount = async (event: FormEvent) => {
    event.preventDefault();
    try {
      await api('/api/profile', { method: 'DELETE', body: JSON.stringify({ password: deletePassword, confirmation }) });
      setUser(null);
      navigate('/login');
    } catch (reason) {
      if (reason instanceof ApiError) setFields(reason.fields ?? { form: reason.message });
    }
  };

  return (
    <div className="space-y-4">
      <PageHeader title="Profile" description={user ? `Member since ${formatManilaTimestamp(user.createdAt)}` : ''} />
      <Card>
        <form className="max-w-md space-y-3" onSubmit={saveProfile}>
          {profileError ? <ErrorNote message={profileError} /> : null}
          <Field label="Name" error={fields.name}><TextInput value={name} onChange={(event) => setName(event.target.value)} /></Field>
          <Field label="Email" error={fields.email}><TextInput type="email" value={email} onChange={(event) => setEmail(event.target.value)} /></Field>
          <Button type="submit">Save profile</Button>
        </form>
      </Card>
      <Card>
        <h2 className="text-sm font-semibold">Change password</h2>
        <form className="mt-3 max-w-md space-y-3" onSubmit={savePassword}>
          {fields.form ? <ErrorNote message={fields.form} /> : null}
          <Field label="Current password" error={fields.currentPassword}><TextInput type="password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} autoComplete="current-password" /></Field>
          <Field label="New password" error={fields.newPassword}><TextInput type="password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} autoComplete="new-password" /></Field>
          <Button type="submit">Update password</Button>
        </form>
      </Card>
      <Card>
        <h2 className="text-sm font-semibold text-rose-800">Delete account</h2>
        <p className="mt-1 text-sm text-muted">This permanently removes your transactions, budgets, goals, and categories.</p>
        <form className="mt-3 max-w-md space-y-3" onSubmit={deleteAccount}>
          <Field label="Password" error={fields.password}><TextInput type="password" value={deletePassword} onChange={(event) => setDeletePassword(event.target.value)} /></Field>
          <Field label="Type DELETE to confirm" error={fields.confirmation}><TextInput value={confirmation} onChange={(event) => setConfirmation(event.target.value)} /></Field>
          <Button type="submit" variant="danger">Delete account</Button>
        </form>
      </Card>
    </div>
  );
}
