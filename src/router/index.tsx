import { lazy, Suspense } from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import AppLayout from '../layouts/AppLayout';
import type { AuthUser } from '../types/auth';
import type { AdminUser } from '../types/admin';

// Lazy load components
const LandingPage = lazy(() => import('../pages/LandingPage'));
const ProfilePage = lazy(() => import('../pages/ProfilePage'));
const AdminDashboard = lazy(() => import('../pages/AdminDashboard'));
const AgentChatPage = lazy(() => import('../pages/agent/AgentChatPage'));
const AgentRunDetailPage = lazy(() => import('../pages/agent/AgentRunDetailPage'));
const DemoLanding = lazy(() => import('../pages/demo/DemoLanding'));
const DemoDashboard = lazy(() => import('../pages/demo/DemoDashboard'));
const DemoChat = lazy(() => import('../pages/demo/DemoChat'));
const DemoSettings = lazy(() => import('../pages/demo/DemoSettings'));

// Loading component
const PageLoader = () => (
  <div className="flex h-screen w-full items-center justify-center bg-sky-50">
    <div className="flex flex-col items-center gap-3">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-sky-200 border-t-sky-600"></div>
      <p className="text-sm font-medium text-sky-600">Loading...</p>
    </div>
  </div>
);

const withSuspense = (Component: React.ComponentType<any>, props?: any) => (
  <Suspense fallback={<PageLoader />}>
    <Component {...props} />
  </Suspense>
);

export const createAppRouter = (
  user: AuthUser | null,
  admin: AdminUser | null,
  onNavigate: (view: string) => void,
  onLogin: () => void,
  onRegister: () => void,
  onLogout: () => void,
  onAdminNavigate: () => void,
  onAdminLogout: () => void
) => createBrowserRouter([
  {
    path: '/',
    element: (
      <AppLayout
        user={user}
        admin={admin}
        onNavigate={onNavigate}
        onLogin={onLogin}
        onRegister={onRegister}
        onLogout={onLogout}
        onAdminNavigate={onAdminNavigate}
      />
    ),
    children: [
      {
        index: true,
        element: withSuspense(LandingPage),
      },
      {
        path: 'profile',
        element: user ? withSuspense(ProfilePage, { user }) : <Navigate to="/" replace />,
      },
      {
        path: 'admin',
        element: admin ? withSuspense(AdminDashboard, { 
          admin, 
          onAdminLogout, 
          onAdminDeleted: onAdminLogout 
        }) : <Navigate to="/" replace />,
      },
      {
        path: 'agent',
        children: [
          {
            path: 'chat',
            element: user ? withSuspense(AgentChatPage) : <Navigate to="/" replace />,
          },
          {
            path: 'runs/:runId',
            element: user ? withSuspense(AgentRunDetailPage) : <Navigate to="/" replace />,
          },
        ],
      },
    ],
  },
  {
    path: 'demo',
    children: [
      {
        index: true,
        element: withSuspense(DemoLanding),
      },
      {
        path: 'dashboard',
        element: withSuspense(DemoDashboard),
      },
      {
        path: 'chat',
        element: withSuspense(DemoChat),
      },
      {
        path: 'settings',
        element: withSuspense(DemoSettings),
      },
    ],
  },
]);

export default createAppRouter;
