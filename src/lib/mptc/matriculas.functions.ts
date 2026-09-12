import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { mapApiData } from "./plate-map";

const PlateSchema = z.object({
  plate: z.string().trim().toUpperCase().min(4).max(10).regex(/^[A-Z0-9]+$/, "Matrícula inválida"),
  force: z.boolean().optional(),
});

/** Días que se considera válida una consulta en caché. */
const CACHE_TTL_DAYS = 30;

export type PlateLookupResult = {
  ok: boolean;
  plate: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data?: Record<string, any>;
  error?: string;
  cached?: boolean;
  fetchedAt?: string;
};

export type PlateHistoryItem = {
  id: string;
  plate: string;
  vehiculo: string | null;
  marca: string | null;
  modelo: string | null;
  ok: boolean;
  cached: boolean;
  error: string | null;
  created_at: string;
};

function errorFromStatus(status: number, body: string): string {
  if (status === 404) return "Matrícula no encontrada";
  if (status === 401 || status === 403) {
    if (/suscrip/i.test(body)) return "La suscripción de la API de matrículas no está activa";
    return "La API de matrículas rechazó la clave de acceso";
  }
  if (status === 429) return "Se ha superado el límite de consultas de la API";
  return `La API de matrículas devolvió un error (${status})`;
}

export const lookupPlate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => PlateSchema.parse(data))
  .handler(async ({ data, context }): Promise<PlateLookupResult> => {
    const plate = data.plate;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const registrar = async (r: PlateLookupResult) => {
      const m = r.data ? mapApiData(r.data) : null;
      let tallerId: string | null = null;
      try {
        const { data: prof } = await supabaseAdmin
          .from("profiles")
          .select("taller_id")
          .eq("user_id", context.userId)
          .maybeSingle();
        tallerId = prof?.taller_id ?? null;
      } catch {
        tallerId = null;
      }
      try {
        await supabaseAdmin.from("plate_lookups_history").insert({
          user_id: context.userId,
          taller_id: tallerId,
          plate,
          vehiculo: m?.vehiculo || null,
          marca: m?.marca || null,
          modelo: m?.modelo || null,
          ok: r.ok,
          cached: !!r.cached,
          error: r.error ?? null,
        });
      } catch {
        /* el historial es informativo: nunca bloquea la consulta */
      }
    };

    // 1) Caché: evita repetir llamadas a la API para la misma matrícula.
    if (!data.force) {
      try {
        const { data: hit } = await supabaseAdmin
          .from("plate_lookups_cache")
          .select("data, fetched_at")
          .eq("plate", plate)
          .maybeSingle();
        if (hit?.data) {
          const age = Date.now() - new Date(hit.fetched_at).getTime();
          if (age < CACHE_TTL_DAYS * 86400000) {
            const res: PlateLookupResult = {
              ok: true,
              plate,
              data: hit.data as Record<string, unknown>,
              cached: true,
              fetchedAt: hit.fetched_at,
            };
            await registrar(res);
            return res;
          }
        }
      } catch {
        /* si la caché falla seguimos con la API */
      }
    }

    const apiKey = process.env["APIVEHICULO_KEY"];
    if (!apiKey) {
      const res: PlateLookupResult = { ok: false, plate, error: "Falta la clave de la API de matrículas" };
      await registrar(res);
      return res;
    }

    try {
      const url = `https://api.apivehiculo.com/v1/vehicles/lookup?plate=${encodeURIComponent(plate)}&country=ES`;
      const apiRes = await fetch(url, {
        method: "GET",
        headers: { Accept: "application/json", Authorization: `Bearer ${apiKey}` },
      });
      const text = await apiRes.text();
      if (!apiRes.ok) {
        const res: PlateLookupResult = { ok: false, plate, error: errorFromStatus(apiRes.status, text) };
        await registrar(res);
        return res;
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let json: any = null;
      try {
        json = JSON.parse(text);
      } catch {
        json = null;
      }
      const finalData = (json?.data ?? json?.vehicle ?? json) as Record<string, unknown> | null;
      if (!finalData || typeof finalData !== "object") {
        const res: PlateLookupResult = { ok: false, plate, error: "Matrícula no encontrada" };
        await registrar(res);
        return res;
      }
      const mapped = mapApiData(finalData);
      if (!mapped.marca && !mapped.modelo && !mapped.vin) {
        const res: PlateLookupResult = { ok: false, plate, error: "No hay datos para esta matrícula" };
        await registrar(res);
        return res;
      }
      const fetchedAt = new Date().toISOString();
      try {
        await supabaseAdmin
          .from("plate_lookups_cache")
          .upsert({ plate, data: finalData, fetched_at: fetchedAt }, { onConflict: "plate" });
      } catch {
        /* la caché es opcional */
      }
      const res: PlateLookupResult = { ok: true, plate, data: finalData, cached: false, fetchedAt };
      await registrar(res);
      return res;
    } catch {
      const res: PlateLookupResult = { ok: false, plate, error: "No se pudo consultar la matrícula" };
      await registrar(res);
      return res;
    }
  });

export const listPlateHistory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => (data as { limit?: number } | undefined) ?? {})
  .handler(async ({ data, context }): Promise<{ items: PlateHistoryItem[] }> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows } = await supabaseAdmin
      .from("plate_lookups_history")
      .select("id, plate, vehiculo, marca, modelo, ok, cached, error, created_at")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false })
      .limit(Math.min(Math.max(data?.limit ?? 50, 1), 200));
    return { items: (rows ?? []) as PlateHistoryItem[] };
  });

export const deletePlateHistoryItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }): Promise<{ ok: true }> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("plate_lookups_history").delete().eq("id", data.id).eq("user_id", context.userId);
    return { ok: true };
  });

export const clearPlateHistory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ ok: true }> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("plate_lookups_history").delete().eq("user_id", context.userId);
    return { ok: true };
  });
