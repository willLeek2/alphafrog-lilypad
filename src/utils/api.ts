// Get API base URL from environment or default
export function getApiBaseUrl(): string {
  if (typeof import.meta !== 'undefined' && import.meta.env) {
    const raw = import.meta.env.VITE_API_BASE_URL as string | undefined;
    // Dev: same-origin `/api/*` — Vite proxies to VITE_API_BASE_URL (avoids browser CORS on SSE)
    if (import.meta.env.DEV) {
      return '';
    }
    if (raw?.trim()) {
      return raw.replace(/\/$/, '');
    }
    return 'http://localhost:31127';
  }
  return 'http://localhost:31127';
}
