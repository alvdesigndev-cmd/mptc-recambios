import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  LogOut, Truck, CheckCheck, Search, Phone, Inbox, Plus, X, Send, Pencil, Trash2, Save,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { clearSettings, loadSettings } from "@/lib/mptc/profiles";
import { buildWAUrl } from "@/lib/mptc/wa";
import { estadoBadge, type Gestion } from "@/lib/mptc/types";
import { AudioTranscripcionActions } from "@/components/mptc/AudioTranscripcionActions";
import { AudioPlayer } from "@/components/mptc/AudioPlayer";

import { redirect } from "@tanstack/react-router";
import { syncProfileToSettings } from "@/lib/mptc/auth";

export const Route = createFileRoute("/pena")({
  ssr: false,
  beforeLoad: async () => {
    const { data } = await supabase.auth.getSession();
    if (!data.session) throw redirect({ to: "/auth" });
    const p = await syncProfileToSettings();
    if (!p) throw redirect({ to: "/auth" });
    if (p.role !== "pena") throw redirect({ to: "/app" });
  },
  component: PenaPage,
});

type Filtro = "todas" | "gestion" | "aceptado" | "directo";

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

function PenaPage() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [gestiones, setGestiones] = useState<Gestion[]>([]);
  const [directos, setDirectos] = useState<PedidoDirecto[]>([]);
  const [filtro, setFiltro] = useState<Filtro>("todas");
  const [q, setQ] = useState("");
  const [open, setOpen] = useState<{ kind: "g" | "d"; item: Gestion | PedidoDirecto } | null>(null);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    const s = loadSettings();
    if (!s) { navigate({ to: "/" }); return; }
    if (s.role !== "pena") { navigate({ to: "/app" }); return; }
    setReady(true);
  }, [navigate]);

  const load = useCallback(async () => {
    const [{ data: g }, { data: d }] = await Promise.all([
      supabase.from("gestiones").select("*")
        .eq("pedido_pena", true)
        .order("created_at", { ascending: false })
        .limit(300),
      supabase.from("pedidos_pena").select("*")
        .order("created_at", { ascending: false })
        .limit(300),
    ]);
    setGestiones((g as Gestion[]) || []);
    setDirectos((d as PedidoDirecto[]) || []);
  }, []);

  useEffect(() => { if (ready) load(); }, [ready, load]);

  // Polling cada 90s + visibilitychange
  useEffect(() => {
    if (!ready) return;
    const id = setInterval(load, 90_000);
    const onVis = () => { if (document.visibilityState === "visible") load(); };
    document.addEventListener("visibilitychange", onVis);
    return () => { clearInterval(id); document.removeEventListener("visibilitychange", onVis); };
  }, [ready, load]);

  const onExit = () => { clearSettings(); navigate({ to: "/" }); };

  const filteredGestiones = useMemo(() => {
    const qq = q.trim().toLowerCase();
    return gestiones.filter((g) => {
      if (filtro === "directo") return false;
      if (filtro === "aceptado" && g.estado !== "aceptado") return false;
      if (filtro === "gestion" && g.estado === "aceptado") return false;
      if (!qq) return true;
      return ([g.matricula, g.vehiculo, g.cliente_nombre, g.taller_nombre, g.piezas, g.subfamilia]
        .filter(Boolean).join(" ").toLowerCase().includes(qq));
    });
  }, [gestiones, filtro, q]);

  const filteredDirectos = useMemo(() => {
    if (filtro === "gestion" || filtro === "aceptado") return [];
    const qq = q.trim().toLowerCase();
    return directos.filter((d) => {
      if (!qq) return true;
      return ([d.matricula, d.vehiculo, d.piezas, d.notas, d.taller_nombre]
        .filter(Boolean).join(" ").toLowerCase().includes(qq));
    });
  }, [directos, filtro, q]);

  if (!ready) return null;

  const kpis = [
    { label: "Pendientes", value: gestiones.filter((g) => g.estado !== "completado").length + directos.filter((d) => d.estado === "pendiente").length },
    { label: "Aceptados",  value: gestiones.filter((g) => g.estado === "aceptado").length },
    { label: "Directos",   value: directos.length },
    { label: "Total",      value: gestiones.length + directos.length },
  ];

  return (
    <div className="min-h-[100dvh] bg-background text-foreground">
      <header className="sticky top-0 z-30 border-b border-border bg-surface/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1200px] items-center gap-3 px-4 py-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent/15 text-accent">
            <Truck className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-semibold leading-tight">Grupo Peña</div>
            <div className="text-[11px] text-muted-foreground leading-tight">Panel de pedidos</div>
          </div>
          <button
            onClick={() => setCreating(true)}
            className="hidden sm:inline-flex items-center gap-2 rounded-xl bg-accent px-3 py-2 text-sm font-semibold text-accent-foreground active:scale-95"
          >
            <Plus className="h-4 w-4" /> Pedido directo
          </button>
          <button onClick={onExit} className="rounded-lg p-2 text-muted-foreground hover:bg-surface-2" aria-label="Salir">
            <LogOut className="h-5 w-5" />
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-[1200px] space-y-5 px-4 pb-24 pt-5">
        <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {kpis.map((k) => (
            <div key={k.label} className="rounded-2xl border border-border bg-surface p-4">
              <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{k.label}</div>
              <div className="mt-1 text-2xl font-bold">{k.value}</div>
            </div>
          ))}
        </section>

        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar por matrícula, taller, pieza…"
            className="w-full rounded-xl bg-surface-2 py-2.5 pl-9 pr-3 text-sm outline-none placeholder:text-muted-foreground/60"
          />
        </div>

        <div className="-mx-4 overflow-x-auto px-4">
          <div className="flex gap-2">
            {(["todas", "gestion", "aceptado", "directo"] as Filtro[]).map((f) => {
              const labels: Record<Filtro, string> = { todas: "Todos", gestion: "Gestión", aceptado: "Aceptado", directo: "Directo" };
              const active = filtro === f;
              return (
                <button
                  key={f}
                  onClick={() => setFiltro(f)}
                  className={"shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold " +
                    (active ? "bg-accent text-accent-foreground" : "bg-surface-2 text-muted-foreground hover:text-foreground")}
                >
                  {labels[f]}
                </button>
              );
            })}
          </div>
        </div>

        {filteredGestiones.length === 0 && filteredDirectos.length === 0 && (
          <div className="rounded-2xl border border-border bg-surface p-8 text-center">
            <Inbox className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">No hay pedidos pendientes.</p>
          </div>
        )}

        <div className="grid gap-3 sm:grid-cols-2">
          {filteredGestiones.map((g) => (
            <PedidoCard
              key={"g-" + g.id}
              kind="gestion"
              taller={g.taller_nombre} matricula={g.matricula} vehiculo={g.vehiculo}
              piezas={g.piezas || g.subfamilia || "—"} estado={g.estado} created_at={g.created_at}
              onClick={() => setOpen({ kind: "g", item: g })}
            />
          ))}
          {filteredDirectos.map((d) => (
            <PedidoCard
              key={"d-" + d.id}
              kind="directo"
              taller={d.taller_nombre} matricula={d.matricula} vehiculo={d.vehiculo}
              piezas={d.piezas || "—"} estado={d.estado} created_at={d.created_at}
              onClick={() => setOpen({ kind: "d", item: d })}
            />
          ))}
        </div>

        {/* FAB móvil */}
        <button
          onClick={() => setCreating(true)}
          className="fixed bottom-6 right-4 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-accent text-accent-foreground shadow-[var(--shadow-glow-red)] active:scale-95 sm:hidden"
          aria-label="Nuevo pedido directo"
        >
          <Plus className="h-6 w-6" />
        </button>
      </main>

      {open && (
        <PedidoModal
          kind={open.kind}
          item={open.item as Gestion & PedidoDirecto}
          onClose={() => setOpen(null)}
          onChanged={() => { setOpen(null); load(); }}
        />
      )}

      {creating && (
        <NuevoDirectoModal onClose={() => setCreating(false)} onSaved={() => { setCreating(false); load(); }} />
      )}
    </div>
  );
}

function PedidoCard({
  kind, taller, matricula, vehiculo, piezas, estado, created_at, onClick,
}: {
  kind: "gestion" | "directo";
  taller: string | null; matricula: string | null; vehiculo: string | null;
  piezas: string; estado: string; created_at: string; onClick: () => void;
}) {
  const dirMeta: Record<string, { label: string; cls: string }> = {
    pendiente:   { label: "Pendiente",    cls: "bg-warning/15 text-warning" },
    aceptado:    { label: "Aceptado",     cls: "bg-accent/15 text-accent" },
    preparacion: { label: "Preparación",  cls: "bg-warning/15 text-warning" },
    enviado:     { label: "Enviado",      cls: "bg-primary/15 text-primary" },
    entregado:   { label: "Entregado",    cls: "bg-success/15 text-success" },
    preparado:   { label: "Preparado",    cls: "bg-success/15 text-success" },
  };
  const meta = kind === "directo"
    ? (dirMeta[estado] || { label: estado, cls: "bg-surface-2 text-text-2" })
    : estadoBadge(estado);
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-stretch gap-2 rounded-2xl border border-border bg-surface p-4 text-left transition hover:border-accent/40 hover:bg-surface-2"
    >
      <div className="flex items-center justify-between gap-2">
        <span className={"rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase " + meta.cls}>
          {meta.label}
        </span>
        <span className="text-[11px] text-muted-foreground">
          {new Date(created_at).toLocaleString("es-ES", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
        </span>
      </div>
      <div className="flex items-baseline justify-between gap-2">
        <span className="font-mono text-sm font-bold">{matricula || "—"}</span>
        <span className="truncate text-[12px] text-muted-foreground">{vehiculo || ""}</span>
      </div>
      <div className="line-clamp-2 text-sm text-text-2">{piezas}</div>
      <div className="text-[11px] font-semibold text-primary">{taller || ""}</div>
    </button>
  );
}

function PedidoModal({
  kind, item, onClose, onChanged,
}: { kind: "g" | "d"; item: Gestion & PedidoDirecto; onClose: () => void; onChanged: () => void }) {
  const [editing, setEditing] = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    matricula: item.matricula || "",
    vehiculo: item.vehiculo || "",
    piezas: item.piezas || "",
    notas: item.notas || "",
  });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const setEstadoDirecto = async (estado: string) => {
    await supabase.from("pedidos_pena").update({ estado }).eq("id", item.id);
    onChanged();
  };

  const marcarPreparado = async () => {
    if (kind === "g") {
      await supabase.from("gestiones").update({ estado: "completado" }).eq("id", item.id);
    } else {
      await supabase.from("pedidos_pena").update({ estado: "entregado" }).eq("id", item.id);
    }
    onChanged();
  };

  const guardarEdicion = async () => {
    setSaving(true);
    const error = kind === "g"
      ? (await supabase.from("gestiones").update({
          matricula: form.matricula || null,
          vehiculo: form.vehiculo || null,
          piezas: form.piezas || null,
        }).eq("id", item.id)).error
      : (await supabase.from("pedidos_pena").update({
          matricula: form.matricula || null,
          vehiculo: form.vehiculo || null,
          piezas: form.piezas || null,
          notas: form.notas || null,
        }).eq("id", item.id)).error;
    setSaving(false);
    if (error) { alert("No se pudo guardar los cambios."); return; }
    setEditing(false);
    onChanged();
  };

  const eliminar = async () => {
    setSaving(true);
    const error = kind === "g"
      ? (await supabase.from("gestiones").delete().eq("id", item.id)).error
      : (await supabase.from("pedidos_pena").delete().eq("id", item.id)).error;
    setSaving(false);
    if (error) { alert("No se pudo eliminar."); return; }
    onChanged();
  };

  const wa = () => {
    const msg = `✅ Pedido *${item.matricula || ""}* (${item.vehiculo || ""}) PREPARADO.\nPasad a recoger cuando podáis. 🙌`;
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center">
      <div className="max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-surface p-5 sm:rounded-3xl">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            <div className="text-[11px] font-semibold uppercase text-accent">
              {kind === "g" ? "Pedido de gestión" : "Pedido directo"}
            </div>
            <h2 className="mt-0.5 font-mono text-xl font-bold">{item.matricula || "—"}</h2>
            <div className="text-[12px] text-muted-foreground">{item.vehiculo} · {item.taller_nombre}</div>
          </div>
          <button onClick={onClose} className="rounded-lg p-2 text-muted-foreground hover:bg-surface-2">
            <X className="h-5 w-5" />
          </button>
        </div>

        {!editing ? (
          <div className="space-y-2.5 text-sm">
            <Field label="Piezas">{item.piezas || (kind === "g" ? item.subfamilia : "") || "—"}</Field>
            {kind === "g" && item.cliente_nombre && <Field label="Cliente">{item.cliente_nombre}</Field>}
            {item.notas && <Field label="Notas">{item.notas}</Field>}
            {kind === "g" && item.descripcion && <Field label="Notas">{item.descripcion}</Field>}
            <Field label="Recibido">{new Date(item.created_at).toLocaleString("es-ES")}</Field>
          </div>
        ) : (
          <div className="space-y-3 text-sm">
            <EditField label="Matrícula">
              <input
                value={form.matricula}
                onChange={(e) => setForm({ ...form, matricula: e.target.value.toUpperCase() })}
                className="w-full rounded-xl bg-surface-2 px-3 py-2 font-mono outline-none focus:bg-surface-3"
              />
            </EditField>
            <EditField label="Vehículo">
              <input
                value={form.vehiculo}
                onChange={(e) => setForm({ ...form, vehiculo: e.target.value })}
                className="w-full rounded-xl bg-surface-2 px-3 py-2 outline-none focus:bg-surface-3"
              />
            </EditField>
            <EditField label="Piezas">
              <textarea
                value={form.piezas}
                onChange={(e) => setForm({ ...form, piezas: e.target.value })}
                rows={3}
                className="w-full rounded-xl bg-surface-2 px-3 py-2 outline-none focus:bg-surface-3"
              />
            </EditField>
            {kind === "d" && (
              <EditField label="Notas">
                <textarea
                  value={form.notas}
                  onChange={(e) => setForm({ ...form, notas: e.target.value })}
                  rows={2}
                  className="w-full rounded-xl bg-surface-2 px-3 py-2 outline-none focus:bg-surface-3"
                />
              </EditField>
            )}
          </div>
        )}

        {!editing && kind === "d" && (item.audio_url || item.transcripcion) && (
          <div className="mt-3 rounded-2xl border border-border bg-surface-2 p-3 space-y-2">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Pedido por voz
            </div>
            {item.audio_url && (
              <AudioPlayer src={item.audio_url} />
            )}
            {item.transcripcion && (
              <div className="whitespace-pre-wrap rounded-xl bg-surface px-3 py-2 text-[13px] leading-relaxed">
                {item.transcripcion}
              </div>
            )}
            <AudioTranscripcionActions
              audioUrl={item.audio_url}
              transcripcion={item.transcripcion}
              baseName={item.matricula || item.id}
            />
          </div>
        )}

        {!editing && item.fotos && item.fotos.length > 0 && (
          <div className="mt-3 grid grid-cols-3 gap-2">
            {item.fotos.map((u, i) => (
              <a key={i} href={u} target="_blank" rel="noreferrer" className="overflow-hidden rounded-xl bg-surface-2">
                <img src={u} alt="" className="aspect-square w-full object-cover" />
              </a>
            ))}
          </div>
        )}

        {!editing && kind === "d" && (
          <div className="mt-5">
            <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Estado del pedido
            </div>
            <div className="flex flex-wrap gap-2">
              {[
                { v: "aceptado",    label: "Aceptar" },
                { v: "preparacion", label: "En preparación" },
                { v: "enviado",     label: "Enviado" },
                { v: "entregado",   label: "Entregado" },
              ].map((b) => {
                const active = item.estado === b.v;
                return (
                  <button
                    key={b.v}
                    onClick={() => setEstadoDirecto(b.v)}
                    className={
                      "inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold active:scale-95 " +
                      (active
                        ? "bg-success text-success-foreground"
                        : "border border-border-strong bg-surface hover:bg-surface-2")
                    }
                  >
                    {b.label}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {confirmDel && (
          <div className="mt-4 rounded-2xl border border-destructive/40 bg-destructive/10 p-3 text-sm">
            <div className="font-semibold text-destructive">¿Eliminar este pedido?</div>
            <div className="text-xs text-muted-foreground">Esta acción no se puede deshacer.</div>
            <div className="mt-2 flex justify-end gap-2">
              <button onClick={() => setConfirmDel(false)} className="rounded-lg border border-border-strong bg-surface px-3 py-1.5 text-xs font-semibold">Cancelar</button>
              <button onClick={eliminar} disabled={saving} className="rounded-lg bg-destructive px-3 py-1.5 text-xs font-semibold text-destructive-foreground disabled:opacity-50">Sí, eliminar</button>
            </div>
          </div>
        )}

        <div className="mt-5 flex flex-wrap justify-end gap-2">
          {!editing ? (
            <>
              <button onClick={() => setConfirmDel((v) => !v)} className="inline-flex items-center gap-2 rounded-xl border border-destructive/40 bg-surface px-3 py-2 text-sm font-semibold text-destructive hover:bg-destructive/10">
                <Trash2 className="h-4 w-4" /> Eliminar
              </button>
              <button onClick={() => setEditing(true)} className="inline-flex items-center gap-2 rounded-xl border border-border-strong bg-surface px-3 py-2 text-sm font-semibold">
                <Pencil className="h-4 w-4" /> Editar
              </button>
              <button onClick={wa} className="inline-flex items-center gap-2 rounded-xl border border-border-strong bg-surface px-3 py-2 text-sm font-semibold">
                <Send className="h-4 w-4" /> WhatsApp taller
              </button>
              {kind === "g" && (
                <button onClick={marcarPreparado} className="inline-flex items-center gap-2 rounded-xl bg-success px-3 py-2 text-sm font-semibold text-success-foreground active:scale-95">
                  <CheckCheck className="h-4 w-4" /> Marcar preparado
                </button>
              )}
            </>
          ) : (
            <>
              <button onClick={() => setEditing(false)} className="rounded-xl border border-border-strong bg-surface px-3 py-2 text-sm font-semibold">
                Cancelar
              </button>
              <button onClick={guardarEdicion} disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-accent px-3 py-2 text-sm font-semibold text-accent-foreground active:scale-95 disabled:opacity-50">
                <Save className="h-4 w-4" /> Guardar cambios
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function EditField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1">
      <span className="text-[11px] font-semibold uppercase text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}


function NuevoDirectoModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const s = loadSettings();
  const [f, setF] = useState({ matricula: "", vehiculo: "", piezas: "", notas: "" });
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!f.piezas.trim()) return;
    setSaving(true);
    await supabase.from("pedidos_pena").insert({
      taller_id: s?.tallerId || "grupo-pena",
      taller_nombre: s?.tallerName || "Grupo Peña",
      ...f,
      estado: "pendiente",
    });
    setSaving(false);
    onSaved();
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center">
      <div className="max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-surface p-5 sm:rounded-3xl">
        <div className="mb-3 flex items-start justify-between">
          <h2 className="text-lg font-bold">Nuevo pedido directo</h2>
          <button onClick={onClose} className="rounded-lg p-2 text-muted-foreground hover:bg-surface-2"><X className="h-5 w-5" /></button>
        </div>
        <div className="space-y-3">
          <Label k="Matrícula"><input value={f.matricula} onChange={(e) => setF({ ...f, matricula: e.target.value.toUpperCase() })} className="w-full rounded-xl bg-surface-2 px-3 py-2.5 text-sm font-mono uppercase outline-none" /></Label>
          <Label k="Vehículo"><input value={f.vehiculo} onChange={(e) => setF({ ...f, vehiculo: e.target.value })} className="w-full rounded-xl bg-surface-2 px-3 py-2.5 text-sm outline-none" /></Label>
          <Label k="Piezas"><textarea value={f.piezas} onChange={(e) => setF({ ...f, piezas: e.target.value })} rows={3} className="w-full rounded-xl bg-surface-2 px-3 py-2.5 text-sm outline-none" /></Label>
          <Label k="Notas"><textarea value={f.notas} onChange={(e) => setF({ ...f, notas: e.target.value })} rows={2} className="w-full rounded-xl bg-surface-2 px-3 py-2.5 text-sm outline-none" /></Label>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-xl border border-border-strong bg-surface px-4 py-2 text-sm font-semibold">Cancelar</button>
          <button onClick={save} disabled={saving || !f.piezas.trim()} className="rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground active:scale-95 disabled:opacity-50">
            Guardar
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-border pb-2">
      <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</span>
      <span className="text-right whitespace-pre-wrap">{children}</span>
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
