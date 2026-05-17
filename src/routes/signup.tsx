import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Loader2 } from "lucide-react";
import { signUp } from "@/lib/mptc/auth";
import type { Role } from "@/lib/mptc/profiles";
import { routeByProfile } from "./login";

export const Route = createFileRoute("/signup")({
  head: () => ({
    meta: [
      { title: "Crear cuenta · MPTC" },
      { name: "description", content: "Crea tu cuenta de taller o de proveedor en MPTC." },
    ],
  }),
  component: SignupPage,
});

const ROLES: { value: Role; label: string; desc: string }[] = [
  { value: "taller-1", label: "Taller 1", desc: "Acceso al panel del Taller 1" },
  { value: "taller-2", label: "Taller 2", desc: "Acceso al panel del Taller 2" },
  { value: "pena", label: "Grupo Peña", desc: "Panel de proveedor / pedidos" },
];

function SignupPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Role>("taller-1");
  const [tallerName, setTallerName] = useState("");
  const [mecanico, setMecanico] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setLoading(true);
    const { data, error } = await signUp({
      email: email.trim(),
      password,
      role,
      tallerName: tallerName.trim(),
      mecanico: mecanico.trim(),
    });
    setLoading(false);
    if (error) { setError(error.message); return; }
    if (data.session) {
      await routeByProfile(navigate);
    } else {
      setInfo("Cuenta creada. Revisa tu email para confirmarla y luego entra.");
    }
  };

  return (
    <div className="mptc-splash-bg flex min-h-[100dvh] items-center justify-center px-6 py-10">
      <div className="w-full max-w-sm space-y-6">
        <header className="text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/20 text-primary text-xl font-black">M</div>
          <h1 className="mt-4 text-2xl font-bold tracking-tight">Crear cuenta</h1>
          <p className="mt-1 text-[13px] text-muted-foreground">Taller Conectado</p>
        </header>

        <form onSubmit={onSubmit} className="space-y-3 rounded-2xl border border-border-strong bg-surface p-5">
          <div className="space-y-2">
            <span className="block text-[11px] uppercase tracking-wide text-muted-foreground">Tipo de cuenta</span>
            <div className="grid grid-cols-1 gap-2">
              {ROLES.map((r) => (
                <button
                  key={r.value}
                  type="button"
                  onClick={() => setRole(r.value)}
                  className={
                    "rounded-xl border px-3 py-2.5 text-left text-sm transition-colors " +
                    (role === r.value
                      ? "border-primary bg-primary/10 text-foreground"
                      : "border-border bg-surface-2 text-muted-foreground hover:text-foreground")
                  }
                >
                  <div className="font-semibold">{r.label}</div>
                  <div className="text-[11px] opacity-80">{r.desc}</div>
                </button>
              ))}
            </div>
          </div>

          <Field label="Nombre visible" value={tallerName} onChange={setTallerName} placeholder={role === "pena" ? "Grupo Peña" : "Mi Taller"} />
          {role !== "pena" && (
            <Field label="Mecánico" value={mecanico} onChange={setMecanico} placeholder="Nombre del mecánico" />
          )}
          <Field label="Email" type="email" value={email} onChange={setEmail} required autoComplete="email" />
          <Field label="Contraseña" type="password" value={password} onChange={setPassword} required autoComplete="new-password" />

          {error && <div className="rounded-lg bg-destructive/15 px-3 py-2 text-[13px] text-destructive">{error}</div>}
          {info && <div className="rounded-lg bg-primary/15 px-3 py-2 text-[13px] text-primary">{info}</div>}

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground transition-opacity disabled:opacity-60"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            Crear cuenta
          </button>
        </form>

        <p className="text-center text-[13px] text-muted-foreground">
          ¿Ya tienes cuenta? <Link to="/login" className="font-medium text-primary hover:underline">Entrar</Link>
        </p>
      </div>
    </div>
  );
}

function Field({
  label, value, onChange, type = "text", required, autoComplete, placeholder,
}: {
  label: string; value: string; onChange: (v: string) => void;
  type?: string; required?: boolean; autoComplete?: string; placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] uppercase tracking-wide text-muted-foreground">{label}</span>
      <input
        type={type}
        value={value}
        required={required}
        autoComplete={autoComplete}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-input bg-surface-2 px-3 py-2.5 text-sm outline-none transition-colors focus:border-primary"
      />
    </label>
  );
}
