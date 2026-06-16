import { Clock, Database, ExternalLink, FileText, Github, UserPlus } from "lucide-react";

const sections = [
  { id: "intro", label: "概览" },
  { id: "workflow", label: "流程" },
  { id: "data", label: "数据" },
  { id: "features", label: "功能" },
];

const heroHighlights = [
  { title: "千万级别行情数据", desc: "股票、指数、基金日线与档案" },
  { title: "多种 LLM 驱动 Agent", desc: "可按任务选择不同模型" },
  { title: "工具编排分析", desc: "查询、检索、Python 计算在同一任务内完成" },
];

const workflowSteps = [
  { title: "提出问题", text: "说明研究对象和关注点。" },
  { title: "拉取数据", text: "Agent 按问题选行情、公告等来源。" },
  { title: "整理材料", text: "归纳、对比，输出事实摘要。" },
  { title: "仓位由你决定", text: "买卖与仓位安排由用户自己完成。" },
];

const exampleQuestions = [
  "沪深300近一年收益率是多少？",
  "512800 这只 ETF 近 30 个交易日的波动情况？",
  "宁德时代 2024 年营收同比增速？",
  "中证500成分里近一月波动率偏高的有哪些？",
];

const agentDataAccess = [
  {
    group: "TuShare 行情",
    items: ["股票 / 指数 / 基金日线", "资产与指数档案查询", "交易日历查询"],
  },
  {
    group: "文本材料",
    items: ["交易所公告检索", "研报向量检索"],
  },
  {
    group: "外部搜索",
    items: ["Perplexity", "Tavily", "Exa"],
  },
  {
    group: "分析执行",
    items: ["Python 沙箱计算", "多数据集对比分析"],
  },
];

const completedFeatures = [
  { module: "对话", feature: "多轮消息保留与上下文压缩" },
  { module: "运行", feature: "任务预算、取消 / 暂停 / 继续" },
  { module: "工具", feature: "工具限流与参数兼容" },
  { module: "执行环境", feature: "Python 沙箱" },
  { module: "展示", feature: "运行过程事件流" },
  { module: "任务", feature: "任务状态区分与并发限流" },
  { module: "数据", feature: "股票 / 指数 / 基金查询与日线拉取" },
  { module: "数据", feature: "联网搜索与公告检索" },
];

const landingThemes = {
  blue: {
    root: "bg-[#fbfdff] text-slate-950",
    sidebarBorder: "border-sky-200",
    brand: "text-sky-600",
    brandName: "text-slate-950",
    nav: "text-slate-600",
    navHover: "hover:bg-white hover:text-sky-700",
    asideStatus: "text-sky-500",
    hero: "border border-sky-200 bg-white text-slate-950 shadow-sm",
    heroSubtitle: "text-sky-700",
    heroRisk: "text-slate-500",
    heroCard: "border-sky-200 bg-sky-50",
    heroCardTitle: "text-slate-950",
    heroCardDesc: "text-slate-600",
    githubButton: "border border-sky-500 bg-sky-600 text-white shadow-sm hover:bg-sky-700",
    docsButton: "border border-sky-200 bg-white text-sky-700 hover:bg-sky-50",
    trialButton: "border border-sky-500 bg-white text-sky-600 shadow-sm hover:bg-sky-50 font-semibold",
    panel: "border-sky-200 bg-white shadow-sm",
    timelineBorder: "border-sky-300",
    timelineDot: "border-sky-300 bg-white text-sky-700",
    heading: "text-slate-950",
    bodyText: "text-slate-600",
    examplePanel: "bg-sky-50",
    exampleTitle: "text-slate-900",
    exampleItem: "border-sky-100 bg-white text-slate-700",
    dataCard: "border-sky-200 bg-white shadow-sm",
    dataCardTitle: "text-slate-900",
    bullet: "text-sky-500",
    featureCard: "border-sky-100 bg-sky-50",
    featureModule: "text-sky-600",
    featureText: "text-slate-800",
    footerBorder: "border-sky-200",
    footerText: "text-slate-600",
    footerIcon: "text-sky-600",
    footerLink: "hover:text-sky-800",
    footerBrand: "text-sky-500",
  },
  stone: {
    root: "bg-stone-50 text-stone-900",
    sidebarBorder: "border-stone-200",
    brand: "text-stone-500",
    brandName: "",
    nav: "text-stone-600",
    navHover: "hover:bg-stone-100 hover:text-stone-900",
    asideStatus: "text-stone-400",
    hero: "bg-stone-900 text-stone-100",
    heroSubtitle: "text-stone-200",
    heroRisk: "text-stone-400",
    heroCard: "border-stone-700 bg-stone-800/60",
    heroCardTitle: "",
    heroCardDesc: "text-stone-400",
    githubButton: "border border-white bg-white text-stone-900 hover:bg-stone-100",
    docsButton: "border border-stone-500 text-stone-100 hover:bg-stone-700",
    trialButton: "border border-stone-400 bg-stone-800 text-stone-100 hover:bg-stone-700 font-semibold",
    panel: "border-stone-200 bg-white",
    timelineBorder: "border-stone-300",
    timelineDot: "border-stone-300 bg-white text-stone-600",
    heading: "",
    bodyText: "text-stone-600",
    examplePanel: "bg-stone-100",
    exampleTitle: "text-stone-800",
    exampleItem: "border-stone-200 bg-white text-stone-700",
    dataCard: "border-stone-200 bg-white",
    dataCardTitle: "text-stone-800",
    bullet: "text-stone-400",
    featureCard: "border-stone-100 bg-stone-50",
    featureModule: "text-stone-500",
    featureText: "text-stone-800",
    footerBorder: "border-stone-200",
    footerText: "text-stone-600",
    footerIcon: "",
    footerLink: "hover:text-stone-800",
    footerBrand: "text-stone-400",
  },
} as const;

export type LandingThemeName = keyof typeof landingThemes;

export const DEFAULT_LANDING_THEME: LandingThemeName = "blue";

type LandingPageViewProps = {
  themeName?: LandingThemeName;
};

export const LandingPageView = ({ themeName = DEFAULT_LANDING_THEME }: LandingPageViewProps) => {
  const theme = landingThemes[themeName];

  return (
    <div className={`min-h-screen ${theme.root}`}>
      <div className="mx-auto flex w-full max-w-7xl px-5 sm:px-8 lg:px-10">
        <aside
          className={`hidden border-r ${theme.sidebarBorder} pr-6 pt-10 lg:sticky lg:top-0 lg:flex lg:h-screen lg:w-32 lg:shrink-0 lg:flex-col lg:justify-between lg:pb-10`}
        >
          <div>
            <p
              className={`text-[10px] font-semibold uppercase tracking-[0.15em] ${theme.brand}`}
            >
              AF
            </p>
            <p className={`mt-1 text-xs font-semibold leading-5 ${theme.brandName}`}>
              lilypad
            </p>
          </div>
          <nav className={`mt-8 space-y-1 text-xs ${theme.nav}`}>
            {sections.map((s, i) => (
              <a
                key={s.id}
                href={`#${s.id}`}
                className={`block rounded px-1 py-1.5 ${theme.navHover}`}
              >
                0{i + 1} {s.label}
              </a>
            ))}
          </nav>
          <p className={`text-[10px] ${theme.asideStatus}`}>开发中</p>
        </aside>

        <main className="min-w-0 flex-1 py-8 lg:py-12 lg:pl-8">
          <section id="intro">
            <div className={`rounded-2xl px-8 py-12 sm:px-10 sm:py-14 ${theme.hero}`}>
              <h1 className="max-w-2xl text-3xl font-semibold leading-tight sm:text-4xl">
                旧时金领行研，飞入寻常散户家。
              </h1>
              <p
                className={`mt-2 max-w-xl text-2xl font-semibold leading-tight sm:text-3xl ${theme.heroSubtitle}`}
              >
                强劲的市场研究助手。
              </p>
              <p className={`mt-4 max-w-xl text-xs italic leading-6 ${theme.heroRisk}`}>
                *投资有风险，入市需谨慎。生成式人工智能的输出内容不可代替投资决策——Do Your Own Research.
              </p>

              <div className="mt-10 grid gap-4 sm:grid-cols-3">
                {heroHighlights.map((h) => (
                  <div
                    key={h.title}
                    className={`rounded-lg border px-5 py-4 ${theme.heroCard}`}
                  >
                    <p className={`text-sm font-semibold ${theme.heroCardTitle}`}>
                      {h.title}
                    </p>
                    <p className={`mt-1 text-xs ${theme.heroCardDesc}`}>{h.desc}</p>
                  </div>
                ))}
              </div>

              <div className="mt-8 flex flex-wrap gap-4">
                <a
                  href="https://github.com/willLeek2/alphafrog-micro"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition ${theme.githubButton}`}
                >
                  <Github className="h-4 w-4" />
                  GitHub Repo
                </a>
                <a
                  href="https://alpha.frogwch.com/wiki/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition ${theme.docsButton}`}
                >
                  技术文档
                  <ExternalLink className="h-4 w-4" />
                </a>
                <a
                  href="https://v.wjx.cn/vm/Otxk0Zk.aspx"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition ${theme.docsButton}`}
                >
                  <UserPlus className="h-4 w-4" />
                  获取试用用户
                </a>
              </div>
            </div>
          </section>

          <section
            id="workflow"
            className={`mt-14 rounded-xl border px-8 py-10 sm:px-10 ${theme.panel}`}
          >
            <div className="grid gap-10 lg:grid-cols-[1fr_1fr]">
              <div>
                <h2 className={`text-xl font-semibold ${theme.heading}`}>一次任务怎么推进</h2>
                <ol className={`relative mt-8 border-l pl-6 ${theme.timelineBorder}`}>
                  {workflowSteps.map((step, i) => (
                    <li key={step.title} className="relative pb-8 last:pb-0">
                      <span
                        className={`absolute -left-[1.6rem] flex h-6 w-6 items-center justify-center rounded-full border text-[10px] font-semibold ${theme.timelineDot}`}
                      >
                        {i + 1}
                      </span>
                      <h3 className={`text-sm font-semibold ${theme.heading}`}>{step.title}</h3>
                      <p className={`mt-1 text-sm leading-6 ${theme.bodyText}`}>{step.text}</p>
                    </li>
                  ))}
                </ol>
              </div>
              <div className={`rounded-lg px-6 py-6 ${theme.examplePanel}`}>
                <h3 className={`text-sm font-semibold ${theme.exampleTitle}`}>示例问题</h3>
                <ul className="mt-5 space-y-4">
                  {exampleQuestions.map((q) => (
                    <li
                      key={q}
                      className={`rounded-md border px-4 py-3 text-sm leading-6 ${theme.exampleItem}`}
                    >
                      {q}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </section>

          <section id="data" className="mt-14">
            <h2 className={`text-xl font-semibold ${theme.heading}`}>Agent 可访问的数据</h2>
            <p className={`mt-3 text-sm ${theme.bodyText}`}>
              以下按当前已接入工具整理，不是示意图表。
            </p>
            <div className="mt-8 grid gap-5 sm:grid-cols-2">
              {agentDataAccess.map((block) => (
                <div
                  key={block.group}
                  className={`rounded-xl border p-6 ${theme.dataCard}`}
                >
                  <h3 className={`text-sm font-semibold ${theme.dataCardTitle}`}>
                    {block.group}
                  </h3>
                  <ul className={`mt-4 space-y-2 text-sm ${theme.bodyText}`}>
                    {block.items.map((item) => (
                      <li key={item} className="flex gap-2">
                        <span className={theme.bullet}>·</span>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </section>

          <section
            id="features"
            className={`mt-14 rounded-xl border px-8 py-10 sm:px-10 ${theme.panel}`}
          >
            <h2 className={`text-xl font-semibold ${theme.heading}`}>已完成功能</h2>
            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              {completedFeatures.map((row) => (
                <div
                  key={`${row.module}-${row.feature}`}
                  className={`rounded-lg border px-5 py-4 ${theme.featureCard}`}
                >
                  <p className={`text-xs font-medium ${theme.featureModule}`}>{row.module}</p>
                  <p className={`mt-1 text-sm ${theme.featureText}`}>{row.feature}</p>
                </div>
              ))}
            </div>
          </section>

          <section className={`mt-14 border-t pt-10 ${theme.footerBorder}`}>
            <div className={`grid gap-6 text-sm md:grid-cols-3 ${theme.footerText}`}>
              <div className="flex gap-2">
                <Clock className={`mt-0.5 h-4 w-4 shrink-0 ${theme.footerIcon}`} />
                <p>前端开发中，上线待定。</p>
              </div>
              <div className="flex gap-2">
                <Database className={`mt-0.5 h-4 w-4 shrink-0 ${theme.footerIcon}`} />
                <p>试用 70 CNY API 额度。</p>
              </div>
              <div className="flex gap-2">
                <FileText className={`mt-0.5 h-4 w-4 shrink-0 ${theme.footerIcon}`} />
                <a
                  href="https://alpha.frogwch.com/wiki/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`underline ${theme.footerLink}`}
                >
                  CLI 文档
                </a>
              </div>
            </div>
            <p className={`mt-6 text-xs ${theme.footerBrand}`}>alphafrog-lilypad</p>
          </section>
        </main>
      </div>
    </div>
  );
};

const LandingPage = () => <LandingPageView />;

export default LandingPage;
