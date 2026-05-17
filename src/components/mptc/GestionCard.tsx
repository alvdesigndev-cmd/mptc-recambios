import { Clock, Send, Check, X as XIcon, CheckCheck } from "lucide-react";
import { estadoBadge, type Gestion } from "@/lib/mptc/types";

interface Props {
  g: Gestion;
  onClick: () => void;
}

export function GestionCard({ g, onClick }: Props) {
  const meta = estadoBadge(g.estado);
  const Icon =
    g.estado === "enviado" ? Send :
    g.estado === "aceptado" ? Check :
    g.estado === "rechazado" ? XIcon :
    g.estado === "completado" ? CheckCheck : Clock;

  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-start gap-3 rounded-2xl border border-border bg-surface p-3.5 text-left transition hover:border-primary/40 hover:bg-surface-2"
    >
      <div className={"flex h-10 w-10 shrink-0 items-center justify-center rounded-xl " + meta.cls}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <span className="truncate text-sm font-semibold">{g.cliente_nombre || "Sin cliente"}</span>
          <span className="shrink-0 text-[11px] text-muted-foreground">
            {new Date(g.created_at).toLocaleDateString("es-ES", { day: "2-digit", month: "short" })}
          </span>
        </div>
        <div className="mt-0.5 truncate text-[12px] text-muted-foreground">
          <span className="font-mono">{g.matricula || "—"}</span> · {g.vehiculo || "—"}
        </div>
        <div className="mt-1 flex items-center justify-between gap-2">
          <span className="truncate text-[12px] text-text-2">
            {g.subfamilia || g.categoria || "—"}
          </span>
          <span className="font-mono text-[13px] font-bold text-primary">
            {g.importe ? `${g.importe} €` : ""}
          </span>
        </div>
      </div>
    </button>
  );
}
