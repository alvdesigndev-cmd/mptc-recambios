/**
 * Resumen de pedidos pendientes de Grupo Peña: cliente, matrícula, vehículo,
 * piezas e importe, para revisarlos de un vistazo sin abrir cada pedido.
 */

export interface PedidoDirecto {
  id: string;
  taller_id: string | null;
  taller_nombre: string | null;
  matricula: string | null;
  vehiculo: string | null;
  piezas: string | null;
  notas: string | null;
  estado: string;
  fotos: string[] | null;
  audio_url: string | null;
  transcripcion: string | null;
  created_at: string;
  cliente_nombre?: string | null;
  cliente_telefono?: string | null;
  importe_total?: number | null;
  numero_pedido?: string | null;
  gpa_pedido_numero?: string | null;
  gpa_pedido_estado?: string | null;
}

export function PendientesTabla({
  pedidos,
  onOpen,
  title = "Pedidos pendientes",
}: {
  pedidos: PedidoDirecto[];
  onOpen: (p: PedidoDirecto) => void;
  title?: string;
}) {
  if (pedidos.length === 0) return null;
  const totalImporte = pedidos.reduce((a, p) => a + (Number(p.importe_total) || 0), 0);
  return (
    <section className="overflow-hidden rounded-2xl border border-border bg-surface">
      <div className="flex items-baseline justify-between gap-3 border-b border-border px-4 py-3">
        <h2 className="text-sm font-semibold">
          {title} <span className="text-muted-foreground">({pedidos.length})</span>
        </h2>
        <span className="font-mono text-sm font-bold">{totalImporte.toFixed(2)} €</span>
      </div>

      {/* Móvil */}
      <div className="divide-y divide-border sm:hidden">
        {pedidos.map((p) => (
          <button
            key={p.id}
            onClick={() => onOpen(p)}
            className="w-full space-y-1 px-4 py-3 text-left hover:bg-surface-2"
          >
            <div className="flex items-baseline justify-between gap-2">
              <span className="truncate text-sm font-semibold">{p.cliente_nombre || "Sin cliente"}</span>
              <span className="font-mono text-sm font-bold">{p.matricula || "—"}</span>
            </div>
            <div className="truncate text-[12px] text-muted-foreground">{p.vehiculo || ""}</div>
            <div className="line-clamp-2 text-[12px] text-text-2">{p.piezas || "—"}</div>
            <div className="flex items-baseline justify-between gap-2 text-[11px] text-muted-foreground">
              <span className="truncate">{p.taller_nombre || ""}</span>
              <span className="font-mono font-semibold text-foreground">
                {p.importe_total != null ? `${Number(p.importe_total).toFixed(2)} €` : "—"}
              </span>
            </div>
          </button>
        ))}
      </div>

      {/* Escritorio */}
      <div className="hidden overflow-x-auto sm:block">
        <table className="w-full text-left text-sm">
          <thead className="text-[11px] uppercase tracking-wide text-muted-foreground">
            <tr className="border-b border-border">
              <th className="px-4 py-2 font-semibold">Cliente</th>
              <th className="px-4 py-2 font-semibold">Matrícula</th>
              <th className="px-4 py-2 font-semibold">Vehículo</th>
              <th className="px-4 py-2 font-semibold">Piezas</th>
              <th className="px-4 py-2 text-right font-semibold">Importe</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {pedidos.map((p) => (
              <tr
                key={p.id}
                onClick={() => onOpen(p)}
                className="cursor-pointer align-top hover:bg-surface-2"
              >
                <td className="px-4 py-2.5">
                  <div className="font-semibold">{p.cliente_nombre || "Sin cliente"}</div>
                  <div className="text-[11px] text-muted-foreground">
                    {p.cliente_telefono || p.taller_nombre || ""}
                  </div>
                </td>
                <td className="px-4 py-2.5">
                  <div className="font-mono font-bold">{p.matricula || "—"}</div>
                  <div className="text-[11px] text-muted-foreground">{p.taller_nombre || ""}</div>
                </td>
                <td className="px-4 py-2.5 text-[12px] text-text-2">{p.vehiculo || "—"}</td>
                <td className="max-w-[380px] px-4 py-2.5 text-[12px] text-text-2">
                  <div className="whitespace-pre-line">{p.piezas || "—"}</div>
                  {(p.gpa_pedido_numero || p.numero_pedido) && (
                    <div className="mt-1 text-[11px] text-muted-foreground">
                      Nº {p.gpa_pedido_numero || p.numero_pedido}
                    </div>
                  )}
                </td>
                <td className="whitespace-nowrap px-4 py-2.5 text-right font-mono font-semibold">
                  {p.importe_total != null ? `${Number(p.importe_total).toFixed(2)} €` : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
