import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useCallback, useMemo } from "react";
import { Search, Inbox } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSettings } from "@/lib/mptc/useSettings";
import { GestionCard } from "@/components/mptc/GestionCard";
import { GestionModal } from "@/components/mptc/GestionModal";
import type { Gestion } from "@/lib/mptc/types";

export const Route = createFileRoute("/app/historial")({
  component: HistorialPage,
});

const FILTROS = ["todas", "en-curso", "enviado", "aceptado", "rechazado", "completado", "pedido-pena"] as const;
type Filtro = (typeof FILTROS)[number];

const FILTRO_LABEL: Record<Filtro, string> = {
  "todas": "Todas",
  "en-curso": "En curso",
  "enviado": "Enviado",
  "aceptado": "Aceptado",
  "rechazado": "Rechazado",
  "completado": "Completado",
  "pedido-pena": "Pedido a Peña",
};

function HistorialPage() {
  const settings = useSettings({ requireTaller: true });
  const [items, setItems] = useState<Gestion[]>([]);
  const [filtro, setFiltro] = useState<Filtro>("todas");
  const [q, setQ] = useState("");
  const [open, setOpen] = useState<Gestion | null>(null);

  const load = useCallback(async () => {
    if (!settings) return;
    const { data } = await supabase
      .from("gestiones")
      .select("*")
      .eq("taller_id", settings.tallerId)
      .order("created_at", { ascending: false });
    setItems((data as Gestion[]) || []);
  }, [settings]);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase();
    return items.filter((g) => {
      if (filtro === "pedido-pena") {
        if (!g.pedido_pena) return false;
      } else if (filtro !== "todas" && g.estado !== filtro) {
        return false;
      }
      if (!qq) return true;
      return (
        (g.cliente_nombre || "").toLowerCase().includes(qq) ||
        (g.matricula || "").toLowerCase().includes(qq) ||
        (g.vehiculo || "").toLowerCase().includes(qq) ||
        (g.subfamilia || "").toLowerCase().includes(qq)
      );
    });
  }, [items, filtro, q]);

  if (!settings) return null;

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Historial</h1>
        <p className="text-sm text-muted-foreground">Filtra por estado o busca por matrícula/cliente.</p>
      </header>

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar…"
          className="w-full rounded-xl bg-surface-2 py-2.5 pl-9 pr-3 text-sm outline-none placeholder:text-muted-foreground/60"
        />
      </div>

      <div className="-mx-4 overflow-x-auto px-4">
        <div className="flex gap-2">
          {FILTROS.map((f) => {
            const active = filtro === f;
            const count =
              f === "todas" ? items.length
              : f === "pedido-pena" ? items.filter((g) => g.pedido_pena).length
              : items.filter((g) => g.estado === f).length;
            return (
              <button
                key={f}
                onClick={() => setFiltro(f)}
                className={
                  "shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition " +
                  (active ? "bg-primary text-primary-foreground" : "bg-surface-2 text-muted-foreground hover:text-foreground")
                }
              >
                {FILTRO_LABEL[f]} <span className="opacity-70">· {count}</span>
              </button>
            );
          })}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-border bg-surface p-8 text-center">
          <Inbox className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">No hay gestiones que coincidan.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((g) => (
            <GestionCard key={g.id} g={g} onClick={() => setOpen(g)} />
          ))}
        </div>
      )}

      <GestionModal gestion={open} onClose={() => setOpen(null)} onChanged={load} />
    </div>
  );
}
