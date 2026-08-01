// Helpers server-only para la integración con Grupo Peña Automoción (GPA).
// Por ahora devuelven datos MOCK, pero la firma y los tipos ya están
// preparados para conectar la API real (svc-test.gpautomocion.com:4433).

export interface GpaArticulo {
  referencia: string;
  descripcion: string;
  marca: string;
  precio: number;
  stock: string;
  plazo: string;
  imagen?: string | null;
}

export interface GpaLineaPedido {
  referencia: string;
  descripcion: string;
  marca?: string;
  cantidad: number;
  precio: number;
}

export const GPA_URL_BASE_DEFAULT = "https://svc-test.gpautomocion.com:4433";

export function gpaConfig() {
  return {
    urlBase: process.env["GPA_URL_BASE"] || GPA_URL_BASE_DEFAULT,
    usuario: process.env["GPA_USUARIO"] || "",
    password: process.env["GPA_PASSWORD"] || "",
  };
}

export function gpaEndpoint(path: string): string {
  const { urlBase } = gpaConfig();
  return `${urlBase.replace(/\/+$/, "")}/api/SvcGPA/${path.replace(/^\/+/, "")}`;
}

/** Modo mock mientras no haya credenciales configuradas. */
export function gpaMockMode(): boolean {
  const { usuario, password } = gpaConfig();
  return !usuario || !password;
}

/** Catálogo mock por categorías, con referencias/marcas/precios de mercado. */
const MOCK_CATALOGO: Record<string, GpaArticulo[]> = {
  pastillas: [
    { referencia: "P85020", descripcion: "Juego pastillas freno delanteras", marca: "BREMBO", precio: 45.9, stock: "Disponible", plazo: "24h" },
    { referencia: "13.0460-2727.2", descripcion: "Juego pastillas freno delanteras", marca: "ATE", precio: 39.75, stock: "Disponible", plazo: "24h" },
    { referencia: "2398201", descripcion: "Juego pastillas freno traseras", marca: "TEXTAR", precio: 31.4, stock: "Disponible", plazo: "24h" },
    { referencia: "0 986 494 600", descripcion: "Juego pastillas freno traseras", marca: "BOSCH", precio: 33.2, stock: "Bajo pedido", plazo: "48h" },
    { referencia: "GDB1550", descripcion: "Juego pastillas freno delanteras", marca: "TRW", precio: 36.8, stock: "Disponible", plazo: "24h" },
  ],
  discos: [
    { referencia: "09.9772.11", descripcion: "Disco de freno delantero ventilado 288mm", marca: "BREMBO", precio: 52.3, stock: "Disponible", plazo: "24h" },
    { referencia: "24.0125-0147.1", descripcion: "Disco de freno delantero 280mm", marca: "ATE", precio: 41.9, stock: "Disponible", plazo: "24h" },
    { referencia: "92120803", descripcion: "Disco de freno trasero macizo 256mm", marca: "TEXTAR", precio: 34.6, stock: "Disponible", plazo: "24h" },
    { referencia: "DF4184", descripcion: "Disco de freno trasero 253mm", marca: "TRW", precio: 29.95, stock: "Bajo pedido", plazo: "48h" },
  ],
  kitfreno: [
    { referencia: "KT-BR-01", descripcion: "Kit frenos delanteros (2 discos + pastillas)", marca: "BREMBO", precio: 129.9, stock: "Bajo pedido", plazo: "48h" },
    { referencia: "13.0460-7195.2", descripcion: "Kit frenos traseros (2 discos + pastillas)", marca: "ATE", precio: 98.5, stock: "Disponible", plazo: "24h" },
    { referencia: "8671014153", descripcion: "Zapatas freno de mano (kit)", marca: "VALEO", precio: 27.4, stock: "Disponible", plazo: "24h" },
  ],
  filtros: [
    { referencia: "OC 593/3", descripcion: "Filtro de aceite", marca: "KNECHT / MAHLE", precio: 8.9, stock: "Disponible", plazo: "24h" },
    { referencia: "C 30 130", descripcion: "Filtro de aire motor", marca: "MANN-FILTER", precio: 16.4, stock: "Disponible", plazo: "24h" },
    { referencia: "CUK 2939", descripcion: "Filtro de habitáculo con carbón activo", marca: "MANN-FILTER", precio: 19.8, stock: "Disponible", plazo: "24h" },
    { referencia: "0 450 906 457", descripcion: "Filtro de combustible diésel", marca: "BOSCH", precio: 22.6, stock: "Bajo pedido", plazo: "48h" },
  ],
  aceite: [
    { referencia: "8100 X-CESS 5W40 5L", descripcion: "Aceite motor 5W-40 sintético 5L", marca: "MOTUL", precio: 42.5, stock: "Disponible", plazo: "24h" },
    { referencia: "EDGE 5W30 LL 5L", descripcion: "Aceite motor 5W-30 Longlife 5L", marca: "CASTROL", precio: 46.9, stock: "Disponible", plazo: "24h" },
    { referencia: "HELIX HX8 5W40 4L", descripcion: "Aceite motor 5W-40 4L", marca: "SHELL", precio: 33.2, stock: "Disponible", plazo: "24h" },
  ],
  bateria: [
    { referencia: "S4 007", descripcion: "Batería 12V 72Ah 680A", marca: "BOSCH", precio: 109.9, stock: "Disponible", plazo: "24h" },
    { referencia: "EA722", descripcion: "Batería EFB Start-Stop 12V 72Ah", marca: "VARTA", precio: 142.5, stock: "Bajo pedido", plazo: "48h" },
    { referencia: "570 500 065", descripcion: "Batería 12V 70Ah 650A", marca: "EXIDE", precio: 96.4, stock: "Disponible", plazo: "24h" },
  ],
  embrague: [
    { referencia: "624 3213 09", descripcion: "Kit de embrague completo", marca: "LUK", precio: 268.4, stock: "Bajo pedido", plazo: "48h" },
    { referencia: "3000 951 001", descripcion: "Kit de embrague 3 piezas", marca: "SACHS", precio: 242.9, stock: "Bajo pedido", plazo: "72h" },
    { referencia: "826 812", descripcion: "Volante motor bimasa", marca: "VALEO", precio: 389.0, stock: "Bajo pedido", plazo: "72h" },
  ],
  amortiguadores: [
    { referencia: "22-183430", descripcion: "Amortiguador delantero gas", marca: "BILSTEIN", precio: 74.9, stock: "Disponible", plazo: "24h" },
    { referencia: "334834", descripcion: "Amortiguador trasero gas", marca: "KYB", precio: 52.3, stock: "Disponible", plazo: "24h" },
    { referencia: "SM5560", descripcion: "Kit soporte amortiguador delantero", marca: "MONROE", precio: 38.7, stock: "Bajo pedido", plazo: "48h" },
  ],
  distribucion: [
    { referencia: "530 0201 10", descripcion: "Kit correa de distribución con bomba de agua", marca: "INA", precio: 158.9, stock: "Bajo pedido", plazo: "48h" },
    { referencia: "KD457.51", descripcion: "Kit distribución (correa + tensores)", marca: "DAYCO", precio: 112.4, stock: "Disponible", plazo: "24h" },
    { referencia: "CT1028WP2", descripcion: "Kit correa distribución + bomba agua", marca: "CONTITECH", precio: 134.6, stock: "Disponible", plazo: "24h" },
  ],
  bujias: [
    { referencia: "FR7DPP332", descripcion: "Bujía de encendido (unidad)", marca: "BOSCH", precio: 9.4, stock: "Disponible", plazo: "24h" },
    { referencia: "PFR7S8EG", descripcion: "Bujía iridio-platino (unidad)", marca: "NGK", precio: 17.9, stock: "Disponible", plazo: "24h" },
    { referencia: "0 250 403 009", descripcion: "Calentador / bujía precalentamiento", marca: "BOSCH", precio: 14.2, stock: "Disponible", plazo: "24h" },
  ],
  radiador: [
    { referencia: "8MK 376 700-584", descripcion: "Radiador de agua motor", marca: "HELLA", precio: 132.5, stock: "Bajo pedido", plazo: "48h" },
    { referencia: "CR 1088 000S", descripcion: "Radiador refrigeración motor", marca: "MAHLE", precio: 148.9, stock: "Bajo pedido", plazo: "72h" },
    { referencia: "735.60", descripcion: "Bomba de agua", marca: "SKF", precio: 46.3, stock: "Disponible", plazo: "24h" },
  ],
  escape: [
    { referencia: "0 258 006 026", descripcion: "Sonda lambda", marca: "BOSCH", precio: 68.9, stock: "Disponible", plazo: "24h" },
    { referencia: "096-152", descripcion: "Catalizador con junta", marca: "BM CATALYSTS", precio: 214.0, stock: "Bajo pedido", plazo: "72h" },
    { referencia: "5511-11-0080940P", descripcion: "Filtro de partículas DPF", marca: "BOSAL", precio: 386.5, stock: "Bajo pedido", plazo: "72h" },
  ],
  suspension: [
    { referencia: "V10-7010", descripcion: "Rótula de suspensión inferior", marca: "VAICO", precio: 21.4, stock: "Disponible", plazo: "24h" },
    { referencia: "JTS7573", descripcion: "Bieleta barra estabilizadora", marca: "TRW", precio: 14.9, stock: "Disponible", plazo: "24h" },
    { referencia: "31 30 6 786 156", descripcion: "Silentblock brazo suspensión", marca: "LEMFÖRDER", precio: 27.8, stock: "Bajo pedido", plazo: "48h" },
  ],
  direccion: [
    { referencia: "JAR203", descripcion: "Rótula axial de dirección", marca: "TRW", precio: 18.6, stock: "Disponible", plazo: "24h" },
    { referencia: "V10-0640", descripcion: "Bomba hidráulica dirección asistida", marca: "VAICO", precio: 178.9, stock: "Bajo pedido", plazo: "72h" },
  ],
  alternador: [
    { referencia: "0 986 049 231", descripcion: "Alternador 140A", marca: "BOSCH", precio: 289.5, stock: "Bajo pedido", plazo: "48h" },
    { referencia: "438171", descripcion: "Motor de arranque", marca: "VALEO", precio: 246.9, stock: "Bajo pedido", plazo: "72h" },
    { referencia: "6PK1200", descripcion: "Correa auxiliar poli-V", marca: "GATES", precio: 16.8, stock: "Disponible", plazo: "24h" },
  ],
  neumaticos: [
    { referencia: "205/55R16 91V", descripcion: "Neumático turismo verano", marca: "MICHELIN", precio: 89.9, stock: "Disponible", plazo: "24h" },
    { referencia: "195/65R15 91H", descripcion: "Neumático turismo verano", marca: "CONTINENTAL", precio: 72.5, stock: "Disponible", plazo: "24h" },
  ],
};

const CATEGORIA_KEYWORDS: Array<{ key: keyof typeof MOCK_CATALOGO | string; words: string[] }> = [
  {
    key: "pastillas",
    words: [
      "pastilla", "pastillas", "balata", "balatas", "ferodo", "ferodos",
      "forro", "forros", "brake pad", "pads", "galleta", "galletas",
    ],
  },
  {
    key: "discos",
    words: ["disco", "discos", "tambor", "tambores", "campana", "campanas", "rotor", "rotores"],
  },
  {
    key: "kitfreno",
    words: [
      "freno", "frenos", "frenada", "frenar", "kit freno", "zapata", "zapatas",
      "freno de mano", "mano", "chirria", "chirrido", "pito al frenar",
    ],
  },
  {
    key: "filtros",
    words: [
      "filtro", "filtros", "filtro de aire", "filtro de aceite", "filtro de combustible",
      "filtro de gasoil", "filtro de habitaculo", "habitaculo", "polen", "aire acondicionado",
      "cabina", "purificador",
    ],
  },
  {
    key: "aceite",
    words: [
      "aceite", "aceites", "lubricante", "lubricantes", "engrase", "5w30", "5w40", "10w40",
      "cambio de aceite", "mantenimiento", "revision",
    ],
  },
  {
    key: "bateria",
    words: [
      "bateria", "baterias", "acumulador", "pila", "arranca", "no arranca",
      "12v", "se queda sin bateria", "start stop", "start-stop",
    ],
  },
  {
    key: "embrague",
    words: [
      "embrague", "embragues", "clutch", "croche", "bimasa", "volante motor",
      "volante bimasa", "disco de embrague", "collarin", "patina",
    ],
  },
  {
    key: "amortiguadores",
    words: [
      "amortiguador", "amortiguadores", "amortiguacion", "shock", "muelle", "muelles",
      "espiral", "suspension trasera", "suspension delantera", "rebota", "botes",
    ],
  },
  {
    key: "distribucion",
    words: [
      "distribucion", "correa", "correa de distribucion", "kit de distribucion",
      "cadena", "cadena de distribucion", "tensor", "tensores", "polea",
    ],
  },
  {
    key: "bujias",
    words: [
      "bujia", "bujias", "calentador", "calentadores", "precalentamiento",
      "encendido", "chispa", "bobina", "ratea",
    ],
  },
  {
    key: "radiador",
    words: [
      "radiador", "refrigeracion", "refrigerante", "anticongelante", "bomba de agua",
      "termostato", "temperatura", "calienta", "sobrecalienta", "pierde agua", "ventilador",
    ],
  },
  {
    key: "escape",
    words: [
      "escape", "tubo de escape", "silencioso", "catalizador", "cataliticio", "dpf",
      "fap", "particulas", "lambda", "sonda lambda", "humo", "gases", "egr",
    ],
  },
  {
    key: "suspension",
    words: [
      "suspension", "rotula", "rotulas", "bieleta", "bieletas", "silentblock",
      "brazo de suspension", "trapecio", "buje", "ruido", "holgura", "juego",
    ],
  },
  {
    key: "direccion",
    words: [
      "direccion", "volante", "asistida", "cremallera", "bomba de direccion",
      "rotula axial", "terminal de direccion", "duro al girar", "se va a un lado",
    ],
  },
  {
    key: "alternador",
    words: [
      "alternador", "dinamo", "arranque", "motor de arranque", "burro",
      "correa auxiliar", "poli-v", "no carga", "bateria no carga", "testigo de bateria",
    ],
  },
  {
    key: "neumaticos",
    words: [
      "neumatico", "neumaticos", "goma", "gomas", "rueda", "ruedas", "llanta",
      "cubierta", "pinchazo", "desgaste", "alineado",
    ],
  },
];

/** Normaliza y trocea el texto en palabras útiles (>=3 letras). */
function tokens(s: string): string[] {
  return stripAccents(s.toLowerCase())
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length >= 3);
}

/**
 * Coincidencia flexible: frase completa contenida, palabra exacta,
 * o coincidencia parcial por prefijo (pastill / balat / filtr…).
 */
function matchesKeyword(qNorm: string, qTokens: string[], word: string): boolean {
  const w = stripAccents(word.toLowerCase());
  if (w.includes(" ")) return qNorm.includes(w);
  const wTokens = tokens(w);
  const wt = wTokens[0] ?? w;
  return qTokens.some((t) => {
    if (t === wt) return true;
    const min = Math.min(t.length, wt.length);
    if (min < 4) return false;
    return t.startsWith(wt.slice(0, min)) || wt.startsWith(t.slice(0, min));
  });
}


const MOCK_PIEZAS: GpaArticulo[] = [
  ...MOCK_CATALOGO["pastillas"]!.slice(0, 2),
  ...MOCK_CATALOGO["discos"]!.slice(0, 1),
  ...MOCK_CATALOGO["filtros"]!.slice(0, 2),
  ...MOCK_CATALOGO["aceite"]!.slice(0, 1),
  ...MOCK_CATALOGO["bateria"]!.slice(0, 1),
];

export function mockIniciarSesion() {
  return {
    ok: true,
    mock: true,
    token: `mock-token-${Date.now().toString(36)}`,
    expiraEn: 3600,
  };
}

function stripAccents(s: string): string {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

const TODOS: GpaArticulo[] = Object.values(MOCK_CATALOGO).flat();

/** Etiquetas legibles de cada categoría del catálogo. */
export const CATEGORIA_LABELS: Record<string, string> = {
  pastillas: "Pastillas de freno",
  discos: "Discos y tambores",
  kitfreno: "Frenos (kits y zapatas)",
  filtros: "Filtros",
  aceite: "Aceites y lubricantes",
  bateria: "Baterías",
  embrague: "Embrague",
  amortiguadores: "Amortiguadores y muelles",
  distribucion: "Distribución",
  bujias: "Bujías y encendido",
  radiador: "Refrigeración",
  escape: "Escape y anticontaminación",
  suspension: "Suspensión",
  direccion: "Dirección",
  neumaticos: "Neumáticos y ruedas",
};

export interface GpaCriterioCategoria {
  key: string;
  label: string;
  sinonimos: string[];
}

export interface GpaCriterio {
  tipo: "referencia" | "categoria" | "texto" | "destacados";
  termino: string;
  categorias: GpaCriterioCategoria[];
}

export interface GpaBusquedaMock {
  articulos: GpaArticulo[];
  criterio: GpaCriterio;
}

export function mockConsultaArticulos(query: string): GpaBusquedaMock {
  const raw = (query || "").trim();
  if (!raw) {
    return { articulos: MOCK_PIEZAS, criterio: { tipo: "destacados", termino: "", categorias: [] } };
  }
  const q = stripAccents(raw.toLowerCase());

  // 1) Búsqueda por referencia exacta/parcial (mín. 3 caracteres alfanuméricos).
  const refQ = q.replace(/[^a-z0-9]/g, "");
  if (refQ.length >= 3) {
    const porRef = TODOS.filter((p) => p.referencia.toLowerCase().replace(/[^a-z0-9]/g, "").includes(refQ));
    if (porRef.length > 0) {
      return { articulos: porRef, criterio: { tipo: "referencia", termino: raw, categorias: [] } };
    }
  }

  // 2) Búsqueda por categoría con sinónimos y coincidencia parcial.
  const qTokens = tokens(q);
  const categorias: GpaCriterioCategoria[] = [];
  for (const c of CATEGORIA_KEYWORDS) {
    const sinonimos = c.words.filter((w) => matchesKeyword(q, qTokens, w));
    if (sinonimos.length > 0) {
      const key = c.key as string;
      categorias.push({ key, label: CATEGORIA_LABELS[key] ?? key, sinonimos });
    }
  }

  if (categorias.length > 0) {
    const seen = new Set<string>();
    const out: GpaArticulo[] = [];
    for (const cat of categorias) {
      for (const p of MOCK_CATALOGO[cat.key] ?? []) {
        if (seen.has(p.referencia)) continue;
        seen.add(p.referencia);
        out.push(p);
      }
    }
    return { articulos: out, criterio: { tipo: "categoria", termino: raw, categorias } };
  }

  // 3) Fallback: texto libre sobre descripción o marca (frase o palabras parciales).
  const libre = TODOS.filter((p) => {
    const desc = stripAccents(p.descripcion.toLowerCase());
    const marca = stripAccents(p.marca.toLowerCase());
    if (desc.includes(q) || marca.includes(q)) return true;
    if (qTokens.length === 0) return false;
    return qTokens.every((t) =>
      tokens(desc).some((d) => d.startsWith(t) || t.startsWith(d)) || marca.includes(t),
    );
  });
  if (libre.length > 0) {
    return { articulos: libre, criterio: { tipo: "texto", termino: raw, categorias: [] } };
  }
  return { articulos: MOCK_PIEZAS, criterio: { tipo: "destacados", termino: raw, categorias: [] } };
}




export function mockGenerarPedido(lineas: GpaLineaPedido[]) {
  const total = lineas.reduce((a, l) => a + l.precio * (l.cantidad || 1), 0);
  return {
    ok: true,
    mock: true,
    numeroPedido: `MOCK-${Date.now().toString(36).toUpperCase()}`,
    total: Number(total.toFixed(2)),
    estado: "Recibido",
  };
}

export function mockConsultaPedidos() {
  return {
    ok: true,
    mock: true,
    pedidos: [
      { numeroPedido: "MOCK-A1B2C3", fecha: new Date().toISOString(), estado: "Recibido", total: 84.4 },
    ],
  };
}

/** Caché en memoria del token GPA (por instancia de worker). */
let tokenCache: { token: string; expiresAt: number } | null = null;
let tokenInFlight: Promise<string> | null = null;

const TOKEN_MARGEN_MS = 60_000; // renovar 1 min antes de expirar
const TOKEN_TTL_FALLBACK_MS = 55 * 60_000; // si la API no informa expiración

async function requestGpaToken(): Promise<string> {
  const { usuario, password } = gpaConfig();
  const res = await fetch(gpaEndpoint("IniciarSesion"), {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ Usuario: usuario, Password: password }),
  });
  if (!res.ok) throw new Error(`IniciarSesion ${res.status}`);
  const json = (await res.json()) as {
    token?: string;
    Token?: string;
    expiraEn?: number;
    expiresIn?: number;
    expiration?: string;
    Expiracion?: string;
  };
  const token = json.token ?? json.Token ?? "";
  if (!token) throw new Error("IniciarSesion sin token");

  const segundos = json.expiraEn ?? json.expiresIn;
  let ttlMs = typeof segundos === "number" && segundos > 0 ? segundos * 1000 : TOKEN_TTL_FALLBACK_MS;
  const iso = json.expiration ?? json.Expiracion;
  if (iso) {
    const ms = new Date(iso).getTime() - Date.now();
    if (Number.isFinite(ms) && ms > 0) ttlMs = ms;
  }

  tokenCache = { token, expiresAt: Date.now() + Math.max(ttlMs - TOKEN_MARGEN_MS, 5_000) };
  return token;
}

/**
 * Obtiene el token real de GPA (server-only), reutilizándolo mientras siga válido.
 * Evita un IniciarSesion por cada búsqueda de piezas.
 */
export async function fetchGpaToken(): Promise<string> {
  if (tokenCache && tokenCache.expiresAt > Date.now()) return tokenCache.token;
  if (tokenInFlight) return tokenInFlight;
  tokenInFlight = requestGpaToken().finally(() => {
    tokenInFlight = null;
  });
  return tokenInFlight;
}

/** Invalida el token en caché (usar tras un 401 de la API). */
export function invalidateGpaToken(): void {
  tokenCache = null;
}


/**
 * POST autenticado a GPA reutilizando el token en caché.
 * Si la API responde 401, invalida el token y reintenta una vez.
 */
export async function gpaAuthPost(endpoint: string, body: unknown): Promise<Response> {
  const call = async (token: string) =>
    fetch(gpaEndpoint(endpoint), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    });

  let res = await call(await fetchGpaToken());
  if (res.status === 401 || res.status === 403) {
    invalidateGpaToken();
    res = await call(await fetchGpaToken());
  }
  return res;
}

/** Detecta categorías y sinónimos aplicados a un texto de búsqueda (sin filtrar catálogo). */
export function detectarCriterio(query: string): GpaCriterio {
  const raw = (query || "").trim();
  if (!raw) return { tipo: "destacados", termino: "", categorias: [] };
  const q = stripAccents(raw.toLowerCase());
  const qTokens = tokens(q);
  const categorias: GpaCriterioCategoria[] = [];
  for (const c of CATEGORIA_KEYWORDS) {
    const sinonimos = c.words.filter((w) => matchesKeyword(q, qTokens, w));
    if (sinonimos.length > 0) {
      const key = c.key as string;
      categorias.push({ key, label: CATEGORIA_LABELS[key] ?? key, sinonimos });
    }
  }
  if (categorias.length > 0) return { tipo: "categoria", termino: raw, categorias };
  if (/^[a-z0-9.\- ]{3,}$/i.test(raw) && /\d/.test(raw)) {
    return { tipo: "referencia", termino: raw, categorias: [] };
  }
  return { tipo: "texto", termino: raw, categorias: [] };
}
