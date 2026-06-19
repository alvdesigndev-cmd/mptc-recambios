import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

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
  .inputValidator((data: unknown) => PlateSchema.parse(data))
  .handler(async ({ data }): Promise<PlateLookupResult> => {
    const apiKey = process.env.RAPIDAPI_PLATE_KEY ?? "828a4daeeemsh70039a30f2d1de2p13f5a3jsn9d8c314d8463";
    try {
      const url = `https://matriculas-espana1.p.rapidapi.com/es?plate=${encodeURIComponent(data.plate)}`;
      const res = await fetch(url, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "x-rapidapi-key": apiKey,
          "x-rapidapi-host": "matriculas-espana1.p.rapidapi.com",
        },
      });
      if (!res.ok) return { ok: false, plate: data.plate, error: res.status === 404 ? "Matrícula no encontrada" : `Error ${res.status}` };
      const json = await res.json();
      const item = Array.isArray(json) ? json[0] : json;
      return { ok: true, plate: data.plate, data: item };
    } catch (e) {
      return { ok: false, plate: data.plate, error: "No se pudo consultar la matrícula" };
    }
  });
