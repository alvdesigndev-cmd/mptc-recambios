import { Clock, Send, Check, X as XIcon, CheckCheck, Trash2 } from "lucide-react";
import { estadoBadge, type Gestion } from "@/lib/mptc/types";
import { FASES, faseDeGestion } from "@/lib/mptc/fases";

interface Props {
  g: Gestion;
  onClick: () => void;
  onDelete?: (g: Gestion) => void;
}

export function GestionCard({ g, onClick, onDelete }: Props) {
  const meta = estadoBadge(g.estado);
  const Icon =
    g.estado === "enviado" ? Send :
    g.estado === "aceptado" ? Check :
    g.estado === "rechazado" ? XIcon :
    g.estado === "completado" ? CheckCheck : Clock;

  const isBorrador = g.estado === "borrador";
  const fase = faseDeGestion(g);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onClick(); } }}
      className="flex w-full items-start gap-3 rounded-2xl border border-border bg-surface p-3.5 text-left transition hover:border-primary/40 hover:bg-surface-2 cursor-pointer"
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

        {/* Progreso del flujo: borrador → plantilla enviada → aceptado → pedido a Peña */}
        <div className="mt-2">
          <div className="flex items-center gap-1" aria-label={`Fase: ${fase.label}`}>
            {FASES.map((f, i) => {
              const done = i <= fase.index;
              const cls = !done
                ? "bg-surface-3"
                : fase.rechazado && i >= 1
                  ? "bg-destructive"
                  : i === 3
                    ? "bg-success"
                    : "bg-primary";
              return <span key={f.key} className={"h-1 flex-1 rounded-full " + cls} />;
            })}
          </div>
          <div className="mt-1 text-[11px] text-muted-foreground">
            {fase.rechazado ? "Rechazado por el cliente" : fase.label}
          </div>
        </div>
      </div>

      {isBorrador && onDelete && (
        <button
          type="button"
          aria-label="Eliminar borrador"
          onClick={(e) => {
            e.stopPropagation();
            if (confirm("¿Eliminar este borrador? No se podrá reanudar.")) {
              onDelete(g);
            }
          }}
          className="shrink-0 rounded-lg p-2 text-muted-foreground hover:bg-destructive/15 hover:text-destructive"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
