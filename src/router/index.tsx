import { lazy, Suspense } from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import AppLayout from '../layouts/AppLayout';
import type { AuthUser } from '../types/auth';
import type { AdminUser } from '../types/admin';

// Lazy load components
const LandingPage = lazy(() => import('../pages/LandingPage'));
const ProfilePage = lazy(() => import('../pages/ProfilePage'));
const AdminDashboard = lazy(() => import('../pages/AdminDashboard'));
const AgentRunDetailPage = lazy(() => import('../pages/agent/AgentRunDetailPage'));
const DemoLanding = lazy(() => import('../pages/demo/DemoLanding'));
const DemoDashboard = lazy(() => import('../pages/demo/DemoDashboard'));
const DemoChat = lazy(() => import('../pages/demo/DemoChat'));
const DemoSettings = lazy(() => import('../pages/demo/DemoSettings'));

// Auth Pages
const LoginPage = lazy(() => import('../pages/auth/LoginPage'));
const RegisterPage = lazy(() => import('../pages/auth/RegisterPage'));
const ForgotPasswordPage = lazy(() => import('../pages/auth/ForgotPasswordPage'));
const AdminLoginPage = lazy(() => import('../pages/auth/AdminLoginPage'));
const AdminRegisterPage = lazy(() => import('../pages/auth/AdminRegisterPage'));
const SettingsPage = lazy(() => import('../pages/SettingsPage'));
const UserChat = lazy(() => import('../pages/agent/UserChat'));
const UserDashboard = lazy(() => import('../pages/agent/UserDashboard'));

// Legacy redirect component
const LegacyLandingRedirect = () => <Navigate to="/" replace />;

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
  onAdminLogout: () => void,
  onAdminLogin: () => void
) => createBrowserRouter([
  // Landing page
  {
    path: '/',
    element: withSuspense(DemoLanding),
  },
  {
    path: '/settings',
    element: withSuspense(DemoSettings),
  },
  
  // Auth Routes
  {
    path: '/login',
    element: withSuspense(LoginPage),
  },
  {
    path: '/register',
    element: withSuspense(RegisterPage),
  },
  {
    path: '/forgot-password',
    element: withSuspense(ForgotPasswordPage),
  },
  {
    path: '/admin/login',
    element: withSuspense(AdminLoginPage),
  },
  {
    path: '/admin/register',
    element: withSuspense(AdminRegisterPage),
  },

  // Legacy routes for authenticated users
  {
    path: '/app',
    element: (
      <AppLayout
        user={user}
        admin={admin}
        onNavigate={onNavigate}
        onLogin={onLogin}
        onRegister={onRegister}
        onLogout={onLogout}
        onAdminNavigate={onAdminNavigate}
        onAdminLogin={onAdminLogin}
      />
    ),
    children: [
      {
        index: true,
        element: <LegacyLandingRedirect />,
      },
      {
        path: 'profile',
        element: user ? withSuspense(ProfilePage, { user }) : <Navigate to="/login" replace />,
      },
      {
        path: 'settings',
        element: user ? withSuspense(SettingsPage, { user }) : <Navigate to="/login" replace />,
      },
      {
        path: 'admin',
        element: admin ? withSuspense(AdminDashboard, { 
          admin, 
          onAdminLogout, 
          onAdminDeleted: onAdminLogout 
        }) : <Navigate to="/admin/login" replace />,
      },
      {
        path: 'dashboard',
        element: user ? withSuspense(UserDashboard) : <Navigate to="/login" replace />,
      },
      {
        path: 'chat',
        children: [
          {
            index: true,
            element: user ? withSuspense(UserChat) : <Navigate to="/login" replace />,
          },
          {
            path: ':runId',
            element: user ? withSuspense(UserChat) : <Navigate to="/login" replace />,
          },
        ],
      },
      {
        path: 'agent', // Keep legacy agent route for now or remove if safe. Let's redirect to new chat.
        children: [
            {
              path: 'chat',
              element: <Navigate to="/app/chat" replace />,
            },
            {
              path: 'runs/:runId',
              // Use a component to capture params if needed, or just redirect to root of chat if complex
              // For simplicity, let's just redirect to /app/chat. Users can find their history there.
              element: <Navigate to="/app/chat" replace />,
            }
        ]
      },
    ],
  },
  // Legacy demo routes (for transition period)
  {
    path: '/legacy/demo',
    element: <Navigate to="/legacy/demo/dashboard" replace />,
  },
  {
    path: '/legacy/demo/dashboard',
    element: withSuspense(DemoDashboard),
  },
  {
    path: '/legacy/demo/chat',
    element: withSuspense(DemoChat),
  },
  {
    path: '/legacy/demo/settings',
    element: withSuspense(DemoSettings),
  },
  // Old demo routes (redirect to legacy)
  {
    path: '/demo',
    element: <Navigate to="/legacy/demo" replace />,
  },
  {
    path: '/demo/*',
    element: <Navigate to="/legacy/demo" replace />,
  },
  // Removed public routes (now require login via /app/*)
  {
    path: '/dashboard',
    element: <Navigate to="/app/dashboard" replace />,
  },
  {
    path: '/chat',
    element: <Navigate to="/app/chat" replace />,
  },
]);

export default createAppRouter;
