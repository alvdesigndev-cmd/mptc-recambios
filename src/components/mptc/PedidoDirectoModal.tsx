import { useEffect, useState } from "react";
import { Loader2, X, Truck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { buildWAUrl } from "@/lib/mptc/wa";
import { buildPenaMessage } from "@/lib/mptc/messages";
import { PENA_PHONE, type AppSettings } from "@/lib/mptc/profiles";

interface Props {
  settings: AppSettings;
  onClose: () => void;
  onSaved?: () => void;
}

export function PedidoDirectoModal({ settings, onClose, onSaved }: Props) {
  const [f, setF] = useState({ matricula: "", vehiculo: "", piezas: "", notas: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const save = async () => {
    if (!f.piezas.trim()) {
      alert("Indica al menos las piezas que quieres pedir.");
      return;
    }
    // Abrir WhatsApp de forma sincrónica para evitar bloqueo de popups
    const msg = buildPenaMessage({
      taller: settings.tallerName,
      vehiculo: f.vehiculo,
      matricula: f.matricula,
      piezas: f.piezas,
      notas: f.notas,
    });
    const url = buildWAUrl(PENA_PHONE, msg);
    const win = window.open(url, "_blank");

    setSaving(true);
    try {
      const { error } = await supabase.from("pedidos_pena").insert({
        taller_id: settings.tallerId,
        taller_nombre: settings.tallerName,
        matricula: f.matricula || null,
        vehiculo: f.vehiculo || null,
        piezas: f.piezas,
        notas: f.notas || null,
        estado: "pendiente",
      });
      if (error) throw error;
      onSaved?.();
      onClose();
    } catch (e: any) {
      console.error("pedidos_pena insert", e);
      alert("No se pudo guardar el pedido: " + (e?.message || "error desconocido"));
    } finally {
      setSaving(false);
      if (!win) window.location.href = url;
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center">
      <div className="max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-surface p-5 sm:rounded-3xl">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent/15 text-accent">
              <Truck className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-lg font-bold leading-tight">Pedido directo a Peña</h2>
              <div className="text-[11px] text-muted-foreground">No genera gestión — sólo el pedido.</div>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-2 text-muted-foreground hover:bg-surface-2">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-3">
          <Label k="Matrícula (opcional)">
            <input
              value={f.matricula}
              onChange={(e) => setF({ ...f, matricula: e.target.value.toUpperCase() })}
              placeholder="1234 ABC"
              className={inputCls + " font-mono uppercase"}
            />
          </Label>
          <Label k="Vehículo (opcional)">
            <input
              value={f.vehiculo}
              onChange={(e) => setF({ ...f, vehiculo: e.target.value })}
              placeholder="Marca y modelo"
              className={inputCls}
            />
          </Label>
          <Label k="Piezas">
            <textarea
              value={f.piezas}
              onChange={(e) => setF({ ...f, piezas: e.target.value })}
              rows={3}
              placeholder="Ej. 2x pastillas delanteras OEM"
              className={inputCls}
            />
          </Label>
          <Label k="Notas">
            <textarea
              value={f.notas}
              onChange={(e) => setF({ ...f, notas: e.target.value })}
              rows={2}
              className={inputCls}
            />
          </Label>
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-xl border border-border-strong bg-surface px-4 py-2 text-sm font-semibold"
          >
            Cancelar
          </button>
          <button
            onClick={save}
            disabled={saving || !f.piezas.trim()}
            className="inline-flex items-center gap-2 rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground active:scale-95 disabled:opacity-50"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Truck className="h-4 w-4" />}
            Enviar a Peña
          </button>
        </div>
      </div>
    </div>
  );
}

function Label({ k, children }: { k: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1">
      <span className="text-[11px] font-semibold uppercase text-muted-foreground">{k}</span>
      {children}
    </label>
  );
}

const inputCls =
  "w-full rounded-xl bg-surface-2 px-3 py-2.5 text-sm outline-none placeholder:text-muted-foreground/60 focus:bg-surface-3";
