import type { UserProfile } from '@pesowise/shared';
import { useState, type FormEvent, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { LogoLockup } from '../components/Logo';
import { Button, ErrorNote, Field, TextInput } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { ApiError, api } from '../lib/api';

export function LoginPage() {
  const navigate = useNavigate();
  const { setUser } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [fields, setFields] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    setFields({});
    try {
      const result = await api<{ user: UserProfile }>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
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
    <AuthSplit
      title="See where your pesos go."
      points={['Budgets that warn you before the month gets away', 'Savings goals you update yourself', 'Reports built from your own transactions']}
    >
      <h1 className="text-3xl font-semibold tracking-tight">Sign in</h1>
      <p className="mt-2 text-base text-muted">Use your PesoWise account to continue.</p>
      <form className="mt-6 space-y-4" onSubmit={submit}>
        {error ? <ErrorNote message={error} /> : null}
        <Field label="Email" error={fields.email}>
          <TextInput type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
        </Field>
        <Field label="Password" error={fields.password}>
          <div className="relative">
            <TextInput type={showPassword ? 'text' : 'password'} autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required />
            <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-muted" onClick={() => setShowPassword((value) => !value)}>
              {showPassword ? 'Hide' : 'Show'}
            </button>
          </div>
        </Field>
        <Button type="submit" className="w-full" loading={loading}>
          Sign in
        </Button>
      </form>
      <p className="mt-5 text-base text-muted">
        New here? <Link className="font-semibold text-navy-800" to="/register">Create an account</Link>
      </p>
    </AuthSplit>
  );
}

export function AuthSplit({ title, points, children }: { title: string; points: string[]; children: ReactNode }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-[minmax(0,0.92fr)_minmax(24rem,1fr)]">
      <section className="relative hidden flex-col justify-between overflow-hidden bg-navy-900 px-12 py-12 text-white lg:flex">
        <div className="pointer-events-none absolute -right-16 top-24 h-72 w-72 rounded-full bg-emerald-500/15 blur-3xl" />
        <div className="relative">
          <LogoLockup />
          <h2 className="mt-16 max-w-lg text-4xl font-semibold leading-tight tracking-tight">{title}</h2>
          <ul className="mt-8 space-y-4 text-lg leading-7 text-white/85">
            {points.map((point) => (
              <li key={point} className="flex gap-3">
                <span className="mt-2 h-2.5 w-2.5 shrink-0 rounded-full bg-emerald-400" />
                {point}
              </li>
            ))}
          </ul>
        </div>
        <p className="relative max-w-md text-base leading-7 text-white/65">Built for students and young professionals tracking pesos. Savings amounts are entered by you.</p>
      </section>
      <section className="flex items-center justify-center bg-canvas px-4 py-10">
        <div className="w-full max-w-lg rounded-2xl border border-line bg-white p-7 shadow-card sm:p-9">
          <div className="mb-7 lg:hidden">
            <LogoLockup tone="onLight" />
          </div>
          {children}
        </div>
      </section>
    </div>
  );
}
