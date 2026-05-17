import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Camera,
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
import { CATS_PRIMARY, FAMILIES, findFamily, findSubfamily } from "@/lib/mptc/families";
import { buildMessage, buildPenaMessage } from "@/lib/mptc/messages";
import { buildWAUrl, generateToken } from "@/lib/mptc/wa";
import { ocrMatricula } from "@/lib/mptc/ocr.functions";

export const Route = createFileRoute("/app/nueva")({
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
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [step, setStep] = useState<Step>(1);

  // Step 1 — cliente
  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");
  const [matricula, setMatricula] = useState("");
  const [vehiculo, setVehiculo] = useState("");
  const [km, setKm] = useState("");
  const [fotos, setFotos] = useState<File[]>([]);
  const [suggest, setSuggest] = useState<ClienteRow[]>([]);
  const [showSuggest, setShowSuggest] = useState(false);
  const [buscador, setBuscador] = useState("");

  // Step 2 — avería
  const [categoria, setCategoria] = useState<string | null>(null);
  const [subfamilia, setSubfamilia] = useState<string | null>(null);
  const [showMore, setShowMore] = useState(false);

  // Step 3 — mensaje
  const [importe, setImporte] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [piezas, setPiezas] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [mensajeTouched, setMensajeTouched] = useState(false);
  const [confirmToken] = useState(() => generateToken());
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
      const { data } = await supabase
        .from("clientes")
        .select("id,nombre,telefono,matricula,vehiculo,km")
        .eq("taller_id", settings.tallerId)
        .or(`matricula.ilike.%${q}%,telefono.ilike.%${q}%,nombre.ilike.%${q}%`)
        .limit(8);
      if (!cancelled) setSuggest((data as ClienteRow[]) || []);
    }, 220);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [buscador, settings]);

  const fam = useMemo(() => findFamily(categoria), [categoria]);
  const sub = useMemo(() => findSubfamily(categoria, subfamilia), [categoria, subfamilia]);

  const confirmUrl = useMemo(() => {
    if (typeof window === "undefined") return "";
    return `${window.location.origin}/confirmar/${confirmToken}`;
  }, [confirmToken]);

  // Regenerar mensaje cuando cambian datos (si el usuario no lo ha tocado)
  useEffect(() => {
    if (mensajeTouched || !settings) return;
    setMensaje(
      buildMessage({
        cliente: nombre || "",
        vehiculo: vehiculo || "",
        matricula: matricula || "",
        km: km || "",
        categoria,
        subfamilia,
        importe,
        taller: settings.tallerName,
        mecanico: settings.mecanico || "",
        confirmUrl,
      }),
    );
  }, [
    nombre, vehiculo, matricula, km, categoria, subfamilia, importe,
    settings, confirmUrl, mensajeTouched,
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
  };

  const onFiles = (files: FileList | null) => {
    if (!files) return;
    const next = [...fotos, ...Array.from(files)].slice(0, 6);
    setFotos(next);
  };

  const uploadFotos = async (gestionId: string): Promise<string[]> => {
    const urls: string[] = [];
    for (let i = 0; i < fotos.length; i++) {
      const f = fotos[i];
      const ext = f.name.split(".").pop() || "jpg";
      const path = `${settings.tallerId}/${gestionId}/${Date.now()}-${i}.${ext}`;
      const { error } = await supabase.storage
        .from("fotos-gestiones")
        .upload(path, f, { contentType: f.type, upsert: false });
      if (error) continue;
      const { data } = supabase.storage.from("fotos-gestiones").getPublicUrl(path);
      urls.push(data.publicUrl);
    }
    return urls;
  };

  const upsertCliente = async () => {
    if (!matricula.trim() && !telefono.trim()) return;
    const { data: existing } = await supabase
      .from("clientes")
      .select("id,total_gestiones")
      .eq("taller_id", settings.tallerId)
      .eq("matricula", matricula.trim() || "__none__")
      .maybeSingle();
    const payload = {
      taller_id: settings.tallerId,
      taller_nombre: settings.tallerName,
      nombre, telefono, matricula, vehiculo, km,
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

  const saveGestion = async (estado: "en-curso" | "enviado") => {
    setBusy(true);
    try {
      const insertPayload = {
        taller_id: settings.tallerId,
        taller_nombre: settings.tallerName,
        cliente_nombre: nombre,
        cliente_telefono: telefono,
        matricula, vehiculo, km,
        categoria, subfamilia,
        descripcion, piezas, importe,
        estado,
        pedido_pena: pedirPena,
        confirm_token: confirmToken,
        fotos: [] as string[],
      };
      const { data, error } = await supabase
        .from("gestiones")
        .insert(insertPayload)
        .select("id")
        .single();
      if (error || !data) throw error || new Error("insert failed");

      if (fotos.length) {
        const urls = await uploadFotos(data.id);
        if (urls.length) {
          await supabase.from("gestiones").update({ fotos: urls }).eq("id", data.id);
        }
      }
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
    // Abrir la ventana SINCRÓNICAMENTE dentro del gesto del usuario para evitar
    // que el navegador bloquee el popup tras el await.
    const win = window.open("about:blank", "_blank", "noopener,noreferrer");
    const url = buildWAUrl(telefono, mensaje);
    try {
      await saveGestion("enviado");
    } finally {
      if (win) win.location.href = url;
      else window.location.href = url;
      navigate({ to: "/app" });
    }
  };

  const onPedirPena = async () => {
    setPedirPena(true);
    const msg = buildPenaMessage({
      taller: settings.tallerName,
      vehiculo, matricula,
      piezas: piezas || (sub ? sub.name : "—"),
      notas: descripcion,
    });
    const url = buildWAUrl(PENA_PHONE, msg);
    const win = window.open("about:blank", "_blank", "noopener,noreferrer");
    try {
      await saveGestion("en-curso");
    } finally {
      if (win) win.location.href = url;
      else window.location.href = url;
      navigate({ to: "/app" });
    }
  };

  const onGuardar = async () => {
    await saveGestion("en-curso");
    navigate({ to: "/app" });
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

  const visibleFamilies = showMore
    ? FAMILIES
    : FAMILIES.filter((f) => CATS_PRIMARY.includes(f.id));

  return (
    <div className="space-y-5">
      {/* Header + stepper */}
      <div className="flex items-center justify-between">
        <Link to="/app" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Cancelar
        </Link>
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
          <div className="rounded-2xl border border-border bg-surface p-4 space-y-3">
            <Field label="Buscar cliente guardado">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  value={buscador}
                  onChange={(e) => { setBuscador(e.target.value); setShowSuggest(true); }}
                  onFocus={() => setShowSuggest(true)}
                  placeholder="Nombre, teléfono o matrícula…"
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
            </Field>
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

            {showSuggest && suggest.length > 0 && (() => {
              const q = buscador.trim().toLowerCase();
              // Puntuación: matrícula > teléfono > nombre.
              // Dentro de cada campo: empieza-por gana sobre contiene.
              const score = (c: ClienteRow) => {
                const m = (c.matricula || "").toLowerCase();
                const t = (c.telefono || "").toLowerCase();
                const n = (c.nombre || "").toLowerCase();
                if (m.startsWith(q)) return 0;
                if (m.includes(q)) return 1;
                if (t.startsWith(q)) return 2;
                if (t.includes(q)) return 3;
                if (n.startsWith(q)) return 4;
                if (n.includes(q)) return 5;
                return 6;
              };
              const ordered = [...suggest].sort((a, b) => score(a) - score(b));
              return (
                <div className="rounded-xl border border-border-strong bg-surface-2">
                  {ordered.map((c) => {
                  const q = buscador.trim().toLowerCase();
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
            <div className="mb-2 text-sm font-semibold">Fotos del problema</div>
            <div className="grid grid-cols-3 gap-2">
              {fotos.map((f, i) => (
                <div key={i} className="relative aspect-square overflow-hidden rounded-xl bg-surface-2">
                  <img src={URL.createObjectURL(f)} alt="" className="h-full w-full object-cover" />
                  <button
                    type="button"
                    onClick={() => setFotos(fotos.filter((_, j) => j !== i))}
                    className="absolute right-1 top-1 rounded-full bg-background/80 p-1 text-foreground"
                    aria-label="Quitar"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
              {fotos.length < 6 && (
                <label className="flex aspect-square cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-border-strong text-muted-foreground hover:bg-surface-2">
                  <Camera className="h-6 w-6" />
                  <span className="text-[11px]">Añadir</span>
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    multiple
                    className="hidden"
                    onChange={(e) => onFiles(e.target.files)}
                  />
                </label>
              )}
            </div>
          </div>

          <BottomBar>
            <button
              type="button"
              disabled={!canNext1}
              onClick={onContinuarPaso1}
              className={primaryBtn}
            >
              Continuar <ArrowRight className="h-4 w-4" />
            </button>
          </BottomBar>
        </section>
      )}

      {/* STEP 2 */}
      {step === 2 && (
        <section className="space-y-4">
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
            {visibleFamilies.map((f) => {
              const active = categoria === f.id;
              return (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => { setCategoria(f.id); setSubfamilia(null); }}
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
                  const active = subfamilia === s.id;
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setSubfamilia(s.id)}
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
            <button
              type="button"
              disabled={!canNext2}
              onClick={() => setStep(3)}
              className={primaryBtn}
            >
              Continuar <ArrowRight className="h-4 w-4" />
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
            <div className="mb-2 flex items-center justify-between">
              <div className="text-sm font-semibold">Mensaje de WhatsApp</div>
              {mensajeTouched && (
                <button
                  type="button"
                  onClick={() => setMensajeTouched(false)}
                  className="text-[11px] text-primary hover:underline"
                >
                  Regenerar
                </button>
              )}
            </div>
            <textarea
              value={mensaje}
              onChange={(e) => { setMensaje(e.target.value); setMensajeTouched(true); }}
              rows={10}
              className={inputCls + " font-mono text-[13px] leading-relaxed"}
            />
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
              <button type="button" onClick={onPedirPena} disabled={busy} className={accentBtn}>
                <Truck className="h-4 w-4" />
                Pedir a Peña
              </button>
              <button type="button" onClick={onEnviarCliente} disabled={busy} className={primaryBtn}>
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                Enviar al cliente
              </button>
            </div>
          </BottomBar>
          <div className="pb-2 text-center text-[11px] text-muted-foreground">
            <MessageCircle className="mr-1 inline h-3 w-3" />
            Se abrirá WhatsApp en una pestaña nueva.
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
