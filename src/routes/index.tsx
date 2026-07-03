import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { syncProfileToSettings } from "@/lib/mptc/auth";

export const Route = createFileRoute("/")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "MPTC · Taller Conectado" },
      { name: "description", content: "App para talleres mecánicos: presupuestos, WhatsApp al cliente, pedidos al proveedor e historial." },
    ],
  }),
  component: SplashRedirect,
});

function SplashRedirect() {
  const navigate = useNavigate();
  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) { navigate({ to: "/auth", replace: true }); return; }
      const p = await syncProfileToSettings();
      navigate({ to: p?.role === "pena" ? "/pena" : "/app", replace: true });
    });
  }, [navigate]);
  return (
    <div className="mptc-splash-bg flex min-h-[100dvh] items-center justify-center">
      <p className="text-sm text-muted-foreground">Cargando…</p>
    </div>
  );
}
