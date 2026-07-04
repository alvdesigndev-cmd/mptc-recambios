import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { ShieldPlus, Loader2 } from "lucide-react";
import { createAdminUser } from "@/lib/mptc/admin-users.functions";

export const Route = createFileRoute("/admin/usuarios")({
  component: UsuariosAdminPage,
});

function UsuariosAdminPage() {
  const createAdmin = useServerFn(createAdminUser);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [tallerName, setTallerName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null); setInfo(null); setLoading(true);
    try {
      await createAdmin({ data: { email, password, tallerName } });
      setInfo(`Administrador creado: ${email}`);
      setEmail(""); setPassword(""); setTallerName("");
    } catch (err: any) {
      setError(err?.message || "No se pudo crear el administrador");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-md">
      <header className="mb-5 flex items-center gap-2">
        <ShieldPlus className="h-5 w-5 text-primary" />
        <h1 className="text-lg font-semibold">Crear administrador</h1>
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
    </div>
  );
}
