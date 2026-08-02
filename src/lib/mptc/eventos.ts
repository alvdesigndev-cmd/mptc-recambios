// Historial de eventos por gestión (envíos por WhatsApp, aceptación, pedido a Peña).
import { supabase } from "@/integrations/supabase/client";

export type EventoTipo =
  | "plantilla_enviada"
  | "plantilla_reenviada"
  | "aceptado"
  | "rechazado"
  | "pedido_confirmado"
  | "pedido_enviado"
  | "presupuesto_generado";

export interface GestionEvento {
  id: string;
  gestion_id: string;
  taller_id: string | null;
  tipo: string;
  actor: string | null;
  detalle: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export const EVENTO_LABEL: Record<string, string> = {
  plantilla_enviada: "Plantilla enviada por WhatsApp",
  plantilla_reenviada: "Plantilla reenviada por WhatsApp",
  aceptado: "Aceptado por el cliente",
  rechazado: "Rechazado por el cliente",
  pedido_confirmado: "Pedido confirmado a Grupo Peña",
  pedido_enviado: "Pedido enviado a Grupo Peña",
  presupuesto_generado: "Presupuesto PDF generado",
};

export const EVENTO_ICON: Record<string, string> = {
  plantilla_enviada: "📤",
  plantilla_reenviada: "🔁",
  aceptado: "✅",
  rechazado: "❌",
  pedido_confirmado: "📦",
  pedido_enviado: "🚚",
  presupuesto_generado: "📄",
};

/** Registra un evento. Nunca lanza: el historial no debe romper el flujo. */
export async function logEvento(opts: {
  gestionId: string;
  tallerId?: string | null;
  tipo: EventoTipo;
  actor?: string | null;
  detalle?: string | null;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  try {
    const { data: auth } = await supabase.auth.getUser();
    await supabase.from("gestion_eventos").insert({
      gestion_id: opts.gestionId,
      taller_id: opts.tallerId ?? null,
      tipo: opts.tipo,
      actor: opts.actor ?? auth?.user?.email ?? "taller",
      actor_user_id: auth?.user?.id ?? null,
      detalle: opts.detalle ?? null,
      metadata: (opts.metadata ?? {}) as never,
    });
  } catch (e) {
    console.warn("No se pudo registrar el evento de la gestión", e);
  }
}

/** Lista los eventos de una gestión (más recientes primero). */
export async function listEventos(gestionId: string): Promise<GestionEvento[]> {
  const { data, error } = await supabase
    .from("gestion_eventos")
    .select("*")
    .eq("gestion_id", gestionId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as GestionEvento[];
}

export function formatEventoFecha(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}
