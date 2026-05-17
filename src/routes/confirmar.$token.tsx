import { createFileRoute } from "@tanstack/react-router";
import { CheckCircle2 } from "lucide-react";

export const Route = createFileRoute("/confirmar/$token")({
  head: () => ({
    meta: [
      { title: "Confirmar reparación" },
      { name: "description", content: "Pulsa el enlace para confirmar la reparación de tu vehículo." },
      { property: "og:title", content: "Confirmación de reparación" },
      {
        property: "og:description",
        content: "Pulsa el enlace para confirmar que autorizas la reparación de tu vehículo.",
      },
    ],
  }),
  component: ConfirmarPage,
});

function ConfirmarPage() {
  return (
    <div className="mptc-splash-bg flex min-h-[100dvh] items-center justify-center p-6">
      <div className="w-full max-w-sm rounded-3xl border border-border-strong bg-surface p-8 text-center shadow-[var(--shadow-elegant)]">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-success/15 text-success">
          <CheckCircle2 className="h-9 w-9" />
        </div>
        <h1 className="mt-5 text-2xl font-bold">¡Confirmado!</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Tu mecánico recibirá el aviso en unos segundos. Próximamente activamos el guardado real — Fase 4.
        </p>
      </div>
    </div>
  );
}
