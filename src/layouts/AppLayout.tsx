import { Outlet, useLocation } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';

interface AppLayoutProps {
  user: { username: string } | null;
  admin: { username: string } | null;
  onNavigate: (view: string) => void;
  onLogin: () => void;
  onRegister: () => void;
  onLogout: () => void;
  onAdminNavigate: () => void;
  onAdminLogin: () => void;
}

const AppLayout = ({
  user,
  admin,
  onNavigate,
  onLogin,
  onRegister,
  onLogout,
  onAdminNavigate,
  onAdminLogin,
}: AppLayoutProps) => {
  const location = useLocation();
  const isAgentV2Chat = location.pathname.startsWith('/app/chat/v2');

  return (
    <div
      className={
        isAgentV2Chat
          ? 'flex h-screen flex-col overflow-hidden bg-slate-50'
          : 'min-h-screen bg-atmos bg-grid animate-shimmer'
      }
    >
      <div
        className={
          isAgentV2Chat
            ? 'flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-white'
            : 'flex min-h-screen flex-col bg-white/70'
        }
      >
        <Header
          isAuthed={Boolean(user)}
          userName={user?.username}
          isAdminAuthed={Boolean(admin)}
          adminName={admin?.username}
          onAdminNavigate={onAdminNavigate}
          onLogin={onLogin}
          onRegister={onRegister}
          onLogout={onLogout}
        />
        <main
          className={
            isAgentV2Chat
              ? 'flex min-h-0 flex-1 flex-col overflow-hidden'
              : 'flex flex-1 flex-col overflow-x-hidden overflow-y-auto'
          }
        >
          <Outlet />
        </main>
        {isAgentV2Chat ? null : (
          <Footer
            onAdminEntry={() => (admin ? onNavigate('admin') : onAdminLogin())}
            adminActive={Boolean(admin)}
          />
        )}
      </div>
    </div>
  );
};

export default AppLayout;
