import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/app/historial")({
  component: HistorialPage,
});

function HistorialPage() {
  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Historial</h1>
        <p className="text-sm text-muted-foreground">Todas tus gestiones, filtrables por estado.</p>
      </header>
      <div className="rounded-2xl border border-border bg-surface p-8 text-center text-sm text-muted-foreground">
        Próximamente — Fase 3.
      </div>
    </div>
  );
}
