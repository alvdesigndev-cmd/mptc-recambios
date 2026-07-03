import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { AppShell } from "@/components/mptc/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { syncProfileToSettings } from "@/lib/mptc/auth";
import { clearSettings } from "@/lib/mptc/profiles";

export const Route = createFileRoute("/app")({
  ssr: false,
  beforeLoad: async () => {
    // getUser() revalida el token con el servidor de Auth; si la sesión
    // expiró (por ejemplo tras cerrar y reabrir el PWA) devuelve error.
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) {
      clearSettings();
      await supabase.auth.signOut().catch(() => {});
      throw redirect({ to: "/auth" });
    }
    const p = await syncProfileToSettings();
    if (!p) throw redirect({ to: "/auth" });
    if (p.role === "pena") throw redirect({ to: "/pena" });
  },
  component: AppLayout,
});

function AppLayout() {
  return (
    <AppShell>
      <Outlet />
    </AppShell>
  );
}
