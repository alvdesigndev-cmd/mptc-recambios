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

// Scripts/estilos que la pestaña actual ya tiene cargados (rutas con hash).
function assetsActuales(): Set<string> {
  const urls = new Set<string>();
  document.querySelectorAll<HTMLScriptElement>("script[src]").forEach((s) => {
    urls.add(new URL(s.src, location.href).pathname);
  });
  document
    .querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"][href], link[rel="modulepreload"][href]')
    .forEach((l) => urls.add(new URL(l.href, location.href).pathname));
  return urls;
}

// Descarga el HTML de la ruta actual (sin caché) y comprueba si referencia
// algún asset con hash que esta pestaña NO tenga ya cargado. Si no hay ninguno
// nuevo, el cambio es sólo del HTML/precache: no hace falta recargar y así
// evitamos parpadeos y volver a pedir todos los datos.
async function necesitaRecarga(): Promise<boolean> {
  try {
    const res = await fetch(location.href, { cache: "no-store", credentials: "same-origin" });
    if (!res.ok) return true;
    const html = await res.text();
    const actuales = assetsActuales();
    const refs = html.match(/(?:src|href)="(\/[^"]+\.(?:js|css))"/g) ?? [];
    for (const ref of refs) {
      const path = ref.replace(/^(?:src|href)="/, "").replace(/"$/, "");
      // Sólo nos importan los bundles con hash: si aparece uno desconocido,
      // el código JS/CSS ha cambiado de verdad.
      if (!/\/assets\//.test(path)) continue;
      if (!actuales.has(path)) return true;
    }
    return false;
  } catch {
    return true;
  }
}

// Evita recargar en medio de una interacción (formularios, modales abiertos).
function usuarioOcupado(): boolean {
  const el = document.activeElement as HTMLElement | null;
  if (el) {
    const tag = el.tagName;
    if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || el.isContentEditable) return true;
  }
  return false;
}

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
    async onNeedRefresh() {
      if (avisoActivo || aplicando) return;

      // Si sólo cambió el HTML (mismos bundles), activamos el SW nuevo en
      // silencio: sin aviso, sin recarga y sin refetch de datos.
      if (!(await necesitaRecarga())) {
        aplicando = false;
        updateSW(false);
        return;
      }

      avisoActivo = true;

      const version = nuevaVersion();
      const toastId = "mptc-update";
      let restantes = AUTO_RELOAD_SECONDS;
      let timer = 0;

      const aplicar = () => {
        window.clearInterval(timer);
        aplicando = true;
        toast.dismiss(toastId);
        updateSW(true);
      };

      // "Reintentar más tarde": cerramos el aviso y lo volvemos a mostrar
      // pasados unos minutos, sin recargar nada mientras tanto.
      const masTarde = () => {
        window.clearInterval(timer);
        avisoActivo = false;
        toast.dismiss(toastId);
        window.setTimeout(() => {
          if (aplicando || avisoActivo) return;
          mostrar();
        }, RETRY_LATER_MS);
      };

      const pintar = () => {
        toast(
          `Actualización lista${version ? ` · versión ${version}` : ""}`,
          {
            id: toastId,
            description: `Se recargará en ${restantes} s. Puedes recargar ahora o reintentar más tarde.`,
            duration: Infinity,
            className: "sm:max-w-[420px]",
            action: { label: "Recargar ahora", onClick: aplicar },
            cancel: { label: "Reintentar más tarde", onClick: masTarde },
            onDismiss: masTarde,
          },
        );
      };

      function mostrar() {
        avisoActivo = true;
        restantes = AUTO_RELOAD_SECONDS;
        pintar();
        timer = window.setInterval(() => {
          restantes -= 1;
          if (restantes <= 0) {
            // Si el usuario está escribiendo, esperamos: nada de recargas
            // en medio de un formulario.
            if (usuarioOcupado()) {
              restantes = 3;
              pintar();
              return;
            }
            aplicar();
            return;
          }
          pintar();
        }, 1000);
      }

      mostrar();

    },
    onRegisteredSW(_swUrl, reg) {
      if (!reg) return;
      // Throttle: como comprobamos en focus/online/visibilidad además del
      // intervalo, evitamos ráfagas de peticiones al SW.
      let ultimaComprobacion = 0;
      const check = () => {
        if (navigator.onLine === false) return;
        const ahora = Date.now();
        if (ahora - ultimaComprobacion < 30_000) return;
        ultimaComprobacion = ahora;
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

