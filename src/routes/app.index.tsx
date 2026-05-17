import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { Plus, ArrowRight, Inbox, Truck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSettings } from "@/lib/mptc/useSettings";
import { GestionCard } from "@/components/mptc/GestionCard";
import { GestionModal } from "@/components/mptc/GestionModal";
import { PedidoDirectoModal } from "@/components/mptc/PedidoDirectoModal";
import type { Gestion } from "@/lib/mptc/types";

export const Route = createFileRoute("/app/")({
  component: Dashboard,
});

function Dashboard() {
  const settings = useSettings({ requireTaller: true });
  const [items, setItems] = useState<Gestion[]>([]);
  const [open, setOpen] = useState<Gestion | null>(null);
  const [loading, setLoading] = useState(true);
  const [pedidoPenaOpen, setPedidoPenaOpen] = useState(false);
  const load = useCallback(async () => {
    if (!settings) return;
    setLoading(true);
    const { data } = await supabase
      .from("gestiones")
      .select("*")
      .eq("taller_id", settings.tallerId)
      .order("created_at", { ascending: false })
      .limit(200);
    setItems((data as Gestion[]) || []);
    setLoading(false);
  }, [settings]);

  useEffect(() => { load(); }, [load]);

  if (!settings) return null;

  const today = new Date(); today.setHours(0, 0, 0, 0);
  const isToday = (iso: string) => new Date(iso) >= today;
  const kpis = [
    { label: "Hoy",       value: items.filter((g) => isToday(g.created_at)).length },
    { label: "En curso",  value: items.filter((g) => g.estado === "en-curso").length },
    { label: "Enviadas",  value: items.filter((g) => g.estado === "enviado").length },
    { label: "Aceptadas", value: items.filter((g) => g.estado === "aceptado").length },
  ];

  const pendientes = items.filter((g) => g.estado === "enviado").slice(0, 5);
  const recientes = items.slice(0, 6);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Inicio</h1>
        <p className="text-sm text-muted-foreground">Resumen de tu actividad reciente.</p>
      </header>

      <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {kpis.map((k) => (
          <div key={k.label} className="rounded-2xl border border-border bg-surface p-4">
            <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{k.label}</div>
            <div className="mt-1 text-2xl font-bold">{k.value}</div>
          </div>
        ))}
      </section>

      <section className="grid gap-2 sm:grid-cols-2">
        <Link
          to="/app/nueva"
          className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-4 transition hover:border-primary/40 hover:bg-surface-2"
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15 text-primary">
            <Plus className="h-5 w-5" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-semibold">Nueva gestión</span>
            <span className="block truncate text-[11px] text-muted-foreground">Cliente · avería · presupuesto</span>
          </span>
        </Link>
        <button
          type="button"
          onClick={() => setPedidoPenaOpen(true)}
          className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-4 text-left transition hover:border-accent/40 hover:bg-surface-2"
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/15 text-accent">
            <Truck className="h-5 w-5" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-semibold">Hacer pedido a Grupo Peña</span>
            <span className="block truncate text-[11px] text-muted-foreground">Pedido directo, sin gestión</span>
          </span>
        </button>
      </section>

      {pendientes.length > 0 && (
        <section className="space-y-2">
          <div className="flex items-baseline justify-between">
            <h2 className="text-base font-semibold">Pendientes de respuesta</h2>
            <Link to="/app/historial" className="text-[12px] text-primary hover:underline">
              Ver todas <ArrowRight className="inline h-3 w-3" />
            </Link>
          </div>
          <div className="space-y-2">
            {pendientes.map((g) => (
              <GestionCard key={g.id} g={g} onClick={() => setOpen(g)} />
            ))}
          </div>
        </section>
      )}

      <section className="space-y-2">
        <h2 className="text-base font-semibold">Recientes</h2>
        {loading ? (
          <div className="rounded-2xl border border-border bg-surface p-6 text-center text-sm text-muted-foreground">Cargando…</div>
        ) : recientes.length === 0 ? (
          <div className="rounded-2xl border border-border bg-surface p-8 text-center">
            <Inbox className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Aún no hay gestiones. Crea la primera con el botón <span className="font-semibold text-foreground">+</span>.
            </p>
            <Link to="/app/nueva" className="mt-4 inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground active:scale-95">
              <Plus className="h-4 w-4" /> Nueva gestión
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            {recientes.map((g) => (
              <GestionCard key={g.id} g={g} onClick={() => setOpen(g)} />
            ))}
          </div>
        )}
      </section>

      <GestionModal gestion={open} onClose={() => setOpen(null)} onChanged={load} />
    </div>
  );
}
