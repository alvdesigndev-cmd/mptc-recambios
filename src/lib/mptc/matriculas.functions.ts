import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const PlateSchema = z.object({
  plate: z.string().trim().toUpperCase().min(4).max(10).regex(/^[A-Z0-9]+$/, "Matrícula inválida"),
  force: z.boolean().optional(),
});

export type PlateLookupResult = {
  ok: boolean;
  plate: string;
  data?: Record<string, unknown>;
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

export const lookupPlate = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => PlateSchema.parse(data))
  .handler(async ({ data }): Promise<PlateLookupResult> => {
    const plate = data.plate;
    const apiKey = process.env.APIVEHICULO_KEY ?? "av_01f9d9d0a71ec10d9ff0d5e82370532bcafd90ff60594c17d5e15849e3f6827b";
    try {
      const url = `https://api.apivehiculo.com/v1/vehicles/lookup?plate=${encodeURIComponent(plate)}&country=ES`;
      const res = await fetch(url, {
        method: "GET",
        headers: { Accept: "application/json", Authorization: `Bearer ${apiKey}` },
      });
      if (!res.ok) return { ok: false, plate, error: res.status === 404 ? "Matrícula no encontrada" : `Error ${res.status}` };
      const json = await res.json();
      const finalData = (json?.data ?? json) as Record<string, unknown>;
      return { ok: true, plate, data: finalData, cached: false };
    } catch {
      return { ok: false, plate, error: "No se pudo consultar la matrícula" };
    }
  });

export const listPlateHistory = createServerFn({ method: "POST" })
  .handler(async (): Promise<{ items: PlateHistoryItem[] }> => {
    return { items: [] };
  });

export const deletePlateHistoryItem = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => (data as { id: string }))
  .handler(async (): Promise<{ ok: true }> => {
    return { ok: true };
  });

export const clearPlateHistory = createServerFn({ method: "POST" })
  .handler(async (): Promise<{ ok: true }> => {
    return { ok: true };
  });
