import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { signIn, syncProfileToSettings } from "@/lib/mptc/auth";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Entrar · MPTC" },
      { name: "description", content: "Accede a tu taller en MPTC Taller Conectado." },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) routeByProfile(navigate);
    });
  }, [navigate]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { error } = await signIn(email.trim(), password);
    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }
    await routeByProfile(navigate);
    setLoading(false);
  };

  return (
    <div className="mptc-splash-bg flex min-h-[100dvh] items-center justify-center px-6 py-10">
      <div className="w-full max-w-sm space-y-6">
        <header className="text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/20 text-primary text-xl font-black">
            M
          </div>
          <h1 className="mt-4 text-2xl font-bold tracking-tight">Entrar a MPTC</h1>
          <p className="mt-1 text-[13px] text-muted-foreground">Taller Conectado</p>
        </header>

        <form onSubmit={onSubmit} className="space-y-3 rounded-2xl border border-border-strong bg-surface p-5">
          <Field label="Email" type="email" value={email} onChange={setEmail} autoComplete="email" required />
          <Field label="Contraseña" type="password" value={password} onChange={setPassword} autoComplete="current-password" required />
          {error && <div className="rounded-lg bg-destructive/15 px-3 py-2 text-[13px] text-destructive">{error}</div>}
          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground transition-opacity disabled:opacity-60"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            Entrar
          </button>
        </form>

        <p className="text-center text-[13px] text-muted-foreground">
          ¿Nuevo? <Link to="/signup" className="font-medium text-primary hover:underline">Crear cuenta</Link>
        </p>
      </div>
    </div>
  );
}

export async function routeByProfile(navigate: ReturnType<typeof useNavigate>) {
  const p = await syncProfileToSettings();
  if (!p) { navigate({ to: "/login" }); return; }
  if (p.role === "pena") navigate({ to: "/pena" });
  else navigate({ to: "/app" });
}

function Field({
  label, value, onChange, type = "text", required, autoComplete,
}: {
  label: string; value: string; onChange: (v: string) => void;
  type?: string; required?: boolean; autoComplete?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] uppercase tracking-wide text-muted-foreground">{label}</span>
      <input
        type={type}
        value={value}
        required={required}
        autoComplete={autoComplete}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-input bg-surface-2 px-3 py-2.5 text-sm outline-none transition-colors focus:border-primary"
      />
    </label>
  );
}
