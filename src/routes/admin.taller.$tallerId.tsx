import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  ArrowLeft, Loader2, Save, KeyRound, Trash2, Eye, Plus, Power, User as UserIcon, Search, X as XIcon, UserPlus,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { GestionModal } from "@/components/mptc/GestionModal";
import { estadoBadge, type Gestion } from "@/lib/mptc/types";
import { listTallerUsers, setTallerUserPassword, createTallerUser, deleteTallerUser, type TallerUser } from "@/lib/mptc/admin-talleres.functions";


export const Route = createFileRoute("/admin/taller/$tallerId")({
  component: TallerDetailPage,
});

interface Taller {
  taller_id: string;
  nombre: string;
  ciudad: string;
  activo: boolean;
}

function TallerDetailPage() {
  const { tallerId } = Route.useParams();
  const navigate = useNavigate();
  const fetchUsers = useServerFn(listTallerUsers);
  const fetchSetPwd = useServerFn(setTallerUserPassword);
  const fetchCreateUser = useServerFn(createTallerUser);
  const fetchDeleteUser = useServerFn(deleteTallerUser);

  const [taller, setTaller] = useState<Taller | null>(null);
  const [nombre, setNombre] = useState("");
  const [ciudad, setCiudad] = useState("");
  const [users, setUsers] = useState<TallerUser[]>([]);
  const [gestiones, setGestiones] = useState<Gestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingHeader, setSavingHeader] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [open, setOpen] = useState<Gestion | null>(null);

  // Password state per user
  const [pwd, setPwd] = useState<Record<string, string>>({});
  const [savingPwd, setSavingPwd] = useState<string | null>(null);

  // New user form
  const [creatingUser, setCreatingUser] = useState(false);
  const [newUser, setNewUser] = useState({ email: "", password: "", mecanico: "" });
  const [savingNewUser, setSavingNewUser] = useState(false);
  const [deletingUser, setDeletingUser] = useState<string | null>(null);

  // New gestion quick form
  const [creating, setCreating] = useState(false);
  const [newG, setNewG] = useState({
    matricula: "", cliente_nombre: "", cliente_telefono: "",
    vehiculo: "", subfamilia: "", importe: "", descripcion: "", piezas: "",
  });
  const [savingNew, setSavingNew] = useState(false);

  // Filtros de búsqueda de gestiones
  const [q, setQ] = useState("");
  const [fechaDesde, setFechaDesde] = useState("");
  const [fechaHasta, setFechaHasta] = useState("");
  const [sortDir, setSortDir] = useState<"desc" | "asc">("desc");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const load = useCallback(async () => {
    setLoading(true); setErr(null);
    try {
      const [{ data: t, error: te }, { data: g, error: ge }] = await Promise.all([
        supabase.from("talleres").select("*").eq("taller_id", tallerId).maybeSingle(),
        supabase.from("gestiones").select("*").eq("taller_id", tallerId).order("created_at", { ascending: false }),
      ]);
      if (te) throw te;
      if (ge) throw ge;
      if (!t) throw new Error("Taller no encontrado");
      const row = t as Taller;
      setTaller(row);
      setNombre(row.nombre);
      setCiudad(row.ciudad ?? "");
      setGestiones((g as Gestion[]) || []);
      const list = await fetchUsers({ data: { tallerId } });
      setUsers(list);
    } catch (e: any) {
      setErr(e?.message || "No se pudo cargar el taller");
    } finally {
      setLoading(false);
    }
  }, [tallerId, fetchUsers]);

  useEffect(() => { load(); }, [load]);

  const saveHeader = async () => {
    if (!taller) return;
    if (!confirm(`¿Guardar cambios del taller "${taller.nombre}"?`)) return;
    setSavingHeader(true); setErr(null);
    try {
      const { error } = await supabase
        .from("talleres")
        .update({ nombre: nombre.trim() || taller.nombre, ciudad: ciudad.trim() })
        .eq("taller_id", taller.taller_id);
      if (error) throw error;
      toast.success("Taller actualizado");
      await load();
    } catch (e: any) {
      const msg = e?.message || "No se pudo guardar";
      setErr(msg);
      toast.error(msg);
    } finally {
      setSavingHeader(false);
    }
  };

  const toggleActivo = async () => {
    if (!taller) return;
    if (!confirm(taller.activo ? `¿Desactivar ${taller.nombre}?` : `¿Reactivar ${taller.nombre}?`)) return;
    const { error } = await supabase.from("talleres").update({ activo: !taller.activo }).eq("taller_id", taller.taller_id);
    if (error) { toast.error(error.message); return; }
    toast.success(taller.activo ? "Taller desactivado" : "Taller reactivado");
    load();
  };

  const changePassword = async (user_id: string) => {
    const p = (pwd[user_id] || "").trim();
    if (p.length < 8) { toast.error("La contraseña debe tener al menos 8 caracteres"); return; }
    setSavingPwd(user_id);
    try {
      await fetchSetPwd({ data: { userId: user_id, password: p } });
      toast.success("Contraseña actualizada");
      setPwd((x) => ({ ...x, [user_id]: "" }));
    } catch (e: any) {
      toast.error(e?.message || "No se pudo cambiar la contraseña");
    } finally {
      setSavingPwd(null);
    }
  };

  const createUser = async () => {
    if (!taller) return;
    const email = newUser.email.trim().toLowerCase();
    const password = newUser.password;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { toast.error("Email no válido"); return; }
    if (password.length < 8) { toast.error("La contraseña debe tener al menos 8 caracteres"); return; }
    if (!confirm(`¿Crear cuenta ${email} en ${taller.nombre}?`)) return;
    setSavingNewUser(true);
    try {
      await fetchCreateUser({ data: { tallerId: taller.taller_id, email, password, mecanico: newUser.mecanico.trim() } });
      toast.success("Cuenta creada");
      setCreatingUser(false);
      setNewUser({ email: "", password: "", mecanico: "" });
      const list = await fetchUsers({ data: { tallerId: taller.taller_id } });
      setUsers(list);
    } catch (e: any) {
      toast.error(e?.message || "No se pudo crear la cuenta");
    } finally {
      setSavingNewUser(false);
    }
  };

  const removeUser = async (u: TallerUser) => {
    if (!confirm(`¿Eliminar la cuenta ${u.email || u.user_id}? Esta acción no se puede deshacer.`)) return;
    setDeletingUser(u.user_id);
    try {
      await fetchDeleteUser({ data: { userId: u.user_id } });
      toast.success("Cuenta eliminada");
      setUsers((prev) => prev.filter((x) => x.user_id !== u.user_id));
    } catch (e: any) {
      toast.error(e?.message || "No se pudo eliminar la cuenta");
    } finally {
      setDeletingUser(null);
    }
  };

    if (!confirm(`¿Eliminar la gestión ${g.matricula || g.id}? Esta acción no se puede deshacer.`)) return;
    const { error } = await supabase.from("gestiones").delete().eq("id", g.id);
    if (error) { toast.error(error.message); return; }
    toast.success("Gestión eliminada");
    setGestiones((prev) => prev.filter((x) => x.id !== g.id));
  };

  const createGestion = async () => {
    if (!taller) return;
    if (!newG.matricula.trim() && !newG.cliente_nombre.trim()) {
      toast.error("Introduce al menos matrícula o cliente");
      return;
    }
    const label = newG.matricula.trim().toUpperCase() || newG.cliente_nombre.trim();
    if (!confirm(`¿Crear nueva gestión (${label}) en ${taller.nombre}?`)) return;
    setSavingNew(true);
    try {
      const { error } = await supabase.from("gestiones").insert({
        taller_id: taller.taller_id,
        taller_nombre: taller.nombre,
        matricula: newG.matricula.trim().toUpperCase() || null,
        cliente_nombre: newG.cliente_nombre.trim() || null,
        cliente_telefono: newG.cliente_telefono.trim() || null,
        vehiculo: newG.vehiculo.trim() || null,
        subfamilia: newG.subfamilia.trim() || null,
        importe: newG.importe.trim() || null,
        descripcion: newG.descripcion.trim() || null,
        piezas: newG.piezas.trim() || null,
        estado: "en-curso",
        pedido_pena: false,
      });
      if (error) throw error;
      toast.success("Gestión creada");
      setCreating(false);
      setNewG({ matricula: "", cliente_nombre: "", cliente_telefono: "", vehiculo: "", subfamilia: "", importe: "", descripcion: "", piezas: "" });
      load();
    } catch (e: any) {
      toast.error(e?.message || "No se pudo crear la gestión");
    } finally {
      setSavingNew(false);
    }
  };

  const gestionesFiltradas = useMemo(() => {
    const qn = q.trim().toLowerCase();
    const desde = fechaDesde ? new Date(fechaDesde + "T00:00:00").getTime() : null;
    const hasta = fechaHasta ? new Date(fechaHasta + "T23:59:59").getTime() : null;
    const filtered = gestiones.filter((g) => {
      if (desde !== null || hasta !== null) {
        const t = new Date(g.created_at).getTime();
        if (desde !== null && t < desde) return false;
        if (hasta !== null && t > hasta) return false;
      }
      if (qn) {
        const hay = [g.matricula, g.cliente_nombre, g.cliente_telefono, g.vehiculo, g.subfamilia]
          .filter(Boolean).join(" ").toLowerCase();
        if (!hay.includes(qn)) return false;
      }
      return true;
    });
    const sorted = [...filtered].sort((a, b) => {
      const da = new Date(a.created_at).getTime();
      const db = new Date(b.created_at).getTime();
      return sortDir === "desc" ? db - da : da - db;
    });
    return sorted;
  }, [gestiones, q, fechaDesde, fechaHasta, sortDir]);

  const totalImporte = useMemo(() => {
    return gestionesFiltradas.reduce((acc, g) => {
      const n = parseFloat((g.importe || "0").replace(",", "."));
      return acc + (isNaN(n) ? 0 : n);
    }, 0);
  }, [gestionesFiltradas]);

  const totalPages = Math.max(1, Math.ceil(gestionesFiltradas.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageStart = (currentPage - 1) * pageSize;
  const gestionesPaginadas = useMemo(
    () => gestionesFiltradas.slice(pageStart, pageStart + pageSize),
    [gestionesFiltradas, pageStart, pageSize],
  );

  // Reset a página 1 cuando cambian filtros/orden/tamaño
  useEffect(() => { setPage(1); }, [q, fechaDesde, fechaHasta, sortDir, pageSize]);



  const hasFilter = !!(q.trim() || fechaDesde || fechaHasta);

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <Link to="/admin/talleres" className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-sm text-muted-foreground hover:bg-surface-2 hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Talleres
        </Link>
      </div>

      {loading && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Cargando…
        </div>
      )}
      {err && <div className="rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-2 text-sm text-destructive">{err}</div>}

      {taller && (
        <>
          {/* Header edit */}
          <div className="rounded-2xl border border-border bg-surface p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <div className="text-[11px] font-mono text-muted-foreground">{taller.taller_id}</div>
                <div className="mt-1 flex items-center gap-2">
                  <h1 className="text-xl font-bold">{taller.nombre}</h1>
                  <span className={"rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase " +
                    (taller.activo ? "bg-success/15 text-success" : "bg-muted text-muted-foreground")}>
                    {taller.activo ? "Activo" : "Desactivado"}
                  </span>
                </div>
              </div>
              <button
                onClick={toggleActivo}
                className={"inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-semibold " +
                  (taller.activo ? "bg-warning/15 text-warning hover:bg-warning/25" : "bg-success/15 text-success hover:bg-success/25")}
              >
                <Power className="h-4 w-4" /> {taller.activo ? "Desactivar" : "Reactivar"}
              </button>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="text-xs">
                <span className="text-muted-foreground">Nombre</span>
                <input value={nombre} onChange={(e) => setNombre(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm" />
              </label>
              <label className="text-xs">
                <span className="text-muted-foreground">Ciudad</span>
                <input value={ciudad} onChange={(e) => setCiudad(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm" />
              </label>
            </div>
            <div className="mt-3 flex justify-end">
              <button onClick={saveHeader} disabled={savingHeader}
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-1.5 text-sm font-semibold text-primary-foreground disabled:opacity-60">
                {savingHeader ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Guardar
              </button>
            </div>
          </div>

          {/* Users + password reset */}
          <div className="rounded-2xl border border-border bg-surface p-4">
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
              <UserIcon className="h-4 w-4 text-primary" /> Usuarios del taller
            </div>
            {users.length === 0 && (
              <div className="text-sm text-muted-foreground">No hay usuarios registrados para este taller.</div>
            )}
            <div className="space-y-3">
              {users.map((u) => (
                <div key={u.user_id} className="rounded-xl border border-border bg-surface-2 p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold">{u.email || "(sin email)"}</div>
                      <div className="text-[11px] text-muted-foreground">Rol: {u.role}{u.mecanico ? ` · ${u.mecanico}` : ""}</div>
                    </div>
                  </div>
                  <div className="mt-2 flex flex-wrap items-end gap-2">
                    <label className="flex-1 min-w-[220px] text-xs">
                      <span className="text-muted-foreground">Nueva contraseña</span>
                      <input
                        type="text"
                        value={pwd[u.user_id] || ""}
                        onChange={(e) => setPwd({ ...pwd, [u.user_id]: e.target.value })}
                        placeholder="Mín. 8 caracteres"
                        className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm"
                      />
                    </label>
                    <button
                      onClick={() => changePassword(u.user_id)}
                      disabled={savingPwd === u.user_id}
                      className="inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60"
                    >
                      {savingPwd === u.user_id ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
                      Cambiar contraseña
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Gestiones */}
          <div className="rounded-2xl border border-border bg-surface p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-semibold">Gestiones</div>
                <div className="text-[11px] text-muted-foreground">
                  {hasFilter
                    ? `${gestionesFiltradas.length} de ${gestiones.length}`
                    : `${gestiones.length} en total`}
                  {" "}· Importe {hasFilter ? "filtrado" : "acumulado"}: {totalImporte.toFixed(2)} €
                </div>
              </div>
              <button
                onClick={() => setCreating((v) => !v)}
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-1.5 text-sm font-semibold text-primary-foreground active:scale-95"
              >
                <Plus className="h-4 w-4" /> {creating ? "Cerrar" : "Nueva gestión"}
              </button>
            </div>

            {/* Filtros de búsqueda */}
            <div className="mb-3 grid gap-2 sm:grid-cols-[1fr_auto_auto_auto] sm:items-end">
              <label className="text-xs">
                <span className="text-muted-foreground">Buscar por matrícula, cliente, teléfono…</span>
                <div className="relative mt-1">
                  <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                  <input
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder="Ej: 1234ABC o Juan Pérez"
                    className="w-full rounded-lg border border-border bg-surface-2 py-2 pl-7 pr-8 text-sm"
                  />
                  {q && (
                    <button
                      onClick={() => setQ("")}
                      className="absolute right-1 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:bg-surface-3"
                      title="Limpiar"
                    >
                      <XIcon className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </label>
              <label className="text-xs">
                <span className="text-muted-foreground">Desde</span>
                <input
                  type="date"
                  value={fechaDesde}
                  onChange={(e) => setFechaDesde(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-border bg-surface-2 px-2 py-2 text-sm"
                />
              </label>
              <label className="text-xs">
                <span className="text-muted-foreground">Hasta</span>
                <input
                  type="date"
                  value={fechaHasta}
                  onChange={(e) => setFechaHasta(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-border bg-surface-2 px-2 py-2 text-sm"
                />
              </label>
              {hasFilter && (
                <button
                  onClick={() => { setQ(""); setFechaDesde(""); setFechaHasta(""); }}
                  className="inline-flex items-center gap-1 rounded-lg bg-surface-2 px-3 py-2 text-xs text-muted-foreground hover:bg-surface-3"
                >
                  <XIcon className="h-3.5 w-3.5" /> Limpiar
                </button>
              )}
            </div>

            {creating && (
              <div className="mb-4 rounded-xl border border-border bg-surface-2 p-3">
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="text-xs"><span className="text-muted-foreground">Matrícula</span>
                    <input value={newG.matricula} onChange={(e) => setNewG({ ...newG, matricula: e.target.value.toUpperCase() })}
                      className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 font-mono text-sm" />
                  </label>
                  <label className="text-xs"><span className="text-muted-foreground">Cliente</span>
                    <input value={newG.cliente_nombre} onChange={(e) => setNewG({ ...newG, cliente_nombre: e.target.value })}
                      className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm" />
                  </label>
                  <label className="text-xs"><span className="text-muted-foreground">Teléfono</span>
                    <input value={newG.cliente_telefono} onChange={(e) => setNewG({ ...newG, cliente_telefono: e.target.value })}
                      className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm" />
                  </label>
                  <label className="text-xs"><span className="text-muted-foreground">Vehículo</span>
                    <input value={newG.vehiculo} onChange={(e) => setNewG({ ...newG, vehiculo: e.target.value })}
                      className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm" />
                  </label>
                  <label className="text-xs"><span className="text-muted-foreground">Subfamilia</span>
                    <input value={newG.subfamilia} onChange={(e) => setNewG({ ...newG, subfamilia: e.target.value })}
                      className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm" />
                  </label>
                  <label className="text-xs"><span className="text-muted-foreground">Importe</span>
                    <input value={newG.importe} onChange={(e) => setNewG({ ...newG, importe: e.target.value })}
                      className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm" />
                  </label>
                  <label className="text-xs sm:col-span-2"><span className="text-muted-foreground">Piezas</span>
                    <input value={newG.piezas} onChange={(e) => setNewG({ ...newG, piezas: e.target.value })}
                      className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm" />
                  </label>
                  <label className="text-xs sm:col-span-2"><span className="text-muted-foreground">Descripción</span>
                    <textarea value={newG.descripcion} onChange={(e) => setNewG({ ...newG, descripcion: e.target.value })}
                      rows={2} className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm" />
                  </label>
                </div>
                <div className="mt-3 flex justify-end gap-2">
                  <button onClick={() => setCreating(false)} className="rounded-lg px-3 py-1.5 text-sm text-muted-foreground hover:bg-surface">Cancelar</button>
                  <button onClick={createGestion} disabled={savingNew}
                    className="inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-1.5 text-sm font-semibold text-primary-foreground disabled:opacity-60">
                    {savingNew ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Crear gestión
                  </button>
                </div>
              </div>
            )}

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-surface-2 text-left text-[11px] uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2">
                      <button
                        onClick={() => setSortDir((d) => (d === "desc" ? "asc" : "desc"))}
                        className="inline-flex items-center gap-1 uppercase tracking-wide hover:text-foreground"
                        title={sortDir === "desc" ? "Más recientes primero" : "Más antiguas primero"}
                      >
                        Fecha <span aria-hidden="true">{sortDir === "desc" ? "↓" : "↑"}</span>
                      </button>
                    </th>
                    <th className="px-3 py-2">Matrícula</th>
                    <th className="px-3 py-2">Cliente</th>
                    <th className="px-3 py-2">Subfamilia</th>
                    <th className="px-3 py-2">Estado</th>
                    <th className="px-3 py-2 text-right">Importe</th>
                    <th className="px-3 py-2 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {gestionesFiltradas.length === 0 && (
                    <tr><td colSpan={7} className="px-3 py-8 text-center text-muted-foreground">
                      {gestiones.length === 0 ? "No hay gestiones en este taller." : "Ninguna gestión coincide con la búsqueda."}
                    </td></tr>
                  )}
                  {gestionesPaginadas.map((g) => {
                    const badge = estadoBadge(g.estado);
                    return (
                      <tr key={g.id} className="border-t border-border">
                        <td className="px-3 py-2 text-xs text-muted-foreground">
                          {new Date(g.created_at).toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit", year: "2-digit" })}
                        </td>
                        <td className="px-3 py-2 font-mono">{g.matricula || <span className="text-muted-foreground">—</span>}</td>
                        <td className="px-3 py-2">{g.cliente_nombre || <span className="text-muted-foreground">—</span>}</td>
                        <td className="px-3 py-2">{g.subfamilia || <span className="text-muted-foreground">—</span>}</td>
                        <td className="px-3 py-2">
                          <span className={"rounded-full px-2 py-0.5 text-[10px] font-semibold " + badge.cls}>{badge.label}</span>
                        </td>
                        <td className="px-3 py-2 text-right font-semibold">{g.importe ? `${g.importe} €` : "—"}</td>
                        <td className="px-3 py-2">
                          <div className="flex justify-end gap-1">
                            <button onClick={() => setOpen(g)}
                              className="inline-flex items-center gap-1 rounded-md bg-surface-2 px-2 py-1 text-xs hover:bg-surface-3" title="Ver / editar">
                              <Eye className="h-3.5 w-3.5" />
                            </button>
                            <button onClick={() => deleteGestion(g)}
                              className="inline-flex items-center gap-1 rounded-md bg-destructive/15 px-2 py-1 text-xs text-destructive hover:bg-destructive/25" title="Eliminar">
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Paginación */}
            {gestionesFiltradas.length > 0 && (
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                <div>
                  Mostrando <span className="font-semibold text-foreground">{pageStart + 1}</span>–
                  <span className="font-semibold text-foreground">{Math.min(pageStart + pageSize, gestionesFiltradas.length)}</span>
                  {" "}de <span className="font-semibold text-foreground">{gestionesFiltradas.length}</span>
                </div>
                <div className="flex items-center gap-2">
                  <label className="inline-flex items-center gap-1">
                    <span>Por página</span>
                    <select
                      value={pageSize}
                      onChange={(e) => setPageSize(parseInt(e.target.value, 10))}
                      className="rounded-md border border-border bg-surface-2 px-2 py-1 text-xs"
                    >
                      {[10, 20, 50, 100].map((n) => <option key={n} value={n}>{n}</option>)}
                    </select>
                  </label>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setPage(1)}
                      disabled={currentPage <= 1}
                      className="rounded-md border border-border bg-surface-2 px-2 py-1 disabled:opacity-40"
                    >«</button>
                    <button
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage <= 1}
                      className="rounded-md border border-border bg-surface-2 px-2 py-1 disabled:opacity-40"
                    >‹</button>
                    <span className="px-2">Página <span className="font-semibold text-foreground">{currentPage}</span> / {totalPages}</span>
                    <button
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      disabled={currentPage >= totalPages}
                      className="rounded-md border border-border bg-surface-2 px-2 py-1 disabled:opacity-40"
                    >›</button>
                    <button
                      onClick={() => setPage(totalPages)}
                      disabled={currentPage >= totalPages}
                      className="rounded-md border border-border bg-surface-2 px-2 py-1 disabled:opacity-40"
                    >»</button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      <GestionModal gestion={open} onClose={() => setOpen(null)} onChanged={load} />
    </div>
  );
}
