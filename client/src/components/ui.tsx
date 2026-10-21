import { formatPHP } from '@pesowise/shared';
import { LoaderCircle, X } from 'lucide-react';
import { useEffect, useId, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react';

export const fieldClass =
  'w-full rounded-lg border border-line bg-white px-3.5 py-2.5 text-base text-ink shadow-sm outline-none transition placeholder:text-slate-400 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20';

export function Button({
  variant = 'primary',
  loading = false,
  className = '',
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'ghost' | 'danger'; loading?: boolean }) {
  const styles = {
    primary: 'bg-navy-900 text-white hover:bg-navy-800',
    secondary: 'border border-line bg-white text-ink hover:bg-navy-50',
    ghost: 'text-ink hover:bg-navy-50',
    danger: 'bg-rose-700 text-white hover:bg-rose-800',
  }[variant];
  return (
    <button
      {...props}
      disabled={props.disabled || loading}
      className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-base font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${styles} ${className}`}
    >
      {loading ? <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
      {children}
    </button>
  );
}

export function Field({ label, error, children, hint }: { label: string; error?: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-base font-medium text-ink">{label}</span>
      {children}
      {hint ? <span className="mt-1 block text-sm text-muted">{hint}</span> : null}
      {error ? <span className="mt-1 block text-sm text-rose-700">{error}</span> : null}
    </label>
  );
}

export function TextInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`${fieldClass} ${props.className ?? ''}`} />;
}

export function SelectInput(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={`${fieldClass} ${props.className ?? ''}`} />;
}

export function TextArea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={`${fieldClass} min-h-24 ${props.className ?? ''}`} />;
}

export function Modal({ title, children, onClose }: { title: string; children: ReactNode; onClose: () => void }) {
  const titleId = useId();
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-navy-950/40 p-3 sm:items-center" role="presentation" onMouseDown={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-xl border border-line bg-white p-5 shadow-card"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <h2 id={titleId} className="text-xl font-semibold text-ink">
            {title}
          </h2>
          <button type="button" className="rounded-md p-1 text-muted hover:bg-navy-50 hover:text-ink" onClick={onClose} aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function EmptyState({ title, message, action }: { title: string; message: string; action?: ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed border-line bg-white px-6 py-10 text-center">
      <h3 className="text-lg font-semibold text-ink">{title}</h3>
      <p className="mx-auto mt-1 max-w-md text-base leading-7 text-muted">{message}</p>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

export function ErrorNote({ message }: { message: string }) {
  return (
    <div role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2.5 text-base text-rose-800">
      {message}
    </div>
  );
}

export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-slate-200/80 ${className}`} />;
}

export function Badge({ children, tone = 'neutral' }: { children: ReactNode; tone?: 'neutral' | 'good' | 'warn' | 'bad' | 'info' }) {
  const styles = {
    neutral: 'bg-slate-100 text-slate-700',
    good: 'bg-emerald-50 text-emerald-800',
    warn: 'bg-amber-50 text-amber-800',
    bad: 'bg-rose-50 text-rose-800',
    info: 'bg-sky-50 text-sky-800',
  }[tone];
  return <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-sm font-semibold ${styles}`}>{children}</span>;
}

export function ProgressBar({ percent, status }: { percent: number; status?: 'normal' | 'warning' | 'exceeded' }) {
  const width = Math.max(0, Math.min(percent, 100));
  const color = status === 'exceeded' ? 'bg-rose-600' : status === 'warning' ? 'bg-amber-500' : 'bg-emerald-600';
  return (
    <div className="h-2 overflow-hidden rounded-full bg-slate-100" role="progressbar" aria-valuenow={Math.round(percent)} aria-valuemin={0} aria-valuemax={100}>
      <div className={`h-full rounded-full ${color}`} style={{ width: `${width}%` }} />
    </div>
  );
}

export function MoneyText({ value, tone = 'neutral' }: { value: string; tone?: 'neutral' | 'income' | 'expense' }) {
  const negative = value.startsWith('-');
  const color = tone === 'income' ? 'text-emerald-700' : tone === 'expense' || negative ? 'text-rose-700' : 'text-ink';
  return <span className={color}>{formatPHP(value)}</span>;
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <section className={`rounded-xl border border-line bg-white p-4 shadow-card ${className}`}>{children}</section>;
}

export function PageHeader({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-ink">{title}</h1>
        {description ? <p className="mt-1.5 max-w-2xl text-base leading-7 text-muted">{description}</p> : null}
      </div>
      {action}
    </div>
  );
}
