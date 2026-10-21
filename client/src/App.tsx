import { Navigate, RouterProvider, createBrowserRouter } from 'react-router-dom';
import { Layout } from './components/Layout';
import { LogoLockup } from './components/Logo';
import { useAuth } from './context/AuthContext';
import { BudgetsPage } from './pages/BudgetsPage';
import { CategoriesPage } from './pages/CategoriesPage';
import { DashboardPage } from './pages/DashboardPage';
import { GoalsPage } from './pages/GoalsPage';
import { LoginPage } from './pages/LoginPage';
import { NotificationsPage } from './pages/NotificationsPage';
import { ProfilePage } from './pages/ProfilePage';
import { RecurringPage } from './pages/RecurringPage';
import { RegisterPage } from './pages/RegisterPage';
import { ReportsPage } from './pages/ReportsPage';
import { SettingsPage } from './pages/SettingsPage';
import { TransactionsPage } from './pages/TransactionsPage';

function RequireAuth({ children }: { children: JSX.Element }) {
  const { user, ready } = useAuth();
  if (!ready) return <FullScreenStatus label="Loading PesoWise" />;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function GuestOnly({ children }: { children: JSX.Element }) {
  const { user, ready } = useAuth();
  if (!ready) return <FullScreenStatus label="Loading PesoWise" />;
  if (user) return <Navigate to="/" replace />;
  return children;
}

function FullScreenStatus({ label }: { label: string }) {
  return (
    <div className="grid min-h-screen place-items-center bg-canvas text-base text-muted" role="status">
      {label}
    </div>
  );
}

function NotFound() {
  return (
    <div className="grid min-h-screen place-items-center bg-canvas px-4">
      <div className="text-center">
        <LogoLockup tone="onLight" />
        <h1 className="mt-4 text-2xl font-semibold">That page is not available</h1>
        <a className="mt-4 inline-block text-base font-semibold text-navy-800 underline" href="/">
          Back to overview
        </a>
      </div>
    </div>
  );
}

const router = createBrowserRouter([
  { path: '/login', element: <GuestOnly><LoginPage /></GuestOnly> },
  { path: '/register', element: <GuestOnly><RegisterPage /></GuestOnly> },
  {
    path: '/',
    element: <RequireAuth><Layout /></RequireAuth>,
    children: [
      { index: true, element: <DashboardPage /> },
      { path: 'transactions', element: <TransactionsPage /> },
      { path: 'budgets', element: <BudgetsPage /> },
      { path: 'goals', element: <GoalsPage /> },
      { path: 'recurring', element: <RecurringPage /> },
      { path: 'reports', element: <ReportsPage /> },
      { path: 'categories', element: <CategoriesPage /> },
      { path: 'settings', element: <SettingsPage /> },
      { path: 'profile', element: <ProfilePage /> },
      { path: 'notifications', element: <NotificationsPage /> },
    ],
  },
  { path: '*', element: <NotFound /> },
]);

export function App() {
  return <RouterProvider router={router} />;
}
