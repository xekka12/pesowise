import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';
import { Button } from '../components/ui';

interface ConfirmOptions {
  title: string;
  message: string;
  confirmLabel?: string;
  tone?: 'danger' | 'primary';
}

const ConfirmContext = createContext<((options: ConfirmOptions) => Promise<boolean>) | null>(null);

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const resolver = useRef<((value: boolean) => void) | null>(null);
  const [options, setOptions] = useState<ConfirmOptions | null>(null);
  const confirm = useCallback((next: ConfirmOptions) => {
    setOptions(next);
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve;
    });
  }, []);
  const close = (value: boolean) => {
    resolver.current?.(value);
    resolver.current = null;
    setOptions(null);
  };
  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {options ? (
        <div className="fixed inset-0 z-[60] flex items-end justify-center bg-navy-950/40 p-4 sm:items-center" role="presentation">
          <div role="dialog" aria-modal="true" aria-labelledby="confirm-title" className="w-full max-w-md rounded-xl border border-line bg-white p-5 shadow-card">
            <h2 id="confirm-title" className="text-lg font-semibold text-ink">
              {options.title}
            </h2>
            <p className="mt-2 text-sm leading-6 text-muted">{options.message}</p>
            <div className="mt-5 flex justify-end gap-2">
              <Button variant="secondary" onClick={() => close(false)}>
                Cancel
              </Button>
              <Button variant={options.tone === 'danger' ? 'danger' : 'primary'} onClick={() => close(true)}>
                {options.confirmLabel ?? 'Confirm'}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const context = useContext(ConfirmContext);
  if (!context) throw new Error('ConfirmProvider is missing.');
  return context;
}
