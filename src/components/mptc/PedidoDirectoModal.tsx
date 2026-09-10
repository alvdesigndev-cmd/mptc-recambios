import { useEffect, useMemo, useState } from "react";
import {
  Camera,
  Car,
  Check,
  ChevronLeft,
  Loader2,
  Package,
  Search,
  Trash2,
  Truck,
  User,
  X,
} from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { type AppSettings } from "@/lib/mptc/profiles";
import { ocrMatricula } from "@/lib/mptc/ocr.functions";
import { lookupPlate } from "@/lib/mptc/matriculas.functions";
import { consultaArticulosGPA, generarPedidoGPA, type GpaArticulo } from "@/lib/mptc/gpa.functions";
import { mapApiData } from "@/lib/mptc/plate-map";
import { normalizeMatricula, normalizeTelefono } from "@/lib/mptc/normalize";
import { compressImageToDataUrl } from "@/lib/mptc/image";
import { generateToken, buildWAUrl } from "@/lib/mptc/wa";
import { PENA_PHONE } from "@/lib/mptc/profiles";

interface Props {
  settings: AppSettings;
  onClose: () => void;
  onSaved?: () => void;
}

interface PiezaPedido extends GpaArticulo {
  cantidad: number;
}

const inputCls =
  "w-full rounded-xl bg-surface-2 px-3 py-2.5 text-base outline-none placeholder:text-muted-foreground/60 focus:bg-surface-3";
const primaryBtn =
  "inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground active:scale-95 disabled:opacity-60";
const ghostBtn =
  "inline-flex items-center gap-2 rounded-xl border border-border-strong bg-surface px-4 py-2.5 text-sm font-semibold active:scale-95 disabled:opacity-60";

const PASOS = ["Cliente y vehículo", "Foto de la avería", "Buscar pieza", "Confirmar pedido"];

export function PedidoDirectoModal({ settings, onClose, onSaved }: Props) {
  const [step, setStep] = useState(1);

  // Paso 1
  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");
  const [matricula, setMatricula] = useState("");
  const [vehiculo, setVehiculo] = useState({ marca: "", modelo: "", motor: "", anio: "" });
  const [plateBusy, setPlateBusy] = useState(false);
  const [plateMsg, setPlateMsg] = useState<string | null>(null);
  const [ocrBusy, setOcrBusy] = useState(false);

  // Paso 2
  const [fotos, setFotos] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);

  // Paso 3
  const [query, setQuery] = useState("");
  const [buscando, setBuscando] = useState(false);
  const [resultados, setResultados] = useState<GpaArticulo[]>([]);
  const [sel, setSel] = useState<Record<string, number>>({});
  const [piezas, setPiezas] = useState<PiezaPedido[]>([]);

  // Paso 4
  const [notas, setNotas] = useState("");
  const [enviando, setEnviando] = useState(false);

  const lookupPlateFn = useServerFn(lookupPlate);
  const runOcr = useServerFn(ocrMatricula);
  const buscarPiezas = useServerFn(consultaArticulosGPA);
  const generarPedido = useServerFn(generarPedidoGPA);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Previews de fotos
  useEffect(() => {
    const urls = fotos.map((f) => URL.createObjectURL(f));
    setPreviews(urls);
    return () => urls.forEach((u) => URL.revokeObjectURL(u));
  }, [fotos]);

  const vehiculoTexto = useMemo(
    () => [vehiculo.marca, vehiculo.modelo].filter(Boolean).join(" ").trim(),
    [vehiculo],
  );
  const contexto = useMemo(
    () => [vehiculo.marca, vehiculo.modelo, vehiculo.motor].filter(Boolean).join(" · "),
    [vehiculo],
  );
  const total = useMemo(() => piezas.reduce((a, p) => a + p.precio * p.cantidad, 0), [piezas]);

  /** Consulta la API de matrículas y rellena los datos del vehículo. */
  const consultarMatricula = async (plateRaw: string) => {
    const plate = normalizeMatricula(plateRaw).replace(/[^A-Z0-9]/g, "");
    if (plate.length < 4) return;
    setPlateBusy(true);
    setPlateMsg(null);
    try {
      const res = await lookupPlateFn({ data: { plate } });
      if (!res.ok || !res.data) {
        setPlateMsg(res.error || "No se encontraron datos para esta matrícula.");
        return;
      }
      const m = mapApiData(res.data);
      const anio = (m.fechaMatriculacion.match(/(\d{4})/)?.[1] ?? "").trim();
      setVehiculo({ marca: m.marca, modelo: m.modelo, motor: m.motor, anio });
      setPlateMsg(m.vehiculo ? `Datos cargados: ${m.vehiculo}` : "Vehículo localizado.");
    } catch {
      setPlateMsg("No se pudo consultar la matrícula.");
    } finally {
      setPlateBusy(false);
    }
  };

  const escanearMatricula = async (file: File | null) => {
    if (!file) return;
    setOcrBusy(true);
    try {
      const dataUrl = await compressImageToDataUrl(file, 1280, 0.82);
      const res = await runOcr({ data: { imageDataUrl: dataUrl } });
      const detected = (res?.matricula || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
      if (!detected) {
        toast.error("No se detectó ninguna matrícula. Prueba con otra foto más nítida.");
        return;
      }
      setMatricula(detected);
      await consultarMatricula(detected);
    } catch {
      toast.error("Error al escanear la matrícula.");
    } finally {
      setOcrBusy(false);
    }
  };

  const buscar = async () => {
    setBuscando(true);
    try {
      const r = await buscarPiezas({
        data: {
          query,
          marca: vehiculo.marca || undefined,
          modelo: vehiculo.modelo || undefined,
          motor: vehiculo.motor || undefined,
          matricula: matricula || undefined,
        },
      });
      setResultados(r.articulos);
      setSel({});
      if (r.articulos.length === 0) toast.info("Sin resultados en GPCat");
    } catch {
      toast.error("No se pudo buscar en GPCat");
    } finally {
      setBuscando(false);
    }
  };

  const anadirAlPedido = () => {
    const nuevas = resultados
      .filter((a) => sel[a.referencia])
      .map((a) => ({ ...a, cantidad: sel[a.referencia] || 1 }));
    if (nuevas.length === 0) return;
    setPiezas((prev) => {
      const map = new Map(prev.map((p) => [p.referencia, p]));
      for (const n of nuevas) {
        const existente = map.get(n.referencia);
        map.set(
          n.referencia,
          existente ? { ...existente, cantidad: existente.cantidad + n.cantidad } : n,
        );
      }
      return [...map.values()];
    });
    setSel({});
    toast.success(`${nuevas.length} pieza(s) añadidas al pedido`);
    setStep(4);
  };

  const subirFotos = async (): Promise<string[]> => {
    if (fotos.length === 0) return [];
    const folder = `${settings.tallerId}/pedidos/${generateToken()}`;
    const urls: string[] = [];
    for (let i = 0; i < fotos.length; i++) {
      const f = fotos[i]!;
      const ext = (f.name.split(".").pop() || "jpg").toLowerCase();
      const path = `${folder}/${Date.now()}-${i}.${ext}`;
      const { error } = await supabase.storage
        .from("fotos-gestiones")
        .upload(path, f, { contentType: f.type, upsert: false });
      if (error) continue;
      const { data } = supabase.storage.from("fotos-gestiones").getPublicUrl(path);
      urls.push(data.publicUrl);
    }
    return urls;
  };

  const confirmarPedido = async () => {
    if (piezas.length === 0) {
      toast.error("Añade al menos una pieza al pedido.");
      return;
    }
    setEnviando(true);
    try {
      const fotosUrls = await subirFotos();
      const confirmToken = generateToken();

      const gpa = await generarPedido({
        data: {
          matricula: matricula || undefined,
          direccion: settings.tallerName,
          lineas: piezas.map((p) => ({
            referencia: p.referencia,
            descripcion: p.descripcion,
            marca: p.marca,
            cantidad: p.cantidad,
            precio: p.precio,
          })),
        },
      });

      const piezasTexto = piezas
        .map(
          (p) =>
            `${p.cantidad}x ${p.referencia} · ${p.descripcion} (${p.marca}) – ${(p.precio * p.cantidad).toFixed(2)}€`,
        )
        .join("\n");

      const { error } = await supabase.from("pedidos_pena").insert({
        taller_id: settings.tallerId,
        taller_nombre: settings.tallerName,
        cliente_nombre: nombre || null,
        cliente_telefono: telefono || null,
        matricula: matricula || null,
        vehiculo: vehiculoTexto || null,
        marca: vehiculo.marca || null,
        modelo: vehiculo.modelo || null,
        motor: vehiculo.motor || null,
        piezas: piezasTexto,
        piezas_json: piezas.map((p) => ({
          referencia: p.referencia,
          descripcion: p.descripcion,
          marca: p.marca,
          cantidad: p.cantidad,
          precio: p.precio,
        })),
        importe_total: Number(total.toFixed(2)),
        numero_pedido: gpa.numeroPedido || null,
        notas: notas || null,
        fotos: fotosUrls,
        estado: "pendiente",
        confirm_token: confirmToken,
      });
      if (error) throw error;

      toast.success(
        gpa.numeroPedido
          ? `Pedido enviado a Grupo Peña · Nº ${gpa.numeroPedido}`
          : "Pedido enviado a Grupo Peña",
        { description: `${piezas.length} pieza(s) · ${total.toFixed(2)} €` },
      );
      onSaved?.();
      onClose();
    } catch (e: unknown) {
      console.error("pedido directo", e);
      toast.error("No se pudo enviar el pedido. Inténtalo de nuevo.", {
        description: e instanceof Error ? e.message : undefined,
      });
    } finally {
      setEnviando(false);
    }
  };

  const paso1Ok = nombre.trim().length > 0 && matricula.trim().length >= 4;

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center">
      <div className="flex max-h-[92dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl bg-surface sm:rounded-3xl">
        {/* Cabecera */}
        <div className="flex items-start justify-between gap-3 border-b border-border p-4">
          <div className="flex min-w-0 items-center gap-2">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent/15 text-accent">
              <Truck className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <h2 className="truncate text-base font-bold leading-tight">Pedido a Grupo Peña</h2>
              <p className="truncate text-[11px] text-muted-foreground">
                Paso {step} de 4 · {PASOS[step - 1]}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-muted-foreground hover:bg-surface-2"
            aria-label="Cerrar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Progreso */}
        <div className="flex gap-1 px-4 pt-3">
          {PASOS.map((_, i) => (
            <span
              key={i}
              className={"h-1.5 flex-1 rounded-full " + (i < step ? "bg-primary" : "bg-surface-3")}
            />
          ))}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          {step === 1 && (
            <div className="space-y-3">
              <Field label="Nombre del cliente" icon={<User className="h-3.5 w-3.5" />}>
                <input
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  placeholder="Nombre y apellidos"
                  className={inputCls}
                />
              </Field>
              <Field label="Teléfono del cliente">
                <input
                  value={telefono}
                  onChange={(e) => setTelefono(normalizeTelefono(e.target.value))}
                  inputMode="tel"
                  placeholder="600000000"
                  className={inputCls}
                />
              </Field>
              <Field label="Matrícula">
                <div className="flex gap-2">
                  <input
                    value={matricula}
                    onChange={(e) => setMatricula(normalizeMatricula(e.target.value))}
                    onBlur={(e) => void consultarMatricula(e.target.value)}
                    placeholder="1234ABC"
                    className={inputCls + " font-mono uppercase"}
                  />
                  <label className={ghostBtn + " shrink-0 cursor-pointer"}>
                    {ocrBusy ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Camera className="h-4 w-4" />
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      className="hidden"
                      onChange={(e) => {
                        void escanearMatricula(e.target.files?.[0] ?? null);
                        e.currentTarget.value = "";
                      }}
                    />
                  </label>
                </div>
              </Field>

              <div className="rounded-2xl border border-border bg-surface-2 p-3">
                <div className="flex items-center gap-2 text-[12px] font-semibold">
                  <Car className="h-3.5 w-3.5 text-accent" /> Datos del vehículo
                  {plateBusy && (
                    <Loader2 className="ml-auto h-3.5 w-3.5 animate-spin text-muted-foreground" />
                  )}
                </div>
                {vehiculo.marca || vehiculo.modelo || vehiculo.motor ? (
                  <div className="mt-2 space-y-0.5 text-sm">
                    <div className="font-semibold">{vehiculoTexto || "—"}</div>
                    <div className="text-[12px] text-muted-foreground">
                      {vehiculo.motor || "Motor n/d"}
                      {vehiculo.anio ? ` · ${vehiculo.anio}` : ""}
                    </div>
                  </div>
                ) : (
                  <p className="mt-1.5 text-[11px] text-muted-foreground">
                    Escribe o escanea la matrícula: los datos se rellenan automáticamente.
                  </p>
                )}
                {plateMsg && <p className="mt-1.5 text-[11px] text-muted-foreground">{plateMsg}</p>}
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-3">
              <p className="text-[12px] text-muted-foreground">
                Añade una foto de la avería (opcional). Ayuda a Grupo Peña a identificar la pieza.
              </p>
              <div className="grid grid-cols-2 gap-2">
                <label className={ghostBtn + " cursor-pointer justify-center"}>
                  <Camera className="h-4 w-4" /> Hacer foto
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={(e) => {
                      const fs = Array.from(e.target.files ?? []);
                      if (fs.length) setFotos((p) => [...p, ...fs]);
                      e.currentTarget.value = "";
                    }}
                  />
                </label>
                <label className={ghostBtn + " cursor-pointer justify-center"}>
                  <Package className="h-4 w-4" /> Galería
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={(e) => {
                      const fs = Array.from(e.target.files ?? []);
                      if (fs.length) setFotos((p) => [...p, ...fs]);
                      e.currentTarget.value = "";
                    }}
                  />
                </label>
              </div>
              {previews.length > 0 && (
                <div className="grid grid-cols-3 gap-2">
                  {previews.map((src, i) => (
                    <div
                      key={src}
                      className="relative overflow-hidden rounded-xl border border-border"
                    >
                      <img src={src} alt={`Foto ${i + 1}`} className="h-24 w-full object-cover" />
                      <button
                        type="button"
                        onClick={() => setFotos((p) => p.filter((_, j) => j !== i))}
                        className="absolute right-1 top-1 rounded-lg bg-black/60 p-1 text-white"
                        aria-label="Quitar foto"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {step === 3 && (
            <div className="space-y-3">
              <div className="rounded-2xl border border-border bg-surface-2 p-3 text-[12px]">
                <span className="font-semibold">{matricula || "Sin matrícula"}</span>
                <span className="text-muted-foreground"> · {contexto || "Vehículo sin datos"}</span>
              </div>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        void buscar();
                      }
                    }}
                    placeholder="Descripción o referencia…"
                    className={inputCls + " pl-9"}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => void buscar()}
                  disabled={buscando}
                  className={primaryBtn}
                >
                  {buscando ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Search className="h-4 w-4" />
                  )}
                  Buscar
                </button>
              </div>

              {buscando ? (
                <div className="py-10 text-center text-sm text-muted-foreground">
                  Buscando piezas…
                </div>
              ) : resultados.length === 0 ? (
                <div className="py-10 text-center text-sm text-muted-foreground">
                  Busca la pieza que necesitas para este vehículo.
                </div>
              ) : (
                <div className="space-y-2">
                  {resultados.map((p) => {
                    const checked = !!sel[p.referencia];
                    return (
                      <label
                        key={p.referencia}
                        className={
                          "flex cursor-pointer items-start gap-3 rounded-2xl border p-3 transition " +
                          (checked ? "border-primary bg-primary/10" : "border-border bg-surface-2")
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
                          className="mt-1 h-4 w-4 shrink-0"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-semibold">{p.descripcion}</div>
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
                                setSel((prev) => ({
                                  ...prev,
                                  [p.referencia]: Math.max(1, parseInt(e.target.value || "1", 10)),
                                }))
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
          )}

          {step === 4 && (
            <div className="space-y-3">
              <Resumen titulo="Cliente">
                <div className="text-sm font-semibold">{nombre || "—"}</div>
                <div className="text-[12px] text-muted-foreground">
                  {telefono || "Sin teléfono"}
                </div>
              </Resumen>
              <Resumen titulo="Vehículo">
                <div className="font-mono text-sm font-semibold">{matricula || "—"}</div>
                <div className="text-[12px] text-muted-foreground">
                  {contexto || "Sin datos del vehículo"}
                </div>
              </Resumen>
              <Resumen titulo={`Piezas (${piezas.length})`}>
                {piezas.length === 0 ? (
                  <p className="text-[12px] text-muted-foreground">Aún no has añadido piezas.</p>
                ) : (
                  <div className="space-y-1.5">
                    {piezas.map((p) => (
                      <div key={p.referencia} className="flex items-start gap-2 text-[12px]">
                        <div className="min-w-0 flex-1">
                          <div className="font-semibold">{p.descripcion}</div>
                          <div className="font-mono text-[11px] text-muted-foreground">
                            REF: {p.referencia} · {p.marca} · x{p.cantidad}
                          </div>
                        </div>
                        <span className="font-mono font-semibold">
                          {(p.precio * p.cantidad).toFixed(2)} €
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            setPiezas((prev) => prev.filter((x) => x.referencia !== p.referencia))
                          }
                          className="rounded-md p-1 text-muted-foreground hover:bg-surface-3"
                          aria-label="Quitar pieza"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                    <div className="flex justify-between border-t border-border pt-2 text-sm font-bold">
                      <span>Total</span>
                      <span className="font-mono">{total.toFixed(2)} €</span>
                    </div>
                  </div>
                )}
              </Resumen>
              {previews.length > 0 && (
                <Resumen titulo={`Fotos (${previews.length})`}>
                  <div className="flex gap-2 overflow-x-auto">
                    {previews.map((src, i) => (
                      <img
                        key={src}
                        src={src}
                        alt={`Foto ${i + 1}`}
                        className="h-16 w-16 shrink-0 rounded-lg object-cover"
                      />
                    ))}
                  </div>
                </Resumen>
              )}
              <Field label="Notas para Grupo Peña">
                <textarea
                  value={notas}
                  onChange={(e) => setNotas(e.target.value)}
                  rows={2}
                  className={inputCls}
                />
              </Field>
            </div>
          )}
        </div>

        {/* Pie de navegación */}
        <div
          className="flex items-center gap-2 border-t border-border p-4"
          style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}
        >
          {step > 1 ? (
            <button type="button" onClick={() => setStep(step - 1)} className={ghostBtn}>
              <ChevronLeft className="h-4 w-4" /> Atrás
            </button>
          ) : (
            <button type="button" onClick={onClose} className={ghostBtn}>
              Cancelar
            </button>
          )}

          <div className="ml-auto flex items-center gap-2">
            {step === 2 && (
              <button type="button" onClick={() => setStep(3)} className={ghostBtn}>
                Saltar
              </button>
            )}
            {step === 1 && (
              <button
                type="button"
                onClick={() => setStep(2)}
                disabled={!paso1Ok}
                className={primaryBtn}
              >
                Siguiente
              </button>
            )}
            {step === 2 && (
              <button type="button" onClick={() => setStep(3)} className={primaryBtn}>
                Siguiente
              </button>
            )}
            {step === 3 && (
              <button
                type="button"
                onClick={anadirAlPedido}
                disabled={Object.keys(sel).length === 0}
                className={primaryBtn}
              >
                <Package className="h-4 w-4" /> Añadir al pedido
              </button>
            )}
            {step === 4 && (
              <button
                type="button"
                onClick={() => void confirmarPedido()}
                disabled={enviando || piezas.length === 0}
                className={primaryBtn}
              >
                {enviando ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Check className="h-4 w-4" />
                )}
                Confirmar pedido a Grupo Peña
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  icon,
  children,
}: {
  label: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-1">
      <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        {icon} {label}
      </span>
      {children}
    </label>
  );
}

function Resumen({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-surface-2 p-3">
      <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        {titulo}
      </div>
      {children}
    </div>
  );
}
