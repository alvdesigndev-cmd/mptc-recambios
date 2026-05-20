import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Bell, CheckCircle2, XCircle, Package, Hammer, Send, Truck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type Kind =
  | "gestion-aceptada"
  | "gestion-rechazada"
  | "pedido-aceptado"
  | "pedido-preparacion"
  | "pedido-enviado"
  | "pedido-entregado";

interface Notif {
  id: string;
  kind: Kind;
  title: string;
  subtitle: string;
  at: string;
}

const META: Record<Kind, { label: string; cls: string; Icon: typeof Bell }> = {
  "gestion-aceptada":   { label: "Cliente aceptó el presupuesto",  cls: "text-success",     Icon: CheckCircle2 },
  "gestion-rechazada":  { label: "Cliente rechazó el presupuesto", cls: "text-destructive", Icon: XCircle },
  "pedido-aceptado":    { label: "Peña aceptó el pedido",          cls: "text-accent",      Icon: Package },
  "pedido-preparacion": { label: "Pedido en preparación",          cls: "text-warning",     Icon: Hammer },
  "pedido-enviado":     { label: "Pedido enviado",                 cls: "text-primary",     Icon: Send },
  "pedido-entregado":   { label: "Pedido entregado",               cls: "text-success",     Icon: Truck },
};

const PEDIDO_KIND: Record<string, Kind | undefined> = {
  aceptado: "pedido-aceptado",
  preparacion: "pedido-preparacion",
  enviado: "pedido-enviado",
  entregado: "pedido-entregado",
  preparado: "pedido-entregado", // legado
};

export function NotificationsBell({ tallerId }: { tallerId: string }) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Notif[]>([]);
  const [lastSeen, setLastSeen] = useState<number>(() => {
    if (typeof window === "undefined") return 0;
    return Number(localStorage.getItem(`notif-lastseen-${tallerId}`) || 0);
  });
  const ref = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    const [{ data: g }, { data: p }] = await Promise.all([
      supabase
        .from("gestiones")
        .select("id,matricula,cliente_nombre,vehiculo,estado,pedido_pena,created_at")
        .eq("taller_id", tallerId)
        .order("created_at", { ascending: false })
        .limit(60),
      supabase
        .from("pedidos_pena")
        .select("id,matricula,vehiculo,piezas,estado,created_at")
        .eq("taller_id", tallerId)
        .order("created_at", { ascending: false })
        .limit(60),
    ]);

    const out: Notif[] = [];
    (g || []).forEach((x: any) => {
      const sub = `${x.matricula || "—"} · ${x.cliente_nombre || x.vehiculo || ""}`;
      if (x.estado === "aceptado") {
        out.push({ id: "ga-" + x.id, kind: "gestion-aceptada", title: META["gestion-aceptada"].label, subtitle: sub, at: x.created_at });
      } else if (x.estado === "rechazado") {
        out.push({ id: "gr-" + x.id, kind: "gestion-rechazada", title: META["gestion-rechazada"].label, subtitle: sub, at: x.created_at });
      }
      if (x.pedido_pena && x.estado === "completado") {
        out.push({ id: "gp-" + x.id, kind: "pedido-entregado", title: "Pedido (gestión) preparado por Peña", subtitle: sub, at: x.created_at });
      }
    });
    (p || []).forEach((x: any) => {
      const k = PEDIDO_KIND[x.estado];
      if (!k) return;
      const sub = `${x.matricula || "—"} · ${x.vehiculo || x.piezas || ""}`;
      out.push({ id: "p" + x.estado + "-" + x.id, kind: k, title: META[k].label, subtitle: sub, at: x.created_at });
    });
    out.sort((a, b) => +new Date(b.at) - +new Date(a.at));
    setItems(out.slice(0, 30));
  }, [tallerId]);

  useEffect(() => {
    load();
    const ch = supabase
      .channel("notif-" + tallerId)
      .on("postgres_changes", { event: "*", schema: "public", table: "gestiones", filter: `taller_id=eq.${tallerId}` }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "pedidos_pena", filter: `taller_id=eq.${tallerId}` }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [tallerId, load]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const unread = useMemo(
    () => items.filter((n) => +new Date(n.at) > lastSeen).length,
    [items, lastSeen],
  );

  const toggle = () => {
    setOpen((v) => {
      const next = !v;
      if (next) {
        const now = Date.now();
        setLastSeen(now);
        localStorage.setItem(`notif-lastseen-${tallerId}`, String(now));
      }
      return next;
    });
  };

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={toggle}
        className="relative rounded-lg p-2 text-muted-foreground hover:bg-surface-2 hover:text-foreground"
        aria-label="Notificaciones"
      >
        <Bell className="h-5 w-5" />
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold leading-none text-destructive-foreground">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-[min(360px,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-border bg-surface shadow-xl">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <span className="text-sm font-semibold">Notificaciones</span>
            <span className="text-[11px] text-muted-foreground">{items.length} recientes</span>
          </div>
          <div className="max-h-[60vh] overflow-y-auto">
            {items.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-muted-foreground">Sin novedades.</div>
            ) : (
              items.map((n) => {
                const m = META[n.kind];
                const Icon = m.Icon;
                const isNew = +new Date(n.at) > lastSeen;
                return (
                  <div
                    key={n.id}
                    className={
                      "flex items-start gap-3 border-b border-border px-4 py-3 last:border-b-0 " +
                      (isNew ? "bg-surface-2/60" : "")
                    }
                  >
                    <span className={"mt-0.5 " + m.cls}><Icon className="h-4 w-4" /></span>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-semibold">{n.title}</div>
                      <div className="truncate text-[12px] text-muted-foreground">{n.subtitle}</div>
                      <div className="text-[11px] text-muted-foreground">
                        {new Date(n.at).toLocaleString("es-ES", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                      </div>
                    </div>
                    {isNew && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" />}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
