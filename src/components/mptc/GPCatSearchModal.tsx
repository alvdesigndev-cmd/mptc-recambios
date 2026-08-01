import { useEffect, useMemo, useState } from "react";
import { Filter, Loader2, Package, Search, Tag, X } from "lucide-react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { consultaArticulosGPA, type GpaArticulo, type GpaCriterio } from "@/lib/mptc/gpa.functions";

export interface PiezaSeleccionada extends GpaArticulo {
  cantidad: number;
}

interface Props {
  open: boolean;
  onClose: () => void;
  marca?: string;
  modelo?: string;
  motor?: string;
  averia?: string;
  onAdd: (piezas: PiezaSeleccionada[]) => void;
}

export function GPCatSearchModal({ open, onClose, marca, modelo, motor, averia, onAdd }: Props) {
  const buscar = useServerFn(consultaArticulosGPA);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<GpaArticulo[]>([]);
  const [criterio, setCriterio] = useState<GpaCriterio | null>(null);
  const [sel, setSel] = useState<Record<string, number>>({});
  const [dispo, setDispo] = useState<"todas" | "disponible" | "pedido">("todas");
  const [marcasSel, setMarcasSel] = useState<string[]>([]);
  const [categoria, setCategoria] = useState("");

  const run = async (opts?: { query?: string; categoria?: string }) => {
    const q = opts?.query ?? query;
    const cat = opts?.categoria ?? categoria;
    setLoading(true);
    try {
      const r = await buscar({ data: { query: q, marca, modelo, motor, categoria: cat || undefined } });
      setItems(r.articulos);
      setCriterio(r.criterio ?? null);
      setSel({});
      setDispo("todas");
      setMarcasSel([]);
      if (r.articulos.length === 0) toast.info("Sin resultados en GPCat");
    } catch {
      toast.error("No se pudo buscar en GPCat");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!open) return;
    setQuery(averia ?? "");
    setSel({});
    setItems([]);
    setCriterio(null);
    setDispo("todas");
    setMarcasSel([]);
    setCategoria("");
    void run({ query: averia ?? "", categoria: "" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  /** Cambio manual de categoría: relanza la búsqueda con esa selección. */
  const cambiarCategoria = (key: string) => {
    setCategoria(key);
    void run({ categoria: key });
  };

  const esDisponible = (stock: string) => stock.toLowerCase().includes("disponible");

  const marcasDisponibles = useMemo(() => {
    const map = new Map<string, number>();
    for (const i of items) {
      if (dispo === "disponible" && !esDisponible(i.stock)) continue;
      if (dispo === "pedido" && esDisponible(i.stock)) continue;
      map.set(i.marca, (map.get(i.marca) ?? 0) + 1);
    }
    return [...map.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  }, [items, dispo]);

  const conteoDispo = useMemo(() => {
    const disponible = items.filter((i) => esDisponible(i.stock)).length;
    return { todas: items.length, disponible, pedido: items.length - disponible };
  }, [items]);

  const visibles = useMemo(
    () =>
      items.filter((i) => {
        if (dispo === "disponible" && !esDisponible(i.stock)) return false;
        if (dispo === "pedido" && esDisponible(i.stock)) return false;
        if (marcasSel.length > 0 && !marcasSel.includes(i.marca)) return false;
        return true;
      }),
    [items, dispo, marcasSel],
  );

  const filtrosActivos = dispo !== "todas" || marcasSel.length > 0;

  const seleccionadas = useMemo(
    () => items.filter((i) => sel[i.referencia]).map((i) => ({ ...i, cantidad: sel[i.referencia] || 1 })),
    [items, sel],
  );
  const total = useMemo(
    () => seleccionadas.reduce((a, p) => a + p.precio * p.cantidad, 0),
    [seleccionadas],
  );

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center">
      <div className="flex max-h-[92dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl bg-surface sm:rounded-3xl">
        <div className="flex items-start justify-between gap-3 border-b border-border p-4">
          <div className="min-w-0">
            <h2 className="flex items-center gap-2 text-base font-bold">
              <Package className="h-4 w-4 text-accent" /> Buscar piezas GPCat
            </h2>
            <p className="truncate text-[12px] text-muted-foreground">
              {[marca, modelo, motor].filter(Boolean).join(" · ") || "Vehículo sin datos"}
            </p>
          </div>
          <button onClick={onClose} className="rounded-lg p-2 text-muted-foreground hover:bg-surface-2" aria-label="Cerrar">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="border-b border-border p-4">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); setCategoria(""); void run({ categoria: "" }); } }}
                placeholder="Descripción o referencia…"
                className="w-full rounded-xl bg-surface-2 py-2.5 pl-9 pr-3 text-sm outline-none focus:bg-surface-3"
              />
            </div>
            <button
              type="button"
              onClick={() => { setCategoria(""); void run({ categoria: "" }); }}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground active:scale-95 disabled:opacity-60"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              Buscar
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          {!loading && criterio ? (
            <div className="mb-3 rounded-2xl border border-border bg-surface-2 p-3">
              <div className="flex items-center gap-2 text-[12px] font-semibold">
                <Filter className="h-3.5 w-3.5 text-accent" />
                {criterio.tipo === "referencia" && "Búsqueda por referencia"}
                {criterio.tipo === "categoria" && "Búsqueda por categoría"}
                {criterio.tipo === "texto" && "Búsqueda por texto libre"}
                {criterio.tipo === "destacados" && "Piezas destacadas"}
                <span className="ml-auto text-[11px] font-normal text-muted-foreground">
                  {filtrosActivos ? `${visibles.length} de ${items.length}` : items.length}{" "}
                  {items.length === 1 ? "resultado" : "resultados"}
                </span>
              </div>

              {criterio.categorias.length > 0 ? (
                <div className="mt-2 space-y-1.5">
                  {criterio.categorias.map((c) => (
                    <div key={c.key} className="flex flex-wrap items-center gap-1.5">
                      <span className="inline-flex items-center gap-1 rounded-full bg-primary/15 px-2 py-0.5 text-[11px] font-semibold text-primary">
                        <Tag className="h-3 w-3" /> {c.label}
                      </span>
                      {c.sinonimos.slice(0, 6).map((s) => (
                        <span key={s} className="rounded-full bg-surface-3 px-2 py-0.5 text-[10px] text-muted-foreground">
                          {s}
                        </span>
                      ))}
                      {c.sinonimos.length > 6 ? (
                        <span className="text-[10px] text-muted-foreground">+{c.sinonimos.length - 6}</span>
                      ) : null}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-1.5 text-[11px] text-muted-foreground">
                  {criterio.tipo === "destacados"
                    ? "Sin coincidencias claras: mostrando selección habitual de taller."
                    : criterio.termino
                      ? <>Criterio aplicado sobre “{criterio.termino}”.</>
                      : "Sin término de búsqueda."}
                </p>
              )}
            </div>
          ) : null}

          {!loading && items.length > 0 ? (
            <div className="mb-3 space-y-2">
              <div className="flex flex-wrap items-center gap-1.5">
                {([
                  ["todas", "Todas", conteoDispo.todas],
                  ["disponible", "Disponible", conteoDispo.disponible],
                  ["pedido", "Bajo pedido", conteoDispo.pedido],
                ] as const).map(([key, label, n]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => { setDispo(key); setMarcasSel([]); }}
                    className={
                      "rounded-full px-2.5 py-1 text-[11px] font-semibold transition " +
                      (dispo === key
                        ? "bg-primary text-primary-foreground"
                        : "bg-surface-2 text-muted-foreground hover:bg-surface-3")
                    }
                  >
                    {label} ({n})
                  </button>
                ))}
                {filtrosActivos ? (
                  <button
                    type="button"
                    onClick={() => { setDispo("todas"); setMarcasSel([]); }}
                    className="ml-auto inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] text-muted-foreground hover:bg-surface-2"
                  >
                    <X className="h-3 w-3" /> Limpiar
                  </button>
                ) : null}
              </div>

              {marcasDisponibles.length > 1 ? (
                <div className="flex flex-wrap items-center gap-1.5">
                  {marcasDisponibles.map(([m, n]) => {
                    const on = marcasSel.includes(m);
                    return (
                      <button
                        key={m}
                        type="button"
                        onClick={() =>
                          setMarcasSel((prev) => (on ? prev.filter((x) => x !== m) : [...prev, m]))
                        }
                        className={
                          "rounded-full border px-2.5 py-1 text-[11px] font-semibold transition " +
                          (on
                            ? "border-accent bg-accent/15 text-accent"
                            : "border-border bg-surface-2 text-muted-foreground hover:bg-surface-3")
                        }
                      >
                        {m} ({n})
                      </button>
                    );
                  })}
                </div>
              ) : null}
            </div>
          ) : null}

          {loading ? (
            <div className="py-10 text-center text-sm text-muted-foreground">Buscando piezas…</div>
          ) : visibles.length === 0 ? (
            <div className="py-10 text-center text-sm text-muted-foreground">
              {items.length > 0 ? "Ningún resultado con estos filtros." : "Sin resultados."}
            </div>
          ) : (
            <div className="space-y-2">
              {visibles.map((p) => {
                const checked = !!sel[p.referencia];
                return (
                  <label
                    key={p.referencia}
                    className={
                      "flex cursor-pointer items-start gap-3 rounded-2xl border p-3 transition " +
                      (checked ? "border-primary bg-primary/10" : "border-border bg-surface-2 hover:bg-surface-3")
                    }
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(e) =>
                        setSel((prev) => {
                          const next = { ...prev };
                          if (e.target.checked) next[p.referencia] = 1;
                          else delete next[p.referencia];
                          return next;
                        })
                      }
                      className="mt-1 h-4 w-4 shrink-0 accent-current"
                    />
                    {p.imagen ? (
                      <img src={p.imagen} alt={p.descripcion} className="h-12 w-12 shrink-0 rounded-lg object-cover" loading="lazy" />
                    ) : null}
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-semibold">{p.descripcion}</div>
                      <div className="font-mono text-[11px] text-muted-foreground">
                        REF: {p.referencia} · {p.marca}
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px]">
                        <span
                          className={
                            "rounded-full px-2 py-0.5 font-semibold " +
                            (p.stock.toLowerCase().includes("disponible")
                              ? "bg-success/15 text-success"
                              : "bg-warning/15 text-warning")
                          }
                        >
                          {p.stock}
                        </span>
                        <span className="text-muted-foreground">Plazo {p.plazo}</span>
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      <div className="font-mono text-sm font-bold">{p.precio.toFixed(2)} €</div>
                      {checked && (
                        <input
                          type="number"
                          min={1}
                          value={sel[p.referencia]}
                          onClick={(e) => e.stopPropagation()}
                          onChange={(e) =>
                            setSel((prev) => ({ ...prev, [p.referencia]: Math.max(1, parseInt(e.target.value || "1", 10)) }))
                          }
                          className="mt-1 w-16 rounded-lg bg-surface px-2 py-1 text-right text-[12px] outline-none"
                        />
                      )}
                    </div>
                  </label>
                );
              })}
            </div>
          )}
        </div>

        <div className="flex items-center gap-3 border-t border-border p-4">
          <div className="min-w-0 flex-1 text-[12px] text-muted-foreground">
            {seleccionadas.length} pieza(s) ·{" "}
            <span className="font-mono font-semibold text-foreground">{total.toFixed(2)} €</span>
          </div>
          <button
            type="button"
            disabled={seleccionadas.length === 0}
            onClick={() => { onAdd(seleccionadas); onClose(); }}
            className="inline-flex items-center gap-2 rounded-xl bg-accent px-3 py-2 text-sm font-semibold text-accent-foreground active:scale-95 disabled:opacity-50"
          >
            <Package className="h-4 w-4" /> Añadir al presupuesto
          </button>
        </div>
      </div>
    </div>
  );
}

/** Formatea una pieza para el campo "Piezas a pedir". */
export function formatPiezaLinea(p: PiezaSeleccionada): string {
  return `REF: ${p.referencia} - ${p.descripcion} (${p.marca}) x${p.cantidad} - ${(p.precio * p.cantidad).toFixed(2)}€`;
}
