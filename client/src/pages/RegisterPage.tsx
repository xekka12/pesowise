import type { UserProfile } from '@pesowise/shared';
import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthSplit } from './LoginPage';
import { Button, ErrorNote, Field, TextInput } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { ApiError, api } from '../lib/api';

export function RegisterPage() {
  const navigate = useNavigate();
  const { setUser } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [fields, setFields] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    setFields({});
    try {
      const result = await api<{ user: UserProfile }>('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({ name, email, password }),
      });
      setUser(result.user);
      navigate('/');
    } catch (reason) {
      if (reason instanceof ApiError) {
        setError(reason.message);
        setFields(reason.fields ?? {});
      } else setError('Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthSplit title="Start with a clear picture of this month." points={['Income and expense categories are ready on day one', 'Budgets warn you as spending approaches the limit', 'Nothing here is connected to your bank']}>
      <h1 className="text-3xl font-semibold tracking-tight">Create your account</h1>
      <p className="mt-2 text-base text-muted">Use at least 8 characters, including a letter and a number.</p>
      <form className="mt-6 space-y-4" onSubmit={submit}>
        {error ? <ErrorNote message={error} /> : null}
        <Field label="Name" error={fields.name}>
          <TextInput value={name} onChange={(event) => setName(event.target.value)} autoComplete="name" required />
        </Field>
        <Field label="Email" error={fields.email}>
          <TextInput type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" required />
        </Field>
        <Field label="Password" error={fields.password}>
          <TextInput type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="new-password" required />
        </Field>
        <Button type="submit" className="w-full" loading={loading}>
          Create account
        </Button>
      </form>
      <p className="mt-5 text-base text-muted">
        Already registered? <Link className="font-semibold text-navy-800" to="/login">Sign in</Link>
      </p>
    </AuthSplit>
  );
}
