import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { CheckCircle2, Loader2, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/confirmar/$token")({
  head: () => ({
    meta: [
      { title: "Confirmar reparación · MPTC" },
      { name: "description", content: "Pulsa para confirmar la reparación de tu vehículo." },
      { property: "og:title", content: "Confirmación de reparación" },
      { property: "og:description", content: "Pulsa para confirmar que autorizas la reparación de tu vehículo." },
    ],
  }),
  component: ConfirmarPage,
});

type Status = "loading" | "ok" | "already" | "notfound" | "error";

function ConfirmarPage() {
  const { token } = Route.useParams();
  const [status, setStatus] = useState<Status>("loading");
  const [info, setInfo] = useState<{ taller?: string; matricula?: string } | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const { data, error } = await supabase
          .from("gestiones")
          .select("id,estado,taller_nombre,matricula")
          .eq("confirm_token", token)
          .maybeSingle();
        if (error) { setStatus("error"); return; }
        if (!data) { setStatus("notfound"); return; }
        setInfo({ taller: data.taller_nombre || "", matricula: data.matricula || "" });
        if (data.estado === "aceptado" || data.estado === "completado") {
          setStatus("already"); return;
        }
        const { error: upErr } = await supabase
          .from("gestiones")
          .update({ estado: "aceptado" })
          .eq("id", data.id);
        if (upErr) { setStatus("error"); return; }
        setStatus("ok");
      } catch {
        setStatus("error");
      }
    })();
  }, [token]);

  return (
    <div className="mptc-splash-bg flex min-h-[100dvh] items-center justify-center p-6">
      <div className="w-full max-w-sm rounded-3xl border border-border-strong bg-surface p-8 text-center shadow-[var(--shadow-elegant)]">
        {status === "loading" && (
          <>
            <Loader2 className="mx-auto h-10 w-10 animate-spin text-primary" />
            <h1 className="mt-5 text-xl font-bold">Confirmando…</h1>
          </>
        )}

        {status === "ok" && (
          <>
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-success/15 text-success">
              <CheckCircle2 className="h-9 w-9" />
            </div>
            <h1 className="mt-5 text-2xl font-bold">¡Confirmado!</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Tu mecánico recibirá el aviso. {info?.taller && <>Pronto contactará contigo desde <span className="font-semibold text-foreground">{info.taller}</span>.</>}
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
            <h1 className="mt-5 text-2xl font-bold">Ya confirmado</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Esta reparación ya estaba autorizada. Sin acciones adicionales.
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
                ? "Este enlace de confirmación ya no existe. Contacta con tu taller."
                : "No hemos podido confirmar la reparación. Inténtalo de nuevo en unos minutos."}
            </p>
          </>
        )}
      </div>
    </div>
  );
}
