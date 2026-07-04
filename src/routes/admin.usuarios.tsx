import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useCallback, useEffect, useState } from "react";
import { ShieldPlus, Loader2, Power, Trash2, RefreshCw, ShieldCheck, History } from "lucide-react";
import {
  createAdminUser,
  listAdmins,
  setAdminBanned,
  deleteAdmin,
  listAdminAuditLog,
  type AdminRow,
  type AuditRow,
} from "@/lib/mptc/admin-users.functions";

export const Route = createFileRoute("/admin/usuarios")({
  component: UsuariosAdminPage,
});

const ACTION_LABEL: Record<string, string> = {
  "admin.create": "Creación",
  "admin.deactivate": "Desactivación",
  "admin.reactivate": "Reactivación",
  "admin.delete": "Eliminación",
};

function UsuariosAdminPage() {
  const createAdmin = useServerFn(createAdminUser);
  const fetchAdmins = useServerFn(listAdmins);
  const toggleBan = useServerFn(setAdminBanned);
  const removeAdmin = useServerFn(deleteAdmin);
  const fetchAudit = useServerFn(listAdminAuditLog);

  const [rows, setRows] = useState<AdminRow[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [listErr, setListErr] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const [audit, setAudit] = useState<AuditRow[]>([]);
  const [loadingAudit, setLoadingAudit] = useState(true);
  const [auditErr, setAuditErr] = useState<string | null>(null);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [tallerName, setTallerName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoadingList(true); setListErr(null);
    try {
      const data = await fetchAdmins();
      setRows(data);
    } catch (err: any) {
      setListErr(err?.message || "No se pudo cargar la lista");
    } finally {
      setLoadingList(false);
    }
  }, [fetchAdmins]);

  const loadAudit = useCallback(async () => {
    setLoadingAudit(true); setAuditErr(null);
    try {
      const data = await fetchAudit();
      setAudit(data);
    } catch (err: any) {
      setAuditErr(err?.message || "No se pudo cargar el historial");
    } finally {
      setLoadingAudit(false);
    }
  }, [fetchAudit]);

  useEffect(() => { load(); loadAudit(); }, [load, loadAudit]);

  const refreshAll = useCallback(() => { load(); loadAudit(); }, [load, loadAudit]);


  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null); setInfo(null); setLoading(true);
    try {
      await createAdmin({ data: { email, password, tallerName } });
      setInfo(`Administrador creado: ${email}`);
      setEmail(""); setPassword(""); setTallerName("");
      refreshAll();
    } catch (err: any) {
      setError(err?.message || "No se pudo crear el administrador");
    } finally {
      setLoading(false);
    }
  };

  const onToggleBan = async (row: AdminRow) => {
    if (row.is_self) return;
    const verb = row.banned ? "reactivar" : "desactivar";
    if (!window.confirm(`¿Seguro que quieres ${verb} a ${row.email ?? row.user_id}?`)) return;
    setBusyId(row.user_id);
    try {
      await toggleBan({ data: { userId: row.user_id, banned: !row.banned } });
      refreshAll();
    } catch (err: any) {
      alert(err?.message || "No se pudo actualizar");
    } finally {
      setBusyId(null);
    }
  };

  const onDelete = async (row: AdminRow) => {
    if (row.is_self) return;
    if (!window.confirm(`¿Eliminar permanentemente a ${row.email ?? row.user_id}? Esta acción no se puede deshacer.`)) return;
    setBusyId(row.user_id);
    try {
      await removeAdmin({ data: { userId: row.user_id } });
      refreshAll();
    } catch (err: any) {
      alert(err?.message || "No se pudo eliminar");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <section>
        <header className="mb-4 flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-primary" />
          <h1 className="text-lg font-semibold">Administradores</h1>
          <button
            onClick={refreshAll}
            className="ml-auto inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-2.5 py-1 text-xs text-muted-foreground hover:bg-surface-2 hover:text-foreground"
            aria-label="Recargar"
          >
            <RefreshCw className="h-3.5 w-3.5" /> Recargar
          </button>
        </header>

        <div className="rounded-2xl border border-border bg-surface">
          {loadingList ? (
            <div className="flex items-center gap-2 p-5 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Cargando…
            </div>
          ) : listErr ? (
            <p className="p-5 text-sm text-red-500">{listErr}</p>
          ) : rows.length === 0 ? (
            <p className="p-5 text-sm text-muted-foreground">No hay administradores.</p>
          ) : (
            <ul className="divide-y divide-border">
              {rows.map((row) => (
                <li key={row.user_id} className="flex flex-wrap items-center gap-3 p-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-sm font-medium">{row.email ?? "(sin email)"}</span>
                      {row.is_self && (
                        <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-semibold text-primary">Tú</span>
                      )}
                      {row.banned && (
                        <span className="rounded-full bg-red-500/15 px-2 py-0.5 text-[10px] font-semibold text-red-500">Desactivado</span>
                      )}
                    </div>
                    <div className="mt-0.5 truncate text-[11px] text-muted-foreground">
                      {row.taller_name}
                      {row.last_sign_in_at && ` · Último acceso ${new Date(row.last_sign_in_at).toLocaleString()}`}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      disabled={row.is_self || busyId === row.user_id}
                      onClick={() => onToggleBan(row)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-xs text-muted-foreground hover:bg-surface-2 hover:text-foreground disabled:opacity-40"
                      title={row.is_self ? "No puedes desactivar tu propia cuenta" : row.banned ? "Reactivar" : "Desactivar"}
                    >
                      {busyId === row.user_id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Power className="h-3.5 w-3.5" />}
                      {row.banned ? "Reactivar" : "Desactivar"}
                    </button>
                    <button
                      disabled={row.is_self || busyId === row.user_id}
                      onClick={() => onDelete(row)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-red-500/30 px-2.5 py-1.5 text-xs text-red-500 hover:bg-red-500/10 disabled:opacity-40"
                      title={row.is_self ? "No puedes eliminar tu propia cuenta" : "Eliminar"}
                    >
                      <Trash2 className="h-3.5 w-3.5" /> Eliminar
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <section>
        <header className="mb-4 flex items-center gap-2">
          <ShieldPlus className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">Crear administrador</h2>
        </header>
        <form onSubmit={submit} className="space-y-3 rounded-2xl border border-border bg-surface p-5">
          <label className="block text-sm">
            <span className="text-muted-foreground">Email</span>
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm" />
          </label>
          <label className="block text-sm">
            <span className="text-muted-foreground">Contraseña (mín. 8)</span>
            <input type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm" />
          </label>
          <label className="block text-sm">
            <span className="text-muted-foreground">Nombre (opcional)</span>
            <input value={tallerName} onChange={(e) => setTallerName(e.target.value)} placeholder="Administración"
              className="mt-1 w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm" />
          </label>
          {error && <p className="text-sm text-red-500">{error}</p>}
          {info && <p className="text-sm text-emerald-500">{info}</p>}
          <button type="submit" disabled={loading}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-60">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldPlus className="h-4 w-4" />}
            {loading ? "Creando…" : "Crear administrador"}
          </button>
          <p className="text-[11px] text-muted-foreground">
            Solo los administradores existentes pueden crear otros administradores. La cuenta se crea con el email ya confirmado.
          </p>
        </form>
      </section>

      <section>
        <header className="mb-4 flex items-center gap-2">
          <History className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">Historial de auditoría</h2>
          <span className="ml-auto text-[11px] text-muted-foreground">Últimos 200 eventos</span>
        </header>
        <div className="rounded-2xl border border-border bg-surface">
          {loadingAudit ? (
            <div className="flex items-center gap-2 p-5 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Cargando…
            </div>
          ) : auditErr ? (
            <p className="p-5 text-sm text-red-500">{auditErr}</p>
          ) : audit.length === 0 ? (
            <p className="p-5 text-sm text-muted-foreground">Sin eventos registrados.</p>
          ) : (
            <ul className="divide-y divide-border">
              {audit.map((row) => (
                <li key={row.id} className="flex flex-wrap items-center gap-3 p-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2 text-sm">
                      <span className="rounded-full bg-surface-2 px-2 py-0.5 text-[11px] font-semibold">
                        {ACTION_LABEL[row.action] ?? row.action}
                      </span>
                      <span className="truncate font-medium">{row.target_email ?? "—"}</span>
                    </div>
                    <div className="mt-0.5 truncate text-[11px] text-muted-foreground">
                      Por {row.actor_email ?? "sistema"} · {new Date(row.created_at).toLocaleString()}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}
