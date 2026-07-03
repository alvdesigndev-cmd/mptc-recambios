import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { signIn, signUp, syncProfileToSettings } from "@/lib/mptc/auth";
import { supabase } from "@/integrations/supabase/client";
import type { Role } from "@/lib/mptc/profiles";
import { pickPostLoginPath } from "@/lib/mptc/redirect";

export const Route = createFileRoute("/auth")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Acceso · MPTC" },
      { name: "description", content: "Inicia sesión en MPTC Taller Conectado." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Role>("taller-1");
  const [tallerName, setTallerName] = useState("");
  const [mecanico, setMecanico] = useState("");
  const [ciudad, setCiudad] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [activeTallerIds, setActiveTallerIds] = useState<Set<string> | null>(null);

  const roleFallback = (r: Role | undefined | null) =>
    r === "admin" ? "/admin/talleres" : r === "pena" ? "/pena" : "/app";

  useEffect(() => {
    // Aviso si /app nos redirigió con ?disabled=1
    if (typeof window !== "undefined" && new URLSearchParams(window.location.search).get("disabled") === "1") {
      setError("Tu taller ha sido desactivado. Contacta con el administrador.");
    }
    let cancelled = false;
    supabase.auth.getSession().then(async ({ data }) => {
      if (cancelled || !data.session) return;
      const p = await syncProfileToSettings();
      navigate({ to: pickPostLoginPath(roleFallback(p?.role)) as any, replace: true });
    });
    // Carga la lista de talleres activos para el registro.
    supabase.from("talleres").select("taller_id,activo").then(({ data }) => {
      if (cancelled || !data) return;
      setActiveTallerIds(new Set(data.filter((t: any) => t.activo).map((t: any) => t.taller_id as string)));
    });
    return () => { cancelled = true; };
  }, [navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null); setInfo(null); setLoading(true);
    try {
      if (mode === "login") {
        const { error } = await signIn(email, password);
        if (error) throw error;
        const p = await syncProfileToSettings();
        navigate({ to: pickPostLoginPath(roleFallback(p?.role)) as any, replace: true });
      } else {
        const { error } = await signUp({
          email, password, role,
          tallerName: tallerName || (role === "pena" ? "Grupo Peña" : "Taller"),
          ciudad, mecanico,
        });
        if (error) throw error;
        setInfo("Cuenta creada. Revisa tu correo si se requiere confirmación e inicia sesión.");
        setMode("login");
      }
    } catch (err: any) {
      setError(err?.message || "No se pudo completar la acción");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mptc-splash-bg flex min-h-[100dvh] items-center justify-center px-6 py-10">
      <form onSubmit={submit} className="w-full max-w-sm space-y-4 rounded-2xl border border-border-strong bg-surface p-6">
        <header className="text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/20 text-primary text-xl font-black">M</div>
          <h1 className="mt-3 text-xl font-bold">{mode === "login" ? "Iniciar sesión" : "Crear cuenta"}</h1>
          <p className="mt-1 text-[13px] text-muted-foreground">MPTC · Taller Conectado</p>
        </header>

        <label className="block text-sm">
          <span className="text-muted-foreground">Email</span>
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm" />
        </label>
        <label className="block text-sm">
          <span className="text-muted-foreground">Contraseña</span>
          <input type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)}
            className="mt-1 w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm" />
        </label>

        {mode === "signup" && (
          <>
            <label className="block text-sm">
              <span className="text-muted-foreground">Rol</span>
              <select value={role} onChange={(e) => setRole(e.target.value as Role)}
                className="mt-1 w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm">
                {[
                  { r: "taller-1", id: "taller-1-mtc-recambios", label: "Taller 1" },
                  { r: "taller-2", id: "taller-2-mtc-recambios", label: "Taller 2" },
                  { r: "taller-3", id: "taller-3-tecniauto-express-marbella", label: "TecniAuto Express Marbella" },
                  { r: "taller-4", id: "taller-4-mecanica-autofran", label: "Mecánica Autofran" },
                  { r: "taller-5", id: "taller-5-boxes-team-marbella", label: "Boxes Team Marbella" },
                ].filter((o) => !activeTallerIds || activeTallerIds.has(o.id))
                  .map((o) => <option key={o.r} value={o.r}>{o.label}</option>)}
                <option value="pena">Grupo Peña (proveedor)</option>
                <option value="admin">Administrador</option>

              </select>
            </label>
            <label className="block text-sm">
              <span className="text-muted-foreground">Nombre del taller</span>
              <input value={tallerName} onChange={(e) => setTallerName(e.target.value)}
                className="mt-1 w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm" />
            </label>
            <div className="grid grid-cols-2 gap-2">
              <label className="block text-sm">
                <span className="text-muted-foreground">Ciudad</span>
                <input value={ciudad} onChange={(e) => setCiudad(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm" />
              </label>
              <label className="block text-sm">
                <span className="text-muted-foreground">Mecánico</span>
                <input value={mecanico} onChange={(e) => setMecanico(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm" />
              </label>
            </div>
          </>
        )}

        {error && <p className="text-sm text-red-500">{error}</p>}
        {info && <p className="text-sm text-emerald-500">{info}</p>}

        <button type="submit" disabled={loading}
          className="w-full rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-60">
          {loading ? "Procesando…" : mode === "login" ? "Entrar" : "Crear cuenta"}
        </button>

        <button type="button" onClick={() => { setError(null); setInfo(null); setMode(mode === "login" ? "signup" : "login"); }}
          className="w-full text-xs text-muted-foreground hover:text-foreground">
          {mode === "login" ? "¿No tienes cuenta? Crear una" : "Ya tengo cuenta"}
        </button>
      </form>
    </div>
  );
}
