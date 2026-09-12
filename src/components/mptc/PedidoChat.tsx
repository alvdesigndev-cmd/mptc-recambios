import { useCallback, useEffect, useRef, useState } from "react";
import { Send } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export interface PedidoMensaje {
  id: string;
  pedido_id: string;
  taller_id: string | null;
  autor_rol: "pena" | "taller";
  autor_nombre: string;
  texto: string;
  created_at: string;
}

/**
 * Chat de un pedido entre Grupo Peña y el taller.
 * `rol` indica desde qué lado se escribe (afecta a la alineación y a las políticas de acceso).
 */
export function PedidoChat({
  pedidoId,
  tallerId,
  rol,
  autorNombre,
}: {
  pedidoId: string;
  tallerId: string | null;
  rol: "pena" | "taller";
  autorNombre: string;
}) {
  const [msgs, setMsgs] = useState<PedidoMensaje[]>([]);
  const [texto, setTexto] = useState("");
  const [busy, setBusy] = useState(false);
  const boxRef = useRef<HTMLDivElement | null>(null);

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from("pedido_mensajes")
      .select("*")
      .eq("pedido_id", pedidoId)
      .order("created_at", { ascending: true })
      .limit(300);
    if (error) return;
    setMsgs((data as PedidoMensaje[]) || []);
  }, [pedidoId]);

  useEffect(() => {
    load();
  }, [load]);

  // Mensajes en tiempo real para este pedido.
  useEffect(() => {
    const ch = supabase
      .channel(`pedido-chat-${pedidoId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "pedido_mensajes", filter: `pedido_id=eq.${pedidoId}` },
        (payload) => setMsgs((prev) => (prev.some((m) => m.id === (payload.new as PedidoMensaje).id) ? prev : [...prev, payload.new as PedidoMensaje])),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [pedidoId]);

  useEffect(() => {
    const el = boxRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [msgs.length]);

  const enviar = async () => {
    const t = texto.trim();
    if (!t || busy) return;
    setBusy(true);
    const { data: u } = await supabase.auth.getUser();
    const { error } = await supabase.from("pedido_mensajes").insert({
      pedido_id: pedidoId,
      taller_id: tallerId,
      autor_rol: rol,
      autor_nombre: autorNombre || (rol === "pena" ? "Grupo Peña" : "Taller"),
      autor_user_id: u.user?.id ?? null,
      texto: t,
    });
    setBusy(false);
    if (error) {
      toast.error("No se pudo enviar el mensaje");
      return;
    }
    setTexto("");
    load();
  };

  return (
    <div className="rounded-2xl border border-border bg-surface-2 p-3">
      <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        Chat del pedido
      </div>

      <div ref={boxRef} className="max-h-56 space-y-2 overflow-y-auto pr-1">
        {msgs.length === 0 && (
          <p className="py-3 text-center text-[12px] text-muted-foreground">
            Todavía no hay mensajes. Escribe el primero.
          </p>
        )}
        {msgs.map((m) => {
          const mine = m.autor_rol === rol;
          return (
            <div key={m.id} className={"flex " + (mine ? "justify-end" : "justify-start")}>
              <div
                className={
                  "max-w-[85%] rounded-2xl px-3 py-2 text-[13px] " +
                  (mine ? "bg-primary text-primary-foreground" : "bg-surface text-foreground")
                }
              >
                <div className="mb-0.5 text-[10px] opacity-70">
                  {m.autor_nombre || (m.autor_rol === "pena" ? "Grupo Peña" : "Taller")} ·{" "}
                  {new Date(m.created_at).toLocaleString("es-ES", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                </div>
                <div className="whitespace-pre-wrap break-words">{m.texto}</div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-2 flex items-end gap-2">
        <textarea
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void enviar();
            }
          }}
          rows={1}
          placeholder="Escribe un mensaje…"
          className="min-h-10 flex-1 resize-none rounded-xl bg-surface px-3 py-2 text-base outline-none placeholder:text-muted-foreground/60 sm:text-sm"
        />
        <button
          onClick={() => void enviar()}
          disabled={busy || !texto.trim()}
          className="shrink-0 rounded-xl bg-primary px-3 py-2.5 text-primary-foreground disabled:opacity-50"
          aria-label="Enviar mensaje"
        >
          <Send className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
