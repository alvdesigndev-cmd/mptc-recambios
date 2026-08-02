// Envío/reenvío del presupuesto PDF de UNA gestión por WhatsApp.
// Centralizado para que detalle, modal y tarjeta del historial usen
// exactamente el mismo PDF, enlace firmado y registro de eventos.
import { buildWAUrl } from "./wa";
import { logEvento } from "./eventos";
import { generarYGuardarPresupuesto, getPresupuestoUrl } from "./presupuesto-storage";
import type { Gestion } from "./types";

export type EnvioPdfResult = { estado: "enviado" | "pendiente"; filename: string; url: string };

/** ¿Se puede enviar el presupuesto PDF al cliente? */
export const puedeEnviarPdf = (g: Gestion) =>
  !!(g.cliente_telefono || "").trim() && g.estado !== "borrador";

/**
 * Genera y archiva el PDF de esta gestión, crea un enlace firmado (7 días) y
 * abre WhatsApp con el mensaje. Registra `presupuesto_enviado` o
 * `presupuesto_envio_error` en el historial. Lanza si falla.
 */
export async function enviarPresupuestoPdfWhatsApp(
  g: Gestion,
  opts: { taller?: string | null; mecanico?: string | null } = {},
): Promise<EnvioPdfResult> {
  const tel = (g.cliente_telefono || "").trim();
  if (!tel) throw new Error("Falta el teléfono del cliente");
  const actor = opts.mecanico || opts.taller || "taller";

  try {
    const res = await generarYGuardarPresupuesto(
      g,
      { taller: opts.taller ?? g.taller_nombre, mecanico: opts.mecanico ?? null },
      false,
    );
    if (!res.path) throw new Error("No se pudo guardar el PDF para enviarlo");
    const link = await getPresupuestoUrl(res.path, 60 * 60 * 24 * 7);
    if (!link) throw new Error("No se pudo generar el enlace del PDF");

    const msg =
      `Hola${g.cliente_nombre ? ` ${g.cliente_nombre}` : ""}, te envío el presupuesto en PDF ` +
      `de tu ${g.vehiculo || "vehículo"}${g.matricula ? ` (${g.matricula})` : ""}` +
      `${g.importe ? ` por ${g.importe} € IVA incluido` : ""}:\n${link}\n\n` +
      `${opts.taller || g.taller_nombre || "Tu taller"}`;
    const url = buildWAUrl(tel, msg);
    const win = typeof window !== "undefined" ? window.open(url, "_blank") : null;

    await logEvento({
      gestionId: g.id,
      tallerId: g.taller_id,
      tipo: "presupuesto_enviado",
      actor,
      detalle: win
        ? `Presupuesto PDF (${res.filename}) enviado por WhatsApp a ${tel}`
        : `Presupuesto PDF (${res.filename}) preparado para ${tel}: WhatsApp no se pudo abrir automáticamente`,
      metadata: {
        path: res.path,
        filename: res.filename,
        importe: g.importe,
        telefono: tel,
        estado: win ? "enviado" : "pendiente",
      },
    });

    return { estado: win ? "enviado" : "pendiente", filename: res.filename, url };
  } catch (e: any) {
    const motivo = e?.message || "error";
    await logEvento({
      gestionId: g.id,
      tallerId: g.taller_id,
      tipo: "presupuesto_envio_error",
      actor,
      detalle: `No se pudo enviar el presupuesto PDF a ${tel}: ${motivo}`,
      metadata: { telefono: tel, importe: g.importe, error: motivo, estado: "error" },
    });
    throw e instanceof Error ? e : new Error(motivo);
  }
}
