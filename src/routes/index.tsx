import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { loadSettings, saveSettings, type Role, type AppSettings } from "@/lib/mptc/profiles";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "MPTC · Taller Conectado" },
      { name: "description", content: "App para talleres mecánicos: presupuestos, WhatsApp al cliente, pedidos al proveedor e historial." },
    ],
  }),
  component: SplashPicker,
});

const DEFAULTS: Record<Role, AppSettings> = {
  "taller-1": { role: "taller-1", tallerId: "taller-1-mtc-recambios", tallerName: "Taller 1", ciudad: "", mecanico: "", theme: "light" },
  "taller-2": { role: "taller-2", tallerId: "taller-2-mtc-recambios", tallerName: "Taller 2", ciudad: "", mecanico: "", theme: "light" },
  "pena": { role: "pena", tallerId: "grupo-pena", tallerName: "Grupo Peña", ciudad: "", mecanico: "", theme: "light" },
};

function SplashPicker() {
  const navigate = useNavigate();

  useEffect(() => {
    const s = loadSettings();
    if (s) {
      if (s.role === "pena") navigate({ to: "/pena" });
      else navigate({ to: "/app" });
    }
  }, [navigate]);

  const pick = (role: Role) => {
    saveSettings(DEFAULTS[role]);
    if (role === "pena") navigate({ to: "/pena" });
    else navigate({ to: "/app" });
  };

  return (
    <div className="mptc-splash-bg flex min-h-[100dvh] items-center justify-center px-6 py-10">
      <div className="w-full max-w-sm space-y-6">
        <header className="text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/20 text-primary text-xl font-black">M</div>
          <h1 className="mt-4 text-2xl font-bold tracking-tight">MPTC</h1>
          <p className="mt-1 text-[13px] text-muted-foreground">Elige cómo entrar (modo demo)</p>
        </header>
        <div className="space-y-2 rounded-2xl border border-border-strong bg-surface p-5">
          {(["taller-1","taller-2","pena"] as Role[]).map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => pick(r)}
              className="w-full rounded-xl border border-border bg-surface-2 px-4 py-3 text-left text-sm font-semibold hover:border-primary hover:text-primary transition-colors"
            >
              {r === "pena" ? "Grupo Peña (proveedor)" : r === "taller-1" ? "Taller 1" : "Taller 2"}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
