import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { syncProfileToSettings } from "@/lib/mptc/auth";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "MPTC · Taller Conectado" },
      {
        name: "description",
        content:
          "App para talleres mecánicos: presupuestos, WhatsApp al cliente, pedidos al proveedor e historial.",
      },
      { property: "og:title", content: "MPTC · Taller Conectado" },
      { property: "og:description", content: "Gestiona presupuestos y comunícate con clientes y proveedor desde una sola app." },
    ],
  }),
  component: SplashRedirect,
});

function SplashRedirect() {
  const navigate = useNavigate();
  const [msg, setMsg] = useState("Cargando…");

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) { navigate({ to: "/login" }); return; }
      setMsg("Sincronizando perfil…");
      const p = await syncProfileToSettings();
      if (!p) { navigate({ to: "/login" }); return; }
      if (p.role === "pena") navigate({ to: "/pena" });
      else navigate({ to: "/app" });
    })();
  }, [navigate]);

  return (
    <div className="mptc-splash-bg flex min-h-[100dvh] items-center justify-center">
      <div className="flex items-center gap-3 text-sm text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
        {msg}
      </div>
    </div>
  );
}
