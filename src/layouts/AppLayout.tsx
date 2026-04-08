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
  return (
    <div className="h-screen bg-atmos bg-grid animate-shimmer">
      <div className="h-screen bg-white/70 flex flex-col">
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
        <main className="flex-1 flex flex-col overflow-hidden">
          <Outlet />
        </main>
        <Footer
          onAdminEntry={() => (admin ? onNavigate('admin') : onAdminLogin())}
          adminActive={Boolean(admin)}
        />
      </div>
    </div>
  );
};

export default AppLayout;
