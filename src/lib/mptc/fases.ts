import type { Gestion } from "./types";

export const FASES = [
  { key: "borrador", label: "Borrador", short: "Borrador" },
  { key: "plantilla", label: "Plantilla enviada", short: "Enviada" },
  { key: "aceptado", label: "Aceptado por el cliente", short: "Aceptado" },
  { key: "pedido", label: "Pedido confirmado a Peña", short: "Pedido" },
] as const;

export type FaseKey = (typeof FASES)[number]["key"];

export interface FaseInfo {
  /** Índice de la fase alcanzada (0-3). */
  index: number;
  key: FaseKey;
  label: string;
  /** True si la gestión fue rechazada por el cliente. */
  rechazado: boolean;
}

/** Deriva la fase del pipeline a partir del estado y del flag de pedido a Peña. */
export function faseDeGestion(g: Gestion): FaseInfo {
  const rechazado = g.estado === "rechazado";
  let index = 0;

  if (g.pedido_pena) index = 3;
  else if (g.estado === "aceptado" || g.estado === "completado") index = 2;
  else if (g.estado === "enviado" || g.estado === "rechazado" || g.wa_abierto) index = 1;
  else if (g.estado === "borrador") index = 0;
  else index = 0; // en-curso

  const fase = FASES[index]!;
  return { index, key: fase.key, label: fase.label, rechazado };
}

/** Etiquetas de filtro del historial por fase. */
export const FASE_FILTROS = FASES.map((f) => ({ key: f.key, label: f.short }));
