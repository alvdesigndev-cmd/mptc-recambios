// Acciones rápidas reutilizables sobre una gestión (historial y detalle):
// reenviar la plantilla al cliente por WhatsApp y confirmar/reintentar el
// pedido a Grupo Peña. Centralizado para que el registro de eventos y los
// cambios de estado sean idénticos en todas las pantallas.
import { supabase } from "@/integrations/supabase/client";
import { buildWAUrl } from "./wa";
import { logEvento } from "./eventos";
import type { Gestion } from "./types";

/** ¿Se puede reenviar la plantilla por WhatsApp? */
export const puedeReenviar = (g: Gestion) =>
  !!g.cliente_telefono && g.estado !== "borrador";

/** ¿Queda pendiente enviar/reintentar el pedido a Peña? */
export const puedePedirPena = (g: Gestion) =>
  !g.pedido_pena && (g.estado === "aceptado" || g.estado === "enviado" || g.estado === "completado");

function mensajeParaCliente(g: Gestion): string {
  const url = typeof window !== "undefined"
    ? `${window.location.origin}/confirmar/${g.confirm_token || ""}`
    : "";
  if (g.mensaje && g.mensaje.trim()) return g.mensaje;
  return `Hola ${g.cliente_nombre || ""} 👋\n\nTe recuerdo el presupuesto de tu ${g.vehiculo || ""} (${g.matricula || ""}):\n\n💰 *${g.importe || "—"} €* (IVA incluido).\n\n✅ Confirma aquí: <${url}>`;
}

/**
 * Reenvía la plantilla al cliente por WhatsApp, marca la gestión como enviada
 * y registra el evento en el historial de la gestión.
 */
export async function reenviarPlantilla(g: Gestion): Promise<void> {
  if (!g.cliente_telefono) throw new Error("La gestión no tiene teléfono del cliente");
  const yaEnviada = g.wa_abierto || g.estado !== "en-curso";
  window.open(buildWAUrl(g.cliente_telefono, mensajeParaCliente(g)), "_blank", "noopener,noreferrer");

  const patch: Partial<Gestion> = { wa_abierto: true };
  if (g.estado === "en-curso" || g.estado === "borrador") patch.estado = "enviado";
  await supabase.from("gestiones").update(patch).eq("id", g.id);
  await logEvento({
    gestionId: g.id,
    tallerId: g.taller_id,
    tipo: yaEnviada ? "plantilla_reenviada" : "plantilla_enviada",
    detalle: yaEnviada ? "Plantilla reenviada al cliente por WhatsApp" : "Plantilla enviada al cliente por WhatsApp",
    metadata: { importe: g.importe, piezas: g.piezas, telefono: g.cliente_telefono },
  });
}

/**
 * Confirma (o reintenta) el pedido a Grupo Peña: abre WhatsApp con el detalle
 * del pedido al número de Peña, marca la gestión y deja traza en el historial.
 * Devuelve "enviado" si se pudo abrir WhatsApp o "pendiente" si el navegador
 * bloqueó la ventana (en ese caso se navega a WhatsApp en la misma pestaña).
 */
export async function pedirAPena(g: Gestion): Promise<"enviado" | "pendiente"> {
  const lista = (g.piezas || "")
    .split(/\n|;/)
    .map((l) => l.replace(/^[-•·]\s*/, "").trim())
    .filter(Boolean)
    .map((l) => `• ${l}`)
    .join("\n");
  const msg =
    `🔧 *Pedido ${g.taller_nombre || ""}*\n\n` +
    `Vehículo: ${g.vehiculo || "—"}${g.matricula ? ` (${g.matricula})` : ""}\n` +
    `Avería: ${g.subfamilia || g.descripcion || "—"}\n\n` +
    `Piezas a pedir:\n${lista || "• (ver gestión en el panel)"}\n\n` +
    `💰 Importe estimado: *${g.importe || "—"} €*`;
  const url = buildWAUrl(PENA_PHONE, msg);
  // Abrimos WhatsApp ANTES de cualquier await para no perder el gesto del
  // usuario (los navegadores bloquean window.open en callbacks asíncronos).
  const win = typeof window !== "undefined" ? window.open(url, "_blank", "noopener,noreferrer") : null;

  const { error } = await supabase.from("gestiones").update({ pedido_pena: true }).eq("id", g.id);
  if (error) throw error;
  await logEvento({
    gestionId: g.id,
    tallerId: g.taller_id,
    tipo: "pedido_confirmado",
    detalle: win
      ? "Pedido confirmado a Grupo Peña (panel + WhatsApp)"
      : "Pedido confirmado en el panel de Grupo Peña; WhatsApp no se pudo abrir automáticamente",
    metadata: { importe: g.importe, piezas: g.piezas, estado: win ? "enviado" : "pendiente" },
  });
  if (!win && typeof window !== "undefined") window.location.href = url;
  return win ? "enviado" : "pendiente";
}

