/// <reference types="vite-plugin-pwa/client" />
// Registro protegido del service worker generado por vite-plugin-pwa.
// - Nunca se registra en dev, iframe, previews de Lovable o con ?sw=off.
// - Muestra un toast cuando hay una nueva versión disponible; al aceptar,
//   activa el nuevo SW y recarga la página.
// - En cualquier contexto refusado, desregistra el SW existente.
import { toast } from "sonner";

const SW_URL = "/sw.js";

function isRefusedContext(): boolean {
  if (typeof window === "undefined") return true;
  if (!import.meta.env.PROD) return true;
  try {
    if (window.top !== window.self) return true;
  } catch {
    return true;
  }
  const host = window.location.hostname;
  if (host.startsWith("id-preview--") || host.startsWith("preview--")) return true;
  if (host === "lovableproject.com" || host.endsWith(".lovableproject.com")) return true;
  if (host === "lovableproject-dev.com" || host.endsWith(".lovableproject-dev.com")) return true;
  if (host === "beta.lovable.dev" || host.endsWith(".beta.lovable.dev")) return true;
  if (new URLSearchParams(window.location.search).get("sw") === "off") return true;
  return false;
}

async function unregisterMatching() {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
  try {
    const regs = await navigator.serviceWorker.getRegistrations();
    for (const r of regs) {
      const url = r.active?.scriptURL || r.installing?.scriptURL || r.waiting?.scriptURL || "";
      if (url.endsWith(SW_URL)) await r.unregister();
    }
  } catch {
    /* noop */
  }
}

let started = false;

export async function registerServiceWorker() {
  if (started) return;
  started = true;

  if (isRefusedContext()) {
    await unregisterMatching();
    return;
  }
  if (!("serviceWorker" in navigator)) return;

  // `virtual:pwa-register` está expuesto por vite-plugin-pwa: gestiona el
  // ciclo `waiting → SKIP_WAITING → controllerchange → reload` por nosotros.
  const { registerSW } = await import("virtual:pwa-register");

  const updateSW = registerSW({
    immediate: true,
    // Actualización 100% automática: en cuanto hay una versión nueva se activa
    // el SW y se recarga la app sola (Android, iOS, tablet o PC).
    onNeedRefresh() {
      toast("Actualizando a la última versión…", { duration: 2500 });
      // Pequeño margen para que el toast se vea antes del reload.
      window.setTimeout(() => { updateSW(true); }, 400);
    },
    onRegisteredSW(_swUrl, reg) {
      if (!reg) return;
      const check = () => {
        if (navigator.onLine === false) return;
        reg.update().catch(() => {});
      };
      // 1) Sondeo periódico mientras la app está abierta.
      const timer = window.setInterval(check, 60_000);
      // 2) Al volver a primer plano (cambio de pestaña / app en segundo plano).
      window.addEventListener("focus", check);
      window.addEventListener("online", check);
      document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "visible") check();
      });
      // 3) Si otro SW toma el control, recargamos para servir el HTML nuevo.
      let reloading = false;
      navigator.serviceWorker.addEventListener("controllerchange", () => {
        if (reloading) return;
        reloading = true;
        window.location.reload();
      });
      window.addEventListener("pagehide", () => window.clearInterval(timer));
      // Comprobación inmediata al arrancar.
      check();
    },
    onRegisterError(err) {
      console.warn("SW registration failed", err);
    },
  });
}

