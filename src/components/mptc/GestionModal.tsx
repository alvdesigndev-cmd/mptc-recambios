import { useEffect, useState } from "react";
import { X, Send, Check, XCircle, CheckCheck, Truck, Trash2, Phone, Pencil, Save, Plus, Bell } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { buildWAUrl } from "@/lib/mptc/wa";
import { PENA_PHONE } from "@/lib/mptc/profiles";
import { estadoBadge, type Gestion } from "@/lib/mptc/types";

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
  });
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
    const patch = {
      subfamilia: mergedSub || null,
      importe: mergedImporte || null,
      km: form.km || null,
      piezas: form.piezas || null,
      descripcion: mergedDesc || null,
      objecion: form.objecion || null,
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
    // Si se han añadido averías nuevas, ofrecemos avisar al cliente y/o a Peña
    // antes de cerrar el modal. Si no hubo, cerramos como antes.
    if (resumenNuevas.length) {
      // Actualizamos la copia local de la gestión para que los mensajes usen
      // los datos nuevos (importe, subfamilia agregada, etc.).
      g.subfamilia = mergedSub;
      g.importe = mergedImporte;
      g.descripcion = mergedDesc;
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
    const msg = `Hola ${g.cliente_nombre || ""} 👋\n\nTe recuerdo el presupuesto de tu ${g.vehiculo || ""} (${g.matricula || ""}):\n\n💰 *${g.importe || "—"} €*\n\n✅ Confirma aquí: ${url}`;
    window.open(buildWAUrl(g.cliente_telefono, msg), "_blank", "noopener,noreferrer");
  };

  const pedirPena = async () => {
    await supabase.from("gestiones").update({ pedido_pena: true }).eq("id", g.id);
    toast.success("El pedido se ha realizado correctamente");
    onChanged();
    onClose();
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
            {g.fotos.map((u, i) => (
              <a key={i} href={u} target="_blank" rel="noreferrer" className="overflow-hidden rounded-xl bg-surface-2">
                <img src={u} alt="" className="aspect-square w-full object-cover" />
              </a>
            ))}
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
              {(g.estado === "enviado" || g.estado === "aceptado") && !g.pedido_pena && (
                <button onClick={pedirPena} className={btnAccent}>
                  <Truck className="h-4 w-4" /> Pedir a Peña
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
