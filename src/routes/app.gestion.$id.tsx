import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, Car, User, Wrench, Package, MessageCircle, Truck, Loader2, Phone, Pencil, Check, X, Search } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useSettings } from "@/lib/mptc/useSettings";
import { estadoBadge, type Gestion } from "@/lib/mptc/types";
import { FASES, faseDeGestion } from "@/lib/mptc/fases";
import { resolveFotoUrls } from "@/lib/mptc/fotos";
import { PhotoLightbox } from "@/components/mptc/PhotoLightbox";
import { GestionModal } from "@/components/mptc/GestionModal";
import { GPCatSearchModal, formatPiezaLinea } from "@/components/mptc/GPCatSearchModal";


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

  const load = useCallback(async () => {
    const { data } = await supabase.from("gestiones").select("*").eq("id", id).maybeSingle();
    setG((data as Gestion) || null);
    setLoading(false);
  }, [id]);

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
      <Block icon={<Car className="h-4 w-4" />} step="Paso 1" title="Matrícula y vehículo">
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
      </Block>

      {/* PASO 2 — Cliente y fotos */}
      <Block icon={<User className="h-4 w-4" />} step="Paso 2" title="Cliente">
        <Grid>
          <Row label="Nombre" value={g.cliente_nombre} />
          <Row label="Teléfono" value={g.cliente_telefono} mono />
        </Grid>
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
      <Block icon={<Wrench className="h-4 w-4" />} step="Paso 3" title="Avería">
        <Grid>
          <Row label="Familia" value={g.categoria} />
          <Row label="Subfamilia" value={g.subfamilia} />
        </Grid>
        {g.descripcion && <Long label="Notas internas" value={g.descripcion} />}
        {g.objecion && <Long label="Objeción del cliente" value={g.objecion} />}
      </Block>

      {/* PASO 4 — Consulta a Peña */}
      <Block icon={<Package className="h-4 w-4" />} step="Paso 4" title="Presupuesto y piezas (Peña)">
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
      </Block>

      {/* PASO 5 — Plantilla enviada */}
      <Block icon={<MessageCircle className="h-4 w-4" />} step="Paso 5" title="Plantilla al cliente">
        <div className="text-[12px] text-muted-foreground">
          {g.wa_abierto || fase.index >= 1 ? "WhatsApp enviado al cliente." : "Todavía no se ha enviado."}
        </div>
        {g.mensaje ? (
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
  icon, step, title, children,
}: { icon: React.ReactNode; step: string; title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-border bg-surface p-4">
      <div className="mb-3 flex items-center gap-2">
        <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-surface-2 text-primary">
          {icon}
        </span>
        <div className="min-w-0">
          <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{step}</div>
          <h2 className="truncate text-sm font-semibold">{title}</h2>
        </div>
      </div>
      {children}
    </section>
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
