// Guarda/recupera la última ruta protegida visitada para restaurarla tras login.
const KEY = "mptc:redirectTo";

export function saveRedirectPath(path?: string) {
  try {
    if (typeof window === "undefined") return;
    const p = path ?? window.location.pathname + window.location.search + window.location.hash;
    if (!p || p === "/" || p.startsWith("/auth")) return;
    // Solo aceptamos rutas internas (evita open-redirects).
    if (!p.startsWith("/")) return;
    window.sessionStorage.setItem(KEY, p);
  } catch { /* noop */ }
}

export function consumeRedirectPath(): string | null {
  try {
    if (typeof window === "undefined") return null;
    const p = window.sessionStorage.getItem(KEY);
    if (p) window.sessionStorage.removeItem(KEY);
    if (!p || !p.startsWith("/") || p.startsWith("/auth")) return null;
    return p;
  } catch { return null; }
}

export function pickPostLoginPath(fallback: string): string {
  const saved = consumeRedirectPath();
  if (!saved) return fallback;
  // Coherencia de rol: /pena solo para 'pena', /app para talleres, /admin para admin.
  if (fallback === "/pena" && !saved.startsWith("/pena")) return fallback;
  if (fallback === "/app" && !saved.startsWith("/app")) return fallback;
  if (fallback.startsWith("/admin") && !saved.startsWith("/admin")) return fallback;
  return saved;
}
