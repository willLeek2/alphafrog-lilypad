import { useState, useEffect } from "react";
import type { AdminOverall } from "../../types/admin";
import { adminOverall } from "../../api/admin";

interface DashboardOverviewProps {
  token: string;
}

export const DashboardOverview = ({ token }: DashboardOverviewProps) => {
  const [overview, setOverview] = useState<AdminOverall | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadOverview = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = (await adminOverall(token)) as AdminOverall;
      setOverview(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "加载失败");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOverview();
  }, [token]);

  return (
    <div className="rounded-3xl border border-amber-100 bg-white/80 p-6 shadow-glow">
        <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-semibold text-ink-900">系统概览</h2>
            <button onClick={loadOverview} className="text-sm text-sky-600 hover:underline">刷新</button>
        </div>
        
        {loading ? (
          <p className="mt-4 text-sm text-ink-600">加载数据中...</p>
        ) : error ? (
          <p className="mt-4 text-sm text-red-600">{error}</p>
        ) : overview ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
  );
};
