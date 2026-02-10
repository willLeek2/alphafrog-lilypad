import { useEffect, useState } from "react";
import type { AdminOverall, AdminUser } from "../types/admin";
import { adminDelete, adminLogout, adminOverall } from "../api/admin";
import ActionButton from "../components/ActionButton";

type AdminDashboardProps = {
  admin: AdminUser;
  onAdminLogout: () => void;
  onAdminDeleted: () => void;
};

const AdminDashboard = ({ admin, onAdminLogout, onAdminDeleted }: AdminDashboardProps) => {
  const [overview, setOverview] = useState<AdminOverall | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [magicPassword, setMagicPassword] = useState("");

  const loadOverview = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = (await adminOverall(admin.token)) as AdminOverall;
      setOverview(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "加载失败");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOverview();
  }, [admin.token]);

  const handleLogout = async () => {
    try {
      await adminLogout(admin.token);
    } catch {
      // ignore network errors, still clear local state
    }
    onAdminLogout();
  };

  const handleDelete = async () => {
    if (!magicPassword) {
      setDeleteError("请输入 magic password");
      return;
    }
    setDeleteLoading(true);
    setDeleteError(null);
    try {
      await adminDelete(admin.token, {
        magicPassword,
      });
      onAdminDeleted();
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : "删除失败");
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <section className="mx-auto w-full max-w-6xl px-6 py-12">
      <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-center">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.4em] text-amber-600">
            Admin Console
          </p>
          <h1 className="mt-2 text-3xl font-semibold text-ink-900">管理员后台</h1>
          <p className="mt-2 text-sm text-ink-600">
            当前登录：{admin.username}
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <ActionButton variant="outline" onClick={handleLogout}>
            登出
          </ActionButton>
          <ActionButton variant="ghost" onClick={loadOverview}>
            刷新状态
          </ActionButton>
        </div>
      </div>

      <div className="mt-10 rounded-3xl border border-amber-100 bg-white/80 p-6 shadow-glow">
        <h2 className="text-lg font-semibold text-ink-900">爬取数据概览</h2>
        {loading ? (
          <p className="mt-4 text-sm text-ink-600">加载中…</p>
        ) : error ? (
          <p className="mt-4 text-sm text-red-600">{error}</p>
        ) : overview ? (
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { label: "基金数量", value: overview.fundCount },
              { label: "指数数量", value: overview.indexCount },
              { label: "上市股票数量", value: overview.stockCount },
              { label: "基金净值条数", value: overview.fundNavCount },
              { label: "指数日线条数", value: overview.indexDailyCount },
              { label: "股票日线条数", value: overview.stockDailyCount },
            ].map((item) => (
              <div
                key={item.label}
                className="rounded-2xl border border-amber-100 bg-amber-50/50 p-4"
              >
                <p className="text-xs uppercase tracking-[0.2em] text-amber-600">{item.label}</p>
                <p className="mt-3 text-2xl font-semibold text-ink-900">
                  {item.value?.toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-4 text-sm text-ink-600">暂无数据</p>
        )}
      </div>

      <div className="mt-8 rounded-3xl border border-red-100 bg-white/80 p-6">
        <h2 className="text-lg font-semibold text-ink-900">管理员账户操作</h2>
        <p className="mt-2 text-sm text-ink-600">
          删除账号需要 magic password，操作不可撤销。
        </p>
        <div className="mt-4 flex flex-col gap-4 md:flex-row md:items-center">
          <input
            value={magicPassword}
            onChange={(event) => setMagicPassword(event.target.value)}
            className="w-full max-w-sm rounded-2xl border border-red-100 bg-red-50/70 px-4 py-3 text-sm text-ink-900 focus:border-red-300 focus:outline-none"
            placeholder="Magic password"
            type="password"
          />
          <ActionButton variant="danger" disabled={deleteLoading} onClick={handleDelete}>
            {deleteLoading ? "删除中..." : "删除当前管理员账号"}
          </ActionButton>
        </div>
        {deleteError ? (
          <p className="mt-3 text-sm text-red-600">{deleteError}</p>
        ) : null}
      </div>
    </section>
  );
};

export default AdminDashboard;
