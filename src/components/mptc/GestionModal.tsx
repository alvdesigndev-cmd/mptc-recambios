import { useEffect, useRef, useState } from "react";
import { X, Send, Check, XCircle, CheckCheck, Truck, Trash2, Phone, Pencil, Save, Plus, Bell , FileDown, Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { buildWAUrl } from "@/lib/mptc/wa";
import { logEvento } from "@/lib/mptc/eventos";
import { PENA_PHONE } from "@/lib/mptc/profiles";
import { estadoBadge, type Gestion } from "@/lib/mptc/types";
import { MicButton } from "@/components/mptc/MicButton";
import { resolveFotoUrls } from "@/lib/mptc/fotos";
import { PhotoLightbox } from "@/components/mptc/PhotoLightbox";
import { useServerFn } from "@tanstack/react-start";
import { generarPedidoGPA } from "@/lib/mptc/gpa.functions";
import { generarYGuardarPresupuesto } from "@/lib/mptc/presupuesto-storage";
import { enviarPresupuestoPdfWhatsApp, puedeEnviarPdf } from "@/lib/mptc/presupuesto-whatsapp";
import { fetchEstadoEnvioPdf, ENVIO_PDF_LABEL, ENVIO_PDF_CLASS, type EstadoEnvioPdf } from "@/lib/mptc/eventos";

interface Props {
  gestion: Gestion | null;
  onClose: () => void;
  onChanged: () => void;
}

type Familia = { id: string; nombre: string; icono: string };
type Subfamilia = { id: string; familia_id: string; nombre: string };
type NuevaAveria = { familia_id: string; subfamilia: string; importe: string; descripcion: string; fotos: string[]; subiendo: boolean };

type EditState = {
  subfamilia: string;
  importe: string;
  km: string;
  piezas: string;
  descripcion: string;
  objecion: string;
  mensaje: string;
};

export function GestionModal({ gestion, onClose, onChanged }: Props) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<EditState>({
    subfamilia: "",
    importe: "",
    km: "",
    piezas: "",
    descripcion: "",
    objecion: "",
    mensaje: "",
  });
  // Snapshot del mensaje al iniciar el dictado, para anexar sin pisar.
  const mensajeBaseRef = useRef<string>("");
  const [familias, setFamilias] = useState<Familia[]>([]);
  const [subfamilias, setSubfamilias] = useState<Subfamilia[]>([]);
  const [nuevas, setNuevas] = useState<NuevaAveria[]>([]);
  // Tras guardar averías nuevas, guardamos un resumen para ofrecer los avisos
  // (cliente / Peña) en lugar de cerrar el modal automáticamente.
  const [avisoPendiente, setAvisoPendiente] = useState<{
    nuevas: { texto: string; importe: string }[];
    importeTotal: string;
  } | null>(null);
  const [clienteNotificado, setClienteNotificado] = useState(false);
  const [penaNotificado, setPenaNotificado] = useState(false);
  const [fotoSigned, setFotoSigned] = useState<string[]>([]);
  const [lightbox, setLightbox] = useState<number | null>(null);
  const [confirmPedido, setConfirmPedido] = useState(false);
  const [enviandoPedido, setEnviandoPedido] = useState(false);
  const [enviandoPdf, setEnviandoPdf] = useState(false);
  const enviarPedidoGPA = useServerFn(generarPedidoGPA);


  useEffect(() => {
    let alive = true;
    const fotos = gestion?.fotos || [];
    if (!fotos.length) { setFotoSigned([]); return; }
    resolveFotoUrls(fotos).then((urls) => { if (alive) setFotoSigned(urls); });
    return () => { alive = false; };
  }, [gestion?.id, gestion?.fotos]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  useEffect(() => {
    (async () => {
      const [{ data: fams }, { data: subs }] = await Promise.all([
        supabase.from("familias").select("id,nombre,icono").order("orden"),
        supabase.from("subfamilias").select("id,familia_id,nombre").order("orden"),
      ]);
      setFamilias((fams as Familia[]) || []);
      setSubfamilias((subs as Subfamilia[]) || []);
    })();
  }, []);

  useEffect(() => {
    if (gestion) {
      setEditing(false);
      setNuevas([]);
      setAvisoPendiente(null);
      setClienteNotificado(false);
      setPenaNotificado(false);
      setForm({
        subfamilia: gestion.subfamilia || gestion.categoria || "",
        importe: gestion.importe || "",
        km: gestion.km || "",
        piezas: gestion.piezas || "",
        descripcion: gestion.descripcion || "",
        objecion: gestion.objecion || "",
        mensaje: gestion.mensaje || "",
      });
    }
  }, [gestion]);

  if (!gestion) return null;
  const g = gestion;
  const meta = estadoBadge(g.estado);

  const update = async (patch: Partial<Gestion>) => {
    await supabase.from("gestiones").update(patch).eq("id", g.id);
    onChanged();
    onClose();
  };

  const parseImporte = (s: string) => {
    const n = parseFloat((s || "").toString().replace(",", ".").replace(/[^\d.-]/g, ""));
    return isNaN(n) ? 0 : n;
  };

  const subirFotos = async (idx: number, files: File[]) => {
    if (!files.length) return;
    setNuevas((prev) => {
      const arr = [...prev];
      arr[idx] = { ...arr[idx], subiendo: true };
      return arr;
    });
    const tallerId = g.taller_id || "sin-taller";
    const urls: string[] = [];
    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      const ext = (f.name.split(".").pop() || "jpg").toLowerCase();
      const path = `${tallerId}/${g.id}/extra-${Date.now()}-${i}.${ext}`;
      const { error } = await supabase.storage
        .from("fotos-gestiones")
        .upload(path, f, { contentType: f.type, upsert: false });
      if (error) {
        toast.error(`No se pudo subir ${f.name}`);
        continue;
      }
      const { data } = supabase.storage.from("fotos-gestiones").getPublicUrl(path);
      urls.push(data.publicUrl);
      // Note: bucket is private; the modal preview replaces this with a signed URL below.
    }
    setNuevas((prev) => {
      const arr = [...prev];
      arr[idx] = { ...arr[idx], fotos: [...arr[idx].fotos, ...urls], subiendo: false };
      return arr;
    });
  };

  const guardarEdicion = async () => {
    setSaving(true);
    const validas = nuevas.filter((n) => n.subfamilia.trim());
    let mergedSub = form.subfamilia;
    let mergedDesc = form.descripcion;
    let mergedImporte = form.importe;
    const nuevasFotos = nuevas.flatMap((n) => n.fotos);
    // Resumen legible (familia / subfamilia) para los avisos posteriores.
    const resumenNuevas = validas.map((n) => {
      const fam = familias.find((f) => f.id === n.familia_id);
      const txt = fam ? `${fam.nombre} / ${n.subfamilia.trim()}` : n.subfamilia.trim();
      return { texto: txt, importe: n.importe.trim() };
    });
    if (validas.length) {
      const subs = validas.map((n) => n.subfamilia.trim());
      mergedSub = [form.subfamilia, ...subs].filter(Boolean).join(" + ");
      const descBloque = validas
        .map((n) => `• ${n.subfamilia.trim()}${n.importe ? ` — ${n.importe} €` : ""}${n.descripcion ? `\n  ${n.descripcion}` : ""}`)
        .join("\n");
      mergedDesc = [form.descripcion, descBloque].filter(Boolean).join("\n\n");
      const total = parseImporte(form.importe) + validas.reduce((a, n) => a + parseImporte(n.importe), 0);
      if (total > 0) mergedImporte = total.toFixed(2).replace(/\.00$/, "");
    }
    // Construir el bloque a anexar al mensaje original (si hay averías nuevas).
    let mergedMensaje = form.mensaje;
    if (validas.length) {
      const bloqueMensaje = validas
        .map((n) => {
          const fam = familias.find((f) => f.id === n.familia_id);
          const tit = fam ? `${fam.nombre} / ${n.subfamilia.trim()}` : n.subfamilia.trim();
          const imp = n.importe ? ` — *${n.importe} €*` : "";
          const nota = n.descripcion ? `\n  ${n.descripcion}` : "";
          return `• ${tit}${imp}${nota}`;
        })
        .join("\n");
      const cabecera = `\n\n— Avería añadida (${new Date().toLocaleDateString("es-ES")}) —\n`;
      mergedMensaje = (form.mensaje || "").trimEnd() + cabecera + bloqueMensaje;
    }
    const patch = {
      subfamilia: mergedSub || null,
      importe: mergedImporte || null,
      km: form.km || null,
      piezas: form.piezas || null,
      descripcion: mergedDesc || null,
      objecion: form.objecion || null,
      mensaje: mergedMensaje || null,
      ...(nuevasFotos.length ? { fotos: [...(g.fotos || []), ...nuevasFotos] } : {}),
    };
    const { error } = await supabase.from("gestiones").update(patch).eq("id", g.id);
    setSaving(false);
    if (error) {
      toast.error("No se pudieron guardar los cambios");
      return;
    }
    toast.success("Gestión actualizada");
    setEditing(false);
    setNuevas([]);
    onChanged();
    // Reflejar cambios en la copia local para los avisos.
    g.subfamilia = mergedSub;
    g.importe = mergedImporte;
    g.descripcion = mergedDesc;
    g.mensaje = mergedMensaje;
    setForm((f) => ({ ...f, mensaje: mergedMensaje }));
    // Si se han añadido averías nuevas, ofrecemos avisar al cliente y/o a Peña
    // antes de cerrar el modal. Si no hubo, cerramos como antes.
    if (resumenNuevas.length) {
      setAvisoPendiente({ nuevas: resumenNuevas, importeTotal: mergedImporte });
      setClienteNotificado(false);
      setPenaNotificado(false);
    } else {
      onClose();
    }
  };

  const remove = async () => {
    if (!confirm("¿Eliminar esta gestión?")) return;
    await supabase.from("gestiones").delete().eq("id", g.id);
    onChanged();
    onClose();
  };

  const reenviar = () => {
    if (!g.cliente_telefono) return;
    const url = typeof window !== "undefined"
      ? `${window.location.origin}/confirmar/${g.confirm_token || ""}`
      : "";
    // Si tenemos el mensaje original guardado, lo reutilizamos para no perder
    // las averías acumuladas. Si no, generamos un recordatorio corto.
    const msg = g.mensaje && g.mensaje.trim()
      ? g.mensaje
      : `Hola ${g.cliente_nombre || ""} 👋\n\nTe recuerdo el presupuesto de tu ${g.vehiculo || ""} (${g.matricula || ""}):\n\n💰 *${g.importe || "—"} €*\n\n✅ Confirma aquí: ${url}`;
    window.open(buildWAUrl(g.cliente_telefono, msg), "_blank", "noopener,noreferrer");
  };

  // Líneas de piezas del pedido (una por línea del campo "Piezas").
  const lineasPedido = (g?.piezas || "")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  const confirmarPedidoGPA = async () => {
    setEnviandoPedido(true);
    try {
      await enviarPedidoGPA({
        data: {
          gestionId: g.id,
          matricula: g.matricula ?? undefined,
          direccion: "Taller",
          lineas: lineasPedido.map((l) => ({
            referencia: (l.match(/REF:\s*([A-Za-z0-9-]+)/) || [])[1] || "",
            descripcion: l,
            cantidad: 1,
            precio: 0,
          })),
        },
      });
      await supabase.from("gestiones").update({ estado: "pedido", pedido_pena: true }).eq("id", g.id);
      await logEvento({
        gestionId: g.id,
        tallerId: g.taller_id,
        tipo: "pedido_enviado",
        detalle: "Pedido enviado a Grupo Peña (GPCat)",
        metadata: { importe: g.importe, piezas: g.piezas },
      });
      toast.success("Pedido enviado a Grupo Peña ✓");
      setConfirmPedido(false);
      onChanged();
      onClose();
    } catch {
      toast.error("No se pudo enviar el pedido a Grupo Peña");
    } finally {
      setEnviandoPedido(false);
    }
  };

  const pedirPena = async () => {
    await supabase.from("gestiones").update({ pedido_pena: true }).eq("id", g.id);
    await logEvento({
      gestionId: g.id,
      tallerId: g.taller_id,
      tipo: "pedido_confirmado",
      detalle: "Pedido confirmado a Grupo Peña",
      metadata: { importe: g.importe, piezas: g.piezas },
    });
    toast.success("El pedido se ha realizado correctamente");
    onChanged();
    onClose();
  };

  // Mensaje corto de novedad para el cliente (cuando se añade una avería nueva).
  const notificarCliente = () => {
    if (!g.cliente_telefono || !avisoPendiente) return;
    const url = typeof window !== "undefined"
      ? `${window.location.origin}/confirmar/${g.confirm_token || ""}`
      : "";
    const lista = avisoPendiente.nuevas
      .map((n) => `• ${n.texto}${n.importe ? ` — ${n.importe} €` : ""}`)
      .join("\n");
    const importeTxt = avisoPendiente.importeTotal || g.importe || "—";
    const msg =
      `Hola ${g.cliente_nombre || ""} 👋\n\n` +
      `Novedad en tu ${g.vehiculo || ""} (${g.matricula || ""}): se ha añadido a tu gestión:\n${lista}\n\n` +
      `💰 Nuevo importe total: *${importeTxt} €* (IVA incluido).\n\n` +
      `✅ Confirma aquí: <${url}>`;
    window.open(buildWAUrl(g.cliente_telefono, msg), "_blank", "noopener,noreferrer");
    setClienteNotificado(true);
  };

  // Aviso a Grupo Peña: marca la gestión como pedido (si no lo estaba) y abre
  // WhatsApp con el detalle de la pieza añadida para que la sumen al pedido.
  const notificarPena = async () => {
    if (!avisoPendiente) return;
    const lista = avisoPendiente.nuevas
      .map((n) => `• ${n.texto}${n.importe ? ` — ${n.importe} €` : ""}`)
      .join("\n");
    const yaPedido = g.pedido_pena;
    const titulo = yaPedido
      ? `🔧 *Ampliación de pedido* — ${g.taller_nombre || ""}`
      : `🔧 *Pedido ${g.taller_nombre || ""}*`;
    const cuerpo = yaPedido
      ? `Se ha añadido una nueva pieza a la gestión de ${g.matricula || ""} (${g.vehiculo || ""}). Por favor, súmala al pedido en curso:\n${lista}`
      : `Nueva pieza a pedir para ${g.matricula || ""} (${g.vehiculo || ""}):\n${lista}`;
    const importeTxt = avisoPendiente.importeTotal || g.importe || "—";
    const msg = `${titulo}\n\n${cuerpo}\n\n💰 Importe total actualizado: *${importeTxt} €*`;
    // Marca la gestión como pedido a Peña para que aparezca/se refresque en su panel.
    if (!yaPedido) {
      await supabase.from("gestiones").update({ pedido_pena: true }).eq("id", g.id);
      g.pedido_pena = true;
      onChanged();
    }
    window.open(buildWAUrl(PENA_PHONE, msg), "_blank", "noopener,noreferrer");
    setPenaNotificado(true);
  };



  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center">
      <div className="max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-surface p-5 sm:rounded-3xl">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className={"rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase " + meta.cls}>
                {meta.label}
              </span>
              {g.pedido_pena && (
                <span className="rounded-full bg-accent/15 px-2 py-0.5 text-[10px] font-semibold uppercase text-accent">
                  Peña
                </span>
              )}
            </div>
            <h2 className="mt-1 truncate text-lg font-bold">{g.cliente_nombre || "Sin cliente"}</h2>
            <div className="font-mono text-[12px] text-muted-foreground">
              {g.matricula} · {g.vehiculo}
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-2 text-muted-foreground hover:bg-surface-2">
            <X className="h-5 w-5" />
          </button>
        </div>

        {editing ? (
          <div className="space-y-3 text-sm">
            <Field label="Avería" value={form.subfamilia} onChange={(v) => setForm({ ...form, subfamilia: v })} />
            <Field label="Importe (€)" value={form.importe} onChange={(v) => setForm({ ...form, importe: v })} />
            <Field label="Km" value={form.km} onChange={(v) => setForm({ ...form, km: v })} />
            <Field label="Piezas" value={form.piezas} onChange={(v) => setForm({ ...form, piezas: v })} multiline />
            <Field label="Notas" value={form.descripcion} onChange={(v) => setForm({ ...form, descripcion: v })} multiline />
            <Field label="Objeción" value={form.objecion} onChange={(v) => setForm({ ...form, objecion: v })} multiline />

            {/* Mensaje WhatsApp — se conserva entre ediciones y permite ampliar por texto o voz */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Mensaje WhatsApp
                </span>
                <MicButton
                  size="sm"
                  title="Dictar y añadir al mensaje"
                  onStart={() => { mensajeBaseRef.current = form.mensaje || ""; }}
                  onInterim={(t) => {
                    const base = mensajeBaseRef.current;
                    setForm((f) => ({ ...f, mensaje: base ? `${base.trimEnd()}\n${t}` : t }));
                  }}
                  onFinal={(t) => {
                    const base = mensajeBaseRef.current;
                    const next = base ? `${base.trimEnd()}\n${t}` : t;
                    mensajeBaseRef.current = next;
                    setForm((f) => ({ ...f, mensaje: next }));
                  }}
                />
              </div>
              <textarea
                value={form.mensaje}
                onChange={(e) => setForm({ ...form, mensaje: e.target.value })}
                rows={8}
                placeholder="El mensaje original se mantiene. Añade aquí la nueva avería (a mano o con el micro)."
                className="w-full whitespace-pre-wrap rounded-xl bg-surface-2 px-3 py-2 text-sm outline-none focus:bg-surface-3"
              />
              <p className="text-[11px] text-muted-foreground">
                Al guardar, las averías añadidas abajo se anexarán automáticamente al mensaje.
              </p>
            </div>

            {/* Añadir averías extra */}
            <div className="rounded-2xl border border-dashed border-border-strong p-3">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Añadir avería
                </span>
                <button
                  type="button"
                  onClick={() => setNuevas([...nuevas, { familia_id: "", subfamilia: "", importe: "", descripcion: "", fotos: [], subiendo: false }])}
                  className="inline-flex items-center gap-1 rounded-lg bg-primary px-2 py-1 text-xs font-semibold text-primary-foreground"
                >
                  <Plus className="h-3.5 w-3.5" /> Añadir
                </button>
              </div>

              {nuevas.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  Añade una nueva familia y subfamilia para sumarla a esta gestión.
                </p>
              )}

              <div className="space-y-3">
                {nuevas.map((n, idx) => {
                  const subs = subfamilias.filter((s) => s.familia_id === n.familia_id);
                  return (
                    <div key={idx} className="space-y-2 rounded-xl bg-surface-2 p-3">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                          Avería #{idx + 1}
                        </span>
                        <button
                          type="button"
                          onClick={() => setNuevas(nuevas.filter((_, i) => i !== idx))}
                          className="rounded-md p-1 text-destructive hover:bg-surface-3"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      <select
                        value={n.familia_id}
                        onChange={(e) => {
                          const arr = [...nuevas];
                          arr[idx] = { ...arr[idx], familia_id: e.target.value, subfamilia: "" };
                          setNuevas(arr);
                        }}
                        className="w-full rounded-xl bg-surface px-3 py-2 text-sm outline-none"
                      >
                        <option value="">— Familia —</option>
                        {familias.map((f) => (
                          <option key={f.id} value={f.id}>{f.icono} {f.nombre}</option>
                        ))}
                      </select>
                      <select
                        value={n.subfamilia}
                        onChange={(e) => {
                          const arr = [...nuevas];
                          arr[idx] = { ...arr[idx], subfamilia: e.target.value };
                          setNuevas(arr);
                        }}
                        disabled={!n.familia_id}
                        className="w-full rounded-xl bg-surface px-3 py-2 text-sm outline-none disabled:opacity-50"
                      >
                        <option value="">— Subfamilia —</option>
                        {subs.map((s) => (
                          <option key={s.id} value={s.nombre}>{s.nombre}</option>
                        ))}
                      </select>
                      <input
                        placeholder="Importe (€)"
                        value={n.importe}
                        onChange={(e) => {
                          const arr = [...nuevas];
                          arr[idx] = { ...arr[idx], importe: e.target.value };
                          setNuevas(arr);
                        }}
                        className="w-full rounded-xl bg-surface px-3 py-2 text-sm outline-none"
                      />
                      <textarea
                        placeholder="Notas (opcional)"
                        rows={2}
                        value={n.descripcion}
                        onChange={(e) => {
                          const arr = [...nuevas];
                          arr[idx] = { ...arr[idx], descripcion: e.target.value };
                          setNuevas(arr);
                        }}
                        className="w-full rounded-xl bg-surface px-3 py-2 text-sm outline-none"
                      />

                      {/* Fotos extra */}
                      <div>
                        <div className="mb-1 flex items-center justify-between">
                          <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                            Fotos {n.subiendo && <span className="ml-1 normal-case text-muted-foreground">(subiendo…)</span>}
                          </span>
                          <label className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-border-strong bg-surface px-2 py-1 text-xs font-semibold hover:bg-surface-2">
                            <Plus className="h-3 w-3" /> Añadir fotos
                            <input
                              type="file"
                              accept="image/*"
                              multiple
                              className="hidden"
                              onChange={(e) => subirFotos(idx, Array.from(e.target.files || []))}
                            />
                          </label>
                        </div>
                        {n.fotos.length > 0 && (
                          <div className="grid grid-cols-4 gap-2">
                            {n.fotos.map((u, fi) => (
                              <div key={fi} className="relative overflow-hidden rounded-lg bg-surface">
                                <img src={u} alt="" className="aspect-square w-full object-cover" />
                                <button
                                  type="button"
                                  onClick={() => {
                                    const arr = [...nuevas];
                                    arr[idx] = { ...arr[idx], fotos: arr[idx].fotos.filter((_, i) => i !== fi) };
                                    setNuevas(arr);
                                  }}
                                  className="absolute right-1 top-1 rounded-md bg-black/60 p-1 text-white"
                                >
                                  <X className="h-3 w-3" />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Vista previa del mensaje final (con averías nuevas anexadas) */}
            {(() => {
              const validas = nuevas.filter((n) => n.subfamilia.trim());
              let preview = form.mensaje || "";
              if (validas.length) {
                const bloque = validas
                  .map((n) => {
                    const fam = familias.find((f) => f.id === n.familia_id);
                    const tit = fam ? `${fam.nombre} / ${n.subfamilia.trim()}` : n.subfamilia.trim();
                    const imp = n.importe ? ` — *${n.importe} €*` : "";
                    const nota = n.descripcion ? `\n  ${n.descripcion}` : "";
                    return `• ${tit}${imp}${nota}`;
                  })
                  .join("\n");
                const cabecera = `\n\n— Avería añadida (${new Date().toLocaleDateString("es-ES")}) —\n`;
                preview = (form.mensaje || "").trimEnd() + cabecera + bloque;
              }
              if (!preview.trim()) return null;
              return (
                <div className="space-y-1">
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Vista previa del mensaje {validas.length > 0 && <span className="ml-1 normal-case text-primary">(actualizado)</span>}
                  </span>
                  <div className="max-h-72 overflow-y-auto whitespace-pre-wrap rounded-xl border border-border bg-surface-2 px-3 py-2 text-[13px] leading-relaxed">
                    {preview}
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Así se enviará el mensaje completo al cliente tras guardar.
                  </p>
                </div>
              );
            })()}
          </div>
        ) : (
          <div className="space-y-3 text-sm">
            <Row label="Avería" value={g.subfamilia || g.categoria || "—"} />
            <Row label="Importe" value={g.importe ? `${g.importe} €` : "—"} />
            <Row label="Km" value={g.km || "—"} />
            <Row label="Teléfono" value={g.cliente_telefono || "—"} />
            {g.piezas && <Row label="Piezas" value={g.piezas} multiline />}
            {g.descripcion && <Row label="Notas" value={g.descripcion} multiline />}
            {g.objecion && <Row label="Objeción" value={g.objecion} multiline />}
            <Row label="Creada" value={new Date(g.created_at).toLocaleString("es-ES")} />
          </div>
        )}

        {g.fotos && g.fotos.length > 0 && (
          <div className="mt-3 grid grid-cols-3 gap-2">
            {g.fotos.map((u, i) => {
              const src = fotoSigned[i] || u;
              return (
                <button
                  type="button"
                  key={i}
                  onClick={() => setLightbox(i)}
                  className="overflow-hidden rounded-xl bg-surface-2"
                >
                  <img src={src} alt="" className="aspect-square w-full object-cover" />
                </button>
              );
            })}
          </div>
        )}
        <PhotoLightbox
          images={fotoSigned.length ? fotoSigned : g.fotos || []}
          startIndex={lightbox ?? 0}
          open={lightbox !== null}
          onClose={() => setLightbox(null)}
        />


        {/* Panel de avisos tras añadir averías nuevas */}
        {avisoPendiente && !editing && (
          <div className="mt-4 rounded-2xl border border-primary/40 bg-primary/5 p-3">
            <div className="mb-2 flex items-center gap-2">
              <Bell className="h-4 w-4 text-primary" />
              <span className="text-sm font-semibold">Avisar de la novedad</span>
            </div>
            <p className="mb-3 text-xs text-muted-foreground">
              Se ha añadido a la gestión:{" "}
              <span className="font-semibold text-foreground">
                {avisoPendiente.nuevas.map((n) => n.texto).join(", ")}
              </span>
              . Nuevo importe total: <span className="font-semibold text-foreground">{avisoPendiente.importeTotal || g.importe || "—"} €</span>.
            </p>
            <div className="flex flex-wrap gap-2">
              {g.cliente_telefono && (
                <button
                  onClick={notificarCliente}
                  className={btnPrimary + (clienteNotificado ? " opacity-70" : "")}
                >
                  <Send className="h-4 w-4" />
                  {clienteNotificado ? "Cliente avisado ✓" : "Avisar al cliente"}
                </button>
              )}
              <button
                onClick={notificarPena}
                className={btnAccent + (penaNotificado ? " opacity-70" : "")}
              >
                <Truck className="h-4 w-4" />
                {penaNotificado ? "Peña avisada ✓" : g.pedido_pena ? "Avisar a Peña (ampliación)" : "Avisar a Peña"}
              </button>
              <button onClick={() => { setAvisoPendiente(null); onClose(); }} className={btnGhost + " ml-auto"}>
                Cerrar
              </button>
            </div>
          </div>
        )}

        {/* Acciones */}
        <div className="mt-5 flex flex-wrap gap-2">
          {editing ? (
            <>
              <button onClick={guardarEdicion} disabled={saving} className={btnPrimary}>
                <Save className="h-4 w-4" /> {saving ? "Guardando…" : "Guardar cambios"}
              </button>
              <button onClick={() => setEditing(false)} className={btnGhost}>
                Cancelar
              </button>
            </>
          ) : (
            <>
              <button onClick={() => setEditing(true)} className={btnGhost}>
                <Pencil className="h-4 w-4" /> Editar
              </button>
              <button
                onClick={async () => {
                  try {
                    const res = await generarYGuardarPresupuesto(g, { taller: g.taller_nombre });
                    toast.success(
                      res.path
                        ? "Presupuesto PDF descargado y guardado en el historial"
                        : "Presupuesto PDF descargado",
                    );
                  } catch {
                    toast.error("No se pudo generar el PDF");
                  }
                }}
                className={btnGhost}
              >
                <FileDown className="h-4 w-4" /> PDF
              </button>
              {puedeEnviarPdf(g) && (
                <button
                  onClick={async () => {
                    setEnviandoPdf(true);
                    try {
                      const res = await enviarPresupuestoPdfWhatsApp(g, { taller: g.taller_nombre });
                      setEnvioPdf(res.estado);
                      if (res.estado === "enviado") toast.success("Presupuesto PDF enviado por WhatsApp");
                      else { toast.warning("WhatsApp no se abrió: reintentando…"); window.location.href = res.url; }
                      onChanged();
                    } catch (e: any) {
                      setEnvioPdf("error");
                      toast.error("No se pudo enviar el PDF: " + (e?.message || "error"));
                    } finally {
                      setEnviandoPdf(false);
                    }
                  }}
                  disabled={enviandoPdf}
                  className={btnGhost + " disabled:opacity-50"}
                >
                  {enviandoPdf
                    ? <Loader2 className="h-4 w-4 animate-spin" />
                    : envioPdf === "error" || envioPdf === "pendiente"
                      ? <RefreshCw className="h-4 w-4" />
                      : <Send className="h-4 w-4" />}
                  {envioPdf === "error" || envioPdf === "pendiente"
                    ? "Reintentar envío PDF"
                    : envioPdf === "enviado" ? "Reenviar PDF" : "Enviar PDF"}
                </button>
              )}
              {puedeEnviarPdf(g) && envioPdf !== "sin-enviar" && (
                <span className={`inline-flex items-center self-center rounded-full px-2.5 py-1 text-[11px] font-semibold ${ENVIO_PDF_CLASS[envioPdf]}`}>
                  {ENVIO_PDF_LABEL[envioPdf]}
                </span>
              )}


              {g.cliente_telefono && (
                <a
                  href={`tel:${g.cliente_telefono}`}
                  className="inline-flex items-center gap-2 rounded-xl border border-border-strong bg-surface px-3 py-2 text-sm hover:bg-surface-2"
                >
                  <Phone className="h-4 w-4" /> Llamar
                </a>
              )}
              {(g.estado === "en-curso" || g.estado === "enviado") && g.cliente_telefono && (
                <button onClick={reenviar} className={btnGhost}>
                  <Send className="h-4 w-4" /> {g.estado === "en-curso" ? "Enviar" : "Reenviar"}
                </button>
              )}
              {g.estado !== "borrador" && !g.pedido_pena && (
                <button
                  onClick={() => (g.estado === "aceptado" ? setConfirmPedido(true) : pedirPena())}
                  className={btnAccent}
                >
                  <Truck className="h-4 w-4" />
                  {g.estado === "aceptado" ? "Pedir a Grupo Peña" : "Pedir a Peña"}
                </button>
              )}
              {g.estado === "enviado" && (
                <>
                  <button onClick={() => update({ estado: "aceptado" })} className={btnPrimary}>
                    <Check className="h-4 w-4" /> Marcar aceptado
                  </button>
                  <button onClick={() => update({ estado: "rechazado" })} className={btnGhost}>
                    <XCircle className="h-4 w-4" /> Rechazado
                  </button>
                </>
              )}
              {(g.estado === "aceptado" || g.estado === "enviado") && (
                <button onClick={() => update({ estado: "completado" })} className={btnPrimary}>
                  <CheckCheck className="h-4 w-4" /> Completar
                </button>
              )}
              <button onClick={remove} className={btnGhost + " ml-auto text-destructive"}>
                <Trash2 className="h-4 w-4" /> Eliminar
              </button>
            </>
          )}
        </div>
      </div>

      {confirmPedido && (
        <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/70 p-0 backdrop-blur-sm sm:items-center sm:p-4">
          <div className="max-h-[90dvh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-surface p-5 sm:rounded-3xl">
            <div className="mb-3 flex items-start justify-between gap-3">
              <div>
                <h3 className="text-base font-bold">Confirmar pedido a Grupo Peña</h3>
                <p className="text-[11px] text-muted-foreground">
                  Paso 6 del flujo: el cliente ya ha aceptado el presupuesto.
                </p>
              </div>

              <button
                onClick={() => setConfirmPedido(false)}
                className="rounded-lg p-2 text-muted-foreground hover:bg-surface-2"
                aria-label="Cerrar"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3 text-sm">
              <div>
                <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Piezas del pedido
                </div>
                {lineasPedido.length === 0 ? (
                  <p className="text-muted-foreground">No hay piezas indicadas en la gestión.</p>
                ) : (
                  <ul className="space-y-1">
                    {lineasPedido.map((l, i) => (
                      <li key={i} className="rounded-xl bg-surface-2 px-3 py-2 text-[13px]">
                        {l}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <Row label="Importe total" value={`${g.importe || "—"} €`} />
              <Row label="Dirección de entrega" value="Taller" />
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              <button onClick={confirmarPedidoGPA} disabled={enviandoPedido} className={btnAccent + " disabled:opacity-60"}>
                <Truck className="h-4 w-4" /> {enviandoPedido ? "Enviando…" : "Confirmar pedido"}
              </button>
              <button onClick={() => setConfirmPedido(false)} className={btnGhost}>
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Row({ label, value, multiline }: { label: string; value: string; multiline?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-border pb-2 last:border-b-0">
      <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</span>
      <span className={"text-right " + (multiline ? "whitespace-pre-wrap" : "truncate")}>{value}</span>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  multiline,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  multiline?: boolean;
}) {
  return (
    <label className="block space-y-1">
      <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</span>
      {multiline ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={3}
          className="w-full rounded-xl bg-surface-2 px-3 py-2 text-sm outline-none focus:bg-surface-3"
        />
      ) : (
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full rounded-xl bg-surface-2 px-3 py-2 text-sm outline-none focus:bg-surface-3"
        />
      )}
    </label>
  );
}

const btnPrimary = "inline-flex items-center gap-2 rounded-xl bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground active:scale-95";
const btnAccent = "inline-flex items-center gap-2 rounded-xl bg-accent px-3 py-2 text-sm font-semibold text-accent-foreground active:scale-95";
const btnGhost = "inline-flex items-center gap-2 rounded-xl border border-border-strong bg-surface px-3 py-2 text-sm font-semibold hover:bg-surface-2";
