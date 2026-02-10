// Get API base URL from environment or default
export function getApiBaseUrl(): string {
  // Vite env variables
  if (typeof import.meta !== 'undefined' && import.meta.env) {
    return (import.meta.env.VITE_API_BASE_URL as string) || 'http://localhost:31127';
  }
  return 'http://localhost:31127';
}
