import type { UserProfile } from '@pesowise/shared';
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { api } from '../lib/api';

interface AuthState {
  user: UserProfile | null;
  ready: boolean;
  refresh: () => Promise<void>;
  setUser: (user: UserProfile | null) => void;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [ready, setReady] = useState(false);

  const refresh = async () => {
    try {
      const result = await api<{ user: UserProfile }>('/api/auth/me');
      setUser(result.user);
    } catch {
      setUser(null);
    } finally {
      setReady(true);
    }
  };

  useEffect(() => {
    void refresh();
    const onUnauthorized = () => setUser(null);
    window.addEventListener('pesowise:unauthorized', onUnauthorized);
    return () => window.removeEventListener('pesowise:unauthorized', onUnauthorized);
  }, []);

  const value = useMemo(() => ({ user, ready, refresh, setUser }), [user, ready]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('AuthProvider is missing.');
  return context;
}
