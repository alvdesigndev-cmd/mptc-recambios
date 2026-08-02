import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState, useCallback, useMemo } from "react";
import { Search, Inbox, Truck, X, Mic } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSettings } from "@/lib/mptc/useSettings";
import { GestionCard } from "@/components/mptc/GestionCard";
import { GestionModal } from "@/components/mptc/GestionModal";
import { AudioTranscripcionActions } from "@/components/mptc/AudioTranscripcionActions";
import { AudioPlayer } from "@/components/mptc/AudioPlayer";
import type { Gestion } from "@/lib/mptc/types";
import { FASES, faseDeGestion, type FaseKey } from "@/lib/mptc/fases";

export const Route = createFileRoute("/app/historial")({
  validateSearch: (s: Record<string, unknown>) => ({
    q: typeof s.q === "string" ? s.q : undefined,
  }),
  component: HistorialPage,
});

const FILTROS = ["todas", "en-curso", "enviado", "aceptado", "rechazado", "completado", "pedido-pena", "pedido-directo"] as const;
type Filtro = (typeof FILTROS)[number];

const FILTRO_LABEL: Record<Filtro, string> = {
  "todas": "Todas",
  "en-curso": "En curso",
  "enviado": "Enviado",
  "aceptado": "Aceptado",
  "rechazado": "Rechazado",
  "completado": "Completado",
  "pedido-pena": "Pedido a Peña",
  "pedido-directo": "Pedido directo",
};

interface PedidoDirecto {
  id: string;
  taller_id: string | null;
  taller_nombre: string | null;
  matricula: string | null;
  vehiculo: string | null;
  piezas: string | null;
  notas: string | null;
  estado: string;
  fotos: string[] | null;
  audio_url: string | null;
  transcripcion: string | null;
  created_at: string;
}

function HistorialPage() {
  const navigate = useNavigate();
  const search = Route.useSearch();
  const settings = useSettings({ requireTaller: true });
  const [items, setItems] = useState<Gestion[]>([]);
  const [directos, setDirectos] = useState<PedidoDirecto[]>([]);
  const [filtro, setFiltro] = useState<Filtro>("todas");
  const [fase, setFase] = useState<FaseKey | "todas">("todas");
  const [q, setQ] = useState(search.q ?? "");
  const [open, setOpen] = useState<Gestion | null>(null);
  const [openDirecto, setOpenDirecto] = useState<PedidoDirecto | null>(null);

  const load = useCallback(async () => {
    if (!settings) return;
    const [{ data: g }, { data: d }] = await Promise.all([
      supabase.from("gestiones").select("*")
        .eq("taller_id", settings.tallerId)
        .order("created_at", { ascending: false }),
      supabase.from("pedidos_pena").select("*")
        .eq("taller_id", settings.tallerId)
        .order("created_at", { ascending: false }),
    ]);
    setItems((g as Gestion[]) || []);
    setDirectos((d as PedidoDirecto[]) || []);
  }, [settings]);

  useEffect(() => { load(); }, [load]);

  const filteredGestiones = useMemo(() => {
    if (filtro === "pedido-directo") return [];
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

  const filteredDirectos = useMemo(() => {
    if (filtro !== "todas" && filtro !== "pedido-directo") return [];
    const qq = q.trim().toLowerCase();
    return directos.filter((d) => {
      if (!qq) return true;
      return (
        (d.matricula || "").toLowerCase().includes(qq) ||
        (d.vehiculo || "").toLowerCase().includes(qq) ||
        (d.piezas || "").toLowerCase().includes(qq) ||
        (d.transcripcion || "").toLowerCase().includes(qq)
      );
    });
  }, [directos, filtro, q]);

  // Vista unificada ordenada por fecha
  const feed = useMemo(() => {
    const a = filteredGestiones.map((g) => ({ kind: "g" as const, at: g.created_at, item: g }));
    const b = filteredDirectos.map((d) => ({ kind: "d" as const, at: d.created_at, item: d }));
    return [...a, ...b].sort((x, y) => (x.at < y.at ? 1 : -1));
  }, [filteredGestiones, filteredDirectos]);

  if (!settings) return null;

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Historial</h1>
        <p className="text-sm text-muted-foreground">Filtra por estado o busca por matrícula/cliente. Incluye pedidos directos con audio.</p>
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
              f === "todas" ? items.length + directos.length
              : f === "pedido-pena" ? items.filter((g) => g.pedido_pena).length
              : f === "pedido-directo" ? directos.length
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

      {feed.length === 0 ? (
        <div className="rounded-2xl border border-border bg-surface p-8 text-center">
          <Inbox className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">No hay registros que coincidan.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {feed.map((entry) =>
            entry.kind === "g" ? (
              <GestionCard
                key={"g-" + entry.item.id}
                g={entry.item}
                onClick={() => entry.item.estado === "borrador" ? navigate({ to: "/app/nueva", search: { resume: entry.item.id } }) : setOpen(entry.item)}
                onDelete={async (x) => { await supabase.from("gestiones").delete().eq("id", x.id); load(); }}
              />
            ) : (
              <PedidoDirectoCard
                key={"d-" + entry.item.id}
                p={entry.item}
                onClick={() => setOpenDirecto(entry.item)}
              />
            )
          )}
        </div>
      )}

      <GestionModal gestion={open} onClose={() => setOpen(null)} onChanged={load} />
      <PedidoDirectoModal pedido={openDirecto} onClose={() => setOpenDirecto(null)} onChanged={load} />
    </div>
  );
}

function PedidoDirectoCard({ p, onClick }: { p: PedidoDirecto; onClick: () => void }) {
  const estadoMeta =
    p.estado === "preparado"
      ? { label: "Preparado", cls: "bg-success/15 text-success" }
      : { label: "Pendiente", cls: "bg-accent/15 text-accent" };
  return (
    <button
      onClick={onClick}
      className="flex w-full flex-col items-stretch gap-2 rounded-2xl border border-border bg-surface p-3.5 text-left hover:bg-surface-2"
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="inline-flex h-6 w-6 items-center justify-center rounded-lg bg-accent/15 text-accent">
            <Truck className="h-3.5 w-3.5" />
          </span>
          <span className={"rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase " + estadoMeta.cls}>
            Pedido directo · {estadoMeta.label}
          </span>
          {p.audio_url && (
            <span className="inline-flex items-center gap-1 rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-semibold uppercase text-primary">
              <Mic className="h-3 w-3" /> Audio
            </span>
          )}
        </div>
        <span className="text-[11px] text-muted-foreground">
          {new Date(p.created_at).toLocaleString("es-ES", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
        </span>
      </div>
      <div className="flex items-baseline justify-between gap-2">
        <span className="font-mono text-sm font-bold">{p.matricula || "—"}</span>
        <span className="truncate text-[12px] text-muted-foreground">{p.vehiculo || ""}</span>
      </div>
      <div className="line-clamp-2 text-[13px] text-text-2">{p.piezas || p.transcripcion || "—"}</div>
    </button>
  );
}

function PedidoDirectoModal({
  pedido, onClose, onChanged,
}: { pedido: PedidoDirecto | null; onClose: () => void; onChanged: () => void }) {
  useEffect(() => {
    if (!pedido) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [pedido, onClose]);

  if (!pedido) return null;
  const p = pedido;

  const remove = async () => {
    if (!confirm("¿Eliminar este pedido directo?")) return;
    if (p.audio_url) {
      // intento best-effort de limpiar el audio en storage
      const marker = "/audios-pedidos/";
      const idx = p.audio_url.indexOf(marker);
      if (idx >= 0) {
        const path = p.audio_url.slice(idx + marker.length);
        try { await supabase.storage.from("audios-pedidos").remove([path]); } catch {}
      }
    }
    await supabase.from("pedidos_pena").delete().eq("id", p.id);
    onChanged();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center">
      <div className="max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-surface p-5 sm:rounded-3xl">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-[11px] font-semibold uppercase text-accent">Pedido directo a Peña</div>
            <h2 className="mt-0.5 font-mono text-xl font-bold">{p.matricula || "—"}</h2>
            <div className="text-[12px] text-muted-foreground">{p.vehiculo || ""}</div>
          </div>
          <button onClick={onClose} className="rounded-lg p-2 text-muted-foreground hover:bg-surface-2">
            <X className="h-5 w-5" />
          </button>
        </div>

        {p.audio_url && (
          <div className="mb-3 rounded-2xl border border-border bg-surface-2 p-3">
            <div className="mb-2 inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              <Mic className="h-3 w-3" /> Audio del pedido
            </div>
            <AudioPlayer src={p.audio_url} />
          </div>
        )}

        {(p.audio_url || p.transcripcion) && (
          <div className="mb-3">
            <AudioTranscripcionActions
              audioUrl={p.audio_url}
              transcripcion={p.transcripcion}
              baseName={p.matricula || p.id}
            />
          </div>
        )}

        <div className="space-y-3 text-sm">
          {p.piezas && (
            <div className="border-b border-border pb-2">
              <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Piezas</div>
              <div className="whitespace-pre-wrap">{p.piezas}</div>
            </div>
          )}
          {p.notas && (
            <div className="border-b border-border pb-2">
              <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Notas</div>
              <div className="whitespace-pre-wrap">{p.notas}</div>
            </div>
          )}
          {p.transcripcion && (
            <div className="border-b border-border pb-2">
              <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Transcripción del audio</div>
              <div className="whitespace-pre-wrap text-[13px] leading-relaxed">{p.transcripcion}</div>
            </div>
          )}
          <div className="flex items-center justify-between gap-3 pb-2 text-[12px] text-muted-foreground">
            <span>Estado: <span className="font-semibold text-foreground">{p.estado}</span></span>
            <span>{new Date(p.created_at).toLocaleString("es-ES")}</span>
          </div>
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button
            onClick={remove}
            className="inline-flex items-center gap-2 rounded-xl border border-border-strong bg-surface px-3 py-2 text-sm font-semibold text-destructive"
          >
            Eliminar
          </button>
          <button
            onClick={onClose}
            className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground active:scale-95"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
