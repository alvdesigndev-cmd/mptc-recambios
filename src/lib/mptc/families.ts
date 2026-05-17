// Catálogo de familias y subfamilias de reparación.
// Las 7 primarias (CATS_PRIMARY) se muestran por defecto; el resto bajo "Ver más".

export interface Subfamily {
  id: string;
  name: string;
}

export interface Family {
  id: string;
  name: string;
  icon: string; // emoji por simplicidad — se puede sustituir por lucide
  subs: Subfamily[];
}

export const FAMILIES: Family[] = [
  {
    id: "motor", name: "Motor", icon: "🔧",
    subs: [
      { id: "inyectores-juntas", name: "Inyectores: kit de juntas" },
      { id: "inyectores-completos", name: "Inyectores: cambio completo" },
      { id: "culata-junta", name: "Culata / junta" },
      { id: "radiador", name: "Radiador / refrigerante" },
      { id: "bomba-agua", name: "Bomba de agua" },
      { id: "egr", name: "Válvula EGR" },
      { id: "correa-alternador", name: "Correa alternador" },
      { id: "caudalimetro", name: "Caudalímetro" },
      { id: "turbo", name: "Turbo" },
      { id: "dpf", name: "Filtro de partículas (DPF)" },
      { id: "bujias", name: "Bujías" },
      { id: "calentadores", name: "Calentadores" },
      { id: "bomba-lavaparabrisas", name: "Bomba lavaparabrisas" },
    ],
  },
  {
    id: "frenos", name: "Frenos", icon: "🛑",
    subs: [
      { id: "pastillas-del", name: "Pastillas de freno delanteras" },
      { id: "discos-pastillas-del", name: "Discos y pastillas delanteras" },
      { id: "kit-freno-tras", name: "Kit freno trasero" },
      { id: "liquido-frenos", name: "Líquido de frenos" },
    ],
  },
  {
    id: "suspension", name: "Suspensión", icon: "🌀",
    subs: [
      { id: "amort-del-v1", name: "Amortiguadores delanteros" },
      { id: "amort-del-v2", name: "Amortiguadores delanteros + copelas" },
      { id: "amort-tras", name: "Amortiguadores traseros" },
      { id: "rotulas-susp", name: "Rótulas suspensión" },
      { id: "rotulas-dir", name: "Rótulas dirección" },
      { id: "brazos", name: "Brazos suspensión" },
      { id: "bieletas", name: "Bieletas" },
      { id: "muelles", name: "Muelles" },
    ],
  },
  {
    id: "electricidad", name: "Electricidad — Batería y carga", icon: "🔋",
    subs: [
      { id: "bateria-v1", name: "Batería" },
      { id: "bateria-v2", name: "Batería con comprobador" },
      { id: "alternador", name: "Alternador" },
      { id: "motor-arranque", name: "Motor de arranque" },
    ],
  },
  {
    id: "neumaticos", name: "Neumáticos", icon: "🛞",
    subs: [
      { id: "neumaticos-del", name: "Neumáticos delanteros" },
      { id: "neumaticos-x4", name: "Neumáticos x4 — Desgaste y cristalización" },
    ],
  },
  {
    id: "mantenimiento", name: "Mantenimiento", icon: "🛠️",
    subs: [
      { id: "aceite-filtro", name: "Aceite y filtro" },
      { id: "filtro-aire", name: "Filtro aire motor" },
      { id: "filtro-combustible", name: "Filtro combustible diésel" },
      { id: "bujias-gasolina", name: "Bujías gasolina" },
      { id: "mantenimiento-completo", name: "Mantenimiento completo" },
    ],
  },
  {
    id: "diagnostico", name: "Diagnóstico eléctrico", icon: "🩺",
    subs: [
      { id: "diag-general", name: "Diagnóstico general" },
      { id: "airbag", name: "Airbag / SRS" },
      { id: "abs", name: "ABS / ESP" },
      { id: "averia-motor", name: "Avería motor" },
    ],
  },
  {
    id: "transmision", name: "Transmisión", icon: "⚙️",
    subs: [
      { id: "homocinetica", name: "Junta homocinética" },
      { id: "fuelles-trans", name: "Fuelles transmisión" },
      { id: "embrague-vibra", name: "Embrague / bimasa (vibración)" },
      { id: "embrague-ruido", name: "Embrague / bimasa (ruido)" },
    ],
  },
  {
    id: "carroceria", name: "Carrocería", icon: "🚪",
    subs: [
      { id: "elevalunas", name: "Elevalunas" },
      { id: "escobillas", name: "Escobillas limpiaparabrisas" },
    ],
  },
  {
    id: "aire", name: "Aire acondicionado", icon: "❄️",
    subs: [
      { id: "carga-gas", name: "Carga de gas" },
      { id: "compresor", name: "Compresor" },
      { id: "filtro-habitaculo", name: "Filtro de habitáculo (polen)" },
    ],
  },
  {
    id: "direccion", name: "Dirección", icon: "🎯",
    subs: [{ id: "fuelles-dir", name: "Fuelles de dirección" }],
  },
  {
    id: "distribucion", name: "Distribución", icon: "🔗",
    subs: [
      { id: "kit-correa", name: "Kit distribución correa" },
      { id: "puretech", name: "Distribución 1.2 PureTech" },
      { id: "kit-cadena", name: "Kit distribución cadena" },
    ],
  },
  {
    id: "escape", name: "Escape", icon: "💨",
    subs: [
      { id: "fap", name: "FAP / DPF" },
      { id: "cata", name: "Catalizador" },
      { id: "lambda", name: "Sonda lambda" },
    ],
  },
];

// Las 7 primeras son las primarias (Diagnóstico ocupa 2 columnas)
export const CATS_PRIMARY = FAMILIES.slice(0, 7).map((f) => f.id);

export function findFamily(id: string | null) {
  return FAMILIES.find((f) => f.id === id) || null;
}
export function findSubfamily(catId: string | null, subId: string | null) {
  const fam = findFamily(catId);
  if (!fam) return null;
  return fam.subs.find((s) => s.id === subId) || null;
}
