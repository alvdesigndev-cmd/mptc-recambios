import { createFileRoute, Outlet, redirect, Link } from "@tanstack/react-router";
import { LogOut, Store } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { syncProfileToSettings } from "@/lib/mptc/auth";
import { clearSettings } from "@/lib/mptc/profiles";
import { saveRedirectPath } from "@/lib/mptc/redirect";
import { signOut } from "@/lib/mptc/auth";

export const Route = createFileRoute("/admin")({
  ssr: false,
  beforeLoad: async ({ location }) => {
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
    if (p.role !== "admin") {
      throw redirect({ to: p.role === "pena" ? "/pena" : "/app" });
    }
  },
  component: AdminLayout,
});

function AdminLayout() {
  const navigate = useNavigate();
  const onExit = async () => { await signOut(); navigate({ to: "/auth" }); };
  return (
    <div className="min-h-[100dvh] bg-background text-foreground">
      <header className="sticky top-0 z-30 border-b border-border bg-surface/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1200px] items-center gap-3 px-4 py-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/15 text-primary font-bold">A</div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-semibold leading-tight">Administración</div>
            <div className="text-[11px] text-muted-foreground leading-tight">MPTC · Panel admin</div>
          </div>
          <nav className="hidden gap-1 sm:flex">
            <Link
              to="/admin/talleres"
              className="inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm text-muted-foreground hover:bg-surface-2 hover:text-foreground"
              activeProps={{ className: "inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm bg-surface-2 text-foreground" }}
            >
              <Store className="h-4 w-4" /> Talleres
            </Link>
          </nav>
          <button onClick={onExit} className="rounded-lg p-2 text-muted-foreground hover:bg-surface-2" aria-label="Salir">
            <LogOut className="h-5 w-5" />
          </button>
        </div>
      </header>
      <main className="mx-auto max-w-[1200px] px-4 pb-24 pt-5"><Outlet /></main>
    </div>
  );
}
