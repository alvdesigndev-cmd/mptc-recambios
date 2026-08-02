/// <reference types="vite-plugin-pwa/client" />
// Registro protegido del service worker generado por vite-plugin-pwa.
// - Nunca se registra en dev, iframe, previews de Lovable o con ?sw=off.
// - Cuando hay una versión nueva muestra un aviso breve en pantalla con la
//   versión y una cuenta atrás: se puede recargar ya o cancelar.
// - En cualquier contexto refusado, desregistra el SW existente.
import { toast } from "sonner";

declare const __APP_VERSION__: string;

const SW_URL = "/sw.js";
const AUTO_RELOAD_SECONDS = 8;

function nuevaVersion(): string {
  try {
    return typeof __APP_VERSION__ === "string" ? __APP_VERSION__ : "";
  } catch {
    return "";
  }
}

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

  const { registerSW } = await import("virtual:pwa-register");

  // Sólo recargamos cuando nosotros lo pedimos (aceptar o fin de cuenta atrás),
  // así "Cancelar" mantiene al usuario en la pantalla actual.
  let aplicando = false;
  let avisoActivo = false;

  const updateSW = registerSW({
    immediate: true,
    onNeedRefresh() {
      if (avisoActivo) return;
      avisoActivo = true;

      const version = nuevaVersion();
      const toastId = "mptc-update";
      let restantes = AUTO_RELOAD_SECONDS;
      let timer = 0;

      const cerrar = () => {
        window.clearInterval(timer);
        avisoActivo = false;
        toast.dismiss(toastId);
      };

      const aplicar = () => {
        window.clearInterval(timer);
        aplicando = true;
        toast.dismiss(toastId);
        updateSW(true);
      };

      const pintar = () => {
        toast(
          `Actualización lista${version ? ` · versión ${version}` : ""}`,
          {
            id: toastId,
            description: `Se recargará en ${restantes} s para aplicar los cambios.`,
            duration: Infinity,
            action: { label: "Recargar ya", onClick: aplicar },
            cancel: { label: "Cancelar", onClick: cerrar },
            onDismiss: cerrar,
          },
        );
      };

      pintar();
      timer = window.setInterval(() => {
        restantes -= 1;
        if (restantes <= 0) {
          aplicar();
          return;
        }
        pintar();
      }, 1000);
    },
    onRegisteredSW(_swUrl, reg) {
      if (!reg) return;
      const check = () => {
        if (navigator.onLine === false) return;
        reg.update().catch(() => {});
      };
      const timer = window.setInterval(check, 60_000);
      window.addEventListener("focus", check);
      window.addEventListener("online", check);
      document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "visible") check();
      });
      let reloading = false;
      navigator.serviceWorker.addEventListener("controllerchange", () => {
        if (!aplicando || reloading) return;
        reloading = true;
        window.location.reload();
      });
      window.addEventListener("pagehide", () => window.clearInterval(timer));
      check();
    },
    onRegisterError(err) {
      console.warn("SW registration failed", err);
    },
  });
}
