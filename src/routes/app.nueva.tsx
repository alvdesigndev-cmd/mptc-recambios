import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Camera,
  Image as ImageIcon,
  Search,
  Check,
  Loader2,
  MessageCircle,
  ScanLine,
  Save,
  Send,
  Truck,
  X,
} from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { loadSettings, PENA_PHONE, type AppSettings } from "@/lib/mptc/profiles";
import { findFamilyBySlug, findSubfamilyBySlug } from "@/lib/mptc/families";
import { useFamilias } from "@/lib/mptc/useFamilias";
import { buildMessage, buildPenaMessage } from "@/lib/mptc/messages";
import { buildWAUrl, generateToken } from "@/lib/mptc/wa";
import { ocrMatricula } from "@/lib/mptc/ocr.functions";
import { normalizeMatricula, normalizeTelefono } from "@/lib/mptc/normalize";
import { MicButton } from "@/components/mptc/MicButton";

export const Route = createFileRoute("/app/nueva")({
  validateSearch: (s: Record<string, unknown>) => ({
    clienteId: typeof s.clienteId === "string" ? s.clienteId : undefined,
  }),
  component: NuevaPage,
});

type Step = 1 | 2 | 3;

interface ClienteRow {
  id: string;
  nombre: string | null;
  telefono: string | null;
  matricula: string | null;
  vehiculo: string | null;
  km: string | null;
}

function NuevaPage() {
  const navigate = useNavigate();
  const search = Route.useSearch();
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [step, setStep] = useState<Step>(1);

  // Step 1 — cliente
  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");
  const [matricula, setMatricula] = useState("");
  const [vehiculo, setVehiculo] = useState("");
  const [km, setKm] = useState("");
  const [fotos, setFotos] = useState<File[]>([]);
  const [fotosUrls, setFotosUrls] = useState<(string | null)[]>([]);
  const [fotosError, setFotosError] = useState<boolean[]>([]);
  const [uploadingFotos, setUploadingFotos] = useState(false);
  const [suggest, setSuggest] = useState<ClienteRow[]>([]);
  const [showSuggest, setShowSuggest] = useState(false);
  const [buscador, setBuscador] = useState("");
  const [clienteBloqueado, setClienteBloqueado] = useState<ClienteRow | null>(null);

  // Step 2 — avería
  const [categoria, setCategoria] = useState<string | null>(null);
  const [subfamilia, setSubfamilia] = useState<string | null>(null);
  const [showMore, setShowMore] = useState(false);
  const [averiaQuery, setAveriaQuery] = useState("");

  // Step 3 — mensaje
  const [importe, setImporte] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [piezas, setPiezas] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [mensajeTouched, setMensajeTouched] = useState(false);
  const [confirmToken] = useState(() => generateToken());
  const [gestionFolder] = useState(() => generateToken());
  const [pedirPena, setPedirPena] = useState(false);
  const [busy, setBusy] = useState(false);
  const [ocrBusy, setOcrBusy] = useState(false);
  const runOcr = useServerFn(ocrMatricula);

  useEffect(() => {
    const s = loadSettings();
    if (!s || s.role === "pena") {
      navigate({ to: "/" });
      return;
    }
    setSettings(s);
  }, [navigate]);

  // Pre-cargar cliente desde query param ?clienteId=...
  useEffect(() => {
    const id = (search as { clienteId?: string }).clienteId;
    if (!id || !settings) return;
    (async () => {
      const { data } = await supabase
        .from("clientes")
        .select("id,nombre,telefono,matricula,vehiculo,km")
        .eq("id", id)
        .maybeSingle();
      if (data) pickCliente(data as ClienteRow);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings]);

  // Búsqueda de clientes guardados — SÓLO usa el buscador dedicado.
  useEffect(() => {
    if (!settings) return;
    const q = buscador.trim();
    if (q.length < 2) {
      setSuggest([]);
      setShowSuggest(false);
      return;
    }
    let cancelled = false;
    const t = setTimeout(async () => {
      // Variante sin separadores para fuzzy match de matrícula/teléfono.
      const qn = q.replace(/[\s\-_.]/g, "");
      const filters = [
        `matricula.ilike.%${q}%`,
        `telefono.ilike.%${q}%`,
        `nombre.ilike.%${q}%`,
      ];
      if (qn && qn !== q) {
        filters.push(`matricula.ilike.%${qn}%`, `telefono.ilike.%${qn}%`);
      }
      const { data } = await supabase
        .from("clientes")
        .select("id,nombre,telefono,matricula,vehiculo,km")
        .eq("taller_id", settings.tallerId)
        .or(filters.join(","))
        .limit(12);
      if (!cancelled) setSuggest((data as ClienteRow[]) || []);
    }, 220);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [buscador, settings]);

  const { data: FAMILIES_DATA = [] } = useFamilias();
  const fam = useMemo(() => findFamilyBySlug(FAMILIES_DATA, categoria), [FAMILIES_DATA, categoria]);
  const sub = useMemo(() => findSubfamilyBySlug(FAMILIES_DATA, categoria, subfamilia), [FAMILIES_DATA, categoria, subfamilia]);

  const confirmUrl = useMemo(() => {
    if (typeof window === "undefined") return "";
    return `${window.location.origin}/confirmar/${confirmToken}`;
  }, [confirmToken]);

  const rejectUrl = useMemo(() => {
    if (typeof window === "undefined") return "";
    return `${window.location.origin}/confirmar/${confirmToken}?action=rechazar`;
  }, [confirmToken]);

  // Subir fotos en cuanto se añaden para que estén listas al enviar.
  // Mantenemos un slot por foto: string = subida, null = pendiente/fallida (ver fotosError).
  useEffect(() => {
    if (!settings) return;
    const pendientes = fotos.length - fotosUrls.length;
    if (pendientes <= 0) return;
    let cancelled = false;
    (async () => {
      setUploadingFotos(true);
      const startIdx = fotosUrls.length;
      // Reservar slots para las nuevas fotos.
      setFotosUrls((prev) => [...prev, ...new Array(pendientes).fill(null) as null[]]);
      setFotosError((prev) => [...prev, ...new Array(pendientes).fill(false) as boolean[]]);
      for (let i = startIdx; i < fotos.length; i++) {
        if (cancelled) return;
        const f = fotos[i];
        const ext = (f.name.split(".").pop() || "jpg").toLowerCase();
        const path = `${settings.tallerId}/${gestionFolder}/${Date.now()}-${i}.${ext}`;
        const { error } = await supabase.storage
          .from("fotos-gestiones")
          .upload(path, f, { contentType: f.type, upsert: false });
        if (cancelled) return;
        if (error) {
          setFotosError((prev) => { const n = [...prev]; n[i] = true; return n; });
          continue;
        }
        const { data } = supabase.storage.from("fotos-gestiones").getPublicUrl(path);
        setFotosUrls((prev) => { const n = [...prev]; n[i] = data.publicUrl; return n; });
        setFotosError((prev) => { const n = [...prev]; n[i] = false; return n; });
      }
      if (!cancelled) setUploadingFotos(false);
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fotos, settings]);

  // URLs subidas con éxito (sin slots nulos).
  const fotosUrlsOk = useMemo(
    () => fotosUrls.filter((u): u is string => typeof u === "string"),
    [fotosUrls],
  );
  const fotosFallidas = fotosError.filter(Boolean).length;
  const fotosPendientes = fotos.length - fotosUrlsOk.length - fotosFallidas;
  const fotosBloquean = uploadingFotos || fotosPendientes > 0 || fotosFallidas > 0;

  // Regenerar mensaje cuando cambian datos (si el usuario no lo ha tocado)
  useEffect(() => {
    if (mensajeTouched || !settings) return;
    setMensaje(
      buildMessage(
        {
          cliente: nombre || "",
          vehiculo: vehiculo || "",
          matricula: matricula || "",
          km: km || "",
          importe,
          taller: settings.tallerName,
          mecanico: settings.mecanico || "",
          confirmUrl,
          rejectUrl,
          fotos: fotosUrlsOk,
        },
        {
          template: sub?.mensaje,
          subfamiliaNombre: sub?.name,
          familiaNombre: fam?.name,
        },
      ),
    );
  }, [
    nombre, vehiculo, matricula, km, sub, fam, importe,
    settings, confirmUrl, rejectUrl, fotosUrlsOk, mensajeTouched,
  ]);

  if (!settings) return null;

  const pickCliente = (c: ClienteRow) => {
    setNombre(c.nombre || "");
    setTelefono(c.telefono || "");
    setMatricula(c.matricula || "");
    setVehiculo(c.vehiculo || "");
    setKm(c.km || "");
    setShowSuggest(false);
    setBuscador("");
    setClienteBloqueado(c);
  };

  const desbloquearCliente = () => {
    setClienteBloqueado(null);
  };

  const onFiles = (files: FileList | null) => {
    if (!files) return;
    const next = [...fotos, ...Array.from(files)].slice(0, 6);
    setFotos(next);
  };

  const removeFoto = (idx: number) => {
    setFotos((prev) => prev.filter((_, j) => j !== idx));
    setFotosUrls((prev) => prev.filter((_, j) => j !== idx));
    setFotosError((prev) => prev.filter((_, j) => j !== idx));
  };

  const upsertCliente = async () => {
    const matN = normalizeMatricula(matricula);
    const telN = normalizeTelefono(telefono);
    if (!matN && !telN) return;

    // Buscar existente por matrícula O teléfono normalizados (evita duplicados).
    const orFilter = [
      matN ? `matricula.eq.${matN}` : null,
      telN ? `telefono.eq.${telN}` : null,
    ].filter(Boolean).join(",");

    const { data: matches } = await supabase
      .from("clientes")
      .select("id,total_gestiones,matricula,telefono")
      .eq("taller_id", settings.tallerId)
      .or(orFilter);

    // Preferir match por matrícula; si no, por teléfono.
    const existing =
      (matN && matches?.find((c) => c.matricula === matN)) ||
      (telN && matches?.find((c) => c.telefono === telN)) ||
      null;

    const payload = {
      taller_id: settings.tallerId,
      taller_nombre: settings.tallerName,
      nombre, telefono: telN, matricula: matN, vehiculo, km,
      ultima_gestion: new Date().toISOString(),
    };
    if (existing?.id) {
      await supabase
        .from("clientes")
        .update({ ...payload, total_gestiones: (existing.total_gestiones || 0) + 1 })
        .eq("id", existing.id);
    } else {
      await supabase.from("clientes").insert({ ...payload, total_gestiones: 1 });
    }
  };

  const saveGestion = async (
    estado: "en-curso" | "enviado",
    opts?: { pedirPena?: boolean; waAbierto?: boolean },
  ) => {
    setBusy(true);
    try {
      const insertPayload = {
        taller_id: settings.tallerId,
        taller_nombre: settings.tallerName,
        cliente_nombre: nombre,
        cliente_telefono: normalizeTelefono(telefono),
        matricula: normalizeMatricula(matricula), vehiculo, km,
        categoria, subfamilia,
        descripcion, piezas, importe,
        estado,
        pedido_pena: opts?.pedirPena ?? pedirPena,
        wa_abierto: opts?.waAbierto ?? false,
        confirm_token: confirmToken,
        fotos: fotosUrlsOk,
      };
      const { data, error } = await supabase
        .from("gestiones")
        .insert(insertPayload)
        .select("id")
        .single();
      if (error || !data) throw error || new Error("insert failed");
      await upsertCliente();
      return data.id as string;
    } finally {
      setBusy(false);
    }
  };

  const onEnviarCliente = async () => {
    if (!telefono.trim()) {
      alert("Falta el teléfono del cliente");
      return;
    }
    if (fotosBloquean) {
      alert(
        fotosFallidas > 0
          ? "Hay fotos que no se han podido subir. Quítalas o vuelve a intentarlo antes de enviar."
          : "Espera a que terminen de subirse las fotos antes de enviar.",
      );
      return;
    }
    const url = buildWAUrl(telefono, mensaje);
    const win = window.open(url, "_blank");
    try {
      await saveGestion("enviado", { waAbierto: true });
      navigate({ to: "/app/historial" });
    } catch (e: any) {
      console.error("saveGestion enviado", e);
      alert("No se pudo guardar la gestión: " + (e?.message || "error desconocido"));
    } finally {
      if (!win) window.location.href = url;
    }
  };

  const onPedirPena = async () => {
    if (fotosBloquean) {
      alert(
        fotosFallidas > 0
          ? "Hay fotos que no se han podido subir. Quítalas o vuelve a intentarlo antes de enviar."
          : "Espera a que terminen de subirse las fotos antes de enviar.",
      );
      return;
    }
    setPedirPena(true);
    const msg = buildPenaMessage({
      taller: settings.tallerName,
      vehiculo, matricula,
      piezas: piezas || (sub ? sub.name : "—"),
      notas: descripcion,
      fotos: fotosUrlsOk,
    });
    const url = buildWAUrl(PENA_PHONE, msg);
    const win = window.open(url, "_blank");
    try {
      await saveGestion("en-curso", { pedirPena: true, waAbierto: true });
      navigate({ to: "/app/historial" });
    } catch (e: any) {
      console.error("saveGestion pena", e);
      alert("No se pudo guardar la gestión: " + (e?.message || "error desconocido"));
    } finally {
      if (!win) window.location.href = url;
    }
  };

  const onGuardar = async () => {
    try {
      await saveGestion("en-curso");
      navigate({ to: "/app" });
    } catch (e: any) {
      console.error("saveGestion guardar", e);
      alert("No se pudo guardar la gestión: " + (e?.message || "error desconocido"));
    }
  };

  const onScanMatricula = async (file: File | null) => {
    if (!file) return;
    setOcrBusy(true);
    try {
      const reader = new FileReader();
      const dataUrl: string = await new Promise((resolve, reject) => {
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(file);
      });
      const res = await runOcr({ data: { imageDataUrl: dataUrl } });
      if (res?.matricula) {
        setMatricula(res.matricula);
      } else {
        alert("No se detectó ninguna matrícula en la imagen.");
      }
    } catch (err) {
      console.error(err);
      alert("Error al escanear la matrícula.");
    } finally {
      setOcrBusy(false);
    }
  };

  const onContinuarPaso1 = async () => {
    // Guardar/actualizar cliente al avanzar para que quede disponible
    // en futuras gestiones aunque la gestión actual no se llegue a enviar.
    try { await upsertCliente(); } catch (e) { console.warn("upsertCliente", e); }
    setStep(2);
  };

  const canNext1 = nombre.trim().length > 1 && (telefono.trim().length > 5 || matricula.trim().length > 2);
  const canNext2 = !!subfamilia;

  const visibleFamilies = showMore ? FAMILIES_DATA : FAMILIES_DATA.slice(0, 7);

  return (
    <div className="space-y-5">
      {/* Header + stepper */}
      <div className="flex items-center justify-between gap-2">
        <Link to="/app" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Cancelar
        </Link>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
            {[1, 2, 3].map((n) => (
              <span
                key={n}
                className={
                  "flex h-6 w-6 items-center justify-center rounded-full " +
                  (step === n
                    ? "bg-primary text-primary-foreground"
                    : n < step
                    ? "bg-success/20 text-success"
                    : "bg-surface-2")
                }
              >
                {n < step ? <Check className="h-3.5 w-3.5" /> : n}
              </span>
            ))}
          </div>
          {step === 1 && (
            <button
              type="button"
              disabled={!canNext1}
              onClick={onContinuarPaso1}
              className={primaryBtn}
            >
              Continuar <ArrowRight className="h-4 w-4" />
            </button>
          )}
          {step === 2 && (
            <button
              type="button"
              disabled={!canNext2}
              onClick={() => setStep(3)}
              className={primaryBtn}
            >
              Continuar <ArrowRight className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      <header>
        <h1 className="text-2xl font-bold tracking-tight">
          {step === 1 ? "Datos del cliente" : step === 2 ? "¿Qué avería?" : "Mensaje al cliente"}
        </h1>
        <p className="text-sm text-muted-foreground">
          {step === 1 ? "Vehículo, matrícula y fotos del problema." :
           step === 2 ? "Elige la categoría y la subfamilia exacta." :
           "Revisa el WhatsApp antes de enviarlo."}
        </p>
      </header>

      {/* STEP 1 */}
      {step === 1 && (
        <section className="space-y-4">
          {/* Buscador encima */}
          {clienteBloqueado ? (
            <div className="flex items-start gap-3 rounded-2xl border border-success/40 bg-success/10 p-3">
              <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-success/20 text-success">
                <Check className="h-3.5 w-3.5" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="text-[11px] font-semibold uppercase tracking-wide text-success">
                  Cliente seleccionado
                </div>
                <div className="truncate text-sm font-semibold text-foreground">
                  {clienteBloqueado.nombre || "(sin nombre)"}
                </div>
                <div className="truncate text-[12px] text-muted-foreground">
                  {[clienteBloqueado.matricula, clienteBloqueado.telefono]
                    .filter(Boolean)
                    .join(" · ") || "—"}
                </div>
              </div>
              <button
                type="button"
                onClick={desbloquearCliente}
                className="shrink-0 rounded-md border border-border-strong bg-surface px-2 py-1 text-[11px] font-medium text-muted-foreground hover:bg-surface-2"
              >
                Cambiar
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    value={buscador}
                    onChange={(e) => { setBuscador(e.target.value); setShowSuggest(true); }}
                    onFocus={() => setShowSuggest(true)}
                    placeholder="Buscar cliente guardado: nombre, teléfono o matrícula…"
                    className={inputCls + " pl-9"}
                  />
                  {buscador && (
                    <button
                      type="button"
                      onClick={() => { setBuscador(""); setSuggest([]); }}
                      className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground hover:bg-surface-3"
                      aria-label="Limpiar búsqueda"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
                <MicButton onResult={(t) => { setBuscador(t); setShowSuggest(true); }} title="Buscar cliente por voz" />
              </div>

              {showSuggest && suggest.length > 0 && (() => {
                const q = buscador.trim().toLowerCase();
                const norm = (s: string) => s.toLowerCase().replace(/[\s\-_.]/g, "");
                const qn = norm(q);
                const score = (c: ClienteRow) => {
                  const m = (c.matricula || "").toLowerCase();
                  const t = (c.telefono || "").toLowerCase();
                  const n = (c.nombre || "").toLowerCase();
                  const mn = norm(m);
                  const tn = norm(t);
                  const nn = norm(n);
                  if (m.startsWith(q)) return 0;
                  if (m.includes(q)) return 1;
                  if (qn && mn.startsWith(qn)) return 2;
                  if (qn && mn.includes(qn)) return 3;
                  if (t.startsWith(q)) return 4;
                  if (t.includes(q)) return 5;
                  if (qn && tn.includes(qn)) return 6;
                  if (n.startsWith(q)) return 7;
                  if (n.includes(q)) return 8;
                  if (qn && nn.includes(qn)) return 9;
                  return 10;
                };
                const ordered = [...suggest].sort((a, b) => score(a) - score(b));
                return (
                  <div className="rounded-xl border border-border-strong bg-surface-2">
                    {ordered.map((c) => {
                      const matches: string[] = [];
                      if (q.length >= 2) {
                        if (c.nombre?.toLowerCase().includes(q)) matches.push("Nombre");
                        if (c.telefono?.toLowerCase().includes(q)) matches.push("Teléfono");
                        if (c.matricula?.toLowerCase().includes(q)) matches.push("Matrícula");
                      }
                      return (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => pickCliente(c)}
                          className="flex w-full items-center justify-between gap-3 border-b border-border px-3 py-2 text-left last:border-b-0 hover:bg-surface-3"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="truncate text-sm font-semibold">{c.nombre || "(sin nombre)"}</div>
                            <div className="truncate text-[12px] text-muted-foreground">
                              {c.matricula} · {c.vehiculo}
                            </div>
                            {matches.length > 0 && (
                              <div className="mt-1 flex flex-wrap gap-1">
                                {matches.map((m) => (
                                  <span
                                    key={m}
                                    className="rounded-full bg-primary/15 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-primary"
                                  >
                                    {m}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                          <span className="shrink-0 text-[11px] text-primary">Usar</span>
                        </button>
                      );
                    })}
                  </div>
                );
              })()}
            </div>
          )}

          {/* Datos cliente */}
          <div className="rounded-2xl border border-border bg-surface p-4 space-y-3">
            <Field label="Nombre del cliente">
              <input
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Ej. Juan García"
                className={inputCls}
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Teléfono">
                <input
                  value={telefono}
                  onChange={(e) => setTelefono(e.target.value)}
                  inputMode="tel"
                  placeholder="6XX XXX XXX"
                  className={inputCls}
                />
              </Field>
              <Field label="Matrícula">
                <div className="flex gap-2">
                  <input
                    value={matricula}
                    onChange={(e) => setMatricula(e.target.value.toUpperCase())}
                    placeholder="1234 ABC"
                    className={inputCls + " font-mono uppercase"}
                  />
                  <label
                    title="Escanear matrícula con la cámara"
                    className={
                      "inline-flex shrink-0 cursor-pointer items-center justify-center rounded-xl border border-border-strong bg-surface-2 px-3 text-muted-foreground hover:bg-surface-3 " +
                      (ocrBusy ? "pointer-events-none opacity-60" : "")
                    }
                  >
                    {ocrBusy ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <ScanLine className="h-4 w-4" />
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      className="hidden"
                      onChange={(e) => onScanMatricula(e.target.files?.[0] ?? null)}
                    />
                  </label>
                </div>
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Vehículo">
                <input
                  value={vehiculo}
                  onChange={(e) => setVehiculo(e.target.value)}
                  placeholder="Marca y modelo"
                  className={inputCls}
                />
              </Field>
              <Field label="Km">
                <input
                  value={km}
                  onChange={(e) => setKm(e.target.value)}
                  inputMode="numeric"
                  placeholder="120000"
                  className={inputCls}
                />
              </Field>
            </div>
          </div>

          {/* Fotos */}
          <div className="rounded-2xl border border-border bg-surface p-4">
            <div className="mb-2 flex items-center justify-between">
              <div className="text-sm font-semibold">Fotos del problema</div>
              {uploadingFotos ? (
                <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                  <Loader2 className="h-3 w-3 animate-spin" /> Subiendo…
                </span>
              ) : fotosFallidas > 0 ? (
                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-destructive">
                  <X className="h-3 w-3" /> {fotosFallidas} fallida{fotosFallidas > 1 ? "s" : ""}
                </span>
              ) : null}
            </div>

            {fotos.length > 0 && (
              <div className="mb-3 grid grid-cols-3 gap-2">
                {fotos.map((f, i) => {
                  const failed = fotosError[i];
                  const uploaded = typeof fotosUrls[i] === "string";
                  return (
                    <div
                      key={i}
                      className={
                        "relative aspect-square overflow-hidden rounded-xl bg-surface-2 " +
                        (failed ? "ring-2 ring-destructive" : "")
                      }
                    >
                      <img src={URL.createObjectURL(f)} alt="" className="h-full w-full object-cover" />
                      {!uploaded && !failed && (
                        <div className="absolute inset-0 flex items-center justify-center bg-background/40">
                          <Loader2 className="h-4 w-4 animate-spin text-foreground" />
                        </div>
                      )}
                      {failed && (
                        <div className="absolute inset-x-0 bottom-0 bg-destructive/90 px-1 py-0.5 text-center text-[10px] font-semibold text-destructive-foreground">
                          Error
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={() => removeFoto(i)}
                        className="absolute right-1 top-1 rounded-full bg-background/80 p-1 text-foreground"
                        aria-label="Quitar"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            {fotos.length < 6 && (
              <div className="grid grid-cols-2 gap-2">
                <label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-border-strong bg-surface-2 px-3 py-2.5 text-sm font-medium text-foreground hover:bg-surface-3">
                  <ImageIcon className="h-4 w-4" />
                  Galería
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={(e) => { onFiles(e.target.files); e.currentTarget.value = ""; }}
                  />
                </label>
                <label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-border-strong bg-surface-2 px-3 py-2.5 text-sm font-medium text-foreground hover:bg-surface-3">
                  <Camera className="h-4 w-4" />
                  Cámara
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={(e) => { onFiles(e.target.files); e.currentTarget.value = ""; }}
                  />
                </label>
              </div>
            )}
          </div>

        </section>
      )}

      {/* STEP 2 */}
      {step === 2 && (
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={averiaQuery}
                onChange={(e) => setAveriaQuery(e.target.value)}
                placeholder="Buscar avería: frenos, embrague, aceite…"
                className={inputCls + " pl-9"}
              />
              {averiaQuery && (
                <button
                  type="button"
                  onClick={() => setAveriaQuery("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground hover:bg-surface-3"
                  aria-label="Limpiar"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
            <MicButton onResult={(t) => setAveriaQuery(t)} title="Buscar avería por voz" />
          </div>

          {averiaQuery.trim().length >= 2 ? (
            (() => {
              const qq = averiaQuery.trim().toLowerCase();
              const results: Array<{ fam: typeof FAMILIES_DATA[number]; sub: typeof FAMILIES_DATA[number]["subs"][number] }> = [];
              for (const f of FAMILIES_DATA) {
                for (const s of f.subs) {
                  if (
                    s.name.toLowerCase().includes(qq) ||
                    f.name.toLowerCase().includes(qq)
                  ) results.push({ fam: f, sub: s });
                }
              }
              if (results.length === 0) {
                return (
                  <div className="rounded-2xl border border-border bg-surface p-6 text-center text-sm text-muted-foreground">
                    Sin resultados para “{averiaQuery}”.
                  </div>
                );
              }
              return (
                <div className="rounded-2xl border border-border bg-surface p-2">
                  {results.slice(0, 20).map(({ fam: f, sub: s }) => {
                    const active = categoria === f.slug && subfamilia === s.slug;
                    return (
                      <button
                        key={f.slug + "/" + s.slug}
                        type="button"
                        onClick={() => { setCategoria(f.slug); setSubfamilia(s.slug); setAveriaQuery(""); }}
                        className={
                          "flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition " +
                          (active ? "bg-primary text-primary-foreground" : "hover:bg-surface-2")
                        }
                      >
                        <span className="min-w-0 flex-1">
                          <span className="mr-2">{f.icon}</span>
                          <span className="font-medium">{s.name}</span>
                          <span className="ml-2 text-[11px] text-muted-foreground">{f.name}</span>
                        </span>
                        {active && <Check className="h-4 w-4" />}
                      </button>
                    );
                  })}
                </div>
              );
            })()
          ) : (
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
            {visibleFamilies.map((f) => {
              const active = categoria === f.slug;
              return (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => { setCategoria(f.slug); setSubfamilia(null); }}
                  className={
                    "flex flex-col items-center gap-2 rounded-2xl border p-4 text-center transition " +
                    (active
                      ? "border-primary bg-primary/10 text-foreground"
                      : "border-border bg-surface hover:bg-surface-2")
                  }
                >
                  <span className="text-2xl">{f.icon}</span>
                  <span className="text-[12px] font-semibold leading-tight">{f.name}</span>
                </button>
              );
            })}
          </div>
          )}

          {!showMore && (
            <button
              type="button"
              onClick={() => setShowMore(true)}
              className="w-full rounded-xl border border-dashed border-border-strong py-2.5 text-sm text-muted-foreground hover:bg-surface-2"
            >
              Ver más categorías…
            </button>
          )}

          {fam && (
            <div className="rounded-2xl border border-border bg-surface p-3">
              <div className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                {fam.name}
              </div>
              <div className="grid gap-1.5">
                {fam.subs.map((s) => {
                  const active = subfamilia === s.slug;
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setSubfamilia(s.slug)}
                      className={
                        "flex items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition " +
                        (active
                          ? "bg-primary text-primary-foreground"
                          : "bg-surface-2 hover:bg-surface-3")
                      }
                    >
                      <span className="font-medium">{s.name}</span>
                      {active && <Check className="h-4 w-4" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <BottomBar>
            <button type="button" onClick={() => setStep(1)} className={ghostBtn}>
              <ArrowLeft className="h-4 w-4" /> Atrás
            </button>
          </BottomBar>
        </section>
      )}

      {/* STEP 3 */}
      {step === 3 && (
        <section className="space-y-4">
          <div className="rounded-2xl border border-border bg-surface p-4 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Importe (€)">
                <input
                  value={importe}
                  onChange={(e) => setImporte(e.target.value)}
                  inputMode="decimal"
                  placeholder="0,00"
                  className={inputCls + " font-mono"}
                />
              </Field>
              <Field label="Avería">
                <div className="rounded-xl bg-surface-2 px-3 py-2 text-sm">
                  {sub?.name || "—"}
                </div>
              </Field>
            </div>
            <Field label="Piezas necesarias (para Peña)">
              <textarea
                value={piezas}
                onChange={(e) => setPiezas(e.target.value)}
                rows={2}
                placeholder="Ej. 2x pastillas delanteras OEM"
                className={inputCls}
              />
            </Field>
            <Field label="Notas internas (opcional)">
              <textarea
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                rows={2}
                className={inputCls}
              />
            </Field>
          </div>

          <div className="rounded-2xl border border-border bg-surface p-4">
            <div className="mb-2 flex items-center justify-between gap-2">
              <div className="text-sm font-semibold">Mensaje de WhatsApp</div>
              <div className="flex items-center gap-2">
                {mensajeTouched && (
                  <button
                    type="button"
                    onClick={() => setMensajeTouched(false)}
                    className="text-[11px] text-primary hover:underline"
                  >
                    Regenerar
                  </button>
                )}
                <MicButton
                  size="sm"
                  title="Dictar mensaje (añade al final)"
                  onResult={(t) => {
                    setMensaje((prev) => (prev ? prev.trimEnd() + " " + t : t));
                    setMensajeTouched(true);
                  }}
                />
                <button
                  type="button"
                  onClick={() => { setMensaje(""); setMensajeTouched(true); }}
                  className="text-[11px] text-muted-foreground hover:text-foreground hover:underline"
                  title="Borrar mensaje"
                >
                  Borrar
                </button>
              </div>
            </div>
            <textarea
              value={mensaje}
              onChange={(e) => { setMensaje(e.target.value); setMensajeTouched(true); }}
              rows={10}
              className={inputCls + " font-mono text-[13px] leading-relaxed"}
            />
            <p className="mt-2 text-[11px] text-muted-foreground">
              Puedes dictar con el micrófono y luego editar el texto antes de enviar.
            </p>
          </div>

          <BottomBar>
            <button type="button" onClick={() => setStep(2)} className={ghostBtn} disabled={busy}>
              <ArrowLeft className="h-4 w-4" /> Atrás
            </button>
            <div className="flex flex-1 flex-wrap justify-end gap-2">
              <button type="button" onClick={onGuardar} disabled={busy} className={ghostBtn}>
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Guardar
              </button>
              <button
                type="button"
                onClick={onPedirPena}
                disabled={busy || fotosBloquean}
                className={accentBtn}
                title={fotosBloquean ? "Espera a que terminen de subirse las fotos" : undefined}
              >
                <Truck className="h-4 w-4" />
                Pedir a Peña
              </button>
              <button
                type="button"
                onClick={onEnviarCliente}
                disabled={busy || fotosBloquean}
                className={primaryBtn}
                title={fotosBloquean ? "Espera a que terminen de subirse las fotos" : undefined}
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                Enviar al cliente
              </button>
            </div>
          </BottomBar>
          <div className="pb-2 text-center text-[11px] text-muted-foreground">
            {fotosBloquean ? (
              <span className="text-warning">
                {fotosFallidas > 0
                  ? `Hay ${fotosFallidas} foto${fotosFallidas > 1 ? "s" : ""} con error. Quítalas para poder enviar.`
                  : "Subiendo fotos… espera unos segundos para enviar."}
              </span>
            ) : (
              <>
                <MessageCircle className="mr-1 inline h-3 w-3" />
                Se abrirá WhatsApp en una pestaña nueva.
              </>
            )}
          </div>
        </section>
      )}
    </div>
  );
}

/* ---------- helpers UI ---------- */

const inputCls =
  "w-full rounded-xl bg-surface-2 px-3 py-2.5 text-sm outline-none ring-0 placeholder:text-muted-foreground/60 focus:bg-surface-3";

const primaryBtn =
  "inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition active:scale-95 disabled:opacity-50";

const accentBtn =
  "inline-flex items-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-accent-foreground transition active:scale-95 disabled:opacity-50";

const ghostBtn =
  "inline-flex items-center gap-2 rounded-xl border border-border-strong bg-surface px-4 py-2.5 text-sm font-semibold text-foreground hover:bg-surface-2 disabled:opacity-50";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1">
      <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}

function BottomBar({ children }: { children: React.ReactNode }) {
  return (
    <div className="sticky bottom-[78px] z-20 flex items-center gap-2 rounded-2xl border border-border bg-surface/95 p-2 backdrop-blur-xl">
      {children}
    </div>
  );
}
