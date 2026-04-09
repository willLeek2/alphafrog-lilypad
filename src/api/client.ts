type AuthScope = "user" | "admin" | "auto";

type ApiOptions = RequestInit & {
  authScope?: AuthScope;
  token?: string;
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

const resolveAuthScope = (path: string, scope: AuthScope): Exclude<AuthScope, "auto"> => {
  if (scope !== "auto") {
    return scope;
  }
  return path.startsWith("/admin") ? "admin" : "user";
};

export const apiFetch = async (path: string, options: ApiOptions = {}) => {
  const { token, headers, authScope = "auto", ...rest } = options;
  const resolvedScope = resolveAuthScope(path, authScope);
  const response = await fetch(buildUrl(path), {
    ...rest,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
  });

  const contentType = response.headers.get("content-type") || "";
  const payload = contentType.includes("application/json")
    ? await response.json()
    : await response.text();

  if (!response.ok) {
    const message = typeof payload === "string" ? payload : payload?.message;
    const fallbackMessage =
      response.status === 401
        ? `${resolvedScope === "admin" ? "管理员" : "用户"}请求未授权`
        : response.statusText;
    throw new Error(message || fallbackMessage);
  }

  return payload;
};
