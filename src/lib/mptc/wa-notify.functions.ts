import { createServerFn } from "@tanstack/react-start";

/**
 * Envío automático de avisos por WhatsApp al móvil de Grupo Peña.
 *
 * Queda operativo en cuanto se guarden los secretos de WhatsApp Business:
 *  - WHATSAPP_TOKEN     → token permanente de la app de Meta
 *  - WHATSAPP_PHONE_ID  → ID del número remitente (Meta Cloud API)
 *  - PENA_WHATSAPP_TO   → móvil de Grupo Peña en formato internacional (34600...)
 *
 * Mientras no estén configurados, `estado()` devuelve `configurado: false`
 * y la app sigue usando el aviso manual (abrir WhatsApp).
 */

function config() {
  const token = process.env["WHATSAPP_TOKEN"];
  const phoneId = process.env["WHATSAPP_PHONE_ID"];
  const to = process.env["PENA_WHATSAPP_TO"];
  if (!token || !phoneId || !to) return null;
  return { token, phoneId, to };
}

export const waNotifyEstado = createServerFn({ method: "GET" }).handler(async () => ({
  configurado: !!config(),
}));

export const waNotifyPedido = createServerFn({ method: "POST" })
  .inputValidator((input: { texto: string }) => {
    const texto = String(input?.texto ?? "").slice(0, 3500);
    if (!texto.trim()) throw new Error("Mensaje vacío");
    return { texto };
  })
  .handler(async ({ data }) => {
    const cfg = config();
    if (!cfg) return { sent: false as const, reason: "not_configured" as const };
    try {
      const res = await fetch(`https://graph.facebook.com/v21.0/${cfg.phoneId}/messages`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${cfg.token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: cfg.to,
          type: "text",
          text: { preview_url: false, body: data.texto },
        }),
      });
      if (!res.ok) {
        console.error("waNotifyPedido: respuesta no OK", res.status, (await res.text()).slice(0, 500));
        return { sent: false as const, reason: "provider_error" as const };
      }
      return { sent: true as const, reason: "ok" as const };
    } catch (e) {
      console.error("waNotifyPedido: fallo de red", e);
      return { sent: false as const, reason: "provider_error" as const };
    }
  });
