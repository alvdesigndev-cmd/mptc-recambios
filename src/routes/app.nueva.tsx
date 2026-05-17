import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/app/nueva")({
  component: NuevaPage,
});

function NuevaPage() {
  return (
    <div className="space-y-4">
      <Link to="/app" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Volver
      </Link>
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Nueva gestión</h1>
        <p className="text-sm text-muted-foreground">Flujo de 3 pasos: cliente → avería → mensaje.</p>
      </header>
      <div className="rounded-2xl border border-border bg-surface p-8 text-center text-sm text-muted-foreground">
        Próximamente — Fase 2.
      </div>
    </div>
  );
}
