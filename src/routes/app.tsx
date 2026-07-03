import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { AppShell } from "@/components/mptc/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { syncProfileToSettings } from "@/lib/mptc/auth";

export const Route = createFileRoute("/app")({
  ssr: false,
  beforeLoad: async () => {
    const { data } = await supabase.auth.getSession();
    if (!data.session) throw redirect({ to: "/auth" });
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
