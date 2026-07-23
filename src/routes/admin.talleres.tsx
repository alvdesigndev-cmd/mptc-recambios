import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Pencil, Save, X, Power, Plus, Store, Loader2, ExternalLink, Search } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";


export const Route = createFileRoute("/admin/talleres")({
  component: TalleresAdminPage,
});

interface Taller {
  taller_id: string;
  nombre: string;
  ciudad: string;
  activo: boolean;
  created_at: string;
  updated_at: string;
}

function TalleresAdminPage() {
  const [rows, setRows] = useState<Taller[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState<{ taller_id: string; nombre: string; ciudad: string }>({ taller_id: "", nombre: "", ciudad: "" });
  const [saving, setSaving] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newForm, setNewForm] = useState({ taller_id: "", nombre: "", ciudad: "" });
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"todos" | "activos" | "inactivos">("todos");

  const filteredRows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((t) => {
      if (statusFilter === "activos" && !t.activo) return false;
      if (statusFilter === "inactivos" && t.activo) return false;
      if (!q) return true;
      return (
        t.taller_id.toLowerCase().includes(q) ||
        t.nombre.toLowerCase().includes(q) ||
        (t.ciudad ?? "").toLowerCase().includes(q)
      );
    });
  }, [rows, query, statusFilter]);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.from("talleres").select("*").order("taller_id");
    setLoading(false);
    if (error) { setErr(error.message); return; }
    setRows((data as Taller[]) || []);
  }, []);

  useEffect(() => { load(); }, [load]);

  const startEdit = (t: Taller) => {
    setEditing(t.taller_id);
    setForm({ taller_id: t.taller_id, nombre: t.nombre, ciudad: t.ciudad ?? "" });
    setErr(null);
  };

  const cancelEdit = () => { setEditing(null); setErr(null); };

  const saveEdit = async (original: Taller) => {
    const newId = form.taller_id.trim();
    if (!newId) { toast.error("El identificador no puede estar vacío"); return; }
    if (newId !== original.taller_id) {
      if (!confirm(`¿Renombrar identificador "${original.taller_id}" → "${newId}"?\n\nEsto actualiza en cascada perfiles, clientes, gestiones y pedidos asociados.`)) return;
    }
    setSaving(true); setErr(null);
    try {
      if (newId !== original.taller_id) {
        const { error } = await supabase.rpc("rename_taller_id" as never, { _old: original.taller_id, _new: newId } as never);
        if (error) throw error;
      }
      const { error: uerr } = await supabase
        .from("talleres")
        .update({ nombre: form.nombre.trim() || original.nombre, ciudad: form.ciudad.trim() })
        .eq("taller_id", newId);
      if (uerr) throw uerr;
      toast.success("Taller actualizado");
      setEditing(null);
      await load();
    } catch (e: any) {
      const msg = e?.message || "No se pudo guardar";
      setErr(msg);
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const toggleActivo = async (t: Taller) => {
    const confirmMsg = t.activo
      ? `¿Desactivar ${t.nombre}? Sus usuarios no podrán acceder y no aparecerá en registros ni en el panel de Peña.`
      : `¿Reactivar ${t.nombre}?`;
    if (!confirm(confirmMsg)) return;
    const { error } = await supabase.from("talleres").update({ activo: !t.activo }).eq("taller_id", t.taller_id);
    if (error) { setErr(error.message); toast.error(error.message); return; }
    toast.success(t.activo ? "Taller desactivado" : "Taller reactivado");
    load();
  };

  const createTaller = async () => {
    const id = newForm.taller_id.trim();
    if (!id || !newForm.nombre.trim()) {
      toast.error("Identificador y nombre son obligatorios");
      return;
    }
    if (!confirm(`¿Crear el taller "${newForm.nombre.trim()}" con identificador "${id}"?`)) return;
    setSaving(true); setErr(null);
    try {
      const { error } = await supabase.from("talleres").insert({
        taller_id: id,
        nombre: newForm.nombre.trim(),
        ciudad: newForm.ciudad.trim(),
        activo: true,
      });
      if (error) throw error;
      toast.success("Taller creado");
      setCreating(false);
      setNewForm({ taller_id: "", nombre: "", ciudad: "" });
      await load();
    } catch (e: any) {
      const msg = e?.message || "No se pudo crear el taller";
      setErr(msg);
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-bold"><Store className="h-5 w-5 text-primary" /> Talleres</h1>
          <p className="text-[13px] text-muted-foreground">Gestiona los talleres del sistema: nombre, identificador y estado.</p>
        </div>
        <button
          onClick={() => { setCreating(true); setErr(null); }}
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground active:scale-95"
        >
          <Plus className="h-4 w-4" /> Nuevo taller
        </button>
      </div>

      {err && <div className="rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-2 text-sm text-destructive">{err}</div>}

      {/* Buscador + filtros */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por identificador, nombre o ciudad…"
            className="w-full rounded-xl border border-border bg-surface pl-9 pr-3 py-2 text-sm"
          />
        </div>
        <div className="flex rounded-xl border border-border bg-surface p-0.5 text-xs">
          {(["todos", "activos", "inactivos"] as const).map((v) => (
            <button
              key={v}
              onClick={() => setStatusFilter(v)}
              className={
                "flex-1 rounded-lg px-3 py-1.5 font-semibold capitalize transition " +
                (statusFilter === v ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")
              }
            >
              {v}
            </button>
          ))}
        </div>
      </div>
      <div className="text-[11px] text-muted-foreground">
        {filteredRows.length} de {rows.length} talleres
      </div>

      {creating && (
        <div className="rounded-2xl border border-border bg-surface p-4">
          <div className="mb-3 text-sm font-semibold">Nuevo taller</div>
          <div className="grid gap-3 sm:grid-cols-3">
            <label className="text-xs">
              <span className="text-muted-foreground">Identificador (slug)</span>
              <input
                value={newForm.taller_id}
                onChange={(e) => setNewForm({ ...newForm, taller_id: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-") })}
                placeholder="taller-6-nombre"
                className="mt-1 w-full rounded-lg border border-border bg-surface-2 px-3 py-2 font-mono text-sm"
              />
            </label>
            <label className="text-xs">
              <span className="text-muted-foreground">Nombre</span>
              <input value={newForm.nombre} onChange={(e) => setNewForm({ ...newForm, nombre: e.target.value })}
                className="mt-1 w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm" />
            </label>
            <label className="text-xs">
              <span className="text-muted-foreground">Ciudad</span>
              <input value={newForm.ciudad} onChange={(e) => setNewForm({ ...newForm, ciudad: e.target.value })}
                className="mt-1 w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm" />
            </label>
          </div>
          <div className="mt-3 flex justify-end gap-2">
            <button onClick={() => setCreating(false)} className="rounded-lg px-3 py-1.5 text-sm text-muted-foreground hover:bg-surface-2">Cancelar</button>
            <button onClick={createTaller} disabled={saving}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-1.5 text-sm font-semibold text-primary-foreground disabled:opacity-60">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Crear
            </button>
          </div>
        </div>
      )}

      {/* Vista móvil: tarjetas */}
      <div className="space-y-3 md:hidden">
        {loading && (
          <div className="rounded-2xl border border-border bg-surface px-4 py-8 text-center text-muted-foreground">
            <Loader2 className="mx-auto h-5 w-5 animate-spin" />
          </div>
        )}
        {!loading && rows.length === 0 && (
          <div className="rounded-2xl border border-border bg-surface px-4 py-8 text-center text-muted-foreground">No hay talleres.</div>
        )}
        {rows.map((t) => {
          const isEd = editing === t.taller_id;
          return (
            <div key={t.taller_id} className={"rounded-2xl border border-border bg-surface p-4 " + (t.activo ? "" : "opacity-60")}>
              <div className="mb-3 flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  {isEd ? (
                    <input value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                      className="w-full rounded-md border border-border bg-surface-2 px-2 py-1 text-sm font-semibold" />
                  ) : <div className="truncate text-sm font-semibold">{t.nombre}</div>}
                  {isEd ? (
                    <input value={form.taller_id}
                      onChange={(e) => setForm({ ...form, taller_id: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-") })}
                      className="mt-1 w-full rounded-md border border-border bg-surface-2 px-2 py-1 font-mono text-[11px]" />
                  ) : (
                    <div className="mt-0.5 truncate font-mono text-[11px] text-muted-foreground">{t.taller_id}</div>
                  )}
                </div>
                <span className={"shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase " +
                  (t.activo ? "bg-success/15 text-success" : "bg-muted text-muted-foreground")}>
                  {t.activo ? "Activo" : "Off"}
                </span>
              </div>
              <div className="mb-3 text-xs">
                <span className="text-muted-foreground">Ciudad: </span>
                {isEd ? (
                  <input value={form.ciudad} onChange={(e) => setForm({ ...form, ciudad: e.target.value })}
                    className="mt-1 w-full rounded-md border border-border bg-surface-2 px-2 py-1" />
                ) : (t.ciudad || <span className="text-muted-foreground">—</span>)}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {isEd ? (
                  <>
                    <button onClick={() => saveEdit(t)} disabled={saving}
                      className="inline-flex flex-1 items-center justify-center gap-1 rounded-md bg-primary px-2.5 py-1.5 text-xs font-semibold text-primary-foreground disabled:opacity-60">
                      {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />} Guardar
                    </button>
                    <button onClick={cancelEdit} className="rounded-md p-1.5 text-muted-foreground hover:bg-surface-2">
                      <X className="h-4 w-4" />
                    </button>
                  </>
                ) : (
                  <>
                    <Link to="/admin/taller/$tallerId" params={{ tallerId: t.taller_id }}
                      className="inline-flex flex-1 items-center justify-center gap-1 rounded-md bg-primary/10 px-2.5 py-1.5 text-xs font-semibold text-primary hover:bg-primary/20">
                      <ExternalLink className="h-3.5 w-3.5" /> Abrir
                    </Link>
                    <button onClick={() => startEdit(t)}
                      className="inline-flex items-center gap-1 rounded-md bg-surface-2 px-2.5 py-1.5 text-xs text-muted-foreground hover:text-foreground">
                      <Pencil className="h-3.5 w-3.5" /> Editar
                    </button>
                    <button onClick={() => toggleActivo(t)}
                      className={"inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-semibold " +
                        (t.activo
                          ? "bg-destructive/10 text-destructive hover:bg-destructive/20"
                          : "bg-success/10 text-success hover:bg-success/20")}>
                      <Power className="h-3.5 w-3.5" /> {t.activo ? "Off" : "On"}
                    </button>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Vista escritorio: tabla */}
      <div className="hidden overflow-hidden rounded-2xl border border-border bg-surface md:block">
        <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-surface-2 text-left text-[11px] uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Identificador</th>
              <th className="px-4 py-3">Nombre</th>
              <th className="px-4 py-3">Ciudad</th>
              <th className="px-4 py-3">Estado</th>
              <th className="px-4 py-3 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                <Loader2 className="mx-auto h-5 w-5 animate-spin" />
              </td></tr>
            )}
            {!loading && rows.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">No hay talleres.</td></tr>
            )}
            {rows.map((t) => {
              const isEd = editing === t.taller_id;
              return (
                <tr key={t.taller_id} className={"border-t border-border " + (t.activo ? "" : "opacity-60")}>
                  <td className="px-4 py-3 font-mono text-xs">
                    {isEd ? (
                      <input
                        value={form.taller_id}
                        onChange={(e) => setForm({ ...form, taller_id: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-") })}
                        className="w-full rounded-md border border-border bg-surface-2 px-2 py-1 font-mono"
                      />
                    ) : t.taller_id}
                  </td>
                  <td className="px-4 py-3">
                    {isEd ? (
                      <input value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                        className="w-full rounded-md border border-border bg-surface-2 px-2 py-1" />
                    ) : <span className="font-semibold">{t.nombre}</span>}
                  </td>
                  <td className="px-4 py-3">
                    {isEd ? (
                      <input value={form.ciudad} onChange={(e) => setForm({ ...form, ciudad: e.target.value })}
                        className="w-full rounded-md border border-border bg-surface-2 px-2 py-1" />
                    ) : (t.ciudad || <span className="text-muted-foreground">—</span>)}
                  </td>
                  <td className="px-4 py-3">
                    <span className={"rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase " +
                      (t.activo ? "bg-success/15 text-success" : "bg-muted text-muted-foreground")}>
                      {t.activo ? "Activo" : "Desactivado"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      {isEd ? (
                        <>
                          <button onClick={() => saveEdit(t)} disabled={saving}
                            className="inline-flex items-center gap-1 rounded-md bg-primary px-2.5 py-1 text-xs font-semibold text-primary-foreground disabled:opacity-60">
                            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />} Guardar
                          </button>
                          <button onClick={cancelEdit} className="rounded-md p-1.5 text-muted-foreground hover:bg-surface-2">
                            <X className="h-4 w-4" />
                          </button>
                        </>
                      ) : (
                        <>
                          <Link
                            to="/admin/taller/$tallerId"
                            params={{ tallerId: t.taller_id }}
                            className="inline-flex items-center gap-1 rounded-md bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary hover:bg-primary/20"
                          >
                            <ExternalLink className="h-3.5 w-3.5" /> Abrir
                          </Link>
                          <button onClick={() => startEdit(t)}
                            className="inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs text-muted-foreground hover:bg-surface-2 hover:text-foreground">
                            <Pencil className="h-3.5 w-3.5" /> Editar
                          </button>
                          <button onClick={() => toggleActivo(t)}
                            className={"inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-semibold " +
                              (t.activo
                                ? "bg-destructive/10 text-destructive hover:bg-destructive/20"
                                : "bg-success/10 text-success hover:bg-success/20")}>
                            <Power className="h-3.5 w-3.5" /> {t.activo ? "Desactivar" : "Activar"}
                          </button>
                        </>

                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        </div>
      </div>


      <p className="text-[11px] text-muted-foreground">
        Al renombrar el identificador se actualizan también los perfiles, clientes, gestiones y pedidos asociados.
      </p>
    </div>
  );
}
