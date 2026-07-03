import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * OCR de matrícula usando Lovable AI Gateway (Gemini 2.5 Flash, multimodal).
 * Recibe la imagen como data URL (base64) y devuelve la matrícula detectada,
 * normalizada en mayúsculas y sin espacios extra.
 */
export const ocrMatricula = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { imageDataUrl: string }) => {
    if (!input?.imageDataUrl?.startsWith("data:image/")) {
      throw new Error("imageDataUrl inválida");
    }
    return input;
  })
  .handler(async ({ data }) => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("LOVABLE_API_KEY no configurada");

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content:
              "Eres un OCR de matrículas de vehículos. Devuelve SOLO la matrícula detectada en la imagen, en mayúsculas, sin espacios ni guiones, sin texto adicional. Si no detectas ninguna matrícula, responde exactamente: NONE.",
          },
          {
            role: "user",
            content: [
              { type: "text", text: "Extrae la matrícula de esta imagen." },
              { type: "image_url", image_url: { url: data.imageDataUrl } },
            ],
          },
        ],
      }),
    });

    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      throw new Error(`Gateway ${res.status}: ${txt.slice(0, 200)}`);
    }
    const json = await res.json();
    const raw: string = json?.choices?.[0]?.message?.content ?? "";
    const cleaned = raw
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, "")
      .trim();
    if (!cleaned || cleaned === "NONE") return { matricula: "" };
    return { matricula: cleaned };
  });
