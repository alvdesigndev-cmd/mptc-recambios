import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Clock, Send, Check, X as XIcon, CheckCheck, Trash2, PlayCircle, Truck, Loader2, FileDown, RefreshCw, MessageCircle } from "lucide-react";
import { toast } from "sonner";

import { estadoBadge, type Gestion } from "@/lib/mptc/types";
import { FASES, faseDeGestion } from "@/lib/mptc/fases";
import { puedeReenviar, puedePedirPena, reenviarPlantilla, buildMensajePena, openWhatsAppPena, registrarPedidoPena } from "@/lib/mptc/quick-actions";
import { enviarPresupuestoPdfWhatsApp, puedeEnviarPdf } from "@/lib/mptc/presupuesto-whatsapp";
import { fetchEstadoEnvioPdf, ENVIO_PDF_LABEL, ENVIO_PDF_CLASS, type EstadoEnvioPdf } from "@/lib/mptc/eventos";

interface Props {
  g: Gestion;
  onClick: () => void;
  onDelete?: (g: Gestion) => void;
  /** Reabrir el borrador en el flujo de nueva gestión. */
  onResume?: (g: Gestion) => void;
  /** Recargar el listado tras una acción rápida. */
  onChanged?: () => void;
}

export function GestionCard({ g, onClick, onDelete, onResume, onChanged }: Props) {
  const [busy, setBusy] = useState<null | "wa" | "pena" | "pdf">(null);
  const [showConfirmPena, setShowConfirmPena] = useState(false);
  const [envioPdf, setEnvioPdf] = useState<EstadoEnvioPdf>("sin-enviar");

  // Estado real del último envío del PDF, para poder reintentar en el sitio.
  useEffect(() => {
    let alive = true;
    if (!puedeEnviarPdf(g)) { setEnvioPdf("sin-enviar"); return; }
    fetchEstadoEnvioPdf(g.id).then((st) => { if (alive) setEnvioPdf(st); });
    return () => { alive = false; };
  }, [g.id, g.estado, g.cliente_telefono]);

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
          <div className="mt-1 flex items-center justify-between gap-2">
            <span className="text-[11px] text-muted-foreground">
              {fase.rechazado ? "Rechazado por el cliente" : fase.label}
            </span>
            <Link
              to="/app/gestion/$id"
              params={{ id: g.id }}
              onClick={(e) => e.stopPropagation()}
              className="shrink-0 text-[11px] font-semibold text-primary hover:underline"
            >
              Ver detalle
            </Link>
          </div>
        </div>

        {/* Acciones rápidas */}
        {(isBorrador || puedeReenviar(g) || puedeEnviarPdf(g) || puedePedirPena(g)) && (
          <div className="mt-2.5 flex flex-wrap gap-1.5" onClick={(e) => e.stopPropagation()}>
            {puedeEnviarPdf(g) && (
              <QuickBtn
                busy={busy === "pdf"}
                accent={envioPdf === "error" || envioPdf === "pendiente"}
                onClick={async () => {
                  setBusy("pdf");
                  try {
                    const res = await enviarPresupuestoPdfWhatsApp(g, { taller: g.taller_nombre });
                    setEnvioPdf(res.estado);
                    if (res.estado === "enviado") toast.success("Presupuesto PDF enviado por WhatsApp");
                    else { toast.warning("WhatsApp no se abrió: reintentando…"); window.location.href = res.url; }
                    onChanged?.();
                  } catch (e: any) {
                    setEnvioPdf("error");
                    toast.error("No se pudo enviar el PDF: " + (e?.message || "error"));
                  } finally {
                    setBusy(null);
                  }
                }}
                icon={envioPdf === "error" || envioPdf === "pendiente"
                  ? <RefreshCw className="h-3.5 w-3.5" />
                  : <FileDown className="h-3.5 w-3.5" />}
                label={
                  envioPdf === "error" ? "Reintentar envío PDF"
                  : envioPdf === "pendiente" ? "Reintentar envío PDF"
                  : envioPdf === "enviado" ? "Reenviar PDF"
                  : "Enviar PDF"
                }
              />
            )}
            {puedeEnviarPdf(g) && envioPdf !== "sin-enviar" && (
              <span className={`inline-flex items-center rounded-full px-2 py-1 text-[10px] font-semibold ${ENVIO_PDF_CLASS[envioPdf]}`}>
                {ENVIO_PDF_LABEL[envioPdf]}
              </span>
            )}




            {isBorrador && onResume && (
              <QuickBtn onClick={() => onResume(g)} icon={<PlayCircle className="h-3.5 w-3.5" />} label="Reanudar borrador" />
            )}
            {puedeReenviar(g) && (
              <QuickBtn
                busy={busy === "wa"}
                onClick={async () => {
                  setBusy("wa");
                  try {
                    await reenviarPlantilla(g);
                    toast.success("Plantilla reenviada por WhatsApp");
                    onChanged?.();
                  } catch {
                    toast.error("No se pudo reenviar la plantilla");
                  } finally {
                    setBusy(null);
                  }
                }}
                icon={<Send className="h-3.5 w-3.5" />}
                label={g.wa_abierto ? "Reenviar plantilla" : "Enviar plantilla"}
              />
            )}
            {puedePedirPena(g) && (
              <QuickBtn
                busy={busy === "pena"}
                accent
                onClick={() => setShowConfirmPena(true)}
                icon={<Truck className="h-3.5 w-3.5" />}
                label="Pedir a Peña"
              />
            )}
          </div>
        )}

        {showConfirmPena && (
          <ConfirmPenaModal
            mensaje={buildMensajePena(g)}
            onCancel={() => setShowConfirmPena(false)}
            onConfirm={() => {
              setShowConfirmPena(false);
              setBusy("pena");
              const abierto = openWhatsAppPena(g);
              registrarPedidoPena(g, { abierto })
                .then(() => {
                  if (abierto) toast.success("Pedido enviado a Grupo Peña por WhatsApp");
                  else toast.warning("Pedido guardado. Abriendo WhatsApp de Grupo Peña…");
                  onChanged?.();
                })
                .catch(() => {
                  toast.error("No se pudo registrar el pedido a Peña");
                })
                .finally(() => setBusy(null));
            }}
          />
        )}
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

function QuickBtn({
  onClick, icon, label, busy, accent,
}: { onClick: () => void; icon: React.ReactNode; label: string; busy?: boolean; accent?: boolean }) {
  return (
    <button
      type="button"
      disabled={busy}
      onClick={onClick}
      className={
        "inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[11px] font-semibold transition disabled:opacity-60 " +
        (accent
          ? "border-accent/40 bg-accent/10 text-accent hover:bg-accent/20"
          : "border-border-strong bg-surface-2 text-text-2 hover:bg-surface-3 hover:text-foreground")
      }
    >
      {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : icon}
      {label}
    </button>
  );
}

function ConfirmPenaModal({
  mensaje,
  onCancel,
  onConfirm,
}: {
  mensaje: string;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center">
      <div className="flex max-h-[92dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl bg-surface sm:rounded-3xl">
        <div className="shrink-0 border-b border-border px-4 py-3">
          <div className="text-sm font-semibold">Revisar pedido a Grupo Peña</div>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            Se enviará por WhatsApp a{" "}
            <span className="font-mono">34634954491</span> (Grupo Peña)
          </p>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
          <div className="rounded-2xl bg-surface-2 p-3">
            <div className="max-w-full whitespace-pre-wrap break-words rounded-2xl rounded-br-sm bg-accent/10 p-3 text-[13px] leading-relaxed text-foreground">
              {mensaje.trim() || "El mensaje está vacío."}
            </div>
            <p className="mt-2 text-[11px] text-muted-foreground">
              Así se verá en WhatsApp. Si algo no cuadra, cancela y edítalo desde el detalle.
            </p>
          </div>
        </div>

        <div
          className="shrink-0 border-t border-border px-4 py-3"
          style={{ paddingBottom: "calc(0.75rem + env(safe-area-inset-bottom))" }}
        >
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onCancel}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-border-strong bg-surface px-4 py-2.5 text-sm font-semibold text-foreground transition hover:bg-surface-2"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={!mensaje.trim()}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-accent-foreground transition active:scale-95 disabled:opacity-50"
            >
              <MessageCircle className="h-4 w-4" />
              Abrir WhatsApp
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
