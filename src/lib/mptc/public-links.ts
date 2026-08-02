// Enlaces públicos limpios y permanentes para compartir por WhatsApp.
// Las URLs firmadas de Storage llevan token, caducan y el navegador in-app de
// WhatsApp no las abre bien; estas rutas sirven el archivo directamente.
import { extractFotoPath } from "./fotos";

const FALLBACK_ORIGIN = "https://mptc-recambios.lovable.app";

export function appOrigin(): string {
  if (typeof window !== "undefined" && window.location?.origin) return window.location.origin;
  return FALLBACK_ORIGIN;
}

const encodePath = (path: string) => path.split("/").map(encodeURIComponent).join("/");

/** URL pública de una foto de gestión (acepta URL guardada o ruta del bucket). */
export function publicFotoUrl(stored: string): string {
  const path = extractFotoPath(stored);
  if (!path) return stored;
  return `${appOrigin()}/api/public/foto/${encodePath(path)}`;
}

export const publicFotoUrls = (urls?: string[] | null): string[] =>
  (urls || []).map(publicFotoUrl);

/** URL pública del PDF de un presupuesto archivado (ruta dentro del bucket). */
export function publicPresupuestoUrl(path: string): string {
  return `${appOrigin()}/api/public/presupuesto/${encodePath(path.replace(/^\/+/, ""))}`;
}
