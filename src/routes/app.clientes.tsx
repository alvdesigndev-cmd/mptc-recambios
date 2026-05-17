import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/app/clientes")({
  component: ClientesPage,
});

function ClientesPage() {
  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Clientes</h1>
        <p className="text-sm text-muted-foreground">Ficha y gestiones de cada cliente.</p>
      </header>
      <div className="rounded-2xl border border-border bg-surface p-8 text-center text-sm text-muted-foreground">
        Próximamente — Fase 3.
      </div>
    </div>
  );
}
