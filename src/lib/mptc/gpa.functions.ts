import { createServerFn } from "@tanstack/react-start";
import {
  gpaMockMode,
  mockConsultaArticulos,
  mockConsultaPedidos,
  mockGenerarPedido,
  mockIniciarSesion,
  fetchGpaToken,
  gpaAuthPost,
  detectarCriterio,
} from "./gpa.server";
import type { GpaArticulo, GpaLineaPedido, GpaCriterio } from "./gpa.server";

export type { GpaArticulo, GpaLineaPedido, GpaCriterio, GpaCriterioCategoria } from "./gpa.server";


/** POST /IniciarSesion — devuelve el token de sesión de GPA (cacheado mientras sea válido). */
export const iniciarSesionGPA = createServerFn({ method: "POST" }).handler(
  async (): Promise<{ ok: boolean; mock: boolean; token: string; expiraEn?: number; error?: string }> => {
    if (gpaMockMode()) return mockIniciarSesion();
    try {
      const token = await fetchGpaToken();
      return { ok: true, mock: false, token };
    } catch {
      return { ok: false, mock: false, token: "", error: "No se pudo conectar con Grupo Peña" };
    }
  },
);


/** POST /ConsultaArticulos — busca artículos por descripción o referencia. */
export const consultaArticulosGPA = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => (data as { query?: string; marca?: string; modelo?: string; motor?: string; matricula?: string; categoria?: string } | undefined) ?? {})
  .handler(async ({ data }): Promise<{ ok: boolean; mock: boolean; articulos: GpaArticulo[]; criterio: GpaCriterio; error?: string }> => {
    const query = (data.query ?? "").toString();
    const categoria = data.categoria ? data.categoria.toString() : undefined;
    if (gpaMockMode()) {
      const r = mockConsultaArticulos(query, categoria);
      return { ok: true, mock: true, articulos: r.articulos, criterio: r.criterio };
    }
    const r = await consultaArticulosReal({
      query,
      categoria,
      marca: data.marca,
      modelo: data.modelo,
      motor: data.motor,
      matricula: data.matricula,
    });
    return { ok: r.ok, mock: false, articulos: r.articulos, criterio: r.criterio, ...(r.error ? { error: r.error } : {}) };
  });


/** POST /GenerarPedido — envía el pedido a Grupo Peña. */
export const generarPedidoGPA = createServerFn({ method: "POST" })
  .inputValidator(
    (data: unknown) =>
      (data as {
        gestionId?: string;
        matricula?: string;
        direccion?: string;
        lineas?: GpaLineaPedido[];
      }) ?? {},
  )
  .handler(async ({ data }): Promise<{ ok: boolean; mock: boolean; numeroPedido: string; total?: number; estado?: string; error?: string }> => {
    const lineas = data.lineas ?? [];
    if (gpaMockMode()) return mockGenerarPedido(lineas);
    try {
      const res = await gpaAuthPost("GenerarPedido", {
        Referencia: data.gestionId,
        Matricula: data.matricula,
        Direccion: data.direccion ?? "Taller",
        Lineas: lineas,
      });
      if (!res.ok) return { ok: false, mock: false, numeroPedido: "", error: `Error ${res.status}` };
      const json = (await res.json()) as { numeroPedido?: string; total?: number; estado?: string };
      return { ok: true, mock: false, numeroPedido: json.numeroPedido ?? "", total: json.total, estado: json.estado };
    } catch {
      return { ok: false, mock: false, numeroPedido: "", error: "No se pudo enviar el pedido" };
    }
  });

/** POST /ConsultaPedidos — lista los pedidos del taller. */
export const consultaPedidosGPA = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => (data as { desde?: string; hasta?: string } | undefined) ?? {})
  .handler(async ({ data }): Promise<{ ok: boolean; mock: boolean; pedidos: Array<{ numeroPedido: string; fecha: string; estado: string; total: number }>; error?: string }> => {
    if (gpaMockMode()) return mockConsultaPedidos();
    try {
      const res = await gpaAuthPost("ConsultaPedidos", { Desde: data.desde, Hasta: data.hasta });
      if (!res.ok) return { ok: false, mock: false, pedidos: [], error: `Error ${res.status}` };
      const json = (await res.json()) as { pedidos?: Array<{ numeroPedido: string; fecha: string; estado: string; total: number }> };
      return { ok: true, mock: false, pedidos: json.pedidos ?? [] };
    } catch {
      return { ok: false, mock: false, pedidos: [], error: "No se pudieron consultar los pedidos" };
    }
  });
