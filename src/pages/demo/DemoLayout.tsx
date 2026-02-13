import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, MessageSquare, Settings, LogOut, ChevronLeft, ChevronRight, User, Database, Newspaper, FileText, PieChart } from 'lucide-react';

interface DemoLayoutProps {
  children: React.ReactNode;
}

const DemoLayout: React.FC<DemoLayoutProps> = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const location = useLocation();

  const navItems = [
    { icon: LayoutDashboard, label: '概览仪表盘', path: '/dashboard', disabled: false },
    { icon: MessageSquare, label: 'AI 分析助手', path: '/chat', disabled: false },
    { icon: Database, label: '数据查询', path: '#', disabled: true },
    { icon: Newspaper, label: '财经新闻', path: '#', disabled: true },
    { icon: FileText, label: '公司财报', path: '#', disabled: true },
    { icon: PieChart, label: '基金报告', path: '#', disabled: true },
    { icon: Settings, label: '设置', path: '/settings', disabled: false },
  ];

  return (
    <div className="flex h-screen w-full bg-sky-50 text-ink-900 font-body">
      {/* Sidebar */}
      <aside 
        className={`${
          sidebarOpen ? 'w-64' : 'w-20'
        } flex flex-col border-r border-sky-100 bg-white transition-all duration-300 ease-in-out`}
      >
        <div className="flex h-16 items-center justify-between border-b border-sky-50 px-4">
          {sidebarOpen && (
            <span className="text-xl font-bold tracking-tight text-ink-900 font-display">
              AlphaFrog
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
            const isActive = location.pathname === item.path;
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
          <Link to="/" className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-ink-700 hover:bg-red-50 hover:text-red-600 transition-colors">
            <LogOut size={20} />
            {sidebarOpen && <span>退出演示</span>}
          </Link>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex flex-1 flex-col overflow-hidden">
        {/* Header */}
        <header className="flex h-16 items-center justify-between border-b border-sky-100 bg-white px-8">
          <h2 className="text-lg font-semibold text-ink-900">
            {navItems.find(i => i.path === location.pathname)?.label || 'AlphaFrog'}
          </h2>
          <div className="flex items-center gap-4">
             <Link to="/settings" className="flex items-center gap-3 rounded-full bg-sky-50 px-4 py-1.5 border border-sky-100 hover:bg-sky-100 transition-colors cursor-pointer">
                <div className="h-8 w-8 rounded-full bg-sky-200 flex items-center justify-center text-sky-700 font-bold text-sm">
                  <User size={16} />
                </div>
                <span className="text-sm font-medium text-ink-700">演示用户</span>
             </Link>
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-auto p-8">
          {children}
        </div>
      </main>
    </div>
  );
};

export default DemoLayout;
