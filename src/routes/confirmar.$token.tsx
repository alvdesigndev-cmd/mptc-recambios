import { createFileRoute, useSearch } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { CheckCircle2, Loader2, AlertTriangle, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/confirmar/$token")({
  validateSearch: (s: Record<string, unknown>) => ({
    action: s.action === "rechazar" ? "rechazar" : "confirmar",
  }),
  head: () => ({
    meta: [
      { title: "Confirmar reparación · MPTC" },
      { name: "description", content: "Pulsa para confirmar o rechazar la reparación de tu vehículo." },
      { property: "og:title", content: "Confirmación de reparación" },
      { property: "og:description", content: "Pulsa para confirmar o rechazar la reparación de tu vehículo." },
    ],
  }),
  component: ConfirmarPage,
});

type Status = "loading" | "ok" | "rejected" | "already" | "notfound" | "error";

function ConfirmarPage() {
  const { token } = Route.useParams();
  const { action } = useSearch({ from: "/confirmar/$token" });
  const [status, setStatus] = useState<Status>("loading");
  const [info, setInfo] = useState<{ taller?: string; matricula?: string } | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const rpc = action === "rechazar" ? "rechazar_gestion" : "confirmar_gestion";
        const { data, error } = await supabase.rpc(rpc, { _token: token });
        if (error) { setStatus("error"); return; }
        const row = Array.isArray(data) ? data[0] : data;
        if (!row) { setStatus("notfound"); return; }
        setInfo({ matricula: row.matricula || "" });
        if (action === "rechazar") {
          setStatus(row.previous_estado === "rechazado" ? "already" : "rejected");
        } else if (row.previous_estado === "aceptado" || row.previous_estado === "completado") {
          setStatus("already");
        } else {
          setStatus("ok");
        }
      } catch {
        setStatus("error");
      }
    })();
  }, [token, action]);

  return (
    <div className="mptc-splash-bg flex min-h-[100dvh] items-center justify-center p-6">
      <div className="w-full max-w-sm rounded-3xl border border-border-strong bg-surface p-8 text-center shadow-[var(--shadow-elegant)]">
        {status === "loading" && (
          <>
            <Loader2 className="mx-auto h-10 w-10 animate-spin text-primary" />
            <h1 className="mt-5 text-xl font-bold">{action === "rechazar" ? "Registrando rechazo…" : "Confirmando…"}</h1>
          </>
        )}

        {status === "ok" && (
          <>
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-success/15 text-success">
              <CheckCircle2 className="h-9 w-9" />
            </div>
            <h1 className="mt-5 text-2xl font-bold">¡Confirmado!</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Tu mecánico recibirá el aviso.
            </p>
            {info?.matricula && (
              <div className="mt-4 inline-block rounded-xl bg-surface-2 px-3 py-1.5 font-mono text-sm font-bold">
                {info.matricula}
              </div>
            )}
          </>
        )}

        {status === "rejected" && (
          <>
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-destructive/15 text-destructive">
              <XCircle className="h-9 w-9" />
            </div>
            <h1 className="mt-5 text-2xl font-bold">Rechazo registrado</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Hemos avisado al taller. Te contactarán para buscar una alternativa.
            </p>
            {info?.matricula && (
              <div className="mt-4 inline-block rounded-xl bg-surface-2 px-3 py-1.5 font-mono text-sm font-bold">
                {info.matricula}
              </div>
            )}
          </>
        )}

        {status === "already" && (
          <>
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/15 text-primary">
              <CheckCircle2 className="h-9 w-9" />
            </div>
            <h1 className="mt-5 text-2xl font-bold">Ya registrado</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Esta gestión ya tenía una respuesta registrada. Sin acciones adicionales.
            </p>
          </>
        )}

        {(status === "notfound" || status === "error") && (
          <>
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-destructive/15 text-destructive">
              <AlertTriangle className="h-9 w-9" />
            </div>
            <h1 className="mt-5 text-2xl font-bold">
              {status === "notfound" ? "Enlace no válido" : "Error"}
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {status === "notfound"
                ? "Este enlace ya no existe. Contacta con tu taller."
                : "No hemos podido procesar la solicitud. Inténtalo de nuevo en unos minutos."}
            </p>
          </>
        )}
      </div>
    </div>
  );
}
