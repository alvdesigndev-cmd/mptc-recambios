import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const PlateSchema = z.object({
  plate: z
    .string()
    .trim()
    .toUpperCase()
    .min(4)
    .max(10)
    .regex(/^[A-Z0-9]+$/, "Matrícula inválida"),
});

type JsonValue = string | number | boolean | null | JsonValue[] | { [k: string]: JsonValue };

export type PlateLookupResult = {
  ok: boolean;
  plate: string;
  data?: JsonValue;
  error?: string;
};

export const lookupPlate = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => PlateSchema.parse(data))
  .handler(async ({ data }): Promise<PlateLookupResult> => {
    const apiKey = process.env.RAPIDAPI_PLATE_KEY;
    if (!apiKey) {
      return { ok: false, plate: data.plate, error: "Falta configurar RAPIDAPI_PLATE_KEY" };
    }
    try {
      const url = `https://api-license-plate.p.rapidapi.com/es?plate=${encodeURIComponent(data.plate)}`;
      const res = await fetch(url, {
        method: "GET",
        headers: {
          "X-RapidAPI-Key": apiKey,
          "X-RapidAPI-Host": "api-license-plate.p.rapidapi.com",
        },
      });
      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        console.error("[plate] upstream error", res.status, txt);
        return {
          ok: false,
          plate: data.plate,
          error: res.status === 404 ? "Matrícula no encontrada" : `Error ${res.status}`,
        };
      }
      const json = (await res.json()) as JsonValue;
      return { ok: true, plate: data.plate, data: json };
    } catch (e) {
      console.error("[plate] fetch failed", e);
      return { ok: false, plate: data.plate, error: "No se pudo consultar la matrícula" };
    }
  });
