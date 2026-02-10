import { Outlet } from 'react-router-dom';
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
}

const AppLayout = ({
  user,
  admin,
  onNavigate,
  onLogin,
  onRegister,
  onLogout,
  onAdminNavigate,
}: AppLayoutProps) => {
  return (
    <div className="min-h-screen bg-atmos bg-grid animate-shimmer">
      <div className="min-h-screen bg-white/70">
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
        <main className="min-h-[calc(100vh-200px)]">
          <Outlet />
        </main>
        <Footer
          onAdminEntry={() => (admin ? onNavigate('admin') : onLogin())}
          adminActive={Boolean(admin)}
        />
      </div>
    </div>
  );
};

export default AppLayout;
