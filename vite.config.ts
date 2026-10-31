import { defineConfig, loadEnv, type ProxyOptions } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const apiTarget = (env.VITE_API_BASE_URL || "http://localhost:8090").replace(/\/$/, "");

  const devProxy: Record<string, ProxyOptions> = {};
  for (const prefix of ["/api", "/auth", "/admin", "/credit"]) {
    devProxy[prefix] = {
      target: apiTarget,
      // 保留真实浏览器的 Host 与 Origin；不改写 Origin 来通过后端来源检查。
      changeOrigin: false,
      secure: false,
      bypass(req) {
        // 管理员登录页与接口共用 /admin 前缀，HTML 导航仍交给 React 路由。
        const pathname = req.url?.split("?", 1)[0];
        if (req.method === "GET" && req.headers.accept?.includes("text/html")
            && (pathname === "/admin/login" || pathname === "/admin/register")) {
          return "/index.html";
        }
      },
    };
  }

  return {
    plugins: [react()],
    server: {
      port: 31127,
      proxy: devProxy,
    },
    preview: {
      port: 31127,
      proxy: {
        "/api": {
          target: apiTarget,
          changeOrigin: true,
          secure: false,
        },
      },
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            "vendor-react": ["react", "react-dom", "react-router-dom"],
            "vendor-ui": ["@xyflow/react", "lucide-react", "date-fns", "zustand"],
          },
        },
      },
    },
  };
});
