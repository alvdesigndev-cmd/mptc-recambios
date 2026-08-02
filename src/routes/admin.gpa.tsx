import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { CheckCircle2, Eye, EyeOff, Loader2, Plug, Power, Save, ShieldCheck, XCircle } from "lucide-react";
import { toast } from "sonner";
import {
  activarIntegracionGPA,
  guardarConfigGPA,
  obtenerConfigGPA,
  validarConfigGPA,
  type GpaConfigPublica,
} from "@/lib/mptc/gpa-config.functions";

export const Route = createFileRoute("/admin/gpa")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Integración Grupo Peña / GPCat · MPTC" },
      { name: "description", content: "Configura y valida las credenciales de la integración GPCat de Grupo Peña Automoción." },
    ],
  }),
  component: GpaConfigPage,
});

function GpaConfigPage() {
  const cargar = useServerFn(obtenerConfigGPA);
  const guardar = useServerFn(guardarConfigGPA);
  const activar = useServerFn(activarIntegracionGPA);
  const validar = useServerFn(validarConfigGPA);

  const [cfg, setCfg] = useState<GpaConfigPublica | null>(null);
  const [loading, setLoading] = useState(true);
  const [urlBase, setUrlBase] = useState("");
  const [usuario, setUsuario] = useState("");
  const [password, setPassword] = useState("");
  const [verPass, setVerPass] = useState(false);
  const [activa, setActiva] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [resultado, setResultado] = useState<{ ok: boolean; mensaje: string } | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const r = await cargar({ data: undefined });
      setCfg(r);
      setUrlBase(r.urlBase);
      setUsuario(r.usuario);
      setActiva(r.activa);
      setPassword("");
    } catch {
      toast.error("No se pudo cargar la configuración");
    } finally {
      setLoading(false);
    }
  }, [cargar]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const onGuardar = async () => {
    setSaving(true);
    try {
      const r = await guardar({ data: { urlBase, usuario, password, activa } });
      if (!r.ok) {
        toast.error(r.error ?? "No se pudo guardar");
        return;
      }
      toast.success("Configuración guardada");
      setResultado(null);
      await refresh();
    } catch {
      toast.error("No se pudo guardar la configuración");
    } finally {
      setSaving(false);
    }
  };

  const onToggle = async () => {
    const nuevo = !activa;
    setActiva(nuevo);
    try {
      const r = await activar({ data: { activa: nuevo } });
      if (!r.ok) {
        setActiva(!nuevo);
        toast.error(r.error ?? "No se pudo cambiar el estado");
        return;
      }
      toast.success(nuevo ? "Integración activada" : "Integración desactivada (modo demo)");
      await refresh();
    } catch {
      setActiva(!nuevo);
      toast.error("No se pudo cambiar el estado");
    }
  };

  const onValidar = async () => {
    setTesting(true);
    setResultado(null);
    try {
      const r = await validar({ data: undefined });
      setResultado(r);
      if (r.ok) toast.success(r.mensaje);
      else toast.error(r.mensaje);
    } catch {
      setResultado({ ok: false, mensaje: "No se pudo validar la conexión" });
    } finally {
      setTesting(false);
    }
  };

  const inputCls =
    "w-full rounded-xl border border-border bg-surface-2 px-3 py-2.5 text-[16px] outline-none focus:border-primary";

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15 text-primary">
          <Plug className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="text-base font-bold leading-tight">Integración Grupo Peña / GPCat</h1>
          <p className="text-[12px] text-muted-foreground">
            Guarda y valida las credenciales. Puedes activar o desactivar la integración sin volver a publicar.
          </p>
        </div>
      </header>

      {loading ? (
        <div className="flex items-center gap-2 rounded-2xl border border-border bg-surface p-4 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Cargando configuración…
        </div>
      ) : (
        <>
          <section className="rounded-2xl border border-border bg-surface p-4">
            <div className="flex flex-wrap items-center gap-3">
              <span
                className={`rounded-full px-2.5 py-1 text-[12px] font-semibold ${
                  cfg && !cfg.modoMock ? "bg-emerald-500/15 text-emerald-500" : "bg-amber-500/15 text-amber-500"
                }`}
              >
                {cfg && !cfg.modoMock ? "API real activa" : "Modo demo (datos de ejemplo)"}
              </span>
              <span className="text-[12px] text-muted-foreground">
                Origen: {cfg?.origen === "bd" ? "guardado en la app" : "variables de entorno"}
                {cfg?.updatedAt ? ` · Actualizado ${new Date(cfg.updatedAt).toLocaleString("es-ES")}` : ""}
              </span>
              <button
                type="button"
                onClick={() => void onToggle()}
                className={`ml-auto inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold active:scale-95 ${
                  activa ? "bg-surface-2 text-foreground" : "bg-primary text-primary-foreground"
                }`}
              >
                <Power className="h-4 w-4" /> {activa ? "Desactivar" : "Activar"}
              </button>
            </div>
          </section>

          <section className="space-y-3 rounded-2xl border border-border bg-surface p-4">
            <div>
              <label className="mb-1 block text-[12px] font-semibold text-muted-foreground" htmlFor="gpa-url">
                URL base del servicio
              </label>
              <input id="gpa-url" value={urlBase} onChange={(e) => setUrlBase(e.target.value)} className={inputCls} placeholder="https://…" />
            </div>
            <div>
              <label className="mb-1 block text-[12px] font-semibold text-muted-foreground" htmlFor="gpa-user">
                Usuario
              </label>
              <input id="gpa-user" value={usuario} onChange={(e) => setUsuario(e.target.value)} className={inputCls} autoComplete="off" />
            </div>
            <div>
              <label className="mb-1 block text-[12px] font-semibold text-muted-foreground" htmlFor="gpa-pass">
                Contraseña {cfg?.tienePassword ? "(guardada — déjala vacía para no cambiarla)" : ""}
              </label>
              <div className="relative">
                <input
                  id="gpa-pass"
                  type={verPass ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`${inputCls} pr-11`}
                  autoComplete="new-password"
                  placeholder={cfg?.tienePassword ? "••••••••" : "Contraseña de GPCat"}
                />
                <button
                  type="button"
                  onClick={() => setVerPass((v) => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-2 text-muted-foreground hover:bg-surface-3"
                  aria-label={verPass ? "Ocultar contraseña" : "Mostrar contraseña"}
                >
                  {verPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={activa} onChange={(e) => setActiva(e.target.checked)} className="h-4 w-4" />
              Integración activada
            </label>

            <div className="grid gap-2 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => void onGuardar()}
                disabled={saving}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-3 py-2.5 text-sm font-semibold text-primary-foreground active:scale-95 disabled:opacity-60"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Guardar
              </button>
              <button
                type="button"
                onClick={() => void onValidar()}
                disabled={testing}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-surface-2 px-3 py-2.5 text-sm font-semibold active:scale-95 disabled:opacity-60"
              >
                {testing ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />} Validar conexión
              </button>
            </div>

            {resultado ? (
              <div
                className={`flex items-center gap-2 rounded-xl border p-3 text-[13px] ${
                  resultado.ok
                    ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-500"
                    : "border-destructive/40 bg-destructive/10 text-destructive"
                }`}
              >
                {resultado.ok ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                {resultado.mensaje}
              </div>
            ) : null}

            <p className="text-[12px] text-muted-foreground">
              Con la integración desactivada o sin credenciales, la búsqueda de piezas sigue funcionando con datos de
              ejemplo, sin llamar a GPCat.
            </p>
          </section>
        </>
      )}
    </div>
  );
}
