const resolvedBaseUrl = (() => {
  const env = (import.meta as any).env ?? {};
  const envBase =
    typeof env.VITE_API_BASE_URL === "string"
      ? env.VITE_API_BASE_URL.replace(/\/$/, "")
      : "";

  if (envBase) return envBase;

  // Keep localhost behavior for local development only.
  const devFlag = Boolean(env.DEV);
  const host = typeof window !== "undefined" ? window.location.hostname : "";
  const isLocalHost =
    host === "localhost" || host === "127.0.0.1" || host.endsWith(".localhost");

  if (devFlag || isLocalHost) return "http://localhost:3001";

  // Default for deployments.
  return "https://cadillac.onrender.com";
})();

export const API_BASE_URL = resolvedBaseUrl;

export function apiUrl(path: string): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${API_BASE_URL}${normalizedPath}`;
}
