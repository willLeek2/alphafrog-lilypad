import { Link } from 'react-router-dom';
import ActionButton from "../../components/ActionButton";
import { ArrowRight, BarChart3, Bot, Database, TrendingDown, Search, ShieldCheck, Activity, BrainCircuit } from 'lucide-react';

const DemoLanding = () => {
  return (
    <div className="min-h-screen bg-white font-body text-ink-900">
      
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
            从原始 A 股数据到投资组合洞察，只需几分钟。AlphaFrog 结合微服务架构与自主 Agent 推理，
            为您提供机构级的深度基本面分析。
          </p>

          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
             <Link to="/demo/chat">
              <ActionButton className="group min-w-[160px] gap-2 shadow-lg shadow-sky-200">
                启动工作台
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </ActionButton>
            </Link>
            <Link to="/demo/dashboard">
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

      {/* 2. Contrast: Value vs Speculation */}
      <section className="px-6 py-24 bg-white">
        <div className="mx-auto max-w-6xl">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="order-2 md:order-1 relative">
              <div className="absolute inset-0 bg-gradient-to-tr from-red-50 to-transparent rounded-3xl -rotate-2 scale-105"></div>
              <div className="relative bg-white border border-red-100 rounded-2xl p-8 shadow-sm">
                <div className="flex items-center gap-3 mb-4 text-red-600">
                  <TrendingDown size={24} />
                  <span className="font-bold text-lg">拒绝噪音</span>
                </div>
                <h3 className="text-2xl font-bold text-ink-900 mb-4">摒弃无效的短线指标与技术迷信</h3>
                <p className="text-ink-600 leading-relaxed">
                  市面上的“智能助手”往往只是缝合了免费的新闻 API 和过时的 MACD/KDJ 策略。
                  除了制造交易焦虑，这些噪音无法为您带来真正的 Alpha。
                  追涨杀跌不是投资，是博弈。
                </p>
              </div>
            </div>
            <div className="order-1 md:order-2">
              <div className="inline-flex items-center gap-2 rounded-full bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-700 mb-4">
                我们的愿景
              </div>
              <h2 className="text-3xl md:text-4xl font-bold text-ink-900 mb-6">回归价值本源</h2>
              <p className="text-lg text-ink-700 leading-relaxed mb-8">
                AlphaFrog 专注于价值回归。我们清洗财报、穿透股权、追踪资金流向，
                为您呈现机构视角的深度基本面分析。让每一笔投资都建立在坚实的数据基础之上。
              </p>
              <ul className="space-y-3">
                {['财报深度解读', '行业周期分析', '估值模型构建'].map((item, i) => (
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

      {/* 3. Contrast: Deep Data vs API Wrappers */}
      <section className="px-6 py-24 bg-slate-50">
        <div className="mx-auto max-w-6xl">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-700 mb-4">
                数据质量
              </div>
              <h2 className="text-3xl md:text-4xl font-bold text-ink-900 mb-6">不仅是聚合，更是清洗与洞察</h2>
              <p className="text-lg text-ink-700 leading-relaxed mb-8">
                通用大模型（LLM）缺乏实时的金融领域知识。AlphaFrog 不只是简单的 API 包装器，
                我们在底层构建了完整的金融微服务架构。数据经过多重清洗、对齐和校验，确保 Agent 
                获取的是高质量的“净水”。
              </p>
              <div className="flex gap-4">
                <div className="rounded-lg bg-white p-4 shadow-sm border border-slate-100 flex-1">
                  <div className="text-2xl font-bold text-sky-600 mb-1">99.9%</div>
                  <div className="text-sm text-ink-500">数据准确率</div>
                </div>
                <div className="rounded-lg bg-white p-4 shadow-sm border border-slate-100 flex-1">
                  <div className="text-2xl font-bold text-sky-600 mb-1">T+0</div>
                  <div className="text-sm text-ink-500">实时更新</div>
                </div>
              </div>
            </div>
            <div className="relative">
               <div className="absolute inset-0 bg-gradient-to-bl from-sky-100 to-transparent rounded-3xl rotate-2 scale-105"></div>
               <div className="relative bg-white border border-sky-100 rounded-2xl p-8 shadow-sm">
                 <div className="flex items-center gap-3 mb-4 text-sky-600">
                   <Activity size={24} />
                   <span className="font-bold text-lg">数据甄别</span>
                 </div>
                 <div className="space-y-4">
                   <div className="flex items-center gap-4 p-3 bg-red-50 rounded-lg border border-red-100 opacity-60">
                     <span className="text-red-500 font-mono text-sm">RAW_API</span>
                     <span className="text-ink-400 text-sm line-through">非结构化噪音数据...</span>
                   </div>
                   <div className="flex items-center justify-center">
                     <ArrowRight className="text-ink-300 rotate-90 md:rotate-0" />
                   </div>
                   <div className="flex items-center gap-4 p-3 bg-emerald-50 rounded-lg border border-emerald-100">
                     <span className="text-emerald-600 font-mono text-sm">ALPHAFROG</span>
                     <span className="text-ink-800 text-sm font-medium">结构化高价值情报</span>
                   </div>
                 </div>
               </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Contrast: Reliable Sources */}
      <section className="px-6 py-24 bg-white">
        <div className="mx-auto max-w-6xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-700 mb-6">
            可信 AI
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-ink-900 mb-6">每一条结论都有据可查</h2>
          <p className="mx-auto max-w-3xl text-lg text-ink-700 leading-relaxed mb-16">
            即使是最先进的 AI 也会产生幻觉。AlphaFrog 采用 RAG（检索增强生成）与工具调用相结合的架构。
            Agent 的每一个推理步骤都会引用原始数据源、研报出处或新闻链接。
            <br className="hidden md:block" />
            <span className="font-medium text-ink-900">我们不编造故事，我们只呈现事实。</span>
          </p>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              { title: '信源溯源', icon: Search, desc: '自动标注引用的财报页码与段落' },
              { title: '逻辑透明', icon: BrainCircuit, desc: '展示 Agent 完整的“思考链” (CoT)' },
              { title: '代码验证', icon: ShieldCheck, desc: '复杂计算通过 Python 代码执行验证' },
            ].map((item, i) => (
              <div key={i} className="flex flex-col items-center">
                <div className="mb-4 h-12 w-12 flex items-center justify-center rounded-xl bg-sky-50 text-sky-600">
                  <item.icon size={24} />
                </div>
                <h3 className="text-lg font-bold text-ink-900 mb-2">{item.title}</h3>
                <p className="text-ink-500 text-sm">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 5. Feature Grid */}
      <section className="px-6 py-24 bg-sky-50">
        <div className="mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-ink-900">核心功能概览</h2>
          </div>
          <div className="grid gap-8 md:grid-cols-3">
            {[
              {
                icon: Database,
                title: "可靠基建",
                desc: "微服务架构支撑，确保 A 股市场数据的高可用性与准确性。"
              },
              {
                icon: Bot,
                title: "自主 Agent",
                desc: "具备复杂推理能力，自动拆解投资问题并执行多步分析任务。"
              },
              {
                icon: BarChart3,
                title: "行动洞察",
                desc: "将海量数据转化为清晰的叙事、交互式图表和可下载的专业报告。"
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
