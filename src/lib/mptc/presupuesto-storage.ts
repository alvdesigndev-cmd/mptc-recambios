// Genera el PDF del presupuesto, lo descarga, lo guarda en Storage
// y registra el evento con su ruta/fecha en el historial de la gestión.
import { supabase } from "@/integrations/supabase/client";
import { downloadPresupuestoPdf, type PresupuestoPdfOpts } from "./presupuesto-pdf";
import { logEvento } from "./eventos";
import type { Gestion } from "./types";

export const PRESUPUESTOS_BUCKET = "presupuestos";

/** Descarga el PDF y lo archiva en Storage + historial. No rompe si falla la subida. */
export async function generarYGuardarPresupuesto(
  g: Gestion,
  opts: PresupuestoPdfOpts = {},
): Promise<{ path: string | null; filename: string }> {
  const { blob, filename } = downloadPresupuestoPdf(g, opts);
  const path = `${g.taller_id || "sin-taller"}/${g.id}/${Date.now()}-${filename}`;
  try {
    const { error } = await supabase.storage
      .from(PRESUPUESTOS_BUCKET)
      .upload(path, blob, { contentType: "application/pdf", upsert: true });
    if (error) throw error;
    await logEvento({
      gestionId: g.id,
      tallerId: g.taller_id,
      tipo: "presupuesto_generado",
      actor: opts.mecanico || opts.taller || null,
      detalle: `Presupuesto en PDF generado y archivado (${filename})`,
      metadata: { path, filename, importe: g.importe, piezas: g.piezas },
    });
    return { path, filename };
  } catch (e) {
    console.warn("No se pudo archivar el PDF del presupuesto", e);
    return { path: null, filename };
  }
}

/** Devuelve una URL firmada temporal para volver a descargar un PDF archivado. */
export async function getPresupuestoUrl(path: string, expiresIn = 3600): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from(PRESUPUESTOS_BUCKET)
    .createSignedUrl(path, expiresIn);
  if (error || !data?.signedUrl) return null;
  return data.signedUrl;
}
