import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
import { Car, Search, ScanLine, Loader2, X, AlertCircle, User, Phone, FileText, History } from "lucide-react";
import { lookupPlate, type PlateLookupResult } from "@/lib/mptc/matriculas.functions";
import { supabase } from "@/integrations/supabase/client";
import { loadSettings } from "@/lib/mptc/profiles";
import { normalizeMatricula } from "@/lib/mptc/normalize";

type LocalCliente = {
  id: string;
  nombre: string | null;
  telefono: string | null;
  matricula: string | null;
  vehiculo: string | null;
  km: string | null;
  notas: string | null;
  ultima_gestion: string | null;
};
type LocalGestion = {
  id: string;
  matricula: string | null;
  vehiculo: string | null;
  categoria: string | null;
  subfamilia: string | null;
  descripcion: string | null;
  piezas: string | null;
  importe: string | null;
  estado: string;
  created_at: string;
};
type LocalInfo = { cliente: LocalCliente | null; gestiones: LocalGestion[] };

export const Route = createFileRoute("/app/matriculas")({
  component: MatriculasPage,
});

function MatriculasPage() {
  const lookup = useServerFn(lookupPlate);
  const [plate, setPlate] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<PlateLookupResult | null>(null);
  const [local, setLocal] = useState<LocalInfo | null>(null);
  const [scannerOpen, setScannerOpen] = useState(false);

  const fetchLocal = async (p: string): Promise<LocalInfo> => {
    const s = loadSettings();
    const tallerId = s?.tallerId ?? null;
    const cliQ = supabase
      .from("clientes")
      .select("id,nombre,telefono,matricula,vehiculo,km,notas,ultima_gestion")
      .eq("matricula", p)
      .limit(1);
    const gesQ = supabase
      .from("gestiones")
      .select("id,matricula,vehiculo,categoria,subfamilia,descripcion,piezas,importe,estado,created_at")
      .eq("matricula", p)
      .order("created_at", { ascending: false })
      .limit(20);
    const [cliRes, gesRes] = await Promise.all([
      tallerId ? cliQ.eq("taller_id", tallerId) : cliQ,
      tallerId ? gesQ.eq("taller_id", tallerId) : gesQ,
    ]);
    return {
      cliente: (cliRes.data?.[0] as LocalCliente | undefined) ?? null,
      gestiones: (gesRes.data as LocalGestion[] | null) ?? [],
    };
  };

  const submit = async (raw: string) => {
    const p = normalizeMatricula(raw).replace(/[^A-Z0-9]/g, "");
    if (p.length < 4) return;
    setPlate(p);
    setLoading(true);
    setResult(null);
    setLocal(null);
    try {
      const [apiRes, localRes] = await Promise.all([
        lookup({ data: { plate: p } }).catch((): PlateLookupResult => ({
          ok: false,
          plate: p,
          error: "Error al consultar",
        })),
        fetchLocal(p).catch(() => ({ cliente: null, gestiones: [] } as LocalInfo)),
      ]);
      setResult(apiRes);
      setLocal(localRes);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-5">
      <header className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15 text-primary">
          <Car className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-xl font-semibold">Matrículas</h1>
          <p className="text-xs text-muted-foreground">Consulta los datos de un vehículo</p>
        </div>
      </header>

      <section className="rounded-2xl border border-border bg-surface p-4 shadow-sm">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            submit(plate);
          }}
          className="space-y-3"
        >
          <label htmlFor="plate" className="text-xs font-medium text-muted-foreground">
            Matrícula
          </label>
          <div className="flex gap-2">
            <input
              id="plate"
              value={plate}
              onChange={(e) => setPlate(e.target.value.toUpperCase())}
              placeholder="1234ABC"
              maxLength={10}
              autoComplete="off"
              className="flex-1 rounded-xl border border-border bg-background px-4 py-3 text-lg font-mono font-semibold tracking-widest uppercase outline-none focus:border-primary"
            />
            <button
              type="button"
              onClick={() => setScannerOpen(true)}
              className="flex h-12 w-12 items-center justify-center rounded-xl border border-border bg-background text-muted-foreground hover:text-primary hover:border-primary"
              aria-label="Escanear matrícula"
            >
              <ScanLine className="h-5 w-5" />
            </button>
            <button
              type="submit"
              disabled={loading || plate.length < 4}
              className="flex h-12 items-center gap-2 rounded-xl bg-primary px-4 font-semibold text-primary-foreground disabled:opacity-50"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              Buscar
            </button>
          </div>
        </form>
      </section>

      {local && (local.cliente || local.gestiones.length > 0) && (
        <LocalInfoView info={local} plate={plate} />
      )}

      {result && (
        <section className="rounded-2xl border border-border bg-surface p-4 shadow-sm">
          <div className="mb-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Datos oficiales (DGT)
          </div>
          {result.ok ? (
            <ResultView result={result} />
          ) : (
            <div className="flex items-start gap-3 text-sm">
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
              <div>
                <div className="font-semibold">No se pudo consultar {result.plate}</div>
                <div className="text-muted-foreground">{result.error}</div>
              </div>
            </div>
          )}
        </section>
      )}

      {scannerOpen && (
        <PlateScanner
          onClose={() => setScannerOpen(false)}
          onDetected={(p) => {
            setScannerOpen(false);
            submit(p);
          }}
        />
      )}
    </div>
  );
}

function LocalInfoView({ info, plate }: { info: LocalInfo; plate: string }) {
  const { cliente, gestiones } = info;
  return (
    <section className="rounded-2xl border border-primary/40 bg-primary/5 p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <div className="text-[10px] font-semibold uppercase tracking-wider text-primary">
          Cliente de tu taller
        </div>
        <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-semibold text-primary">
          {gestiones.length} gestión{gestiones.length === 1 ? "" : "es"}
        </span>
      </div>

      {cliente ? (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <User className="h-4 w-4 text-primary" />
            <span className="font-semibold">{cliente.nombre || "Sin nombre"}</span>
            {cliente.telefono && (
              <a
                href={`tel:${cliente.telefono}`}
                className="ml-auto inline-flex items-center gap-1 text-xs text-primary hover:underline"
              >
                <Phone className="h-3 w-3" /> {cliente.telefono}
              </a>
            )}
          </div>
          <dl className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-3">
            {cliente.vehiculo && <Field k="Vehículo" v={cliente.vehiculo} />}
            {cliente.km && <Field k="Km" v={cliente.km} />}
            <div className="rounded-lg bg-surface-2 p-2">
              <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Total gestiones</div>
              {gestiones.length > 0 ? (
                <Link
                  to="/app/historial"
                  search={{ q: plate }}
                  className="text-sm font-medium text-primary hover:underline"
                >
                  {gestiones.length}
                </Link>
              ) : (
                <div className="text-sm font-medium">0</div>
              )}
            </div>
            {cliente.ultima_gestion && (
              <Field k="Última gestión" v={new Date(cliente.ultima_gestion).toLocaleDateString("es-ES")} />
            )}
          </dl>
          {cliente.notas && (
            <div className="flex items-start gap-2 rounded-lg bg-surface-2 p-3 text-xs">
              <FileText className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              <span>{cliente.notas}</span>
            </div>
          )}
        </div>
      ) : (
        <div className="text-sm text-muted-foreground">
          La matrícula <span className="font-mono font-semibold">{plate}</span> no está en clientes,
          pero tiene {gestiones.length} gestión{gestiones.length === 1 ? "" : "es"} registrada
          {gestiones.length === 1 ? "" : "s"}.
        </div>
      )}

      {gestiones.length > 0 && (
        <div className="mt-4">
          <div className="mb-2 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            <History className="h-3 w-3" /> Historial
          </div>
          <ul className="space-y-2">
            {gestiones.slice(0, 5).map((g) => (
              <li key={g.id} className="rounded-lg bg-surface-2 p-3 text-xs">
                <div className="mb-1 flex items-center justify-between">
                  <span className="font-semibold">
                    {g.subfamilia || g.categoria || "Gestión"}
                  </span>
                  <EstadoBadge estado={g.estado} />
                </div>
                <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-muted-foreground">
                  <span>{new Date(g.created_at).toLocaleDateString("es-ES")}</span>
                  {g.importe && <span>{g.importe} €</span>}
                  {g.piezas && <span className="truncate">{g.piezas}</span>}
                </div>
              </li>
            ))}
          </ul>
          {gestiones.length > 5 && (
            <Link
              to="/app/historial"
              className="mt-2 inline-block text-xs font-medium text-primary hover:underline"
            >
              Ver historial completo →
            </Link>
          )}
        </div>
      )}
    </section>
  );
}

function Field({ k, v }: { k: string; v: string }) {
  return (
    <div className="rounded-lg bg-surface-2 p-2">
      <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{k}</div>
      <div className="text-sm font-medium">{v}</div>
    </div>
  );
}

function EstadoBadge({ estado }: { estado: string }) {
  const map: Record<string, string> = {
    "aceptado": "bg-emerald-500/15 text-emerald-600",
    "rechazado": "bg-destructive/15 text-destructive",
    "en-curso": "bg-amber-500/15 text-amber-600",
  };
  const cls = map[estado] ?? "bg-muted text-muted-foreground";
  return (
    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${cls}`}>{estado}</span>
  );
}

function ResultView({ result }: { result: PlateLookupResult }) {
  const data = (result.data ?? {}) as Record<string, unknown>;
  const entries = Object.entries(data).filter(
    ([, v]) => v !== null && v !== undefined && v !== "" && typeof v !== "object",
  );

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <div className="rounded-lg border-2 border-foreground bg-yellow-300 px-3 py-1.5 font-mono text-lg font-bold tracking-widest text-black">
          {result.plate}
        </div>
        <span className="text-xs font-medium text-emerald-600">Encontrado</span>
      </div>
      {entries.length === 0 ? (
        <pre className="overflow-auto rounded-lg bg-surface-2 p-3 text-xs">
          {JSON.stringify(result.data, null, 2)}
        </pre>
      ) : (
        <dl className="grid grid-cols-2 gap-3 text-sm">
          {entries.map(([k, v]) => (
            <div key={k} className="rounded-lg bg-surface-2 p-3">
              <dt className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                {k}
              </dt>
              <dd className="font-medium">{String(v)}</dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  );
}

function PlateScanner({
  onClose,
  onDetected,
}: {
  onClose: () => void;
  onDetected: (plate: string) => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [manualMode, setManualMode] = useState(false);

  useEffect(() => {
    let stream: MediaStream | null = null;
    let raf = 0;
    let cancelled = false;

    const BD = (globalThis as any).BarcodeDetector;
    if (!BD) {
      setManualMode(true);
      return;
    }

    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" } },
        });
        if (cancelled) return;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        const detector = new BD({ formats: ["code_128", "code_39", "qr_code"] });
        const tick = async () => {
          if (cancelled || !videoRef.current) return;
          try {
            const codes = await detector.detect(videoRef.current);
            if (codes && codes.length > 0) {
              const raw = String(codes[0].rawValue || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
              if (raw.length >= 4) {
                onDetected(raw);
                return;
              }
            }
          } catch {}
          raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
      } catch (e) {
        setError("No se pudo acceder a la cámara");
        setManualMode(true);
      }
    })();

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [onDetected]);

  const [manual, setManual] = useState("");

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/80 p-0 sm:items-center sm:p-4">
      <div className="w-full max-w-md overflow-hidden rounded-t-3xl bg-surface sm:rounded-3xl">
        <div className="flex items-center justify-between border-b border-border p-4">
          <h2 className="font-semibold">Escanear matrícula</h2>
          <button onClick={onClose} className="rounded-lg p-2 hover:bg-surface-2" aria-label="Cerrar">
            <X className="h-5 w-5" />
          </button>
        </div>
        {!manualMode ? (
          <div className="relative aspect-[4/3] bg-black">
            <video ref={videoRef} className="h-full w-full object-cover" playsInline muted />
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="h-24 w-3/4 rounded-lg border-2 border-primary/80 shadow-[0_0_0_9999px_rgba(0,0,0,0.4)]" />
            </div>
            {error && (
              <div className="absolute bottom-2 left-2 right-2 rounded bg-destructive/90 p-2 text-xs text-destructive-foreground">
                {error}
              </div>
            )}
          </div>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const p = manual.toUpperCase().replace(/[^A-Z0-9]/g, "");
              if (p.length >= 4) onDetected(p);
            }}
            className="space-y-3 p-4"
          >
            <p className="text-xs text-muted-foreground">
              {error ?? "Tu dispositivo no admite escaneo automático. Introduce la matrícula manualmente."}
            </p>
            <input
              autoFocus
              value={manual}
              onChange={(e) => setManual(e.target.value.toUpperCase())}
              placeholder="1234ABC"
              className="w-full rounded-xl border border-border bg-background px-4 py-3 text-lg font-mono font-semibold tracking-widest uppercase"
            />
            <button
              type="submit"
              className="w-full rounded-xl bg-primary py-3 font-semibold text-primary-foreground"
            >
              Buscar
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
