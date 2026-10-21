export function LogoMark({ size = 44, className = '' }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" className={className} aria-hidden="true">
      <rect width="64" height="64" rx="16" fill="#0B1F3A" />
      <path fill="#F8FAFC" fillRule="evenodd" d="M23.2 12.5h12.6c6.7 0 11 3.9 11 9.6 0 5.6-4.3 9.5-11 9.5H28.6V51h-5.4V12.5zm5.4 4.7v9.2h7c3.2 0 5.2-1.6 5.2-4.6s-2-4.6-5.2-4.6h-7z" />
      <path fill="#34D399" d="M16.5 27.4h26.2v3.5H16.5z" />
      <path fill="#059669" d="M16.5 33.6h21.4v3.5H16.5z" />
    </svg>
  );
}

export function LogoLockup({ tone = 'onDark', mark = 44 }: { tone?: 'onDark' | 'onLight'; mark?: number }) {
  const wise = tone === 'onDark' ? 'text-emerald-400' : 'text-emerald-700';
  const peso = tone === 'onDark' ? 'text-white' : 'text-navy-900';
  return (
    <div className="flex items-center gap-3">
      <LogoMark size={mark} className="shrink-0" />
      <p className={`text-[1.35rem] font-semibold leading-none tracking-tight ${peso}`}>
        Peso<span className={wise}>Wise</span>
      </p>
    </div>
  );
}
