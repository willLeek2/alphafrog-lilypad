import { ArrowRight, BookOpen, Clock, CreditCard, FileText } from "lucide-react";
import { Link } from "react-router-dom";

const trialFormHref = "#trial";
const cliDocsHref = "#cli";

const sections = [
  { id: "intro", label: "概览" },
  { id: "trial", label: "试用" },
  { id: "cli", label: "CLI" },
];

const statusCards = [
  {
    label: "前端状态",
    value: "开发中",
    detail: "页面和交互仍在调整，正式上线时间待定。",
  },
  {
    label: "试用额度",
    value: "70 CNY",
    detail: "默认 API 额度，用于早期体验和问题反馈。",
  },
  {
    label: "CLI 文档",
    value: "待补充",
    detail: "入口先保留，文档稳定后再接入。",
  },
];

const AgentFrontendStatusPage = () => {
  return (
    <div className="min-h-screen bg-stone-50 text-stone-900">
      <div className="mx-auto flex w-full max-w-7xl px-5 sm:px-8 lg:px-10">
        <aside className="hidden border-r border-stone-200 pr-6 pt-10 lg:sticky lg:top-0 lg:flex lg:h-screen lg:w-32 lg:shrink-0 lg:flex-col lg:justify-between lg:pb-10">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-stone-500">
              AF
            </p>
            <p className="mt-1 text-xs font-semibold leading-5">lilypad</p>
          </div>
          <nav className="mt-8 space-y-1 text-xs text-stone-600">
            {sections.map((s, i) => (
              <a
                key={s.id}
                href={`#${s.id}`}
                className="block rounded px-1 py-1.5 hover:bg-stone-100 hover:text-stone-900"
              >
                0{i + 1} {s.label}
              </a>
            ))}
          </nav>
          <Link
            to="/"
            className="text-[10px] text-stone-500 hover:text-stone-800"
          >
            返回首页
          </Link>
        </aside>

        <main className="min-w-0 flex-1 py-8 lg:py-12 lg:pl-8">
          <section id="intro">
            <div className="rounded-2xl bg-stone-900 px-8 py-12 text-stone-100 sm:px-10 sm:py-14">
              <p className="inline-flex items-center gap-2 text-xs font-medium text-stone-400">
                <Clock className="h-3.5 w-3.5" />
                产品状态说明
              </p>
              <h1 className="mt-4 max-w-2xl text-3xl font-semibold leading-tight sm:text-4xl">
                前端仍在开发中，上线时间待定。
              </h1>
              <p className="mt-4 max-w-xl text-sm leading-7 text-stone-300 sm:text-base">
                目前可以先申请试用。默认提供 70 CNY API 额度，适合体验核心流程并反馈问题。
              </p>
              <div className="mt-8 flex flex-wrap gap-4">
                <a
                  href={trialFormHref}
                  className="inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-semibold text-stone-900"
                >
                  申请试用
                  <ArrowRight className="h-4 w-4" />
                </a>
                <a
                  href={cliDocsHref}
                  className="inline-flex items-center gap-2 rounded-lg border border-stone-600 px-4 py-2 text-sm font-semibold text-stone-100"
                >
                  CLI 文档
                  <FileText className="h-4 w-4" />
                </a>
              </div>
            </div>
          </section>

          <section className="mt-14">
            <div className="grid gap-4 sm:grid-cols-3">
              {statusCards.map((item) => (
                <div
                  key={item.label}
                  className="rounded-xl border border-stone-200 bg-white px-5 py-4"
                >
                  <p className="text-xs font-medium text-stone-500">{item.label}</p>
                  <p className="mt-2 text-xl font-semibold text-stone-900">{item.value}</p>
                  <p className="mt-2 text-sm leading-6 text-stone-600">{item.detail}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="mt-14 rounded-xl border border-stone-200 bg-white px-8 py-10 sm:px-10">
            <div className="grid gap-10 lg:grid-cols-[1fr_1fr]">
              <article id="trial">
                <div className="flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-stone-600" />
                  <h2 className="text-lg font-semibold">申请试用用户</h2>
                </div>
                <p className="mt-4 text-sm leading-7 text-stone-600">
                  试用用户默认获得 70 CNY API 额度。申请入口即将开放。
                </p>
                <a
                  href={trialFormHref}
                  className="mt-6 inline-flex items-center gap-2 rounded-lg bg-stone-900 px-4 py-2.5 text-sm font-semibold text-white"
                >
                  填写试用申请
                  <ArrowRight className="h-4 w-4" />
                </a>
              </article>

              <article id="cli">
                <div className="flex items-center gap-2">
                  <BookOpen className="h-4 w-4 text-stone-600" />
                  <h2 className="text-lg font-semibold">CLI 使用文档</h2>
                </div>
                <p className="mt-4 text-sm leading-7 text-stone-600">
                  CLI 使用说明将在命令、权限和示例稳定后补充。
                </p>
                <a
                  href={cliDocsHref}
                  className="mt-6 inline-flex items-center gap-2 rounded-lg border border-stone-300 bg-stone-50 px-4 py-2.5 text-sm font-semibold text-stone-800"
                >
                  查看 CLI 文档
                  <FileText className="h-4 w-4" />
                </a>
              </article>
            </div>
          </section>

          <section className="mt-14 border-t border-stone-200 pt-10">
            <p className="text-xs text-stone-400">alphafrog-lilypad</p>
          </section>
        </main>
      </div>
    </div>
  );
};

export default AgentFrontendStatusPage;
