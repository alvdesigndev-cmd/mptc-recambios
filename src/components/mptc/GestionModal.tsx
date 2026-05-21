import { useEffect } from "react";
import { X, Send, Check, XCircle, CheckCheck, Truck, Trash2, Phone } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { buildWAUrl } from "@/lib/mptc/wa";
import { estadoBadge, type Gestion } from "@/lib/mptc/types";
import { PENA_PHONE } from "@/lib/mptc/profiles";
import { buildPenaMessage } from "@/lib/mptc/messages";

interface Props {
  gestion: Gestion | null;
  onClose: () => void;
  onChanged: () => void;
}

export function GestionModal({ gestion, onClose, onChanged }: Props) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  if (!gestion) return null;
  const g = gestion;
  const meta = estadoBadge(g.estado);

  const update = async (patch: Partial<Gestion>) => {
    await supabase.from("gestiones").update(patch).eq("id", g.id);
    onChanged();
    onClose();
  };

  const remove = async () => {
    if (!confirm("¿Eliminar esta gestión?")) return;
    await supabase.from("gestiones").delete().eq("id", g.id);
    onChanged();
    onClose();
  };

  const reenviar = () => {
    if (!g.cliente_telefono) return;
    const url = typeof window !== "undefined"
      ? `${window.location.origin}/confirmar/${g.confirm_token || ""}`
      : "";
    const msg = `Hola ${g.cliente_nombre || ""} 👋\n\nTe recuerdo el presupuesto de tu ${g.vehiculo || ""} (${g.matricula || ""}):\n\n💰 *${g.importe || "—"} €*\n\n✅ Confirma aquí: ${url}`;
    window.open(buildWAUrl(g.cliente_telefono, msg), "_blank", "noopener,noreferrer");
  };

  const pedirPena = async () => {
    // Enviamos directamente al panel de Grupo Peña (sin abrir WhatsApp).
    // La gestión ya contiene toda la información y las fotos adjuntas,
    // que se mostrarán en el panel al marcarla como pedido a Peña.
    await supabase.from("gestiones").update({ pedido_pena: true }).eq("id", g.id);
    onChanged();
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center">
      <div className="max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-surface p-5 sm:rounded-3xl">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className={"rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase " + meta.cls}>
                {meta.label}
              </span>
              {g.pedido_pena && (
                <span className="rounded-full bg-accent/15 px-2 py-0.5 text-[10px] font-semibold uppercase text-accent">
                  Peña
                </span>
              )}
            </div>
            <h2 className="mt-1 truncate text-lg font-bold">{g.cliente_nombre || "Sin cliente"}</h2>
            <div className="font-mono text-[12px] text-muted-foreground">
              {g.matricula} · {g.vehiculo}
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-2 text-muted-foreground hover:bg-surface-2">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-3 text-sm">
          <Row label="Avería" value={g.subfamilia || g.categoria || "—"} />
          <Row label="Importe" value={g.importe ? `${g.importe} €` : "—"} />
          <Row label="Km" value={g.km || "—"} />
          <Row label="Teléfono" value={g.cliente_telefono || "—"} />
          {g.piezas && <Row label="Piezas" value={g.piezas} multiline />}
          {g.descripcion && <Row label="Notas" value={g.descripcion} multiline />}
          {g.objecion && <Row label="Objeción" value={g.objecion} multiline />}
          <Row label="Creada" value={new Date(g.created_at).toLocaleString("es-ES")} />
        </div>

        {g.fotos && g.fotos.length > 0 && (
          <div className="mt-3 grid grid-cols-3 gap-2">
            {g.fotos.map((u, i) => (
              <a key={i} href={u} target="_blank" rel="noreferrer" className="overflow-hidden rounded-xl bg-surface-2">
                <img src={u} alt="" className="aspect-square w-full object-cover" />
              </a>
            ))}
          </div>
        )}

        {/* Acciones según estado */}
        <div className="mt-5 flex flex-wrap gap-2">
          {g.cliente_telefono && (
            <a
              href={`tel:${g.cliente_telefono}`}
              className="inline-flex items-center gap-2 rounded-xl border border-border-strong bg-surface px-3 py-2 text-sm hover:bg-surface-2"
            >
              <Phone className="h-4 w-4" /> Llamar
            </a>
          )}
          {(g.estado === "en-curso" || g.estado === "enviado") && g.cliente_telefono && (
            <button onClick={reenviar} className={btnGhost}>
              <Send className="h-4 w-4" /> {g.estado === "en-curso" ? "Enviar" : "Reenviar"}
            </button>
          )}
          {(g.estado === "enviado" || g.estado === "aceptado") && !g.pedido_pena && (
            <button onClick={pedirPena} className={btnAccent}>
              <Truck className="h-4 w-4" /> Pedir a Peña
            </button>
          )}
          {g.estado === "enviado" && (
            <>
              <button onClick={() => update({ estado: "aceptado" })} className={btnPrimary}>
                <Check className="h-4 w-4" /> Marcar aceptado
              </button>
              <button onClick={() => update({ estado: "rechazado" })} className={btnGhost}>
                <XCircle className="h-4 w-4" /> Rechazado
              </button>
            </>
          )}
          {(g.estado === "aceptado" || g.estado === "enviado") && (
            <button onClick={() => update({ estado: "completado" })} className={btnPrimary}>
              <CheckCheck className="h-4 w-4" /> Completar
            </button>
          )}
          <button onClick={remove} className={btnGhost + " ml-auto text-destructive"}>
            <Trash2 className="h-4 w-4" /> Eliminar
          </button>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, multiline }: { label: string; value: string; multiline?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-border pb-2 last:border-b-0">
      <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</span>
      <span className={"text-right " + (multiline ? "whitespace-pre-wrap" : "truncate")}>{value}</span>
    </div>
  );
}

const btnPrimary = "inline-flex items-center gap-2 rounded-xl bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground active:scale-95";
const btnAccent = "inline-flex items-center gap-2 rounded-xl bg-accent px-3 py-2 text-sm font-semibold text-accent-foreground active:scale-95";
const btnGhost = "inline-flex items-center gap-2 rounded-xl border border-border-strong bg-surface px-3 py-2 text-sm font-semibold hover:bg-surface-2";
