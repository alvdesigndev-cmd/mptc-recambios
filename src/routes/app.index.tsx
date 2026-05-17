import { createFileRoute, Link } from "@tanstack/react-router";
import { Plus } from "lucide-react";

export const Route = createFileRoute("/app/")({
  component: Dashboard,
});

function Dashboard() {
  const kpis = [
    { label: "Hoy", value: 0 },
    { label: "Pendientes", value: 0 },
    { label: "Aceptadas", value: 0 },
    { label: "Total", value: 0 },
  ];

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Inicio</h1>
        <p className="text-sm text-muted-foreground">Resumen de tu actividad reciente.</p>
      </header>

      <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {kpis.map((k) => (
          <div key={k.label} className="rounded-2xl border border-border bg-surface p-4">
            <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{k.label}</div>
            <div className="mt-1 text-2xl font-bold">{k.value}</div>
          </div>
        ))}
      </section>

      <section className="rounded-2xl border border-border bg-surface p-6 text-center">
        <p className="text-sm text-muted-foreground">
          Aún no hay gestiones. Crea la primera con el botón <span className="font-semibold text-foreground">+</span>.
        </p>
        <Link
          to="/app/nueva"
          className="mt-4 inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-transform active:scale-95"
        >
          <Plus className="h-4 w-4" /> Nueva gestión
        </Link>
      </section>
    </div>
  );
}
