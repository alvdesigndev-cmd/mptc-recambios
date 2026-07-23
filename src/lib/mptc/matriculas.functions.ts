import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const PlateSchema = z.object({
  plate: z.string().trim().toUpperCase().min(4).max(10).regex(/^[A-Z0-9]+$/, "Matrícula inválida"),
});

export type PlateLookupResult = {
  ok: boolean;
  plate: string;
  data?: Record<string, any>;
  error?: string;
};

export const lookupPlate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => PlateSchema.parse(data))
  .handler(async ({ data }): Promise<PlateLookupResult> => {
    const apiKey = process.env.APIVEHICULO_KEY;
    if (!apiKey) {
      return { ok: false, plate: data.plate, error: "Servicio no configurado" };
    }
    try {
      const url = `https://api.apivehiculo.com/v1/lookup?plate=${encodeURIComponent(data.plate)}&country=ES`;
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
          plate: data.plate,
          error: res.status === 404 ? "Matrícula no encontrada" : `Error ${res.status}`,
        };
      }
      const json = await res.json();
      const item = json?.data ?? json;
      return { ok: true, plate: data.plate, data: item };
    } catch (e) {
      return { ok: false, plate: data.plate, error: "No se pudo consultar la matrícula" };
    }
  });
