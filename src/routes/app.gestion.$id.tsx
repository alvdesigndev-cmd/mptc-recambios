import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeft, Car, User, Wrench, Package, MessageCircle, Truck, Loader2, Phone, Pencil, Check, X, Search, History, Send, FileDown, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useSettings } from "@/lib/mptc/useSettings";
import { estadoBadge, type Gestion } from "@/lib/mptc/types";
import { FASES, faseDeGestion } from "@/lib/mptc/fases";
import { resolveFotoUrls } from "@/lib/mptc/fotos";
import { PhotoLightbox } from "@/components/mptc/PhotoLightbox";
import { GestionModal } from "@/components/mptc/GestionModal";
import { GPCatSearchModal, formatPiezaLinea } from "@/components/mptc/GPCatSearchModal";
import { buildWAUrl } from "@/lib/mptc/wa";
import { buildMessage } from "@/lib/mptc/messages";
import { useFamilias } from "@/lib/mptc/useFamilias";
import { findFamilyBySlug, findSubfamilyBySlug } from "@/lib/mptc/families";
import { generarYGuardarPresupuesto, getPresupuestoUrl } from "@/lib/mptc/presupuesto-storage";
import { downloadGestionPdf } from "@/lib/mptc/gestion-pdf";
import { logEvento, listEventos, EVENTO_LABEL, EVENTO_ICON, formatEventoFecha, estadoEnvioPdf, estadoEventoPdf, ENVIO_PDF_LABEL, ENVIO_PDF_CLASS, type GestionEvento } from "@/lib/mptc/eventos";



export const Route = createFileRoute("/app/gestion/$id")({
  head: () => ({
    meta: [
      { title: "Detalle de gestión — MPTC Recambios" },
      { name: "description", content: "Ficha completa de la gestión: vehículo, cliente, avería, presupuesto de Peña, plantilla enviada y estado del pedido." },
      { property: "og:title", content: "Detalle de gestión — MPTC Recambios" },
      { property: "og:description", content: "Ficha completa de la gestión: vehículo, cliente, avería, presupuesto y estado del pedido." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: GestionDetallePage,
});

const fmtFecha = (iso?: string | null) =>
  iso
    ? new Date(iso).toLocaleString("es-ES", {
        day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
      })
    : "—";

function GestionDetallePage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const settings = useSettings({ requireTaller: true });
  const [g, setG] = useState<Gestion | null>(null);
  const [loading, setLoading] = useState(true);
  const [fotos, setFotos] = useState<string[]>([]);
  const [lightbox, setLightbox] = useState<number | null>(null);
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [gpcat, setGpcat] = useState(false);
  const [eventos, setEventos] = useState<GestionEvento[]>([]);
  const [enviandoWA, setEnviandoWA] = useState(false);
  const [enviandoPdf, setEnviandoPdf] = useState(false);
  const [reenviando, setReenviando] = useState(false);

  const { data: FAMILIES_DATA = [] } = useFamilias();
  const fam = useMemo(() => findFamilyBySlug(FAMILIES_DATA, g?.categoria ?? null), [FAMILIES_DATA, g?.categoria]);
  const sub = useMemo(
    () => findSubfamilyBySlug(FAMILIES_DATA, g?.categoria ?? null, g?.subfamilia ?? null),
    [FAMILIES_DATA, g?.categoria, g?.subfamilia],
  );


  const load = useCallback(async () => {
    const { data } = await supabase.from("gestiones").select("*").eq("id", id).maybeSingle();
    setG((data as Gestion) || null);
    setLoading(false);
    try {
      setEventos(await listEventos(id));
    } catch {
      setEventos([]);
    }
  }, [id]);

  const startEdit = (section: string, fields: string[]) => {
    const d: Record<string, string> = {};
    for (const f of fields) d[f] = ((g as unknown as Record<string, string | null>)?.[f] ?? "") || "";
    setDraft(d);
    setEditing(section);
  };

  const setField = (k: string, v: string) => setDraft((p) => ({ ...p, [k]: v }));

  const saveEdit = async () => {
    if (!g) return;
    setSaving(true);
    const payload: Record<string, string | null> = {};
    for (const [k, v] of Object.entries(draft)) payload[k] = v.trim() === "" ? null : v.trim();
    const { error } = await supabase
      .from("gestiones")
      .update(payload as never)
      .eq("id", g.id);
    setSaving(false);
    if (error) { toast.error("No se pudo guardar: " + error.message); return; }
    toast.success("Cambios guardados");
    setEditing(null);
    setDraft({});
    load();
  };

  const addPiezas = (piezas: Parameters<typeof formatPiezaLinea>[0][]) => {
    const lineas = piezas.map(formatPiezaLinea);
    const total = piezas.reduce((s, p) => s + p.precio * p.cantidad, 0);
    setDraft((prev) => {
      const actuales = (prev["piezas"] ?? g?.piezas ?? "").trim();
      const importePrev = Number(String(prev["importe"] ?? g?.importe ?? "").replace(",", ".")) || 0;
      return {
        ...prev,
        piezas: actuales ? actuales + "\n" + lineas.join("\n") : lineas.join("\n"),
        importe: (importePrev + total).toFixed(2),
      };
    });
    setEditing("piezas");
    setGpcat(false);
  };


  // Envío directo por WhatsApp con la plantilla y el precio finales guardados.
  const enviarWhatsApp = async () => {
    if (!g) return;
    const tel = (g.cliente_telefono || "").trim();
    if (!tel) { toast.error("Falta el teléfono del cliente"); return; }
    const msg = (g.mensaje || "").trim();
    if (!msg) { toast.error("No hay plantilla guardada. Edita el mensaje antes de enviar."); return; }

    const url = buildWAUrl(tel, msg);
    const win = window.open(url, "_blank");
    setEnviandoWA(true);
    try {
      const yaEnviado = g.wa_abierto || fase.index >= 1;
      const nuevoEstado = g.estado === "en-curso" || g.estado === "borrador" ? "enviado" : g.estado;
      await supabase
        .from("gestiones")
        .update({ wa_abierto: true, estado: nuevoEstado })
        .eq("id", g.id);
      await logEvento({
        gestionId: g.id,
        tallerId: g.taller_id,
        tipo: yaEnviado ? "plantilla_reenviada" : "plantilla_enviada",
        actor: settings?.mecanico || settings?.tallerName || "taller",
        detalle: `Plantilla enviada por WhatsApp a ${tel} desde el detalle`,
        metadata: { importe: g.importe, piezas: g.piezas, telefono: tel },
      });
      toast.success(yaEnviado ? "Plantilla reenviada por WhatsApp" : "Plantilla enviada por WhatsApp");
      load();
    } catch (e: any) {
      toast.error("No se pudo registrar el envío: " + (e?.message || "error"));
    } finally {
      setEnviandoWA(false);
      if (!win) window.location.href = url;
    }
  };

  // Reenvía la plantilla al cliente REGENERÁNDOLA con el precio final y las
  // piezas actuales del paso 4 (por si se editaron después del primer envío).
  const reenviarPlantilla = async () => {
    if (!g) return;
    const tel = (g.cliente_telefono || "").trim();
    if (!tel) { toast.error("Falta el teléfono del cliente"); return; }
    if (!g.importe) { toast.error("Falta el importe del paso 4"); return; }

    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const token = g.confirm_token || "";
    const msg = buildMessage(
      {
        cliente: g.cliente_nombre || "",
        vehiculo: g.vehiculo || "",
        matricula: g.matricula || "",
        km: g.km ? String(g.km) : "",
        importe: String(g.importe),
        taller: settings?.tallerName || "",
        mecanico: settings?.mecanico || "",
        confirmUrl: token ? `${origin}/confirmar/${token}` : "",
        rejectUrl: token ? `${origin}/confirmar/${token}?action=rechazar` : undefined,
        fotos,
        piezas: g.piezas || "",
      },
      { template: sub?.mensaje, subfamiliaNombre: sub?.name, familiaNombre: fam?.name },
    );

    const url = buildWAUrl(tel, msg);
    const win = window.open(url, "_blank");
    setReenviando(true);
    try {
      const nuevoEstado = g.estado === "en-curso" || g.estado === "borrador" ? "enviado" : g.estado;
      await supabase
        .from("gestiones")
        .update({ mensaje: msg, wa_abierto: true, estado: nuevoEstado })
        .eq("id", g.id);
      await logEvento({
        gestionId: g.id,
        tallerId: g.taller_id,
        tipo: "plantilla_reenviada",
        actor: settings?.mecanico || settings?.tallerName || "taller",
        detalle: `Plantilla reenviada a ${tel} con el precio final ${g.importe} €`,
        metadata: { importe: g.importe, piezas: g.piezas, telefono: tel, regenerada: true },
      });
      toast.success("Plantilla reenviada con el precio final");
      load();
    } catch (e: any) {
      toast.error("No se pudo registrar el reenvío: " + (e?.message || "error"));
    } finally {
      setReenviando(false);
      if (!win) window.location.href = url;
    }
  };



  useEffect(() => { if (settings) load(); }, [settings, load]);

  useEffect(() => {
    let alive = true;
    const fs = g?.fotos || [];
    if (!fs.length) { setFotos([]); return; }
    resolveFotoUrls(fs).then((urls) => { if (alive) setFotos(urls); });
    return () => { alive = false; };
  }, [g?.id, g?.fotos]);

  if (!settings) return null;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  }

  if (!g) {
    return (
      <div className="space-y-4">
        <BackLink />
        <div className="rounded-2xl border border-border bg-surface p-8 text-center text-sm text-muted-foreground">
          No se ha encontrado esta gestión.
        </div>
      </div>
    );
  }

  const meta = estadoBadge(g.estado);
  const fase = faseDeGestion(g);
  const descargarPdf = async () => {
    if (!g) return;
    try {
      const res = await generarYGuardarPresupuesto(g, {
        taller: settings?.tallerName,
        mecanico: settings?.mecanico,
      });
      toast.success(
        res.path
          ? "Presupuesto PDF descargado y guardado en el historial"
          : "Presupuesto PDF descargado",
      );
      await load();
    } catch {
      toast.error("No se pudo generar el PDF");
    }
  };

  // Envía el PDF de ESTA gestión por WhatsApp: lo archiva en Storage y manda
  // un enlace firmado al PDF concreto (WhatsApp Web no permite adjuntar ficheros
  // por URL, así que el enlace es la vía fiable en móvil y escritorio).
  const enviarPdfWhatsApp = async () => {
    if (!g) return;
    if (!(g.cliente_telefono || "").trim()) { toast.error("Falta el teléfono del cliente"); return; }
    setEnviandoPdf(true);
    try {
      const res = await enviarPresupuestoPdfWhatsApp(g, {
        taller: settings?.tallerName,
        mecanico: settings?.mecanico,
      });
      if (res.estado === "enviado") toast.success("Presupuesto PDF enviado por WhatsApp");
      else toast.warning("WhatsApp no se abrió: envío pendiente, puedes reintentarlo");
      await load();
      if (res.estado === "pendiente") window.location.href = res.url;
    } catch (e: any) {
      toast.error("No se pudo enviar el PDF: " + (e?.message || "error"));
      await load();
    } finally {
      setEnviandoPdf(false);
    }
  };



  const exportarGestionPdf = () => {
    if (!g) return;
    try {
      const { filename } = downloadGestionPdf(g, {
        taller: settings?.tallerName ?? g.taller_nombre,
        mecanico: settings?.mecanico ?? null,
        categoriaLabel: fam?.name ?? g.categoria,
        subfamiliaLabel: sub?.name ?? g.subfamilia,
        eventos,
      });
      toast.success("Informe descargado: " + filename);
    } catch (e: any) {
      toast.error("No se pudo generar el PDF: " + (e?.message || "error"));
    }
  };

  const reabrirPdf = async (path: string) => {
    const url = await getPresupuestoUrl(path);
    if (!url) {
      toast.error("No se pudo recuperar el PDF guardado");
      return;
    }
    window.open(url, "_blank");
  };

  const envioPdf = estadoEnvioPdf(eventos);

  const piezasList = (g.piezas || "")
    .split("\n")
    .map((l) => l.replace(/^[-•·]\s*/, "").trim())
    .filter(Boolean);

  return (
    <div className="space-y-4 pb-4">
      <BackLink />

      <header className="rounded-2xl border border-border bg-surface p-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <h1 className="font-mono text-2xl font-bold tracking-tight">{g.matricula || "—"}</h1>
            <p className="text-sm text-muted-foreground">{g.vehiculo || "Vehículo sin datos"}</p>
          </div>
          <span className={"rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase " + meta.cls}>
            {meta.label}
          </span>
        </div>

        <div className="mt-3">
          <div className="flex items-center gap-1">
            {FASES.map((f, i) => {
              const done = i <= fase.index;
              const cls = !done
                ? "bg-surface-3"
                : fase.rechazado && i >= 1
                  ? "bg-destructive"
                  : i === 3
                    ? "bg-success"
                    : "bg-primary";
              return <span key={f.key} className={"h-1.5 flex-1 rounded-full " + cls} />;
            })}
          </div>
          <div className="mt-2 grid grid-cols-2 gap-1 text-[11px] sm:grid-cols-4">
            {FASES.map((f, i) => (
              <span
                key={f.key}
                className={i <= fase.index ? "font-semibold text-foreground" : "text-muted-foreground"}
              >
                {i + 1}. {f.short}
              </span>
            ))}
          </div>
          <div className="mt-2 text-[12px] text-muted-foreground">
            {fase.rechazado ? "Rechazado por el cliente" : `Fase actual: ${fase.label}`} · Creada el {fmtFecha(g.created_at)}
          </div>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setModal(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground active:scale-95"
          >
            <Wrench className="h-4 w-4" /> Gestionar
          </button>
          {g.estado === "borrador" && (
            <button
              type="button"
              onClick={() => navigate({ to: "/app/nueva", search: { resume: g.id } })}
              className="inline-flex items-center gap-2 rounded-xl border border-border-strong bg-surface px-3 py-2 text-sm font-semibold"
            >
              Reanudar borrador
            </button>
          )}
          <button
            type="button"
            onClick={exportarGestionPdf}
            className="inline-flex items-center gap-2 rounded-xl border border-border-strong bg-surface px-3 py-2 text-sm font-semibold"
          >
            <FileDown className="h-4 w-4" /> Exportar gestión (PDF)
          </button>
          {g.cliente_telefono && (
            <a
              href={`tel:${g.cliente_telefono}`}
              className="inline-flex items-center gap-2 rounded-xl border border-border-strong bg-surface px-3 py-2 text-sm font-semibold"
            >
              <Phone className="h-4 w-4" /> Llamar
            </a>
          )}
        </div>
      </header>

      {/* PASO 1 — Matrícula y vehículo */}
      <Block
        icon={<Car className="h-4 w-4" />}
        step="Paso 1"
        title="Matrícula y vehículo"
        action={
          <EditActions
            editing={editing === "veh"}
            saving={saving}
            onEdit={() => startEdit("veh", ["matricula", "km", "marca", "modelo", "motor", "fecha_matriculacion", "vin", "vehiculo"])}
            onSave={saveEdit}
            onCancel={() => { setEditing(null); setDraft({}); }}
          />
        }
      >
        {editing === "veh" ? (
          <Grid>
            <Field label="Matrícula" value={draft["matricula"] ?? ""} onChange={(v) => setField("matricula", v.toUpperCase())} mono />
            <Field label="Km" value={draft["km"] ?? ""} onChange={(v) => setField("km", v)} />
            <Field label="Marca" value={draft["marca"] ?? ""} onChange={(v) => setField("marca", v)} />
            <Field label="Modelo" value={draft["modelo"] ?? ""} onChange={(v) => setField("modelo", v)} />
            <Field label="Motor" value={draft["motor"] ?? ""} onChange={(v) => setField("motor", v)} />
            <Field label="Matriculación" value={draft["fecha_matriculacion"] ?? ""} onChange={(v) => setField("fecha_matriculacion", v)} />
            <Field label="VIN" value={draft["vin"] ?? ""} onChange={(v) => setField("vin", v.toUpperCase())} mono />
            <Field label="Vehículo (resumen)" value={draft["vehiculo"] ?? ""} onChange={(v) => setField("vehiculo", v)} />
          </Grid>
        ) : (
          <Grid>
            <Row label="Matrícula" value={g.matricula} mono />
            <Row label="Km" value={g.km} />
            <Row label="Marca" value={g.marca} />
            <Row label="Modelo" value={g.modelo} />
            <Row label="Motor" value={g.motor} />
            <Row label="Matriculación" value={g.fecha_matriculacion} />
            <Row label="VIN" value={g.vin} mono />
            <Row label="Taller" value={g.taller_nombre} />
          </Grid>
        )}
      </Block>

      {/* PASO 2 — Cliente y fotos */}
      <Block
        icon={<User className="h-4 w-4" />}
        step="Paso 2"
        title="Cliente"
        action={
          <EditActions
            editing={editing === "cliente"}
            saving={saving}
            onEdit={() => startEdit("cliente", ["cliente_nombre", "cliente_telefono"])}
            onSave={saveEdit}
            onCancel={() => { setEditing(null); setDraft({}); }}
          />
        }
      >
        {editing === "cliente" ? (
          <Grid>
            <Field label="Nombre" value={draft["cliente_nombre"] ?? ""} onChange={(v) => setField("cliente_nombre", v)} />
            <Field label="Teléfono" value={draft["cliente_telefono"] ?? ""} onChange={(v) => setField("cliente_telefono", v)} mono inputMode="tel" />
          </Grid>
        ) : (
          <Grid>
            <Row label="Nombre" value={g.cliente_nombre} />
            <Row label="Teléfono" value={g.cliente_telefono} mono />
          </Grid>
        )}
        {fotos.length > 0 && (
          <div className="mt-3 flex gap-2 overflow-x-auto">
            {fotos.map((u, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setLightbox(i)}
                className="h-20 w-20 shrink-0 overflow-hidden rounded-xl border border-border"
              >
                <img src={u} alt={`Foto ${i + 1} de la gestión`} className="h-full w-full object-cover" loading="lazy" />
              </button>
            ))}
          </div>
        )}
      </Block>

      {/* PASO 3 — Avería */}
      <Block
        icon={<Wrench className="h-4 w-4" />}
        step="Paso 3"
        title="Avería"
        action={
          <EditActions
            editing={editing === "averia"}
            saving={saving}
            onEdit={() => startEdit("averia", ["categoria", "subfamilia", "descripcion", "objecion"])}
            onSave={saveEdit}
            onCancel={() => { setEditing(null); setDraft({}); }}
          />
        }
      >
        {editing === "averia" ? (
          <>
            <Grid>
              <Field label="Familia" value={draft["categoria"] ?? ""} onChange={(v) => setField("categoria", v)} />
              <Field label="Subfamilia" value={draft["subfamilia"] ?? ""} onChange={(v) => setField("subfamilia", v)} />
            </Grid>
            <Area label="Notas internas" value={draft["descripcion"] ?? ""} onChange={(v) => setField("descripcion", v)} />
            <Area label="Objeción del cliente" value={draft["objecion"] ?? ""} onChange={(v) => setField("objecion", v)} />
          </>
        ) : (
          <>
            <Grid>
              <Row label="Familia" value={g.categoria} />
              <Row label="Subfamilia" value={g.subfamilia} />
            </Grid>
            {g.descripcion && <Long label="Notas internas" value={g.descripcion} />}
            {g.objecion && <Long label="Objeción del cliente" value={g.objecion} />}
          </>
        )}
      </Block>

      {/* PASO 4 — Consulta a Peña */}
      <Block
        icon={<Package className="h-4 w-4" />}
        step="Paso 4"
        title="Presupuesto y piezas (Peña)"
        action={
          <EditActions
            editing={editing === "piezas"}
            saving={saving}
            onEdit={() => startEdit("piezas", ["importe", "piezas"])}
            onSave={saveEdit}
            onCancel={() => { setEditing(null); setDraft({}); }}
          />
        }
      >
        {editing === "piezas" ? (
          <>
            <Field label="Importe € (IVA incl.)" value={draft["importe"] ?? ""} onChange={(v) => setField("importe", v.replace(",", "."))} mono inputMode="decimal" />
            <Area label="Piezas a pedir (una por línea)" value={draft["piezas"] ?? ""} onChange={(v) => setField("piezas", v)} rows={6} />
            <button
              type="button"
              onClick={() => setGpcat(true)}
              className="mt-2 inline-flex items-center gap-2 rounded-xl border border-border-strong bg-surface px-3 py-2 text-[13px] font-semibold"
            >
              <Search className="h-4 w-4" /> Buscar piezas en GPCat
            </button>
          </>
        ) : (
          <>
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Importe final</span>
              <span className="font-mono text-lg font-bold text-primary">{g.importe ? `${g.importe} €` : "—"}</span>
            </div>
            {piezasList.length > 0 ? (
              <ul className="mt-2 space-y-1 text-[13px]">
                {piezasList.map((l, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="text-primary">•</span>
                    <span className="min-w-0 flex-1 break-words">{l}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-[12px] text-muted-foreground">Sin piezas registradas.</p>
            )}
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={descargarPdf}
                className="inline-flex items-center gap-2 rounded-xl border border-border-strong bg-surface px-3 py-2 text-[13px] font-semibold hover:bg-surface-2"
              >
                <FileDown className="h-4 w-4" /> Descargar presupuesto PDF
              </button>
              <button
                type="button"
                onClick={enviarPdfWhatsApp}
                disabled={enviandoPdf || !g.cliente_telefono}
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-3 py-2 text-[13px] font-semibold text-primary-foreground disabled:opacity-50"
              >
                {enviandoPdf ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageCircle className="h-4 w-4" />}
                {envioPdf === "error" || envioPdf === "pendiente" ? "Reintentar envío del PDF" : "Enviar PDF por WhatsApp"}
              </button>
              <span className={`inline-flex items-center gap-1 self-center rounded-full px-2.5 py-1 text-[11px] font-semibold ${ENVIO_PDF_CLASS[envioPdf]}`}>
                {ENVIO_PDF_LABEL[envioPdf]}
              </span>
            </div>
          </>
        )}
      </Block>

      {/* PASO 5 — Plantilla enviada */}
      <Block
        icon={<MessageCircle className="h-4 w-4" />}
        step="Paso 5"
        title="Plantilla al cliente"
        action={
          <EditActions
            editing={editing === "mensaje"}
            saving={saving}
            onEdit={() => startEdit("mensaje", ["mensaje"])}
            onSave={saveEdit}
            onCancel={() => { setEditing(null); setDraft({}); }}
          />
        }
      >
        <div className="text-[12px] text-muted-foreground">
          {g.wa_abierto || fase.index >= 1 ? "WhatsApp enviado al cliente." : "Todavía no se ha enviado."}
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={enviarWhatsApp}
            disabled={enviandoWA || editing === "mensaje" || !g.mensaje || !g.cliente_telefono}
            className="inline-flex items-center gap-2 rounded-xl bg-success px-3 py-2 text-[13px] font-semibold text-success-foreground disabled:opacity-50"
          >
            {enviandoWA ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            {g.wa_abierto || fase.index >= 1 ? "Reenviar por WhatsApp" : "Enviar por WhatsApp"}
          </button>
          <button
            type="button"
            onClick={reenviarPlantilla}
            disabled={reenviando || editing === "mensaje" || !g.cliente_telefono || !g.importe}
            title="Regenera la plantilla con el precio final del paso 4 y la reenvía"
            className="inline-flex items-center gap-2 rounded-xl border border-border-strong bg-surface px-3 py-2 text-[13px] font-semibold hover:bg-surface-2 disabled:opacity-50"
          >
            {reenviando ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Reenviar plantilla al cliente
          </button>
          <span className="text-[11px] text-muted-foreground">
            Importe actual: <span className="font-semibold text-foreground">{g.importe ? `${g.importe} €` : "—"}</span>
          </span>
        </div>
        {!g.cliente_telefono && (
          <p className="mt-1 text-[11px] text-warning">Añade el teléfono del cliente para poder enviar.</p>
        )}
        {editing === "mensaje" ? (
          <Area label="Mensaje" value={draft["mensaje"] ?? ""} onChange={(v) => setField("mensaje", v)} rows={8} />
        ) : g.mensaje ? (
          <div className="mt-2 whitespace-pre-wrap break-words rounded-2xl bg-surface-2 p-3 text-[13px] leading-relaxed">
            {g.mensaje}
          </div>
        ) : (
          <p className="mt-2 text-[12px] text-muted-foreground">Sin mensaje guardado.</p>
        )}
      </Block>


      {/* PASO 6 — Pedido a Peña */}
      <Block icon={<Truck className="h-4 w-4" />} step="Paso 6" title="Pedido a Grupo Peña">
        <div className="text-[13px]">
          {g.pedido_pena ? (
            <span className="font-semibold text-success">Pedido confirmado y enviado a Peña.</span>
          ) : fase.index >= 2 ? (
            <span className="text-warning">Cliente aceptado: falta confirmar el pedido a Peña.</span>
          ) : (
            <span className="text-muted-foreground">Pendiente de aceptación del cliente.</span>
          )}
        </div>
      </Block>

      {/* Historial de envíos y aceptaciones (WhatsApp / Peña) */}
      <Block icon={<History className="h-4 w-4" />} step="Historial" title="Envíos y aceptaciones">
        {eventos.length === 0 ? (
          <p className="text-[12px] text-muted-foreground">
            Todavía no hay eventos registrados para esta gestión.
          </p>
        ) : (
          <ol className="space-y-3">
            {eventos.map((e) => (
              <li key={e.id} className="flex gap-3">
                <span className="mt-0.5 text-base leading-none">{EVENTO_ICON[e.tipo] || "•"}</span>
                <div className="min-w-0 flex-1">
                  <div className="text-[13px] font-semibold">{EVENTO_LABEL[e.tipo] || e.tipo}</div>
                  {e.detalle && (
                    <div className="break-words text-[12px] text-muted-foreground">{e.detalle}</div>
                  )}
                  <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-muted-foreground">
                    <span>{formatEventoFecha(e.created_at)}</span>
                    {e.actor && <span className="rounded-full bg-surface-2 px-2 py-0.5">{e.actor}</span>}
                    {typeof e.metadata?.["importe"] === "string" && e.metadata["importe"] && (
                      <span className="rounded-full bg-primary/15 px-2 py-0.5 font-semibold text-primary">
                        {String(e.metadata["importe"])} €
                      </span>
                    )}
                    {estadoEventoPdf(e) && (
                      <span className={`rounded-full px-2 py-0.5 font-semibold ${ENVIO_PDF_CLASS[estadoEventoPdf(e)!]}`}>
                        {ENVIO_PDF_LABEL[estadoEventoPdf(e)!]}
                      </span>
                    )}
                    {(estadoEventoPdf(e) === "error" || estadoEventoPdf(e) === "pendiente") && (
                      <button
                        type="button"
                        onClick={enviarPdfWhatsApp}
                        disabled={enviandoPdf || !g.cliente_telefono}
                        className="inline-flex items-center gap-1 rounded-full bg-primary/15 px-2 py-0.5 font-semibold text-primary disabled:opacity-50"
                      >
                        {enviandoPdf ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
                        Reintentar envío
                      </button>
                    )}
                    {typeof e.metadata?.["path"] === "string" && e.metadata["path"] && (
                      <button
                        type="button"
                        onClick={() => reabrirPdf(String(e.metadata!["path"]))}
                        className="rounded-full bg-surface-2 px-2 py-0.5 font-semibold text-foreground underline-offset-2 hover:underline"
                      >
                        Descargar PDF
                      </button>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ol>
        )}
      </Block>

      <PhotoLightbox
        images={fotos}
        startIndex={lightbox ?? 0}
        open={lightbox !== null}
        onClose={() => setLightbox(null)}
      />


      <GestionModal
        gestion={modal ? g : null}
        onClose={() => setModal(false)}
        onChanged={() => { setModal(false); load(); }}
      />

      <GPCatSearchModal
        open={gpcat}
        onClose={() => setGpcat(false)}
        marca={g.marca ?? undefined}
        modelo={g.modelo ?? undefined}
        motor={g.motor ?? undefined}
        averia={[g.categoria, g.subfamilia].filter(Boolean).join(" ") || undefined}
        onAdd={addPiezas}
      />

    </div>
  );
}

function BackLink() {
  return (
    <Link
      to="/app/historial"
      className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-muted-foreground hover:text-foreground"
    >
      <ArrowLeft className="h-4 w-4" /> Volver al historial
    </Link>
  );
}

function Block({
  icon, step, title, action, children,
}: { icon: React.ReactNode; step: string; title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-border bg-surface p-4">
      <div className="mb-3 flex items-center gap-2">
        <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-surface-2 text-primary">
          {icon}
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{step}</div>
          <h2 className="truncate text-sm font-semibold">{title}</h2>
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

function EditActions({
  editing, saving, onEdit, onSave, onCancel,
}: { editing: boolean; saving: boolean; onEdit: () => void; onSave: () => void; onCancel: () => void }) {
  if (!editing) {
    return (
      <button
        type="button"
        onClick={onEdit}
        className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-border-strong bg-surface px-2.5 py-1.5 text-[12px] font-semibold active:scale-95"
      >
        <Pencil className="h-3.5 w-3.5" /> Editar
      </button>
    );
  }
  return (
    <div className="flex shrink-0 items-center gap-1.5">
      <button
        type="button"
        onClick={onCancel}
        disabled={saving}
        className="inline-flex items-center gap-1 rounded-xl border border-border-strong bg-surface px-2.5 py-1.5 text-[12px] font-semibold disabled:opacity-50"
      >
        <X className="h-3.5 w-3.5" /> Cancelar
      </button>
      <button
        type="button"
        onClick={onSave}
        disabled={saving}
        className="inline-flex items-center gap-1 rounded-xl bg-primary px-2.5 py-1.5 text-[12px] font-semibold text-primary-foreground disabled:opacity-50"
      >
        {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />} Guardar
      </button>
    </div>
  );
}

const inputCls =
  "mt-1 w-full rounded-xl border border-border-strong bg-surface-2 px-3 py-2 text-[16px] outline-none focus:border-primary";

function Field({
  label, value, onChange, mono, inputMode,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  mono?: boolean;
  inputMode?: "text" | "tel" | "decimal" | "numeric";
}) {
  return (
    <label className="block min-w-0">
      <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</span>
      <input
        value={value}
        inputMode={inputMode}
        onChange={(e) => onChange(e.target.value)}
        className={inputCls + (mono ? " font-mono" : "")}
      />
    </label>
  );
}

function Area({
  label, value, onChange, rows = 3,
}: { label: string; value: string; onChange: (v: string) => void; rows?: number }) {
  return (
    <label className="mt-3 block">
      <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</span>
      <textarea
        value={value}
        rows={rows}
        onChange={(e) => onChange(e.target.value)}
        className={inputCls + " resize-y leading-relaxed"}
      />
    </label>
  );
}


function Grid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-2 gap-x-3 gap-y-2">{children}</div>;
}

function Row({ label, value, mono }: { label: string; value?: string | null; mono?: boolean }) {
  return (
    <div className="min-w-0">
      <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className={"break-words text-[13px] " + (mono ? "font-mono" : "")}>{value || "—"}</div>
    </div>
  );
}

function Long({ label, value }: { label: string; value: string }) {
  return (
    <div className="mt-3">
      <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-1 whitespace-pre-wrap break-words text-[13px] leading-relaxed">{value}</div>
    </div>
  );
}
