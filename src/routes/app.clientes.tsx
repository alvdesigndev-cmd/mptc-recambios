import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, useCallback, useMemo } from "react";
import { Search, UserPlus, X, Phone, Car, Plus, Pencil, Save, History } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSettings } from "@/lib/mptc/useSettings";
import { GestionModal } from "@/components/mptc/GestionModal";
import type { Gestion } from "@/lib/mptc/types";

export const Route = createFileRoute("/app/clientes")({
  component: ClientesPage,
});

import { normalizeMatricula, normalizeTelefono } from "@/lib/mptc/normalize";
import { MicButton } from "@/components/mptc/MicButton";


interface Cliente {
  id: string;
  taller_id: string;
  nombre: string | null;
  telefono: string | null;
  matricula: string | null;
  vehiculo: string | null;
  km: string | null;
  notas: string | null;
  total_gestiones: number;
  ultima_gestion: string | null;
  created_at: string;
}


interface GestionRow {
  id: string;
  created_at: string;
  matricula: string | null;
  cliente_telefono: string | null;
  cliente_nombre: string | null;
  vehiculo: string | null;
  categoria: string | null;
  subfamilia: string | null;
  estado: string;
  importe: string | null;
  descripcion: string | null;
}

function ClientesPage() {
  const settings = useSettings({ requireTaller: true });
  const navigate = useNavigate();
  const [items, setItems] = useState<Cliente[]>([]);
  const [q, setQ] = useState("");
  const [creating, setCreating] = useState(false);
  const [open, setOpen] = useState<Cliente | null>(null);

  const load = useCallback(async () => {
    if (!settings) return;
    const [{ data: cs }, { data: gs }] = await Promise.all([
      supabase
        .from("clientes")
        .select("*")
        .eq("taller_id", settings.tallerId),
      supabase
        .from("gestiones")
        .select("id,matricula,cliente_telefono,created_at")
        .eq("taller_id", settings.tallerId),
    ]);
    const gestiones = (gs as { matricula: string | null; cliente_telefono: string | null; created_at: string }[]) || [];
    const list = ((cs as Cliente[]) || []).map((c) => {
      const matN = c.matricula ? normalizeMatricula(c.matricula) : "";
      const telN = c.telefono ? normalizeTelefono(c.telefono) : "";
      const matches = gestiones.filter((g) => {
        const gm = g.matricula ? normalizeMatricula(g.matricula) : "";
        const gt = g.cliente_telefono ? normalizeTelefono(g.cliente_telefono) : "";
        return (matN && gm === matN) || (telN && gt === telN);
      });
      const ultima = matches.reduce<string | null>(
        (acc, g) => (!acc || g.created_at > acc ? g.created_at : acc),
        null,
      );
      return { ...c, total_gestiones: matches.length, ultima_gestion: ultima ?? c.ultima_gestion };
    });
    list.sort((a, b) => (b.ultima_gestion || "").localeCompare(a.ultima_gestion || ""));
    setItems(list);
  }, [settings]);

  useEffect(() => { load(); }, [load]);


  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase();
    if (!qq) return items;
    return items.filter((c) =>
      (c.nombre || "").toLowerCase().includes(qq) ||
      (c.telefono || "").toLowerCase().includes(qq) ||
      (c.matricula || "").toLowerCase().includes(qq) ||
      (c.vehiculo || "").toLowerCase().includes(qq),
    );
  }, [items, q]);

  if (!settings) return null;

  return (
    <div className="space-y-4">
      <header className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Clientes</h1>
          <p className="text-sm text-muted-foreground">{items.length} clientes registrados.</p>
        </div>
        <button
          onClick={() => setCreating(true)}
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground active:scale-95"
        >
          <UserPlus className="h-4 w-4" /> Nuevo
        </button>
      </header>

      <div className="relative flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar por nombre, matrícula, teléfono…"
            className="w-full rounded-xl bg-surface-2 py-2.5 pl-9 pr-3 text-sm outline-none placeholder:text-muted-foreground/60"
          />
        </div>
        <MicButton
          onInterim={(t) => setQ(t)}
          onFinal={(t) => setQ(t)}
          title="Buscar por voz"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-border bg-surface p-8 text-center text-sm text-muted-foreground">
          No hay clientes que coincidan.
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((c) => (
            <button
              key={c.id}
              onClick={() => setOpen(c)}
              className="flex w-full items-start gap-3 rounded-2xl border border-border bg-surface p-3.5 text-left hover:bg-surface-2"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/15 font-bold text-primary">
                {(c.nombre || "?").charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="truncate text-sm font-semibold">{c.nombre || "(sin nombre)"}</span>
                  <span className="shrink-0 text-[11px] text-muted-foreground">
                    {c.total_gestiones} {c.total_gestiones === 1 ? "gestión" : "gestiones"}
                  </span>
                </div>
                <div className="mt-0.5 truncate text-[12px] text-muted-foreground">
                  <span className="font-mono">{c.matricula ? normalizeMatricula(c.matricula) : "—"}</span> · {c.vehiculo || "—"}
                </div>
                {c.telefono && (
                  <div className="mt-0.5 truncate text-[12px] text-text-2">
                    <Phone className="mr-1 inline h-3 w-3" />{normalizeTelefono(c.telefono)}
                  </div>
                )}
              </div>
            </button>
          ))}
        </div>
      )}

      {creating && (
        <NuevoClienteModal
          tallerId={settings.tallerId}
          tallerNombre={settings.tallerName}
          onClose={() => setCreating(false)}
          onSaved={() => { setCreating(false); load(); }}
        />
      )}

      {open && (
        <ClienteModal
          cliente={open}
          onClose={() => setOpen(null)}
          onNuevaGestion={(id) => { navigate({ to: "/app/nueva", search: { clienteId: id } }); }}
          onChanged={() => { setOpen(null); load(); }}
        />
      )}
    </div>
  );
}

function NuevoClienteModal({
  tallerId, tallerNombre, onClose, onSaved,
}: { tallerId: string; tallerNombre: string; onClose: () => void; onSaved: () => void }) {
  const [f, setF] = useState({ nombre: "", telefono: "", matricula: "", vehiculo: "", km: "", notas: "" });
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!f.nombre.trim()) return;
    setSaving(true);
    await supabase.from("clientes").insert({
      taller_id: tallerId,
      taller_nombre: tallerNombre,
      ...f,
      telefono: normalizeTelefono(f.telefono),
      matricula: normalizeMatricula(f.matricula),
      total_gestiones: 0,
    });
    setSaving(false);
    onSaved();
  };

  return (
    <ModalShell onClose={onClose} title="Nuevo cliente">
      <div className="space-y-3">
        {(["nombre", "telefono", "matricula", "vehiculo", "km"] as const).map((k) => (
          <label key={k} className="block space-y-1">
            <span className="text-[11px] font-semibold uppercase text-muted-foreground">{k}</span>
            <input
              value={f[k]}
              onChange={(e) => setF({ ...f, [k]: k === "matricula" ? e.target.value.toUpperCase() : e.target.value })}
              className={"w-full rounded-xl bg-surface-2 px-3 py-2.5 text-sm outline-none " + (k === "matricula" ? "font-mono uppercase" : "")}
            />
          </label>
        ))}
        <label className="block space-y-1">
          <span className="text-[11px] font-semibold uppercase text-muted-foreground">Notas</span>
          <textarea
            value={f.notas}
            onChange={(e) => setF({ ...f, notas: e.target.value })}
            rows={3}
            className="w-full rounded-xl bg-surface-2 px-3 py-2.5 text-sm outline-none"
          />
        </label>
      </div>
      <div className="mt-5 flex justify-end gap-2">
        <button onClick={onClose} className="rounded-xl border border-border-strong bg-surface px-4 py-2 text-sm font-semibold">Cancelar</button>
        <button
          onClick={save}
          disabled={saving || !f.nombre.trim()}
          className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground active:scale-95 disabled:opacity-50"
        >
          Guardar
        </button>
      </div>
    </ModalShell>
  );
}

function ClienteModal({
  cliente, onClose, onNuevaGestion, onChanged,
}: { cliente: Cliente; onClose: () => void; onNuevaGestion: (id: string) => void; onChanged: () => void }) {
  const [editing, setEditing] = useState(false);
  const [f, setF] = useState({
    nombre: cliente.nombre || "",
    telefono: cliente.telefono || "",
    matricula: cliente.matricula || "",
    vehiculo: cliente.vehiculo || "",
    km: cliente.km || "",
    notas: cliente.notas || "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [historial, setHistorial] = useState<GestionRow[] | null>(null);
  const [openGestion, setOpenGestion] = useState<Gestion | null>(null);
  const [historialKey, setHistorialKey] = useState(0);


  useEffect(() => {
    let cancelled = false;
    (async () => {
      const matN = cliente.matricula ? normalizeMatricula(cliente.matricula) : "";
      const telN = cliente.telefono ? normalizeTelefono(cliente.telefono) : "";
      const filters: string[] = [];
      if (matN) filters.push(`matricula.eq.${matN}`);
      if (telN) filters.push(`cliente_telefono.eq.${telN}`);
      if (filters.length === 0) { setHistorial([]); return; }
      const { data } = await supabase
        .from("gestiones")
        .select("id,created_at,matricula,cliente_telefono,cliente_nombre,vehiculo,categoria,subfamilia,estado,importe,descripcion")
        .eq("taller_id", cliente.taller_id)
        .or(filters.join(","))
        .order("created_at", { ascending: false });
      if (!cancelled) setHistorial((data as GestionRow[]) || []);
    })();
    return () => { cancelled = true; };
  }, [cliente]);


  const remove = async () => {
    if (!confirm("¿Eliminar este cliente? (no afecta a sus gestiones)")) return;
    await supabase.from("clientes").delete().eq("id", cliente.id);
    onChanged();
  };

  const validate = (): string | null => {
    if (!f.nombre.trim()) return "El nombre es obligatorio.";
    const tel = f.telefono.trim();
    if (tel) {
      const digits = tel.replace(/[\s\-().]/g, "");
      if (!/^(\+?\d{9,15})$/.test(digits)) return "Teléfono no válido (9–15 dígitos, opcional +).";
    }
    const mat = f.matricula.trim().toUpperCase();
    if (mat) {
      // Acepta formatos ES comunes: 1234ABC, 1234-ABC, 1234 ABC, B1234CD, etc.
      const clean = mat.replace(/[\s-]/g, "");
      if (!/^[A-Z0-9]{6,8}$/.test(clean)) return "Matrícula no válida (6–8 caracteres alfanuméricos).";
    }
    return null;
  };

  const save = async () => {
    const err = validate();
    if (err) { setError(err); return; }
    setError(null);
    setSaving(true);
    const payload = {
      ...f,
      telefono: normalizeTelefono(f.telefono),
      matricula: normalizeMatricula(f.matricula),
    };
    await supabase.from("clientes").update(payload).eq("id", cliente.id);
    setSaving(false);
    onChanged();
  };

  return (
    <ModalShell onClose={onClose} title={editing ? "Editar cliente" : (cliente.nombre || "Cliente")}>
      {editing ? (
        <div className="space-y-3">
          {(["nombre", "telefono", "matricula", "vehiculo", "km"] as const).map((k) => (
            <label key={k} className="block space-y-1">
              <span className="text-[11px] font-semibold uppercase text-muted-foreground">{k}</span>
              <input
                value={f[k]}
                onChange={(e) => setF({ ...f, [k]: k === "matricula" ? e.target.value.toUpperCase() : e.target.value })}
                className={"w-full rounded-xl bg-surface-2 px-3 py-2.5 text-sm outline-none " + (k === "matricula" ? "font-mono uppercase" : "")}
              />
            </label>
          ))}
          <label className="block space-y-1">
            <span className="text-[11px] font-semibold uppercase text-muted-foreground">Notas</span>
            <textarea
              value={f.notas}
              onChange={(e) => setF({ ...f, notas: e.target.value })}
              rows={3}
              className="w-full rounded-xl bg-surface-2 px-3 py-2.5 text-sm outline-none"
            />
          </label>
          {error && <p className="text-xs font-semibold text-destructive">{error}</p>}
        </div>
      ) : (
        <div className="space-y-4 text-sm">
          <div className="space-y-3">
            <Row label="Teléfono" value={cliente.telefono ? normalizeTelefono(cliente.telefono) : "—"} />
            <Row label="Matrícula" value={cliente.matricula ? normalizeMatricula(cliente.matricula) : "—"} />
            <Row label="Vehículo" value={cliente.vehiculo || "—"} />
            <Row label="Km" value={cliente.km || "—"} />
            {cliente.notas && <Row label="Notas" value={cliente.notas} multiline />}
          </div>

          <div>
            <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              <History className="h-3.5 w-3.5" />
              Historial ({historial?.length ?? "…"})
            </div>
            {historial === null ? (
              <div className="rounded-xl border border-border bg-surface-2 p-3 text-xs text-muted-foreground">
                Cargando…
              </div>
            ) : historial.length === 0 ? (
              <div className="rounded-xl border border-border bg-surface-2 p-3 text-xs text-muted-foreground">
                Aún no hay gestiones para este cliente.
              </div>
            ) : (
              <ul className="space-y-2">
                {historial.map((g) => {
                  const fecha = new Date(g.created_at).toLocaleDateString("es-ES", {
                    day: "2-digit", month: "short", year: "numeric",
                  });
                  const titulo = [g.subfamilia, g.categoria].filter(Boolean).join(" · ") || "Gestión";
                  return (
                    <li
                      key={g.id}
                      className="rounded-xl border border-border bg-surface-2 p-3"
                    >
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="truncate text-sm font-semibold capitalize">{titulo}</span>
                        <span className="shrink-0 text-[11px] text-muted-foreground">{fecha}</span>
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px]">
                        <span className="rounded-full bg-primary/15 px-2 py-0.5 font-semibold uppercase tracking-wide text-primary">
                          {g.estado}
                        </span>
                        {g.importe && (
                          <span className="text-muted-foreground">{g.importe} €</span>
                        )}
                      </div>
                      {g.descripcion && (
                        <p className="mt-1 line-clamp-2 text-[12px] text-text-2">{g.descripcion}</p>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      )}
      <div className="mt-5 flex flex-wrap justify-end gap-2">
        {editing ? (
          <>
            <button onClick={() => setEditing(false)} className="rounded-xl border border-border-strong bg-surface px-3 py-2 text-sm font-semibold">Cancelar</button>
            <button
              onClick={save}
              disabled={saving || !f.nombre.trim()}
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground active:scale-95 disabled:opacity-50"
            >
              <Save className="h-4 w-4" /> Guardar
            </button>
          </>
        ) : (
          <>
            {cliente.telefono && (
              <a href={`tel:${cliente.telefono}`} className="inline-flex items-center gap-2 rounded-xl border border-border-strong bg-surface px-3 py-2 text-sm font-semibold">
                <Phone className="h-4 w-4" /> Llamar
              </a>
            )}
            <button onClick={() => setEditing(true)} className="inline-flex items-center gap-2 rounded-xl border border-border-strong bg-surface px-3 py-2 text-sm font-semibold">
              <Pencil className="h-4 w-4" /> Editar
            </button>
            <button onClick={remove} className="inline-flex items-center gap-2 rounded-xl border border-border-strong bg-surface px-3 py-2 text-sm font-semibold text-destructive">
              Eliminar
            </button>
            <button onClick={() => onNuevaGestion(cliente.id)} className="inline-flex items-center gap-2 rounded-xl bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground active:scale-95">
              <Plus className="h-4 w-4" /> Nueva gestión
            </button>
          </>
        )}
      </div>
    </ModalShell>
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

function ModalShell({ children, onClose, title }: { children: React.ReactNode; onClose: () => void; title: string }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center">
      <div className="max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-surface p-5 sm:rounded-3xl">
        <div className="mb-3 flex items-start justify-between gap-3">
          <h2 className="truncate text-lg font-bold flex items-center gap-2">
            <Car className="h-5 w-5 text-primary" /> {title}
          </h2>
          <button onClick={onClose} className="rounded-lg p-2 text-muted-foreground hover:bg-surface-2">
            <X className="h-5 w-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
