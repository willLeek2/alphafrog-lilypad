import { clearAuth, clearAdminAuth } from "../utils/storage";

type ApiOptions = RequestInit & {
  token?: string;
};

// 401 错误监听器（用于通知 React 组件）
type UnauthorizedListener = () => void;
let unauthorizedListener: UnauthorizedListener | null = null;

export const setUnauthorizedListener = (listener: UnauthorizedListener | null) => {
  unauthorizedListener = listener;
};

const apiBaseUrl = (() => {
  const raw = import.meta.env.VITE_API_BASE_URL as string | undefined;
  if (!raw) {
    return "";
  }
  return raw.endsWith("/") ? raw.slice(0, -1) : raw;
})();

const buildUrl = (path: string) => {
  if (path.startsWith("http")) {
    return path;
  }
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${apiBaseUrl}${normalizedPath}`;
};

// 处理 401 未授权错误
const handleUnauthorized = () => {
  // 清除本地存储的认证信息
  clearAuth();
  clearAdminAuth();
  
  // 通知监听器（如果有的话）
  if (unauthorizedListener) {
    unauthorizedListener();
  } else {
    // 如果没有监听器，直接跳转到登录页
    const isAdminPath = window.location.pathname.startsWith('/app/admin') || window.location.pathname.startsWith('/admin/');
    window.location.href = isAdminPath ? "/admin/login" : "/login";
  }
};

export const apiFetch = async (path: string, options: ApiOptions = {}) => {
  const { token, headers, ...rest } = options;
  const response = await fetch(buildUrl(path), {
    ...rest,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
  });

  // 处理 401 未授权
  if (response.status === 401) {
    handleUnauthorized();
    throw new Error("登录已过期，请重新登录");
  }

  const contentType = response.headers.get("content-type") || "";
  const payload = contentType.includes("application/json")
    ? await response.json()
    : await response.text();

  if (!response.ok) {
    const message = typeof payload === "string" ? payload : payload?.message;
    throw new Error(message || response.statusText);
  }

  return payload;
};
