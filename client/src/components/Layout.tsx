import type { NotificationList, UserProfile } from '@pesowise/shared';
import { formatManilaHeading, formatManilaTimestamp } from '@pesowise/shared';
import {
  ArrowLeftRight,
  BarChart3,
  Bell,
  ChevronsLeft,
  LayoutDashboard,
  LogOut,
  Menu,
  PieChart,
  Repeat,
  Settings,
  Tags,
  Target,
  UserRound,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { LogoLockup, LogoMark } from './Logo';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { api } from '../lib/api';
import { useDismiss } from '../lib/hooks';

const NAV = [
  { to: '/', label: 'Overview', icon: LayoutDashboard, end: true },
  { to: '/transactions', label: 'Transactions', icon: ArrowLeftRight },
  { to: '/budgets', label: 'Budgets', icon: PieChart },
  { to: '/goals', label: 'Savings Goals', icon: Target },
  { to: '/recurring', label: 'Recurring', icon: Repeat },
  { to: '/reports', label: 'Reports', icon: BarChart3 },
  { to: '/categories', label: 'Categories', icon: Tags },
  { to: '/settings', label: 'Settings', icon: Settings },
];

export function Layout() {
  const { user, setUser } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem('pesowise.sidebar') === '1');
  const [mobileOpen, setMobileOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [notesOpen, setNotesOpen] = useState(false);
  const [notes, setNotes] = useState<NotificationList>({ items: [], unreadCount: 0 });
  const menuRef = useDismiss(menuOpen, () => setMenuOpen(false));
  const notesRef = useDismiss(notesOpen, () => setNotesOpen(false));

  const loadNotes = useCallback(async () => {
    const result = await api<NotificationList>('/api/notifications');
    setNotes(result);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    localStorage.setItem('pesowise.sidebar', collapsed ? '1' : '0');
  }, [collapsed]);

  useEffect(() => {
    void loadNotes().catch(() => undefined);
    const timer = window.setInterval(() => void loadNotes().catch(() => undefined), 60_000);
    return () => window.clearInterval(timer);
  }, [loadNotes]);

  useEffect(() => {
    void api<{ created: number }>('/api/recurring/process', { method: 'POST' })
      .then((result) => {
        if (result.created > 0) {
          toast.info(`${result.created} recurring transaction${result.created === 1 ? '' : 's'} added.`);
          window.dispatchEvent(new Event('pesowise:refresh'));
          void loadNotes();
        }
      })
      .catch(() => undefined);
  }, [loadNotes, toast]);

  const logout = async () => {
    await api('/api/auth/logout', { method: 'POST' });
    setUser(null);
    navigate('/login');
  };

  const markRead = async (id: string) => {
    await api(`/api/notifications/${id}/read`, { method: 'PATCH' });
    await loadNotes();
  };

  const markAll = async () => {
    await api('/api/notifications/read-all', { method: 'POST' });
    await loadNotes();
  };

  return (
    <div className="min-h-screen bg-canvas">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:z-50 focus:rounded-md focus:bg-white focus:px-3 focus:py-2">
        Skip to content
      </a>
      {mobileOpen ? <button type="button" className="fixed inset-0 z-30 bg-navy-950/40 lg:hidden" aria-label="Close menu" onClick={() => setMobileOpen(false)} /> : null}
      <aside className={`fixed inset-y-0 left-0 z-40 flex flex-col bg-navy-900 text-white transition-all ${mobileOpen ? 'translate-x-0' : '-translate-x-full'} ${collapsed ? 'w-72 lg:w-[84px] lg:translate-x-0' : 'w-72 lg:translate-x-0'}`}>
        <div className="flex h-[4.5rem] items-center gap-3 px-4">
          {collapsed ? <LogoMark size={40} className="hidden lg:block" /> : null}
          <div className={collapsed ? 'lg:hidden' : ''}>
            <LogoLockup mark={40} />
          </div>
        </div>
        <nav className="flex-1 space-y-1 px-3 py-2" aria-label="Primary">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              title={item.label}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2.5 text-base font-medium transition ${isActive ? 'bg-white/15 text-white' : 'text-white/75 hover:bg-white/10 hover:text-white'}`
              }
            >
              <item.icon className="h-5 w-5 shrink-0" aria-hidden="true" />
              <span className={collapsed ? 'lg:hidden' : ''}>{item.label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-white/10 p-3">
          <NavLink to="/profile" className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-white/10">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-emerald-600 text-sm font-semibold">{initials(user)}</span>
            <span className={`min-w-0 ${collapsed ? 'lg:hidden' : ''}`}>
              <span className="block truncate text-base font-semibold">{user?.name}</span>
              <span className="block truncate text-sm text-white/60">{user?.email}</span>
            </span>
          </NavLink>
        </div>
      </aside>
      <div className={collapsed ? 'lg:pl-[84px]' : 'lg:pl-72'}>
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between gap-3 border-b border-line bg-canvas/95 px-4 backdrop-blur sm:px-6">
          <div className="flex items-center gap-2">
            <button type="button" className="rounded-lg p-2 text-ink hover:bg-white lg:hidden" aria-label="Open menu" onClick={() => setMobileOpen(true)}>
              <Menu className="h-5 w-5" />
            </button>
            <button type="button" className="hidden rounded-lg p-2 text-muted hover:bg-white lg:inline-flex" aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'} onClick={() => setCollapsed((value) => !value)}>
              <ChevronsLeft className={`h-5 w-5 transition ${collapsed ? 'rotate-180' : ''}`} />
            </button>
            <p className="hidden text-base text-muted sm:block">{formatManilaHeading()}</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative" ref={notesRef}>
              <button type="button" className="relative rounded-lg p-2 text-ink hover:bg-white" aria-label="Notifications" aria-expanded={notesOpen} onClick={() => setNotesOpen((value) => !value)}>
                <Bell className="h-5 w-5" />
                {notes.unreadCount > 0 ? <span className="absolute right-1 top-1 grid h-4 min-w-4 place-items-center rounded-full bg-emerald-600 px-1 text-[10px] font-bold text-white">{notes.unreadCount}</span> : null}
              </button>
              {notesOpen ? (
                <div className="absolute right-0 mt-2 w-[min(100vw-2rem,22rem)] rounded-xl border border-line bg-white p-2 shadow-card">
                  <div className="flex items-center justify-between px-2 py-1">
                    <p className="text-sm font-semibold">Notifications</p>
                    <button type="button" className="text-xs font-semibold text-emerald-700" onClick={() => void markAll()}>
                      Mark all read
                    </button>
                  </div>
                  <div className="max-h-80 overflow-y-auto">
                    {notes.items.length === 0 ? <p className="px-2 py-6 text-center text-sm text-muted">You are all caught up.</p> : null}
                    {notes.items.slice(0, 8).map((item) => (
                      <button key={item.id} type="button" className="block w-full rounded-lg px-2 py-2 text-left hover:bg-navy-50" onClick={() => void markRead(item.id)}>
                        <span className="flex items-start justify-between gap-2">
                          <span className={`text-sm ${item.read ? 'text-muted' : 'font-semibold text-ink'}`}>{item.title}</span>
                          {!item.read ? <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-emerald-600" /> : null}
                        </span>
                        <span className="mt-0.5 block text-xs leading-5 text-muted">{item.message}</span>
                        <span className="mt-1 block text-[11px] text-slate-400">{formatManilaTimestamp(item.createdAt)}</span>
                      </button>
                    ))}
                  </div>
                  <NavLink to="/notifications" className="block px-2 py-2 text-center text-sm font-semibold text-navy-800" onClick={() => setNotesOpen(false)}>
                    View all
                  </NavLink>
                </div>
              ) : null}
            </div>
            <div className="relative" ref={menuRef}>
              <button type="button" className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-white" aria-label="Account menu" aria-expanded={menuOpen} onClick={() => setMenuOpen((value) => !value)}>
                <UserRound className="h-5 w-5" />
                <span className="hidden text-base font-semibold sm:inline">{user?.name}</span>
              </button>
              {menuOpen ? (
                <div className="absolute right-0 mt-2 w-48 rounded-xl border border-line bg-white p-1 shadow-card">
                  <NavLink to="/profile" className="block rounded-lg px-3 py-2 text-sm hover:bg-navy-50" onClick={() => setMenuOpen(false)}>
                    Profile
                  </NavLink>
                  <NavLink to="/settings" className="block rounded-lg px-3 py-2 text-sm hover:bg-navy-50" onClick={() => setMenuOpen(false)}>
                    Settings
                  </NavLink>
                  <button type="button" className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-rose-700 hover:bg-rose-50" onClick={() => void logout()}>
                    <LogOut className="h-4 w-4" /> Sign out
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </header>
        <main id="main" className="px-4 py-5 sm:px-6 sm:py-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

function initials(user: UserProfile | null): string {
  if (!user) return 'PW';
  return user.name
    .split(' ')
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}
