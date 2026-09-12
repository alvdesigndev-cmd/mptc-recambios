import { createFileRoute, Link, redirect, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeft, Inbox, RefreshCw, Search } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { syncProfileToSettings } from "@/lib/mptc/auth";
import { clearSettings, loadSettings } from "@/lib/mptc/profiles";
import { saveRedirectPath } from "@/lib/mptc/redirect";
import { checkAuthResilient } from "@/lib/mptc/authCheck";
import { PendientesTabla, type PedidoDirecto } from "@/components/mptc/PendientesTabla";
import { PedidoChat } from "@/components/mptc/PedidoChat";

export const Route = createFileRoute("/pena_/pendientes")({
  ssr: false,
  beforeLoad: async ({ location }) => {
    const auth = await checkAuthResilient();
    if ("expired" in auth) {
      saveRedirectPath(location.href);
      clearSettings();
      await supabase.auth.signOut().catch(() => {});
      throw redirect({ to: "/auth" });
    }
    if ("offline" in auth) {
      const cached = loadSettings();
      if (!cached) { saveRedirectPath(location.href); throw redirect({ to: "/auth" }); }
      if (cached.role === "admin") throw redirect({ to: "/admin/talleres" });
      if (cached.role !== "pena") throw redirect({ to: "/app" });
      return;
    }
    const p = await syncProfileToSettings();
    if (!p) { saveRedirectPath(location.href); throw redirect({ to: "/auth" }); }
    if (p.role === "admin") throw redirect({ to: "/admin/talleres" });
    if (p.role !== "pena") throw redirect({ to: "/app" });
  },
  component: PendientesPage,
  head: () => ({
    meta: [
      { title: "Pedidos pendientes · Grupo Peña | MPTC" },
      { name: "description", content: "Listado de pedidos pendientes de Grupo Peña con cliente, matrícula, vehículo, piezas e importe." },
      { property: "og:title", content: "Pedidos pendientes · Grupo Peña" },
      { property: "og:description", content: "Pedidos pendientes con cliente, matrícula, vehículo y piezas." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
});

const ESTADOS = ["aceptado", "preparacion", "enviado", "entregado"] as const;

function PendientesPage() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [pedidos, setPedidos] = useState<PedidoDirecto[]>([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [detalle, setDetalle] = useState<PedidoDirecto | null>(null);

  useEffect(() => {
    const s = loadSettings();
    if (!s) { navigate({ to: "/" }); return; }
    if (s.role !== "pena") { navigate({ to: "/app" }); return; }
    setReady(true);
  }, [navigate]);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("pedidos_pena")
      .select("*")
      .eq("estado", "pendiente")
      .order("created_at", { ascending: false })
      .limit(300);
    setLoading(false);
    if (error) { toast.error("No se pudieron cargar los pedidos"); return; }
    setPedidos((data as PedidoDirecto[]) || []);
  }, []);

  useEffect(() => { if (ready) load(); }, [ready, load]);

  useEffect(() => {
    if (!ready) return;
    const id = setInterval(load, 90_000);
    const onVis = () => { if (document.visibilityState === "visible") load(); };
    document.addEventListener("visibilitychange", onVis);
    return () => { clearInterval(id); document.removeEventListener("visibilitychange", onVis); };
  }, [ready, load]);

  const filtrados = useMemo(() => {
    const qq = q.trim().toLowerCase();
    if (!qq) return pedidos;
    return pedidos.filter((p) =>
      [p.cliente_nombre, p.cliente_telefono, p.matricula, p.vehiculo, p.piezas, p.taller_nombre, p.numero_pedido]
        .filter(Boolean).join(" ").toLowerCase().includes(qq),
    );
  }, [pedidos, q]);

  const cambiarEstado = async (p: PedidoDirecto, estado: string) => {
    const { error } = await supabase.from("pedidos_pena").update({ estado }).eq("id", p.id);
    if (error) { toast.error("No se pudo actualizar el pedido"); return; }
    toast.success(`Pedido marcado como ${estado}`);
    setDetalle(null);
    load();
  };

  if (!ready) return null;

  return (
    <div className="min-h-[100dvh] bg-background text-foreground">
      <header className="sticky top-0 z-30 border-b border-border bg-surface/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1200px] items-center gap-3 px-4 py-3">
          <Link to="/pena" className="shrink-0 rounded-lg p-2 text-muted-foreground hover:bg-surface-2" aria-label="Volver">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-sm font-semibold leading-tight">Pedidos pendientes</h1>
            <div className="truncate text-[11px] text-muted-foreground leading-tight">Grupo Peña</div>
          </div>
          <button
            onClick={load}
            className="shrink-0 rounded-lg p-2 text-muted-foreground hover:bg-surface-2"
            aria-label="Actualizar"
          >
            <RefreshCw className={"h-5 w-5 " + (loading ? "animate-spin" : "")} />
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-[1200px] space-y-4 px-4 pb-24 pt-5">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar por cliente, matrícula, vehículo o pieza…"
            className="w-full rounded-xl bg-surface-2 py-2.5 pl-9 pr-3 text-base outline-none placeholder:text-muted-foreground/60 sm:text-sm"
          />
        </div>

        <PendientesTabla pedidos={filtrados} onOpen={setDetalle} />

        {filtrados.length === 0 && (
          <div className="rounded-2xl border border-border bg-surface p-8 text-center">
            <Inbox className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">No hay pedidos pendientes.</p>
          </div>
        )}
      </main>

      {detalle && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 sm:items-center sm:p-4" onClick={() => setDetalle(null)}>
          <div
            className="max-h-[88dvh] w-full max-w-lg overflow-y-auto rounded-t-2xl border border-border bg-surface p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:rounded-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3">
              <div className="text-sm font-semibold">{detalle.cliente_nombre || "Sin cliente"}</div>
              <div className="text-[12px] text-muted-foreground">
                {detalle.cliente_telefono || "—"} · {detalle.taller_nombre || "—"}
              </div>
            </div>
            <dl className="space-y-2 text-sm">
              <Row k="Matrícula" v={detalle.matricula || "—"} />
              <Row k="Vehículo" v={detalle.vehiculo || "—"} />
              <Row k="Nº pedido" v={detalle.gpa_pedido_numero || detalle.numero_pedido || "—"} />
              <Row k="Importe" v={detalle.importe_total != null ? `${Number(detalle.importe_total).toFixed(2)} €` : "—"} />
            </dl>
            <div className="mt-3">
              <div className="text-[11px] uppercase tracking-wide text-muted-foreground">Piezas</div>
              <p className="whitespace-pre-line text-sm text-text-2">{detalle.piezas || "—"}</p>
            </div>
            {detalle.notas && (
              <div className="mt-3">
                <div className="text-[11px] uppercase tracking-wide text-muted-foreground">Notas</div>
                <p className="whitespace-pre-line text-sm text-text-2">{detalle.notas}</p>
              </div>
            )}
            <div className="mt-4 flex flex-wrap gap-2">
              {ESTADOS.map((e) => (
                <button
                  key={e}
                  onClick={() => cambiarEstado(detalle, e)}
                  className="rounded-xl bg-surface-2 px-3 py-2 text-xs font-semibold capitalize hover:bg-accent hover:text-accent-foreground"
                >
                  {e}
                </button>
              ))}
            </div>
            <button
              onClick={() => setDetalle(null)}
              className="mt-4 w-full rounded-xl border border-border py-2.5 text-sm font-semibold"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-[12px] text-muted-foreground">{k}</dt>
      <dd className="text-right font-medium">{v}</dd>
    </div>
  );
}
