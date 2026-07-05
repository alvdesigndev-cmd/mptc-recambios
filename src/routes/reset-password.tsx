import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/reset-password")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Restablecer contraseña · MPTC" },
      { name: "description", content: "Introduce una nueva contraseña para tu cuenta MPTC." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ResetPasswordPage,
});

function translateAuthError(msg: string): string {
  const m = (msg || "").toLowerCase();
  if (m.includes("password is known to be weak") || m.includes("pwned") || m.includes("weak and easy to guess")) {
    return "La contraseña es demasiado débil o ha aparecido en filtraciones conocidas. Elige otra distinta.";
  }
  if (m.includes("same password") || m.includes("new password should be different")) {
    return "La nueva contraseña debe ser distinta de la anterior.";
  }
  if (m.includes("password should be at least")) return "La contraseña debe tener al menos 6 caracteres.";
  if (m.includes("session") || m.includes("expired") || m.includes("invalid")) {
    return "El enlace de recuperación no es válido o ha caducado. Solicita uno nuevo.";
  }
  return msg;
}

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [hasSession, setHasSession] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  useEffect(() => {
    // Supabase parsea automáticamente los tokens de recuperación del hash
    // y dispara el evento PASSWORD_RECOVERY. Confirmamos disponibilidad
    // de sesión antes de permitir el cambio de contraseña.
    let cancelled = false;
    const finalize = async () => {
      const { data } = await supabase.auth.getSession();
      if (cancelled) return;
      setHasSession(!!data.session);
      setReady(true);
    };
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN" || event === "INITIAL_SESSION") {
        finalize();
      }
    });
    finalize();
    return () => { cancelled = true; sub.subscription.unsubscribe(); };
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null); setInfo(null);
    if (password.length < 6) { setError("La contraseña debe tener al menos 6 caracteres."); return; }
    if (password !== confirm) { setError("Las contraseñas no coinciden."); return; }
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setInfo("Contraseña actualizada. Ya puedes iniciar sesión con la nueva contraseña.");
      // Cerramos la sesión temporal de recuperación y redirigimos a /auth
      await supabase.auth.signOut();
      setTimeout(() => { navigate({ to: "/auth", replace: true }); }, 1200);
    } catch (err: any) {
      setError(translateAuthError(err?.message || "No se pudo actualizar la contraseña"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mptc-splash-bg flex min-h-[100dvh] items-center justify-center px-6 py-10">
      <form onSubmit={submit} className="w-full max-w-sm space-y-4 rounded-2xl border border-border-strong bg-surface p-6">
        <header className="text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/20 text-primary text-xl font-black">M</div>
          <h1 className="mt-3 text-xl font-bold">Restablecer contraseña</h1>
          <p className="mt-1 text-[13px] text-muted-foreground">Introduce y confirma tu nueva contraseña.</p>
        </header>

        {!ready && <p className="text-sm text-muted-foreground">Verificando enlace…</p>}

        {ready && !hasSession && (
          <div className="rounded-lg border border-border bg-surface-2/60 p-3 text-sm text-muted-foreground">
            El enlace de recuperación no es válido o ha caducado. Vuelve a{" "}
            <button type="button" onClick={() => navigate({ to: "/auth" })}
              className="text-primary hover:underline">solicitar uno nuevo</button>.
          </div>
        )}

        {ready && hasSession && (
          <>
            <label className="block text-sm">
              <span className="text-muted-foreground">Nueva contraseña</span>
              <div className="relative mt-1">
                <input
                  type={showPassword ? "text" : "password"}
                  required minLength={6} autoComplete="new-password"
                  value={password} onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-lg border border-border bg-surface-2 px-3 py-2 pr-10 text-sm"
                />
                <button type="button" onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                  className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground hover:text-foreground">
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </label>
            <label className="block text-sm">
              <span className="text-muted-foreground">Confirmar nueva contraseña</span>
              <input
                type={showPassword ? "text" : "password"}
                required minLength={6} autoComplete="new-password"
                value={confirm} onChange={(e) => setConfirm(e.target.value)}
                className="mt-1 w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm"
              />
            </label>

            {error && <p className="text-sm text-red-500">{error}</p>}
            {info && <p className="text-sm text-emerald-500">{info}</p>}

            <button type="submit" disabled={loading}
              className="w-full rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-60">
              {loading ? "Guardando…" : "Guardar nueva contraseña"}
            </button>
          </>
        )}
      </form>
    </div>
  );
}
