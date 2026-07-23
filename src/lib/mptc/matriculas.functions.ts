import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const PlateSchema = z.object({
  plate: z.string().trim().toUpperCase().min(4).max(10).regex(/^[A-Z0-9]+$/, "Matrícula inválida"),
  force: z.boolean().optional(),
});

export type PlateLookupResult = {
  ok: boolean;
  plate: string;
  data?: Record<string, any>;
  error?: string;
  cached?: boolean;
  fetchedAt?: string;
};

/**
 * TTL de la caché de matrículas en horas.
 * Configurable con la variable de entorno PLATE_CACHE_TTL_HOURS.
 * Por defecto: 720h (30 días). Los datos técnicos de un vehículo apenas cambian,
 * así que evitar llamadas repetidas a APIVehículo ahorra créditos.
 */
function getCacheTtlMs(): number {
  const raw = process.env.PLATE_CACHE_TTL_HOURS;
  const hours = raw ? Number(raw) : 720;
  const safe = Number.isFinite(hours) && hours >= 0 ? hours : 720;
  return safe * 60 * 60 * 1000;
}

export const lookupPlate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => PlateSchema.parse(data))
  .handler(async ({ data, context }): Promise<PlateLookupResult> => {
    const plate = data.plate;
    const ttlMs = getCacheTtlMs();
    const supabase = context.supabase;

    // 1) Intento de caché (a menos que el llamante pida forzar).
    if (!data.force && ttlMs > 0) {
      try {
        const { data: row } = await supabase
          .from("plate_lookups_cache")
          .select("data, fetched_at")
          .eq("plate", plate)
          .maybeSingle();
        if (row?.fetched_at) {
          const age = Date.now() - new Date(row.fetched_at).getTime();
          if (age <= ttlMs) {
            return {
              ok: true,
              plate,
              data: (row.data ?? undefined) as Record<string, any> | undefined,
              cached: true,
              fetchedAt: row.fetched_at,
            };
          }
        }
      } catch {
        // ignorar errores de caché y seguir con la API
      }
    }

    const apiKey = process.env.APIVEHICULO_KEY;
    if (!apiKey) {
      return { ok: false, plate, error: "Servicio no configurado" };
    }
    try {
      const url = `https://api.apivehiculo.com/v1/vehicles/lookup?plate=${encodeURIComponent(plate)}&country=ES`;
      const res = await fetch(url, {
        method: "GET",
        headers: {
          "Accept": "application/json",
          "Authorization": `Bearer ${apiKey}`,
        },
      });
      if (!res.ok) {
        return {
          ok: false,
          plate,
          error: res.status === 404 ? "Matrícula no encontrada" : `Error ${res.status}`,
        };
      }
      const json = await res.json();
      const payload = json?.data;
      if (payload && typeof payload === "object" && payload.error) {
        return {
          ok: false,
          plate,
          error: typeof payload.error === "string" ? payload.error : "Matrícula no encontrada",
        };
      }
      const finalData = (payload ?? json) as Record<string, any>;

      // 2) Guardar/actualizar caché (solo si hay TTL activo).
      if (ttlMs > 0) {
        try {
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          await supabaseAdmin
            .from("plate_lookups_cache")
            .upsert(
              { plate, data: finalData, fetched_at: new Date().toISOString() },
              { onConflict: "plate" },
            );
        } catch {
          // ignorar fallos de escritura de caché
        }
      }

      return { ok: true, plate, data: finalData, cached: false };
    } catch {
      return { ok: false, plate, error: "No se pudo consultar la matrícula" };
    }
  });
