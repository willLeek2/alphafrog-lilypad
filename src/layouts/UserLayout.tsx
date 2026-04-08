import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, MessageSquare, Settings, LogOut, ChevronLeft, ChevronRight, Database, Newspaper, FileText, PieChart } from 'lucide-react';

interface UserLayoutProps {
  children: React.ReactNode;
}

const UserLayout: React.FC<UserLayoutProps> = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const location = useLocation();

  const navItems = [
    { icon: LayoutDashboard, label: '概览仪表盘', path: '/app/dashboard', disabled: false },
    { icon: MessageSquare, label: 'AI 分析助手', path: '/app/chat', disabled: false },
    { icon: Database, label: '数据查询', path: '#', disabled: true },
    { icon: Newspaper, label: '财经新闻', path: '#', disabled: true },
    { icon: FileText, label: '公司财报', path: '#', disabled: true },
    { icon: PieChart, label: '基金报告', path: '#', disabled: true },
    { icon: Settings, label: '设置', path: '/app/settings', disabled: false },
  ];

  return (
    <div className="flex h-full w-full bg-sky-50 text-ink-900 font-body overflow-hidden">
      {/* Sidebar */}
      <aside 
        className={`${
          sidebarOpen ? 'w-64' : 'w-20'
        } flex flex-col border-r border-sky-100 bg-white transition-all duration-300 ease-in-out`}
      >
        <div className="flex h-14 items-center justify-between border-b border-sky-50 px-4">
          {sidebarOpen && (
            <span className="text-lg font-semibold tracking-tight text-ink-900 font-display">
              Agent分析
            </span>
          )}
          <button 
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="rounded-lg p-1.5 text-ink-700 hover:bg-sky-50"
          >
            {sidebarOpen ? <ChevronLeft size={20} /> : <ChevronRight size={20} />}
          </button>
        </div>

        <nav className="flex-1 space-y-1 p-3">
          {navItems.map((item, index) => {
            const isActive = location.pathname === item.path || location.pathname.startsWith(item.path + '/');
            const Component = item.disabled ? 'div' : Link;
            return (
              <Component
                key={index}
                to={item.path}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors ${
                  item.disabled 
                    ? 'text-ink-300 cursor-not-allowed'
                    : isActive
                      ? 'bg-sky-50 text-sky-700 font-medium'
                      : 'text-ink-700 hover:bg-sky-50 hover:text-ink-900'
                }`}
              >
                <item.icon size={20} className={item.disabled ? 'text-ink-300' : (isActive ? 'text-sky-600' : 'text-ink-400')} />
                {sidebarOpen && <span>{item.label}</span>}
              </Component>
            );
          })}
        </nav>

        <div className="border-t border-sky-50 p-3">
          <Link to="/logout" className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-ink-700 hover:bg-red-50 hover:text-red-600 transition-colors">
            <LogOut size={20} />
            {sidebarOpen && <span>退出登录</span>}
          </Link>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex flex-1 flex-col overflow-hidden">
        {/* Light Header - 只保留页面标题 */}
        <header className="flex h-12 items-center border-b border-sky-100 bg-white px-6">
          <h2 className="text-base font-medium text-ink-700">
            {navItems.find(i => location.pathname === i.path || location.pathname.startsWith(i.path + '/'))?.label || 'Agent分析'}
          </h2>
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-auto p-6">
          {children}
        </div>
      </main>
    </div>
  );
};

export default UserLayout;
