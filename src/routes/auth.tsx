import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { signIn, signUp, syncProfileToSettings } from "@/lib/mptc/auth";
import { supabase } from "@/integrations/supabase/client";
import type { Role } from "@/lib/mptc/profiles";

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

  useEffect(() => {
    let cancelled = false;
    supabase.auth.getSession().then(async ({ data }) => {
      if (cancelled || !data.session) return;
      const p = await syncProfileToSettings();
      navigate({ to: p?.role === "pena" ? "/pena" : "/app", replace: true });
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
        navigate({ to: p?.role === "pena" ? "/pena" : "/app", replace: true });
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
                <option value="taller-1">Taller 1</option>
                <option value="taller-2">Taller 2</option>
                <option value="taller-3">TecniAuto Express Marbella</option>
                <option value="taller-4">Mecánica Autofran</option>
                <option value="taller-5">Boxes Team Marbella</option>
                <option value="pena">Grupo Peña (proveedor)</option>
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
