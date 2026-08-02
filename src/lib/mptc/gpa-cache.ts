/**
 * Caché local (localStorage) de consultas de piezas a GPCat.
 * Evita repetir llamadas a la API para la misma búsqueda + vehículo,
 * lo que acelera mucho el recálculo de presupuestos.
 */
import type { GpaArticulo, GpaCriterio } from "./gpa.functions";

const STORAGE_KEY = "mptc.gpcat.cache.v1";
const TTL_MS = 12 * 60 * 60 * 1000; // 12 h
const MAX_ENTRADAS = 80;

export interface GpaCacheValor {
  articulos: GpaArticulo[];
  criterio: GpaCriterio | null;
  mock: boolean;
  ts: number;
}

type Store = Record<string, GpaCacheValor>;

export interface GpaCacheClaveParams {
  query?: string | undefined;
  categoria?: string | undefined;
  marca?: string | undefined;
  modelo?: string | undefined;
  motor?: string | undefined;
}

function norm(s?: string): string {
  return (s ?? "")
    .toString()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

export function gpaCacheKey(p: GpaCacheClaveParams): string {
  return [norm(p.query), norm(p.categoria), norm(p.marca), norm(p.modelo), norm(p.motor)].join("|");
}

function leerStore(): Store {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Store;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function escribirStore(store: Store): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    /* cuota llena: se ignora, la caché es best-effort */
  }
}

/** Devuelve la consulta cacheada si sigue vigente. */
export function gpaCacheGet(p: GpaCacheClaveParams): GpaCacheValor | null {
  const store = leerStore();
  const v = store[gpaCacheKey(p)];
  if (!v) return null;
  if (Date.now() - v.ts > TTL_MS) return null;
  return v;
}

/** Guarda el resultado de una consulta (no guarda resultados vacíos ni errores). */
export function gpaCacheSet(
  p: GpaCacheClaveParams,
  valor: Omit<GpaCacheValor, "ts">,
): void {
  if (!valor.articulos || valor.articulos.length === 0) return;
  const store = leerStore();
  store[gpaCacheKey(p)] = { ...valor, ts: Date.now() };

  // Poda: caducadas primero, luego las más antiguas si se supera el máximo.
  const ahora = Date.now();
  for (const [k, v] of Object.entries(store)) {
    if (ahora - v.ts > TTL_MS) delete store[k];
  }
  const claves = Object.keys(store);
  if (claves.length > MAX_ENTRADAS) {
    claves
      .sort((a, b) => (store[a]?.ts ?? 0) - (store[b]?.ts ?? 0))
      .slice(0, claves.length - MAX_ENTRADAS)
      .forEach((k) => delete store[k]);
  }
  escribirStore(store);
}

/** Limpia toda la caché de consultas de piezas. */
export function gpaCacheClear(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* noop */
  }
}
