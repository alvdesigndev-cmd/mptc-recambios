import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { AppShell } from "@/components/mptc/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { syncProfileToSettings } from "@/lib/mptc/auth";
import { clearSettings, loadSettings } from "@/lib/mptc/profiles";
import { saveRedirectPath } from "@/lib/mptc/redirect";
import { checkAuthResilient } from "@/lib/mptc/authCheck";

export const Route = createFileRoute("/app")({
  ssr: false,
  beforeLoad: async ({ location }) => {
    const auth = await checkAuthResilient();
    if ("expired" in auth) {
      saveRedirectPath(location.href);
      clearSettings();
      await supabase.auth.signOut().catch(() => {});
      throw redirect({ to: "/auth" });
    }
    // Offline: si tenemos ajustes cacheados, dejamos entrar; si no, a login.
    if ("offline" in auth) {
      const cached = loadSettings();
      if (!cached) {
        saveRedirectPath(location.href);
        throw redirect({ to: "/auth" });
      }
      if (cached.role === "pena") throw redirect({ to: "/pena" });
      if (cached.role === "admin") throw redirect({ to: "/admin/talleres" });
      return; // seguimos con la sesión cacheada, sin verificar taller activo
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
