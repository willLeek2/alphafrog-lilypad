import type { AuthUser } from "../types/auth";

type ProfilePageProps = {
  user: AuthUser;
};

const ProfilePage = ({ user }: ProfilePageProps) => {
  return (
  <section className="px-6 py-12">
    <div className="mx-auto w-full max-w-5xl space-y-8">
      <div className="rounded-3xl border border-sky-100 bg-white/90 p-8 shadow-card">
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-sky-700">
              个人中心
            </p>
            <h1 className="mt-2 text-3xl font-semibold text-ink-900">
              欢迎回来，{user.username}
            </h1>
            <p className="mt-2 text-sm text-ink-700">
              管理您的账户信息
            </p>
          </div>

        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
        <div className="rounded-3xl border border-sky-100 bg-white/80 p-6 shadow-card">
          <h2 className="text-xl font-semibold text-ink-900">账户信息</h2>
          <dl className="mt-4 space-y-4 text-sm text-ink-700">
            <div className="flex items-center justify-between">
              <dt className="font-semibold text-ink-900">用户 ID</dt>
              <dd>{user.userId ?? user.username}</dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="font-semibold text-ink-900">邮箱</dt>
              <dd>{user.email || "未设置"}</dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="font-semibold text-ink-900">用户类型</dt>
              <dd>{user.userType ?? "未知"}</dd>
            </div>
          </dl>
        </div>
        <div className="rounded-3xl border border-sky-100 bg-sky-50/80 p-6 shadow-card">
          <h2 className="text-xl font-semibold text-ink-900">今日市场新闻</h2>
          <div className="mt-4 space-y-3">
            <div className="rounded-2xl border border-sky-200 bg-white p-4">
              <p className="text-xs text-ink-500 mb-1">09:30</p>
              <p className="text-sm text-ink-700">沪深300指数开盘上涨 0.5%，北向资金净流入 12.3 亿元</p>
            </div>
            <div className="rounded-2xl border border-sky-200 bg-white p-4">
              <p className="text-xs text-ink-500 mb-1">09:15</p>
              <p className="text-sm text-ink-700">央行开展 1000 亿元逆回购操作，维护银行体系流动性合理充裕</p>
            </div>
            <div className="rounded-2xl border border-sky-200 bg-white p-4">
              <p className="text-xs text-ink-500 mb-1">08:45</p>
              <p className="text-sm text-ink-700">隔夜美股三大指数集体收涨，科技股表现强劲</p>
            </div>
          </div>
          <p className="mt-4 text-xs text-ink-500">
            * 数据仅供演示，实际数据将通过后端接口获取
          </p>
        </div>
      </div>
    </div>
  </section>
  );
};

export default ProfilePage;
