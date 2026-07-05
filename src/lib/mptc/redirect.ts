// Guarda/recupera la última ruta protegida visitada para restaurarla tras login.
// Usamos localStorage (no sessionStorage) porque, en modo PWA/standalone,
// tanto iOS como Android limpian sessionStorage al cerrar y reabrir la app.
// Añadimos una expiración para no restaurar rutas antiguas si el usuario
// vuelve al cabo de días.
const KEY = "mptc:redirectTo";
const TTL_MS = 24 * 60 * 60 * 1000; // 24h

interface Saved { path: string; at: number }

export function saveRedirectPath(path?: string) {
  try {
    if (typeof window === "undefined") return;
    const p = path ?? window.location.pathname + window.location.search + window.location.hash;
    if (!p || p === "/" || p.startsWith("/auth")) return;
    if (!p.startsWith("/")) return; // solo rutas internas (anti open-redirect)
    const payload: Saved = { path: p, at: Date.now() };
    window.localStorage.setItem(KEY, JSON.stringify(payload));
  } catch { /* noop */ }
}

export function consumeRedirectPath(): string | null {
  try {
    if (typeof window === "undefined") return null;
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    window.localStorage.removeItem(KEY);
    const parsed = JSON.parse(raw) as Saved;
    if (!parsed?.path || !parsed.path.startsWith("/") || parsed.path.startsWith("/auth")) return null;
    if (typeof parsed.at !== "number" || Date.now() - parsed.at > TTL_MS) return null;
    return parsed.path;
  } catch { return null; }
}

export function pickPostLoginPath(fallback: string): string {
  const saved = consumeRedirectPath();
  if (!saved) return fallback;
  // La página de consentimiento OAuth (MCP) es común a todos los roles.
  if (saved.startsWith("/.lovable/oauth/consent")) return saved;
  // Coherencia de rol: /pena solo para 'pena', /app para talleres, /admin para admin.
  if (fallback === "/pena" && !saved.startsWith("/pena")) return fallback;
  if (fallback === "/app" && !saved.startsWith("/app")) return fallback;
  if (fallback.startsWith("/admin") && !saved.startsWith("/admin")) return fallback;
  return saved;
}

