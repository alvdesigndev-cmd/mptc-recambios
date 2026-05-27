import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, useCallback, useMemo } from "react";
import { ArrowRight, Inbox, Truck, Search, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSettings } from "@/lib/mptc/useSettings";
import { GestionCard } from "@/components/mptc/GestionCard";
import { GestionModal } from "@/components/mptc/GestionModal";
import { PedidoDirectoModal } from "@/components/mptc/PedidoDirectoModal";
import type { Gestion } from "@/lib/mptc/types";

export const Route = createFileRoute("/app/")({
  component: Dashboard,
});

interface ClienteRow {
  id: string;
  nombre: string | null;
  telefono: string | null;
  matricula: string | null;
  vehiculo: string | null;
}

function Dashboard() {
  const navigate = useNavigate();
  const settings = useSettings({ requireTaller: true });
  const [items, setItems] = useState<Gestion[]>([]);
  const [open, setOpen] = useState<Gestion | null>(null);
  const [loading, setLoading] = useState(true);
  const [pedidoPenaOpen, setPedidoPenaOpen] = useState(false);
  const [buscador, setBuscador] = useState("");
  const [suggest, setSuggest] = useState<ClienteRow[]>([]);

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

  // Buscador de clientes guardados
  useEffect(() => {
    if (!settings) return;
    const q = buscador.trim();
    if (q.length < 2) { setSuggest([]); return; }
    let cancelled = false;
    const t = setTimeout(async () => {
      const qn = q.replace(/[\s\-_.]/g, "");
      const filters = [
        `matricula.ilike.%${q}%`,
        `telefono.ilike.%${q}%`,
        `nombre.ilike.%${q}%`,
      ];
      if (qn && qn !== q) filters.push(`matricula.ilike.%${qn}%`, `telefono.ilike.%${qn}%`);
      const { data } = await supabase
        .from("clientes")
        .select("id,nombre,telefono,matricula,vehiculo")
        .eq("taller_id", settings.tallerId)
        .or(filters.join(","))
        .limit(8);
      if (!cancelled) setSuggest((data as ClienteRow[]) || []);
    }, 220);
    return () => { cancelled = true; clearTimeout(t); };
  }, [buscador, settings]);

  const pendientes = useMemo(() => items.filter((g) => g.estado === "enviado").slice(0, 5), [items]);
  const recientes = useMemo(() => items.slice(0, 6), [items]);

  if (!settings) return null;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Inicio</h1>
        <p className="text-sm text-muted-foreground">Busca un cliente o continúa una gestión.</p>
      </header>

      {/* Buscador de clientes */}
      <div className="space-y-2">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={buscador}
            onChange={(e) => setBuscador(e.target.value)}
            placeholder="Buscar cliente: nombre, teléfono o matrícula…"
            className="w-full rounded-xl bg-surface-2 py-2.5 pl-9 pr-9 text-sm outline-none placeholder:text-muted-foreground/60 focus:bg-surface-3"
          />
          {buscador && (
            <button
              type="button"
              onClick={() => { setBuscador(""); setSuggest([]); }}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground hover:bg-surface-3"
              aria-label="Limpiar"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        {suggest.length > 0 && (
          <div className="rounded-xl border border-border-strong bg-surface-2">
            {suggest.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => navigate({ to: "/app/nueva", search: { clienteId: c.id } })}
                className="flex w-full items-center justify-between gap-3 border-b border-border px-3 py-2 text-left last:border-b-0 hover:bg-surface-3"
              >
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold">{c.nombre || "(sin nombre)"}</div>
                  <div className="truncate text-[12px] text-muted-foreground">
                    {c.matricula || "—"} · {c.vehiculo || "—"}
                  </div>
                </div>
                <span className="shrink-0 text-[11px] text-primary">Nueva gestión</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Pedido directo */}
      <button
        type="button"
        onClick={() => setPedidoPenaOpen(true)}
        className="flex w-full items-center gap-3 rounded-2xl border border-border bg-surface p-4 text-left transition hover:border-accent/40 hover:bg-surface-2"
      >
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/15 text-accent">
          <Truck className="h-5 w-5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold">Hacer pedido a Grupo Peña</span>
          <span className="block truncate text-[11px] text-muted-foreground">Pedido directo, sin gestión</span>
        </span>
      </button>

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
              <GestionCard
                key={g.id}
                g={g}
                onClick={() => g.estado === "borrador" ? navigate({ to: "/app/nueva", search: { resume: g.id } }) : setOpen(g)}
                onDelete={async (x) => { await supabase.from("gestiones").delete().eq("id", x.id); load(); }}
              />
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
          </div>
        ) : (
          <div className="space-y-2">
            {recientes.map((g) => (
              <GestionCard
                key={g.id}
                g={g}
                onClick={() => g.estado === "borrador" ? navigate({ to: "/app/nueva", search: { resume: g.id } }) : setOpen(g)}
                onDelete={async (x) => { await supabase.from("gestiones").delete().eq("id", x.id); load(); }}
              />
            ))}
          </div>
        )}
      </section>

      <GestionModal gestion={open} onClose={() => setOpen(null)} onChanged={load} />
      {pedidoPenaOpen && (
        <PedidoDirectoModal
          settings={settings}
          onClose={() => setPedidoPenaOpen(false)}
          onSaved={load}
        />
      )}
    </div>
  );
}
