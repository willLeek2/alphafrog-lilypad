import { useState } from "react";
import type { AdminUser } from "../types/admin";
import { adminDelete, adminLogout } from "../api/admin";
import ActionButton from "../components/ActionButton";
import { DashboardOverview } from "../components/admin/DashboardOverview";
import { UserManagement } from "../components/admin/UserManagement";
import { CreditApproval } from "../components/admin/CreditApproval";
import { AgentMonitor } from "../components/admin/AgentMonitor";
import { SystemConfig } from "../components/admin/SystemConfig";
import { LayoutDashboard, Users, CreditCard, Settings, Activity, Server } from "lucide-react";

type AdminDashboardProps = {
  admin: AdminUser;
  onAdminLogout: () => void;
  onAdminDeleted: () => void;
};

type Tab = "overview" | "users" | "credits" | "monitor" | "config" | "settings";

const AdminDashboard = ({ admin, onAdminLogout, onAdminDeleted }: AdminDashboardProps) => {
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [magicPassword, setMagicPassword] = useState("");

  const handleLogout = async () => {
    try {
      await adminLogout(admin.token);
    } catch {
      // ignore network errors
    }
    onAdminLogout();
  };

  const handleDelete = async () => {
    if (!magicPassword) {
      setDeleteError("请输入 Magic Password");
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

  const tabs = [
    { id: "overview", label: "概览", icon: LayoutDashboard },
    { id: "users", label: "用户管理", icon: Users },
    { id: "credits", label: "额度审批", icon: CreditCard },
    { id: "monitor", label: "Agent监控", icon: Activity },
    { id: "config", label: "系统配置", icon: Server },
    { id: "settings", label: "设置", icon: Settings },
  ] as const;

  return (
    <section className="mx-auto w-full max-w-7xl px-6 py-8">
      {/* Header */}
      <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-center mb-8">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.4em] text-amber-600">
            Admin Console
          </p>
          <h1 className="mt-2 text-3xl font-semibold text-ink-900">AlphaFrog 管理后台</h1>
          <p className="mt-2 text-sm text-ink-600">
            当前登录: <span className="font-medium text-ink-900">{admin.username}</span>
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <ActionButton variant="outline" onClick={handleLogout}>
            退出登录
          </ActionButton>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex overflow-x-auto border-b border-gray-200 mb-8 gap-6 no-scrollbar">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as Tab)}
              className={`group flex items-center gap-2 border-b-2 py-4 px-1 text-sm font-medium transition-colors whitespace-nowrap ${
                isActive
                  ? "border-amber-500 text-amber-600"
                  : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
              }`}
            >
              <Icon size={18} className={isActive ? "text-amber-500" : "text-gray-400 group-hover:text-gray-500"} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Content Area */}
      <div className="min-h-[500px]">
        {activeTab === "overview" && (
          <DashboardOverview token={admin.token} />
        )}

        {activeTab === "users" && (
          <UserManagement token={admin.token} />
        )}

        {activeTab === "credits" && (
          <CreditApproval token={admin.token} />
        )}

        {activeTab === "monitor" && (
          <AgentMonitor token={admin.token} />
        )}

        {activeTab === "config" && (
          <SystemConfig token={admin.token} />
        )}

        {activeTab === "settings" && (
          <div className="max-w-2xl">
             <div className="rounded-3xl border border-red-100 bg-white p-6">
                <h2 className="text-lg font-semibold text-ink-900 mb-2">危险区域</h2>
                <p className="text-sm text-ink-600 mb-6">
                  以下操作不可逆，请谨慎操作。
                </p>
                
                <div className="rounded-xl bg-red-50 p-4 border border-red-100">
                    <h3 className="font-medium text-red-900 mb-2">删除管理员账号</h3>
                    <p className="text-sm text-red-700 mb-4">
                        永久删除当前管理员账号。您将立即被登出。
                    </p>
                    <div className="flex flex-col gap-4 sm:flex-row">
                        <input
                            value={magicPassword}
                            onChange={(event) => setMagicPassword(event.target.value)}
                            className="flex-1 rounded-xl border border-red-200 bg-white px-4 py-2 text-sm text-ink-900 focus:border-red-400 focus:outline-none placeholder:text-red-300"
                            placeholder="请输入 Magic Password"
                            type="password"
                        />
                        <ActionButton variant="danger" disabled={deleteLoading} onClick={handleDelete}>
                            {deleteLoading ? "删除中..." : "确认删除"}
                        </ActionButton>
                    </div>
                    {deleteError && (
                        <p className="mt-3 text-sm text-red-600 font-medium">{deleteError}</p>
                    )}
                </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
};

export default AdminDashboard;
