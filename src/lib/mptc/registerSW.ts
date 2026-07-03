// Registro protegido del service worker generado por vite-plugin-pwa.
// - Nunca se registra en dev, iframe, previews de Lovable o con ?sw=off.
// - Muestra un toast cuando hay una nueva versión disponible.
// - En cualquier contexto refusado, desregistra el SW existente para no
//   servir HTML/asset caducados.
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

  let reloading = false;
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (reloading) return;
    reloading = true;
    window.location.reload();
  });

  try {
    const reg = await navigator.serviceWorker.register(SW_URL, { scope: "/" });

    const promptUpdate = (waiting: ServiceWorker) => {
      toast("Nueva versión disponible", {
        description: "Recarga para aplicar la actualización.",
        duration: Infinity,
        action: {
          label: "Recargar",
          onClick: () => waiting.postMessage({ type: "SKIP_WAITING" }),
        },
      });
    };

    // Ya hay una versión esperando desde una carga anterior.
    if (reg.waiting && navigator.serviceWorker.controller) {
      promptUpdate(reg.waiting);
    }

    reg.addEventListener("updatefound", () => {
      const installing = reg.installing;
      if (!installing) return;
      installing.addEventListener("statechange", () => {
        if (
          installing.state === "installed" &&
          navigator.serviceWorker.controller &&
          reg.waiting
        ) {
          promptUpdate(reg.waiting);
        }
      });
    });

    // Sondeo puntual de actualizaciones cuando el PWA vuelve a primer plano.
    const checkForUpdate = () => {
      reg.update().catch(() => {});
    };
    window.addEventListener("focus", checkForUpdate);
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") checkForUpdate();
    });
  } catch (err) {
    console.warn("SW registration failed", err);
  }
}
