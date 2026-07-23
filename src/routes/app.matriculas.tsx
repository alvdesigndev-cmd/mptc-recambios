import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
import { Car, Search, ScanLine, Loader2, X, AlertCircle, User, Phone, FileText, History, Clock, Trash2, Wrench, Camera, CameraOff, Keyboard, Info } from "lucide-react";
import { lookupPlate, type PlateLookupResult } from "@/lib/mptc/matriculas.functions";
import { ocrMatricula } from "@/lib/mptc/ocr.functions";
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

type RecentItem = {
  plate: string;
  vehiculo: string;
  ts: number;
  data: Record<string, unknown>;
};

const RECENT_KEY = "mptc:matriculas:recientes";
const DRAFT_KEY = "mptc:nueva:draft";

function loadRecent(): RecentItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? (arr as RecentItem[]) : [];
  } catch {
    return [];
  }
}

function saveRecent(items: RecentItem[]) {
  try {
    localStorage.setItem(RECENT_KEY, JSON.stringify(items.slice(0, 12)));
  } catch {}
}

function pickStr(data: Record<string, unknown>, ...keys: string[]): string {
  for (const k of keys) {
    const v = data?.[k];
    if (v === undefined || v === null) continue;
    const s = String(v).trim();
    if (!s) continue;
    if (/^(n\/?d|nd|null|undefined|-|—|desconocido)$/i.test(s)) continue;
    return s;
  }
  return "";
}

function isValidVin(v: string): boolean {
  const s = v.toUpperCase().replace(/\s+/g, "");
  return /^[A-HJ-NPR-Z0-9]{17}$/.test(s);
}

function normalizeFecha(v: string): string {
  const s = v.trim();
  if (!s) return "";
  // DD/MM/YYYY
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(s)) return s;
  // YYYY-MM-DD -> DD/MM/YYYY
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[3]}/${iso[2]}/${iso[1]}`;
  return "";
}

export type MappedPlate = {
  vin: string;
  marca: string;
  modelo: string;
  motor: string;
  fechaMatriculacion: string;
  vehiculo: string;
};

export function mapApiData(data: Record<string, unknown>): MappedPlate {
  const marca = pickStr(data, "MARCA", "marca", "brand");
  const modelo = pickStr(data, "MODELO", "modelo", "model", "modelEn");
  const motorRaw = pickStr(data, "MOTOR", "motor", "version", "engineCode");
  const vinRaw = pickStr(data, "VIN", "vin", "vinNumber");
  const fechaRaw = pickStr(
    data,
    "FECHA_MATRICULACION",
    "fecha_matriculacion",
    "firstRegistrationDateEs",
    "firstRegistrationDate",
  );
  const vin = isValidVin(vinRaw) ? vinRaw.toUpperCase() : "";
  const fechaMatriculacion = normalizeFecha(fechaRaw);
  const motor = motorRaw;
  return {
    vin,
    marca,
    modelo,
    motor,
    fechaMatriculacion,
    vehiculo: `${marca} ${modelo}`.trim(),
  };
}

function buildVehiculo(data: Record<string, unknown>): string {
  return mapApiData(data).vehiculo;
}

function validatePlateInput(p: string): { ok: boolean; error?: string } {
  const s = normalizeMatricula(p).replace(/[^A-Z0-9]/g, "");
  if (s.length === 0) return { ok: false };
  if (s.length < 4) return { ok: false, error: "Mínimo 4 caracteres" };
  if (s.length > 10) return { ok: false, error: "Máximo 10 caracteres" };
  if (!/[A-Z]/.test(s) || !/[0-9]/.test(s)) {
    return { ok: false, error: "Debe incluir letras y números" };
  }
  return { ok: true };
}


/**
 * Builds an auto-generated "Datos técnicos del vehículo" block using the
 * additional fields the API returns (cilindrada, potencia, tipo de motor,
 * inyección, país, códigos TecDoc…). Only includes fields that came back
 * with a real value.
 */
export function buildTechDescripcion(
  plate: string,
  data: Record<string, unknown>,
): string {
  const rows: Array<[string, string]> = [];
  const add = (label: string, ...keys: string[]) => {
    const v = pickStr(data, ...keys);
    if (v) rows.push([label, v]);
  };
  add("Matrícula", "MATRICULA", "matricula", "plate");
  add("Marca", "MARCA", "marca", "brand");
  add("Modelo", "MODELO", "modelo", "model", "modelEn");
  add("Versión", "VERSION", "version");
  add("Carrocería", "bodyType");
  add("Tipo vehículo", "vehicleType");
  const cil = pickStr(data, "TPMOTOR", "tpmotor", "displacementCcm", "engineCapacityLiters");
  if (cil) rows.push(["Cilindrada", cil]);
  add("Tipo motor", "TYMOTOR", "tymotor", "fuelType", "fuelSystem");
  add("Códigos motor", "MOTOR", "motor", "engineCode", "platformCodes");
  const kw = pickStr(data, "KWs", "kws", "KW", "kw", "powerKW", "powerHP");
  if (kw) {
    const cv = Math.round(parseFloat(kw.replace(",", ".")) * 1.35962);
    rows.push(["Potencia", Number.isFinite(cv) && cv > 0 ? `${kw} kW (~${cv} CV)` : `${kw} kW`]);
  }
  add("Transmisión", "transmissionType", "gearboxType");
  add("Inyección", "INYECCION", "inyeccion");
  add("País", "PAIS", "pais", "country");
  const vin = pickStr(data, "VIN", "vin", "vinNumber");
  if (vin && isValidVin(vin)) rows.push(["VIN", vin.toUpperCase()]);
  const fecha = normalizeFecha(
    pickStr(data, "FECHA_MATRICULACION", "fecha_matriculacion", "firstRegistrationDateEs", "firstRegistrationDate"),
  );
  if (fecha) {
    const parts = fecha.split("/");
    const year = parts.length === 3 ? parseInt(parts[2], 10) : NaN;
    const antig = Number.isFinite(year) ? new Date().getFullYear() - year : NaN;
    rows.push(["Matriculación", Number.isFinite(antig) && antig >= 0 ? `${fecha} (${antig} años)` : fecha]);
  }
  const tecdoc: string[] = [];
  const idMarca = pickStr(data, "ID_MARCA_TECDOC", "id_marca_tecdoc", "tecdocManufacturerId");
  const idModelo = pickStr(data, "ID_MODELO_TECDOC", "id_modelo_tecdoc", "tecdocModelId");
  const idKtype = pickStr(data, "ID_KTYPE", "id_ktype", "kType", "tecdocCarId");
  if (idMarca) tecdoc.push(`marca ${idMarca}`);
  if (idModelo) tecdoc.push(`modelo ${idModelo}`);
  if (idKtype) tecdoc.push(`ktype ${idKtype}`);
  if (tecdoc.length) rows.push(["TecDoc", tecdoc.join(" · ")]);

  if (!rows.length) return "";
  const body = rows.map(([k, v]) => `• ${k}: ${v}`).join("\n");
  return `📋 Datos técnicos (${plate})\n${body}`;
}


export const Route = createFileRoute("/app/matriculas")({
  component: MatriculasPage,
});

function MatriculasPage() {
  const lookup = useServerFn(lookupPlate);
  const navigate = useNavigate();
  const [plate, setPlate] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<PlateLookupResult | null>(null);
  const [local, setLocal] = useState<LocalInfo | null>(null);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [recent, setRecent] = useState<RecentItem[]>([]);
  const lastSubmittedRef = useRef("");
  const submitRef = useRef<(raw: string) => Promise<void>>(async () => {});


  useEffect(() => {
    setRecent(loadRecent());
  }, []);

  // Búsqueda automática con debounce (500 ms) tras una matrícula válida
  useEffect(() => {
    const check = plate ? validatePlateInput(plate) : null;
    if (!check?.ok) return;
    const t = setTimeout(() => {
      if (plate !== lastSubmittedRef.current) {
        submitRef.current(plate);
      }
    }, 500);
    return () => clearTimeout(t);
  }, [plate]);


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
    const check = validatePlateInput(p);
    if (!check.ok) return;
    if (p === lastSubmittedRef.current) return;
    lastSubmittedRef.current = p;
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
      if (apiRes.ok && apiRes.data) {
        const item: RecentItem = {
          plate: p,
          vehiculo: buildVehiculo(apiRes.data),
          ts: Date.now(),
          data: apiRes.data,
        };
        setRecent((prev) => {
          const next = [item, ...prev.filter((r) => r.plate !== p)].slice(0, 12);
          saveRecent(next);
          return next;
        });
      }
    } finally {
      setLoading(false);
    }
  };
  submitRef.current = submit;

  const validation = plate ? validatePlateInput(plate) : null;


  const startGestion = (p: string, data: Record<string, unknown>) => {
    const m = mapApiData(data);
    const tech = buildTechDescripcion(p, data);
    try {
      const draft = {
        step: 1,
        matricula: p,
        vehiculo: m.vehiculo || undefined,
        vin: m.vin || undefined,
        marca: m.marca || undefined,
        modelo: m.modelo || undefined,
        motor: m.motor || undefined,
        fechaMatriculacion: m.fechaMatriculacion || undefined,
        descripcion: tech || undefined,
      };
      sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    } catch {}
    navigate({ to: "/app/nueva", search: { fresh: String(Date.now()) } });
  };

  const removeRecent = (p: string) => {
    setRecent((prev) => {
      const next = prev.filter((r) => r.plate !== p);
      saveRecent(next);
      return next;
    });
  };

  const clearRecent = () => {
    saveRecent([]);
    setRecent([]);
  };

  return (
    <div className="space-y-5">
      <header className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15 text-primary">
          <Car className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <h1 className="text-xl font-semibold">Matrículas</h1>
          <p className="text-xs text-muted-foreground">Consulta los datos de un vehículo</p>
        </div>
        <Link
          to="/app/matriculas/historial"
          className="flex items-center gap-1.5 rounded-xl border border-border bg-surface px-3 py-2 text-xs font-medium text-muted-foreground hover:text-primary hover:border-primary"
        >
          <History className="h-3.5 w-3.5" />
          Historial
        </Link>
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
          <div className="flex flex-wrap gap-2 sm:flex-nowrap">
            <div className="relative min-w-0 flex-1 basis-full sm:basis-auto">
              <input
                id="plate"
                value={plate}
                onChange={(e) => setPlate(e.target.value.toUpperCase())}
                placeholder="1234ABC"
                maxLength={10}
                autoComplete="off"
                disabled={loading}
                aria-invalid={validation ? !validation.ok : false}
                aria-describedby="plate-hint"
                className="w-full rounded-xl border border-border bg-background px-4 py-3 pr-10 text-lg font-mono font-semibold tracking-widest uppercase outline-none focus:border-primary disabled:opacity-60"
              />
              {loading && (
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={() => setScannerOpen(true)}
              disabled={loading}
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-border bg-background text-muted-foreground hover:text-primary hover:border-primary disabled:opacity-50"
              aria-label="Escanear matrícula"
            >
              <ScanLine className="h-5 w-5" />
            </button>
            <button
              type="submit"
              disabled={loading || !validation?.ok}
              className="flex h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-primary px-4 font-semibold text-primary-foreground disabled:opacity-50 sm:flex-none"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              Buscar
            </button>
          </div>
          {validation && !validation.ok && (
            <div id="plate-hint" className="flex items-center gap-1.5 text-xs text-destructive">
              <AlertCircle className="h-3.5 w-3.5" />
              {validation.error}
            </div>
          )}
        </form>
      </section>


      {local && (local.cliente || local.gestiones.length > 0) && (
        <LocalInfoView info={local} plate={plate} />
      )}

      {result && (
        <section className="rounded-2xl border border-border bg-surface p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Datos oficiales (DGT)
            </div>
            {result.ok && result.data && (
              <button
                type="button"
                onClick={() => startGestion(result.plate, result.data as Record<string, unknown>)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:opacity-90"
              >
                <Wrench className="h-3.5 w-3.5" /> Nueva gestión
              </button>
            )}
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

      {recent.length > 0 && (
        <section className="rounded-2xl border border-border bg-surface p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              <Clock className="h-3 w-3" /> Búsquedas recientes
            </div>
            <button
              type="button"
              onClick={clearRecent}
              className="text-[10px] font-medium text-muted-foreground hover:text-destructive"
            >
              Limpiar
            </button>
          </div>
          <ul className="space-y-2">
            {recent.map((r) => (
              <li
                key={r.plate}
                className="flex items-center gap-2 rounded-lg bg-surface-2 p-2"
              >
                <button
                  type="button"
                  onClick={() => submit(r.plate)}
                  className="flex flex-1 items-center gap-3 text-left"
                >
                  <div className="rounded border-2 border-foreground bg-yellow-300 px-2 py-1 font-mono text-xs font-bold tracking-widest text-black">
                    {r.plate}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">
                      {r.vehiculo || "Vehículo"}
                    </div>
                    <div className="text-[10px] text-muted-foreground">
                      {new Date(r.ts).toLocaleString("es-ES", {
                        day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit",
                      })}
                    </div>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => startGestion(r.plate, r.data)}
                  className="rounded-md bg-primary/15 p-2 text-primary hover:bg-primary/25"
                  aria-label="Nueva gestión"
                  title="Nueva gestión"
                >
                  <Wrench className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => removeRecent(r.plate)}
                  className="rounded-md p-2 text-muted-foreground hover:text-destructive"
                  aria-label="Eliminar"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </li>
            ))}
          </ul>
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
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [manualMode, setManualMode] = useState(false);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [manual, setManual] = useState("");
  const runOcr = useServerFn(ocrMatricula);

  useEffect(() => {
    let stream: MediaStream | null = null;
    let cancelled = false;

    (async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        setManualMode(true);
        setError("La cámara no está disponible en este dispositivo");
        return;
      }
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" } },
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
          setReady(true);
        }
      } catch {
        setError("No se pudo acceder a la cámara");
        setManualMode(true);
      }
    })();

    return () => {
      cancelled = true;
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const capture = async () => {
    const video = videoRef.current;
    if (!video || busy) return;
    setBusy(true);
    setError(null);
    try {
      const w = video.videoWidth;
      const h = video.videoHeight;
      if (!w || !h) throw new Error("Cámara no lista");
      const canvas = canvasRef.current ?? document.createElement("canvas");
      canvasRef.current = canvas;
      const maxSide = 1280;
      const scale = Math.min(1, maxSide / Math.max(w, h));
      canvas.width = Math.round(w * scale);
      canvas.height = Math.round(h * scale);
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas no disponible");
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
      const res = await runOcr({ data: { imageDataUrl: dataUrl } });
      const m = (res?.matricula || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
      if (m.length >= 4) {
        onDetected(m);
      } else {
        setError("No se detectó ninguna matrícula. Inténtalo de nuevo o introdúcela manualmente.");
      }
    } catch (e) {
      setError("No se pudo leer la matrícula. Inténtalo de nuevo.");
    } finally {
      setBusy(false);
    }
  };

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
          <>
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
            <div className="flex items-center justify-between gap-2 p-4">
              <button
                type="button"
                onClick={() => setManualMode(true)}
                className="text-xs font-medium text-muted-foreground hover:text-primary"
              >
                Introducir manualmente
              </button>
              <button
                type="button"
                onClick={capture}
                disabled={!ready || busy}
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 font-semibold text-primary-foreground disabled:opacity-50"
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
                {busy ? "Leyendo..." : "Capturar y leer"}
              </button>
            </div>
          </>
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
              {error ?? "Introduce la matrícula manualmente."}
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
