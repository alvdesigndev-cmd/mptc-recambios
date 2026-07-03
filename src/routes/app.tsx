import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { AppShell } from "@/components/mptc/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { syncProfileToSettings } from "@/lib/mptc/auth";
import { clearSettings } from "@/lib/mptc/profiles";
import { saveRedirectPath } from "@/lib/mptc/redirect";

export const Route = createFileRoute("/app")({
  ssr: false,
  beforeLoad: async ({ location }) => {
    // getUser() revalida el token con el servidor de Auth; si la sesión
    // expiró (por ejemplo tras cerrar y reabrir el PWA) devuelve error.
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) {
      saveRedirectPath(location.href);
      clearSettings();
      await supabase.auth.signOut().catch(() => {});
      throw redirect({ to: "/auth" });
    }
    const p = await syncProfileToSettings();
    if (!p) {
      saveRedirectPath(location.href);
      throw redirect({ to: "/auth" });
    }
    if (p.role === "pena") throw redirect({ to: "/pena" });
    if (p.role === "admin") throw redirect({ to: "/admin/talleres" });

    // Bloquear acceso si el taller del usuario está desactivado.
    const { data: taller } = await supabase
      .from("talleres")
      .select("activo")
      .eq("taller_id", p.taller_id)
      .maybeSingle();
    if (taller && taller.activo === false) {
      clearSettings();
      await supabase.auth.signOut().catch(() => {});
      throw redirect({ to: "/auth", search: { disabled: "1" } as never });
    }
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
