import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/mptc/AppShell";

export const Route = createFileRoute("/pena")({
  component: PenaPage,
});

function PenaPage() {
  return (
    <AppShell>
      <div className="space-y-4">
        <header>
          <h1 className="text-2xl font-bold tracking-tight">Panel Grupo Peña</h1>
          <p className="text-sm text-muted-foreground">Pedidos pendientes de todos los talleres.</p>
        </header>
        <div className="rounded-2xl border border-border bg-surface p-8 text-center text-sm text-muted-foreground">
          Próximamente — Fase 4.
        </div>
      </div>
    </AppShell>
  );
}
