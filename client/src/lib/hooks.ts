import { useEffect, useRef, useState } from 'react';

export function useApiData<T>(load: () => Promise<T>, deps: unknown[], refreshEvent?: string) {
  const loadRef = useRef(load);
  loadRef.current = load;
  const [tick, setTick] = useState(0);
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    loadRef.current().then(
      (next) => {
        if (!active) return;
        setData(next);
        setLoading(false);
      },
      (reason: unknown) => {
        if (!active) return;
        setError(reason instanceof Error ? reason.message : 'Something went wrong.');
        setLoading(false);
      },
    );
    return () => {
      active = false;
    };
  }, [tick, ...deps]);

  useEffect(() => {
    if (!refreshEvent) return;
    const onRefresh = () => setTick((value) => value + 1);
    window.addEventListener(refreshEvent, onRefresh);
    return () => window.removeEventListener(refreshEvent, onRefresh);
  }, [refreshEvent]);

  return { data, error, loading, reload: () => setTick((value) => value + 1) };
}

export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReduced(media.matches);
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);
  return reduced;
}

export function useDismiss(open: boolean, onClose: () => void) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onPointer = (event: MouseEvent) => {
      if (!ref.current?.contains(event.target as Node)) onClose();
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);
  return ref;
}
