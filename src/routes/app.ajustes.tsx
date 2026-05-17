import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ChevronRight, LogOut } from "lucide-react";
import { clearSettings, loadSettings, saveSettings, type AppSettings } from "@/lib/mptc/profiles";

export const Route = createFileRoute("/app/ajustes")({
  component: AjustesPage,
});

function AjustesPage() {
  const navigate = useNavigate();
  const [s, setS] = useState<AppSettings | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  useEffect(() => {
    const loaded = loadSettings();
    if (!loaded) navigate({ to: "/" });
    else setS(loaded);
  }, [navigate]);

  if (!s) return null;

  const update = (patch: Partial<AppSettings>) => {
    const next = { ...s, ...patch };
    setS(next);
    saveSettings(next);
    if (patch.theme === "dark") document.documentElement.classList.add("dark");
    if (patch.theme === "light") document.documentElement.classList.remove("dark");
    if ("tallerName" in patch || "ciudad" in patch || "mecanico" in patch) {
      setSavedAt(Date.now());
    }
  };

  const onLogout = () => {
    clearSettings();
    navigate({ to: "/" });
  };

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Ajustes</h1>
        <p className="text-sm text-muted-foreground">Datos del taller y preferencias.</p>
      </header>

      <section className="space-y-3 rounded-2xl border border-border bg-surface p-5">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">Datos del taller</h2>
          {savedAt && <span className="text-[11px] text-success">Guardado</span>}
        </div>
        <Field label="Nombre del taller" value={s.tallerName} onChange={(v) => update({ tallerName: v })} />
        <Field label="Ciudad" value={s.ciudad} onChange={(v) => update({ ciudad: v })} />
        <Field label="Nombre del mecánico" value={s.mecanico} onChange={(v) => update({ mecanico: v })} />
        <Field label="Identificador" value={s.tallerId} readOnly />
      </section>

      <section className="space-y-3 rounded-2xl border border-border bg-surface p-5">
        <h2 className="text-sm font-semibold">Apariencia</h2>
        <div className="flex gap-2">
          {(["dark", "light"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => update({ theme: t })}
              className={
                "flex-1 rounded-xl border px-4 py-2.5 text-sm font-medium transition-colors " +
                (s.theme === t
                  ? "border-primary bg-primary/15 text-primary"
                  : "border-border bg-surface-2 text-muted-foreground hover:text-foreground")
              }
            >
              {t === "dark" ? "Oscuro" : "Claro"}
            </button>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-surface p-5">
        <h2 className="mb-3 text-sm font-semibold">Catálogo</h2>
        <Link
          to="/app/familias"
          className="flex items-center justify-between gap-2 rounded-xl border border-border bg-surface-2 px-4 py-3 text-sm font-medium hover:border-primary hover:text-primary"
        >
          <span>Gestionar familias y mensajes</span>
          <ChevronRight className="h-4 w-4" />
        </Link>
      </section>

      <section className="rounded-2xl border border-border bg-surface p-5">
        <h2 className="mb-3 text-sm font-semibold">Sesión</h2>
        <button
          type="button"
          onClick={onLogout}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm font-semibold text-destructive transition-colors hover:bg-destructive/20"
        >
          <LogOut className="h-4 w-4" /> Cerrar sesión
        </button>
      </section>
    </div>
  );
}

function Field({
  label, value, onChange, readOnly,
}: {
  label: string; value: string; onChange?: (v: string) => void; readOnly?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] uppercase tracking-wide text-muted-foreground">{label}</span>
      <input
        value={value}
        readOnly={readOnly}
        onChange={(e) => onChange?.(e.target.value)}
        className={
          "w-full rounded-xl border border-input bg-surface-2 px-3 py-2.5 text-sm outline-none transition-colors focus:border-primary " +
          (readOnly ? "font-mono text-muted-foreground" : "")
        }
      />
    </label>
  );
}
