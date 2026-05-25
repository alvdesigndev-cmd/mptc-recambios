import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, AlertTriangle, Truck, CheckCircle2, PackageCheck, Send, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/pedido-pena/$token")({
  head: () => ({
    meta: [
      { title: "Estado del pedido · Grupo Peña" },
      { name: "description", content: "Actualiza el estado de un pedido directo a Grupo Peña." },
    ],
  }),
  component: PedidoPenaConfirm,
});

type Estado = "pendiente" | "aceptado" | "preparacion" | "enviado" | "entregado";

const ESTADOS: { v: Estado; label: string; icon: any; cls: string }[] = [
  { v: "aceptado",    label: "Aceptado",      icon: CheckCircle2, cls: "bg-accent text-accent-foreground" },
  { v: "preparacion", label: "En preparación", icon: Clock,        cls: "bg-warning text-warning-foreground" },
  { v: "enviado",     label: "Enviado",       icon: Send,         cls: "bg-primary text-primary-foreground" },
  { v: "entregado",   label: "Entregado",     icon: PackageCheck, cls: "bg-success text-success-foreground" },
];

interface Pedido {
  id: string;
  taller_nombre: string | null;
  matricula: string | null;
  vehiculo: string | null;
  piezas: string | null;
  estado: string;
  created_at: string;
}

function PedidoPenaConfirm() {
  const { token } = Route.useParams();
  const [loading, setLoading] = useState(true);
  const [pedido, setPedido] = useState<Pedido | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [saving, setSaving] = useState<Estado | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase.rpc("get_pedido_pena_by_token", { _token: token });
    const row = Array.isArray(data) ? data[0] : data;
    if (error || !row) { setNotFound(true); setLoading(false); return; }
    setPedido(row as Pedido);
    setLoading(false);
  };

  useEffect(() => { load(); }, [token]);

  const setEstado = async (estado: Estado) => {
    setSaving(estado);
    setMsg(null);
    const { error } = await supabase.rpc("actualizar_estado_pedido_pena", { _token: token, _estado: estado });
    setSaving(null);
    if (error) { setMsg("No se pudo actualizar el estado."); return; }
    setMsg("Estado actualizado correctamente.");
    load();
  };

  return (
    <div className="mptc-splash-bg flex min-h-[100dvh] items-center justify-center p-6">
      <div className="w-full max-w-md rounded-3xl border border-border-strong bg-surface p-6 shadow-[var(--shadow-elegant)]">
        <div className="mb-4 flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/15 text-accent">
            <Truck className="h-5 w-5" />
          </span>
          <div>
            <h1 className="text-lg font-bold leading-tight">Pedido a Grupo Peña</h1>
            <div className="text-[11px] text-muted-foreground">Selecciona el estado del pedido</div>
          </div>
        </div>

        {loading && (
          <div className="py-10 text-center">
            <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
          </div>
        )}

        {!loading && notFound && (
          <div className="py-8 text-center">
            <AlertTriangle className="mx-auto h-10 w-10 text-destructive" />
            <p className="mt-3 text-sm font-semibold">Enlace no válido</p>
            <p className="mt-1 text-xs text-muted-foreground">Este pedido no existe o el enlace caducó.</p>
          </div>
        )}

        {!loading && pedido && (
          <>
            <div className="space-y-1 rounded-2xl bg-surface-2 p-4 text-sm">
              <div><span className="text-muted-foreground">Taller:</span> <b>{pedido.taller_nombre || "—"}</b></div>
              {pedido.matricula && <div><span className="text-muted-foreground">Matrícula:</span> <span className="font-mono font-bold">{pedido.matricula}</span></div>}
              {pedido.vehiculo && <div><span className="text-muted-foreground">Vehículo:</span> {pedido.vehiculo}</div>}
              {pedido.piezas && <div className="pt-1"><span className="text-muted-foreground">Piezas:</span><br/><span className="whitespace-pre-wrap">{pedido.piezas}</span></div>}
              <div className="pt-2 text-[11px] text-muted-foreground">Estado actual: <b className="text-foreground">{pedido.estado}</b></div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2">
              {ESTADOS.map((e) => {
                const Icon = e.icon;
                const active = pedido.estado === e.v;
                return (
                  <button
                    key={e.v}
                    type="button"
                    onClick={() => setEstado(e.v)}
                    disabled={saving !== null}
                    className={
                      "inline-flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold transition disabled:opacity-50 " +
                      (active ? e.cls + " ring-2 ring-offset-2 ring-offset-surface ring-foreground/30" : "border border-border-strong bg-surface hover:bg-surface-2")
                    }
                  >
                    {saving === e.v ? <Loader2 className="h-4 w-4 animate-spin" /> : <Icon className="h-4 w-4" />}
                    {e.label}
                  </button>
                );
              })}
            </div>

            {msg && <p className="mt-3 text-center text-xs text-muted-foreground">{msg}</p>}
          </>
        )}
      </div>
    </div>
  );
}
