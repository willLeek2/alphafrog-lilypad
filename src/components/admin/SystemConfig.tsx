import { useState, useEffect } from 'react';
import { getSystemConfig, updateSystemConfig } from '../../api/admin';
import ActionButton from '../ActionButton';
import { Settings, Save, RotateCcw, AlertTriangle, Check, Info } from 'lucide-react';
import type { SystemConfigItem } from '../../types/admin';

interface SystemConfigProps {
  token: string;
}

const CATEGORY_COLORS: Record<string, string> = {
  'model': 'bg-violet-50 text-violet-700 border-violet-200',
  'search': 'bg-blue-50 text-blue-700 border-blue-200',
  'agent': 'bg-green-50 text-green-700 border-green-200',
  'system': 'bg-gray-50 text-gray-700 border-gray-200',
};

const CATEGORY_LABELS: Record<string, string> = {
  'model': '模型配置',
  'search': '搜索配置',
  'agent': 'Agent配置',
  'system': '系统配置',
};

export const SystemConfig = ({ token }: SystemConfigProps) => {
  const [configs, setConfigs] = useState<SystemConfigItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [editingValues, setEditingValues] = useState<Record<string, string>>({});
  const [editReasons, setEditReasons] = useState<Record<string, string>>({});
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(['model', 'agent']));
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);

  useEffect(() => {
    fetchConfigs();
  }, [token]);

  const fetchConfigs = async () => {
    setLoading(true);
    try {
      const res = await getSystemConfig(token);
      const configList = res.configs || [];
      setConfigs(configList);
      // Initialize editing values
      const initialValues: Record<string, string> = {};
      configList.forEach(c => {
        initialValues[c.key] = c.value;
      });
      setEditingValues(initialValues);
    } catch (err) {
      console.error("加载系统配置失败", err);
      alert("加载配置失败");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (key: string) => {
    const value = editingValues[key];
    const reason = editReasons[key];

    if (!reason || reason.trim().length < 5) {
      alert("请提供修改原因（至少5个字符）");
      return;
    }

    setSavingKey(key);
    try {
      await updateSystemConfig(token, key, value, reason);
      setSaveSuccess(key);
      setTimeout(() => setSaveSuccess(null), 2000);
      // Clear reason after successful save
      setEditReasons(prev => ({ ...prev, [key]: '' }));
    } catch (err: any) {
      console.error("保存配置失败", err);
      alert("保存失败: " + (err?.message || '未知错误'));
    } finally {
      setSavingKey(null);
    }
  };

  const handleReset = (key: string, originalValue: string) => {
    setEditingValues(prev => ({ ...prev, [key]: originalValue }));
    setEditReasons(prev => ({ ...prev, [key]: '' }));
  };

  const toggleCategory = (category: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  };

  // Group configs by category
  const groupedConfigs = configs.reduce((acc, config) => {
    const category = config.category || 'system';
    if (!acc[category]) acc[category] = [];
    acc[category].push(config);
    return acc;
  }, {} as Record<string, SystemConfigItem[]>);

  // Sort categories
  const sortedCategories = Object.keys(groupedConfigs).sort((a, b) => {
    const order = ['model', 'agent', 'search', 'system'];
    return order.indexOf(a) - order.indexOf(b);
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-sky-200 border-t-sky-600"></div>
          <p className="text-sm text-ink-500">加载配置中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-ink-900 flex items-center gap-2">
            <Settings size={24} className="text-sky-600" />
            系统配置管理
          </h2>
          <p className="text-sm text-ink-500 mt-1">
            管理系统运行参数，修改后将实时生效
          </p>
        </div>
        <ActionButton onClick={fetchConfigs} variant="ghost" className="flex items-center gap-2">
          <RotateCcw size={16} /> 刷新
        </ActionButton>
      </div>

      {/* Warning Banner */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
        <AlertTriangle size={20} className="text-amber-600 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-amber-800">
          <p className="font-medium">谨慎操作</p>
          <p className="mt-1">修改系统配置可能影响服务正常运行。每次修改都需要提供原因，并将记录在审计日志中。</p>
        </div>
      </div>

      {/* Config Groups */}
      <div className="space-y-4">
        {sortedCategories.map(category => {
          const categoryConfigs = groupedConfigs[category];
          const isExpanded = expandedCategories.has(category);
          const categoryClass = CATEGORY_COLORS[category] || CATEGORY_COLORS['system'];

          return (
            <div key={category} className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
              {/* Category Header */}
              <button
                onClick={() => toggleCategory(category)}
                className={`w-full flex items-center justify-between px-6 py-4 ${categoryClass} border-b`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-lg font-semibold">
                    {CATEGORY_LABELS[category] || category}
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-white/50">
                    {categoryConfigs.length} 项配置
                  </span>
                </div>
                <span className="transform transition-transform">
                  {isExpanded ? '▼' : '▶'}
                </span>
              </button>

              {/* Config Items */}
              {isExpanded && (
                <div className="divide-y divide-gray-100">
                  {categoryConfigs.map(config => {
                    const hasChanges = editingValues[config.key] !== config.value;
                    const isSaving = savingKey === config.key;
                    const isSuccess = saveSuccess === config.key;

                    return (
                      <div key={config.key} className="p-6 hover:bg-gray-50/50 transition-colors">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            {/* Key & Description */}
                            <div className="flex items-center gap-2 mb-2">
                              <code className="text-sm font-mono text-sky-700 bg-sky-50 px-2 py-0.5 rounded">
                                {config.key}
                              </code>
                              {!config.editable && (
                                <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                                  只读
                                </span>
                              )}
                              {hasChanges && (
                                <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
                                  已修改
                                </span>
                              )}
                              {isSuccess && (
                                <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 flex items-center gap-1">
                                  <Check size={12} /> 已保存
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-ink-600 mb-3">{config.description}</p>

                            {/* Current Value */}
                            <div className="text-xs text-gray-500 mb-3">
                              当前值: <code className="text-gray-700 bg-gray-100 px-1.5 py-0.5 rounded">{config.value}</code>
                            </div>

                            {/* Edit Area */}
                            {config.editable && (
                              <div className="space-y-3">
                                <textarea
                                  value={editingValues[config.key] || ''}
                                  onChange={(e) => setEditingValues(prev => ({ ...prev, [config.key]: e.target.value }))}
                                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm font-mono focus:border-sky-500 focus:outline-none resize-y min-h-[80px]"
                                  placeholder="输入新值..."
                                />
                                <input
                                  type="text"
                                  value={editReasons[config.key] || ''}
                                  onChange={(e) => setEditReasons(prev => ({ ...prev, [config.key]: e.target.value }))}
                                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none"
                                  placeholder="请输入修改原因（必填，至少5个字符）"
                                />
                              </div>
                            )}
                          </div>

                          {/* Actions */}
                          {config.editable && (
                            <div className="flex items-center gap-2 flex-shrink-0">
                              {hasChanges && (
                                <button
                                  onClick={() => handleReset(config.key, config.value)}
                                  className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition"
                                  title="重置"
                                >
                                  <RotateCcw size={16} />
                                </button>
                              )}
                              <ActionButton
                                onClick={() => handleSave(config.key)}
                                disabled={!hasChanges || isSaving}
                                className="flex items-center gap-1.5"
                              >
                                {isSaving ? (
                                  <>
                                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                                    保存中...
                                  </>
                                ) : (
                                  <>
                                    <Save size={16} />
                                    保存
                                  </>
                                )}
                              </ActionButton>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {configs.length === 0 && !loading && (
        <div className="text-center py-12 text-ink-400">
          <Info size={48} className="mx-auto mb-4 opacity-50" />
          <p>暂无配置项</p>
        </div>
      )}
    </div>
  );
};
