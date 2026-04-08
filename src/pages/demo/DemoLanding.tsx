import { Link, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import ActionButton from "../../components/ActionButton";
import { ArrowRight, Bot, Database } from 'lucide-react';
import { loadAuth, clearAuth } from "../../utils/storage";
import type { AuthUser } from "../../types/auth";
import { logout } from "../../api/auth";

const LandingHeader = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<AuthUser | null>(null);
  
  // 从 localStorage 读取用户状态
  const checkAuth = () => {
    const auth = loadAuth();
    console.log('[LandingHeader] checkAuth:', auth);
    // 检查是否有有效 token（兼容旧数据没有 tokenExpiresAt 的情况）
    if (auth && auth.token) {
      // 如果有过期时间，检查是否过期；如果没有过期时间，假设 token 有效
      const isExpired = auth.tokenExpiresAt && Date.parse(auth.tokenExpiresAt) <= Date.now();
      if (!isExpired) {
        console.log('[LandingHeader] User logged in:', auth.username);
        setUser(auth);
      } else {
        // Token 已过期，清除
        console.log('[LandingHeader] Token expired');
        clearAuth();
        setUser(null);
      }
    } else {
      console.log('[LandingHeader] No auth found');
      setUser(null);
    }
  };

  useEffect(() => {
    checkAuth();
    // 监听 storage 变化（其他标签页登录/登出）
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'alphafrog.auth') {
        checkAuth();
      }
    };
    window.addEventListener('storage', handleStorageChange);
    // 定时检查（应对 token 过期）
    const interval = setInterval(checkAuth, 5000);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(interval);
    };
  }, []);
  
  const handleLogout = async () => {
    if (user) {
      try {
        await logout({ username: user.username });
      } catch {
        // 忽略登出错误
      }
    }
    clearAuth();
    setUser(null);
    navigate("/");
  };
  
  return (
    <header className="fixed top-0 z-50 w-full border-b border-white/60 bg-white/70 backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-4">
        <Link to="/" className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-sky-600 text-lg font-bold text-white">
            AF
          </span>
          <div className="text-left">
            <p className="text-base font-semibold text-ink-900">AlphaFrog</p>
            <p className="text-xs text-ink-700">A股市场智能投研</p>
          </div>
        </Link>
        <div className="flex items-center gap-3">
          {user ? (
            <>
              <div className="hidden rounded-full bg-sky-50 px-3 py-1 text-xs font-semibold text-ink-700 md:block">
                {user.username}
              </div>
              <Link to="/app/chat">
                <ActionButton variant="outline">
                  工作台
                </ActionButton>
              </Link>
              <ActionButton variant="ghost" onClick={handleLogout}>
                登出
              </ActionButton>
            </>
          ) : (
            <>
              <Link to="/login">
                <ActionButton variant="ghost">
                  登录
                </ActionButton>
              </Link>
              <Link to="/register">
                <ActionButton>
                  注册
                </ActionButton>
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
};

const DemoLanding = () => {
  return (
    <div className="min-h-screen bg-white font-body text-ink-900 pt-20">
      <LandingHeader />
      
      {/* 1. Hero Section */}
      <section className="relative overflow-hidden px-6 py-24 md:py-32 lg:py-40 bg-sky-50">
        <div className="mx-auto max-w-5xl text-center relative z-10">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-white px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-sky-600 shadow-sm ring-1 ring-sky-100">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-sky-400 opacity-75"></span>
              <span className="relative inline-flex h-2 w-2 rounded-full bg-sky-500"></span>
            </span>
            AlphaFrog v0.4
          </div>
          
          <h1 className="mb-8 font-display text-4xl font-bold leading-tight tracking-tight text-ink-900 md:text-6xl lg:text-7xl">
            AI 驱动的市场情报，<br />
            <span className="text-sky-600">专为理性投资者打造。</span>
          </h1>
          
          <p className="mx-auto mb-10 max-w-2xl text-lg text-ink-700 md:text-xl">
            基于真实的 A 股市场数据，让 AI 协助你进行调研与分析。
          </p>

          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
             <Link to="/chat">
              <ActionButton className="group min-w-[160px] gap-2 shadow-lg shadow-sky-200">
                启动工作台
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </ActionButton>
            </Link>
            <Link to="/dashboard">
              <ActionButton variant="outline" className="min-w-[160px] bg-white hover:bg-sky-50">
                查看仪表盘
              </ActionButton>
            </Link>
          </div>
        </div>
        
        {/* Background Gradients */}
        <div className="absolute top-0 left-0 -z-10 h-full w-full bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-sky-100/50 via-white to-white" />
        <div className="absolute top-1/2 left-1/2 -z-10 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-sky-200/30 blur-[100px]" />
      </section>

      {/* 2. Value vs Speculation with Chart */}
      <section className="px-6 py-24 bg-white">
        <div className="mx-auto max-w-6xl">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            {/* Left: Simple Chart */}
            <div className="order-2 md:order-1">
              <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm font-medium text-ink-600">长期收益对比示意</span>
                </div>
                <svg viewBox="0 0 400 200" className="w-full h-48">
                  {/* Grid lines */}
                  <line x1="0" y1="160" x2="400" y2="160" stroke="#e2e8f0" strokeWidth="1" />
                  <line x1="0" y1="100" x2="400" y2="100" stroke="#e2e8f0" strokeWidth="1" strokeDasharray="4" />
                  <line x1="0" y1="40" x2="400" y2="40" stroke="#e2e8f0" strokeWidth="1" strokeDasharray="4" />
                  
                  {/* Red line: volatile, ends lower */}
                  <path
                    d="M 20 120 Q 60 60, 100 100 T 180 80 T 260 120 T 340 140 L 380 150"
                    fill="none"
                    stroke="#ef4444"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                  />
                  
                  {/* Blue line: steady growth */}
                  <path
                    d="M 20 140 Q 80 130, 140 110 T 260 70 T 380 30"
                    fill="none"
                    stroke="#0ea5e9"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                  />
                  
                  {/* Labels */}
                  <circle cx="20" cy="120" r="4" fill="#ef4444" />
                  <circle cx="380" cy="150" r="4" fill="#ef4444" />
                  <text x="30" y="115" className="text-xs fill-red-500">追涨杀跌</text>
                  <text x="320" y="170" className="text-xs fill-red-500">最终亏损</text>
                  
                  <circle cx="20" cy="140" r="4" fill="#0ea5e9" />
                  <circle cx="380" cy="30" r="4" fill="#0ea5e9" />
                  <text x="30" y="155" className="text-xs fill-sky-500">稳健持有</text>
                  <text x="300" y="25" className="text-xs fill-sky-500">长期复利</text>
                </svg>
                <div className="flex items-center justify-center gap-6 mt-2 text-xs text-ink-500">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-0.5 bg-red-500 rounded"></div>
                    <span>短线博弈</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-0.5 bg-sky-500 rounded"></div>
                    <span>价值投资</span>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Right: Vision */}
            <div className="order-1 md:order-2">
              <div className="inline-flex items-center gap-2 rounded-full bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-700 mb-4">
                我们的愿景
              </div>
              <h2 className="text-3xl md:text-4xl font-bold text-ink-900 mb-6">基于真实数据的投资决策</h2>
              <p className="text-lg text-ink-700 leading-relaxed mb-8">
                AlphaFrog 依托真实的市场数据，帮助投资者进行理性的分析与判断。
                我们关注长期价值，而非短期波动。
              </p>
              <ul className="space-y-3">
                {['历史行情数据查询', '财务指标分析', 'AI 辅助研究报告生成'].map((item, i) => (
                  <li key={i} className="flex items-center gap-3 text-ink-700">
                    <CheckCircle className="h-5 w-5 text-emerald-500" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Data Coverage */}
      <section className="px-6 py-24 bg-slate-50">
        <div className="mx-auto max-w-6xl">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-700 mb-4">
                数据覆盖
              </div>
              <h2 className="text-3xl md:text-4xl font-bold text-ink-900 mb-6">全面的 A 股市场数据</h2>
              <p className="text-lg text-ink-700 leading-relaxed mb-8">
                覆盖股票、基金、指数等多个市场板块，为分析提供数据支撑。
              </p>
              <div className="flex gap-4">
                <div className="rounded-lg bg-white p-4 shadow-sm border border-slate-100 flex-1">
                  <div className="text-2xl font-bold text-sky-600 mb-1">每日</div>
                  <div className="text-sm text-ink-500">收盘后更新数据</div>
                </div>
                <div className="rounded-lg bg-white p-4 shadow-sm border border-slate-100 flex-1">
                  <div className="text-2xl font-bold text-sky-600 mb-1">3000万+</div>
                  <div className="text-sm text-ink-500">历史数据条目</div>
                </div>
              </div>
            </div>
            <div className="relative">
               <div className="absolute inset-0 bg-gradient-to-bl from-sky-100 to-transparent rounded-3xl rotate-2 scale-105"></div>
               <div className="relative bg-white border border-sky-100 rounded-2xl p-8 shadow-sm">
                 <div className="space-y-3">
                   <div className="flex items-center gap-3 p-3 bg-sky-50 rounded-lg">
                     <Database size={18} className="text-sky-600" />
                     <span className="text-sm font-medium text-ink-800">股票日线数据</span>
                   </div>
                   <div className="flex items-center gap-3 p-3 bg-sky-50 rounded-lg">
                     <Database size={18} className="text-sky-600" />
                     <span className="text-sm font-medium text-ink-800">基金净值数据</span>
                   </div>
                   <div className="flex items-center gap-3 p-3 bg-sky-50 rounded-lg">
                     <Database size={18} className="text-sky-600" />
                     <span className="text-sm font-medium text-ink-800">指数行情数据</span>
                   </div>
                   <div className="flex items-center gap-3 p-3 bg-sky-50 rounded-lg">
                     <Database size={18} className="text-sky-600" />
                     <span className="text-sm font-medium text-ink-800">公司基本面数据</span>
                   </div>
                 </div>
               </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Decision Support */}
      <section className="px-6 py-24 bg-white">
        <div className="mx-auto max-w-6xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-700 mb-6">
            投资理念
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-ink-900 mb-6">不断坚定你的决策，而非不断新造决策</h2>
          <p className="mx-auto max-w-3xl text-lg text-ink-700 leading-relaxed">
            我们期望 AlphaFrog 成为你投资路上的陪伴者。通过 AI 分析，
            帮助你从价值和长期的视角审视自己的持仓，在波动中保持定力，
            安心持有经过深思熟虑的资产——而不是被市场的噪音牵引，
            追逐热点、频繁交易，最终在追涨杀跌中消耗本金。
          </p>
        </div>
      </section>

      {/* 5. Feature Grid */}
      <section className="px-6 py-24 bg-sky-50">
        <div className="mx-auto max-w-4xl">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-ink-900">核心功能</h2>
          </div>
          <div className="grid gap-8 md:grid-cols-2">
            {[
              {
                icon: Database,
                title: "市场数据查询",
                desc: "查询股票、基金、指数的历史行情与基本面数据。"
              },
              {
                icon: Bot,
                title: "AI 辅助分析",
                desc: "基于提供的数据，AI 协助整理信息、生成分析报告。"
              }
            ].map((feature, i) => (
              <div key={i} className="group rounded-2xl border border-sky-100 bg-white p-8 shadow-sm transition-all hover:border-sky-200 hover:shadow-card">
                <div className="mb-6 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-sky-50 text-sky-600 group-hover:bg-sky-600 group-hover:text-white transition-colors">
                  <feature.icon className="h-6 w-6" />
                </div>
                <h3 className="mb-3 text-xl font-bold text-ink-900">{feature.title}</h3>
                <p className="text-ink-700 leading-relaxed">
                  {feature.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white border-t border-sky-100 py-12 px-6">
        <div className="mx-auto max-w-6xl flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-sky-600 flex items-center justify-center text-white font-bold">AF</div>
            <span className="text-ink-900 font-semibold">AlphaFrog</span>
          </div>
          <div className="text-sm text-ink-400">
            © 2026 AlphaFrog Intelligence. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
};

// Simple CheckCircle Icon component for local use
const CheckCircle = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
    <path d="m9 11 3 3L22 4" />
  </svg>
);

export default DemoLanding;
