import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { Home, History, Users, Settings, Plus, LogOut, Car } from "lucide-react";
import { NotificationsBell } from "@/components/mptc/NotificationsBell";
import { useEffect, useState } from "react";
import { loadSettings, type AppSettings } from "@/lib/mptc/profiles";
import { signOut } from "@/lib/mptc/auth";

interface Props {
  children: React.ReactNode;
}

const TABS = [
  { to: "/app", label: "Inicio", icon: Home, exact: true },
  { to: "/app/historial", label: "Historial", icon: History, exact: false },
  { to: "/app/matriculas", label: "Matrículas", icon: Car, exact: false },
  { to: "/app/clientes", label: "Clientes", icon: Users, exact: false },
  { to: "/app/ajustes", label: "Ajustes", icon: Settings, exact: false },
] as const;

export function AppShell({ children }: Props) {
  const navigate = useNavigate();
  const location = useLocation();
  const [settings, setSettings] = useState<AppSettings | null>(null);

  useEffect(() => {
    const s = loadSettings();
    if (!s) { navigate({ to: "/" }); return; }
    setSettings(s);
    if (s.theme === "dark") document.documentElement.classList.add("dark");
    else document.documentElement.classList.remove("dark");
  }, [navigate]);

  if (!settings) return null;
  const isPena = settings.role === "pena";

  const onExit = () => {
    clearSettings();
    navigate({ to: "/" });
  };

  return (
    <div className="min-h-[100dvh] bg-background text-foreground">
      {/* Topbar */}
      <header className="sticky top-0 z-30 border-b border-border bg-surface/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1200px] items-center gap-3 px-4 py-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/15 text-primary font-bold">
            M
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-semibold leading-tight">{settings.tallerName}</div>
            <div className="text-[11px] text-muted-foreground leading-tight">MPTC · Taller Conectado</div>
          </div>
          <span
            className={
              "rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide " +
              (isPena
                ? "bg-accent/15 text-accent"
                : "bg-primary/15 text-primary")
            }
          >
            {settings.role === "taller-1" ? "Taller 1" : settings.role === "taller-2" ? "Taller 2" : "Grupo Peña"}
          </span>
          {!isPena && <NotificationsBell tallerId={settings.tallerId} />}
          <button
            type="button"
            onClick={onExit}
            className="rounded-lg p-2 text-muted-foreground hover:bg-surface-2 hover:text-foreground"
            aria-label="Salir"
          >
            <LogOut className="h-5 w-5" />
          </button>
        </div>
      </header>

      {/* Page */}
      <main className="mx-auto max-w-[1200px] px-4 pb-[120px] pt-5">{children}</main>

      {/* Tabbar (solo taller) */}
      {!isPena && (
        <>
          <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface/95 backdrop-blur-xl">
            <div className="mx-auto grid max-w-[1200px] grid-cols-5">
              {TABS.map((t) => {
                const active = t.exact
                  ? location.pathname === t.to
                  : location.pathname.startsWith(t.to);
                const Icon = t.icon;
                return (
                  <Link
                    key={t.to}
                    to={t.to}
                    className={
                      "flex flex-col items-center gap-1 py-3 text-[11px] font-medium transition-colors " +
                      (active ? "text-primary" : "text-muted-foreground hover:text-foreground")
                    }
                  >
                    <Icon className="h-5 w-5" />
                    {t.label}
                  </Link>
                );
              })}
            </div>
          </nav>

          {/* FAB: siempre arranca una gestión NUEVA aunque ya estés en /app/nueva.
              El borrador anterior se conserva en BD como "Reanudar". */}
          <button
            type="button"
            aria-label="Nueva gestión"
            onClick={() => {
              try { sessionStorage.removeItem("mptc:nueva:draft"); } catch {}
              navigate({ to: "/app/nueva", search: { fresh: String(Date.now()) } });
            }}
            className="fixed bottom-[78px] right-4 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-[var(--shadow-glow-blue)] transition-transform active:scale-95"
          >
            <Plus className="h-6 w-6" />
          </button>
        </>
      )}
    </div>
  );
}
