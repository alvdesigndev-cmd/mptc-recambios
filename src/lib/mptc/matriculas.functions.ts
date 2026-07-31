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

/**
 * TTL de la caché de matrículas en horas.
 * Configurable con la variable de entorno PLATE_CACHE_TTL_HOURS.
 * Por defecto: 720h (30 días).
 */
function getCacheTtlMs(): number {
  const raw = process.env.PLATE_CACHE_TTL_HOURS;
  const hours = raw ? Number(raw) : 720;
  const safe = Number.isFinite(hours) && hours >= 0 ? hours : 720;
  return safe * 60 * 60 * 1000;
}

function pickStr(data: Record<string, unknown> | null | undefined, ...keys: string[]): string {
  if (!data) return "";
  for (const k of keys) {
    const v = data[k];
    if (v === undefined || v === null) continue;
    const s = String(v).trim();
    if (s) return s;
  }
  return "";
}

export const lookupPlate = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => PlateSchema.parse(data))
  .handler(async ({ data }): Promise<PlateLookupResult> => {
    const plate = data.plate;
    const ttlMs = getCacheTtlMs();
    const supabase = context.supabase;
    const userId = context.userId;

    const logHistory = async (result: PlateLookupResult) => {
      try {
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const marca = pickStr(result.data as any, "MARCA", "marca", "brand");
        const modelo = pickStr(result.data as any, "MODELO", "modelo", "model", "modelEn");
        const vehiculo = `${marca} ${modelo}`.trim() || null;
        // taller_id opcional (best-effort)
        let tallerId: string | null = null;
        try {
          const { data: prof } = await supabaseAdmin
            .from("profiles")
            .select("taller_id")
            .eq("user_id", userId)
            .maybeSingle();
          tallerId = (prof as any)?.taller_id ?? null;
        } catch {}
        await supabaseAdmin.from("plate_lookups_history").insert({
          user_id: userId,
          taller_id: tallerId,
          plate,
          vehiculo,
          marca: marca || null,
          modelo: modelo || null,
          ok: result.ok,
          cached: !!result.cached,
          error: result.error ?? null,
        });
      } catch {
        // ignorar errores de historial
      }
    };

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
            const result: PlateLookupResult = {
              ok: true,
              plate,
              data: (row.data ?? undefined) as Record<string, any> | undefined,
              cached: true,
              fetchedAt: row.fetched_at,
            };
            await logHistory(result);
            return result;
          }
        }
      } catch {
        // ignorar errores de caché
      }
    }

    const apiKey = process.env.APIVEHICULO_KEY ?? "av_01f9d9d0a71ec10d9ff0d5e82370532bcafd90ff60594c17d5e15849e3f6827b";
    if (!apiKey) {
      const result: PlateLookupResult = { ok: false, plate, error: "Servicio no configurado" };
      await logHistory(result);
      return result;
    }
    try {
      const url = `https://api.apivehiculo.com/v1/vehicles/lookup?plate=${encodeURIComponent(plate)}&country=ES`;
      const res = await fetch(url, {
        method: "GET",
        headers: { Accept: "application/json", Authorization: `Bearer ${apiKey}` },
      });
      if (!res.ok) {
        const result: PlateLookupResult = {
          ok: false,
          plate,
          error: res.status === 404 ? "Matrícula no encontrada" : `Error ${res.status}`,
        };
        await logHistory(result);
        return result;
      }
      const json = await res.json();
      const payload = json?.data;
      if (payload && typeof payload === "object" && (payload as any).error) {
        const result: PlateLookupResult = {
          ok: false,
          plate,
          error:
            typeof (payload as any).error === "string"
              ? (payload as any).error
              : "Matrícula no encontrada",
        };
        await logHistory(result);
        return result;
      }
      const finalData = (payload ?? json) as Record<string, any>;

      if (ttlMs > 0) {
        try {
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          await supabaseAdmin
            .from("plate_lookups_cache")
            .upsert(
              { plate, data: finalData, fetched_at: new Date().toISOString() },
              { onConflict: "plate" },
            );
        } catch {}
      }

      const result: PlateLookupResult = { ok: true, plate, data: finalData, cached: false };
      await logHistory(result);
      return result;
    } catch {
      const result: PlateLookupResult = { ok: false, plate, error: "No se pudo consultar la matrícula" };
      await logHistory(result);
      return result;
    }
  });

const ListSchema = z.object({
  limit: z.number().int().min(1).max(200).optional(),
  before: z.string().datetime().optional(),
});

export const listPlateHistory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => ListSchema.parse(data ?? {}))
  .handler(async ({ data, context }): Promise<{ items: PlateHistoryItem[] }> => {
    const limit = data.limit ?? 50;
    let q = context.supabase
      .from("plate_lookups_history")
      .select("id, plate, vehiculo, marca, modelo, ok, cached, error, created_at")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false })
      .limit(limit);
    if (data.before) q = q.lt("created_at", data.before);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return { items: (rows as PlateHistoryItem[]) ?? [] };
  });

const DeleteSchema = z.object({ id: z.string().uuid() });

export const deletePlateHistoryItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => DeleteSchema.parse(data))
  .handler(async ({ data, context }): Promise<{ ok: true }> => {
    const { error } = await context.supabase
      .from("plate_lookups_history")
      .delete()
      .eq("id", data.id)
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const clearPlateHistory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ ok: true }> => {
    const { error } = await context.supabase
      .from("plate_lookups_history")
      .delete()
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
