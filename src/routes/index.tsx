import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Wrench, Truck, ArrowRight, ArrowLeft } from "lucide-react";
import { saveSettings, settingsFromRole, type Role } from "@/lib/mptc/profiles";

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
  component: SplashPage,
});

function SplashPage() {
  const navigate = useNavigate();
  const [pickingTaller, setPickingTaller] = useState(false);

  const enter = (role: Role) => {
    saveSettings(settingsFromRole(role));
    if (role === "pena") navigate({ to: "/pena" });
    else navigate({ to: "/app" });
  };

  return (
    <div className="mptc-splash-bg min-h-[100dvh]">
      <div className="mx-auto flex min-h-[100dvh] max-w-md flex-col justify-between px-6 py-10">
        {/* Header */}
        <header className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/20 text-primary text-lg font-black">
            M
          </div>
          <div>
            <div className="text-sm font-semibold leading-tight">MPTC</div>
            <div className="text-[11px] text-muted-foreground">Taller Conectado</div>
          </div>
        </header>

        {/* Hero */}
        <section className="my-10 space-y-3">
          <h1 className="text-[44px] font-black leading-[1.05] tracking-tight">
            Gestiona tu <span className="text-gradient-fire">taller</span> conectado
          </h1>
          <p className="text-[15px] text-muted-foreground">
            Presupuestos, fotos, WhatsApp al cliente y pedidos al proveedor. Todo en un solo flujo.
          </p>
        </section>

        {/* Cards */}
        {!pickingTaller ? (
          <div className="space-y-3">
            <button
              type="button"
              onClick={() => setPickingTaller(true)}
              className="group w-full rounded-2xl border border-border-strong bg-surface p-5 text-left transition-all hover:border-primary/50 hover:bg-surface-2 active:scale-[0.98]"
            >
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
                  <Wrench className="h-6 w-6" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-base font-semibold">Soy del taller</div>
                  <div className="mt-0.5 text-[13px] text-muted-foreground">
                    Nuevas gestiones, historial y clientes.
                  </div>
                </div>
                <ArrowRight className="mt-3 h-5 w-5 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
              </div>
            </button>

            <button
              type="button"
              onClick={() => enter("pena")}
              className="group w-full rounded-2xl border border-border-strong bg-surface p-5 text-left transition-all hover:border-accent/50 hover:bg-surface-2 active:scale-[0.98]"
            >
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-accent/15 text-accent">
                  <Truck className="h-6 w-6" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-base font-semibold">Soy Grupo Peña</div>
                  <div className="mt-0.5 text-[13px] text-muted-foreground">
                    Panel de pedidos de todos los talleres.
                  </div>
                </div>
                <ArrowRight className="mt-3 h-5 w-5 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
              </div>
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <button
              type="button"
              onClick={() => setPickingTaller(false)}
              className="flex items-center gap-2 text-[13px] text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" /> Volver
            </button>
            {(["taller-1", "taller-2"] as const).map((r, i) => (
              <button
                key={r}
                type="button"
                onClick={() => enter(r)}
                className="group flex w-full items-center gap-4 rounded-2xl border border-border-strong bg-surface p-5 text-left transition-all hover:border-primary/50 hover:bg-surface-2 active:scale-[0.98]"
              >
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/15 font-mono text-primary text-lg font-bold">
                  T{i + 1}
                </div>
                <div className="flex-1">
                  <div className="text-base font-semibold">Taller {i + 1}</div>
                  <div className="text-[13px] text-muted-foreground">MTC Recambios</div>
                </div>
                <ArrowRight className="h-5 w-5 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
              </button>
            ))}
          </div>
        )}

        <footer className="mt-10 text-center text-[11px] text-muted-foreground">
          © MPTC · v2 reconstruido
        </footer>
      </div>
    </div>
  );
}
