// Catálogo de familias y subfamilias de reparación.
// Estructura definida por el taller — los nombres deben mantenerse exactos.

export interface Subfamily {
  id: string;
  name: string;
}

export interface Family {
  id: string;
  name: string;
  icon: string;
  subs: Subfamily[];
}

export const FAMILIES: Family[] = [
  {
    id: "frenos", name: "Frenos", icon: "🛑",
    subs: [
      { id: "pastillas-del", name: "Pastillas de freno delanteras" },
      { id: "discos-pastillas-del", name: "Discos y pastillas delanteras" },
      { id: "amort-del", name: "Amortiguadores delanteros" },
      { id: "amort-tras", name: "Amortiguadores traseros" },
      { id: "liquido-frenos", name: "Líquido de frenos" },
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
    id: "suspension", name: "Suspensión", icon: "🌀",
    subs: [
      { id: "rotulas-susp", name: "Rótulas de suspensión" },
      { id: "rotulas-dir", name: "Rótulas de dirección" },
      { id: "brazos-susp-del", name: "Brazos de suspensión delanteros" },
    ],
  },
  {
    id: "transmision", name: "Transmisión", icon: "⚙️",
    subs: [
      { id: "fuelles-trans", name: "Fuelles de transmisión" },
      { id: "punta-trans", name: "Punta de transmisión (junta homocinética)" },
      { id: "embrague", name: "Embrague" },
    ],
  },
  {
    id: "motor", name: "Motor", icon: "🔧",
    subs: [
      { id: "distribucion-correa", name: "Distribución — Correa estándar" },
      { id: "distribucion-puretech", name: "Distribución — Motor 1.2 PureTech" },
      { id: "bomba-agua", name: "Bomba de agua" },
      { id: "junta-culata", name: "Junta de culata" },
      { id: "radiador", name: "Radiador" },
      { id: "turbo", name: "Turbo" },
      { id: "fap-dpf", name: "Filtro de partículas (FAP/DPF)" },
      { id: "bujias", name: "Bujías" },
      { id: "correa-auxiliar", name: "Correa auxiliar" },
      { id: "caudalimetro", name: "Caudalímetro" },
    ],
  },
  {
    id: "electricidad", name: "Electricidad", icon: "🔋",
    subs: [
      { id: "bateria", name: "Batería — Avería detectada en revisión" },
      { id: "alternador", name: "Alternador" },
      { id: "motor-arranque", name: "Motor de arranque" },
      { id: "calentadores", name: "Calentadores (motor diésel)" },
      { id: "elevalunas-del", name: "Elevalunas delantero" },
    ],
  },
  {
    id: "escape", name: "Escape y emisiones", icon: "💨",
    subs: [
      { id: "egr", name: "Válvula EGR" },
    ],
  },
  {
    id: "inyeccion", name: "Inyección", icon: "💧",
    subs: [
      { id: "inyectores-gasolina-juntas", name: "Inyectores gasolina — Kit de reparación (juntas)" },
      { id: "inyectores-diesel-completos", name: "Inyectores diésel — Sustitución completa" },
    ],
  },
  {
    id: "varios", name: "Varios", icon: "🧰",
    subs: [
      { id: "escobillas", name: "Escobillas limpiaparabrisas" },
      { id: "bomba-lavaparabrisas", name: "Bomba lavaparabrisas" },
    ],
  },
  {
    id: "climatizacion", name: "Climatización", icon: "❄️",
    subs: [
      { id: "recarga-aa-filtro", name: "Recarga aire acondicionado + filtro habitáculo" },
    ],
  },
  {
    id: "mantenimiento", name: "Mantenimiento", icon: "🛠️",
    subs: [
      { id: "mantenimiento-completo", name: "Mantenimiento completo (cliente que pide solo aceite)" },
      { id: "revision-pre-itv", name: "Revisión pre-ITV" },
    ],
  },
  {
    id: "luces", name: "Luces", icon: "💡",
    subs: [
      { id: "lampara-estandar", name: "Lámpara delantera estándar fundida" },
      { id: "lampara-xenon", name: "Lámpara delantera xenón fundida" },
      { id: "luces-freno-interruptor", name: "Luces de freno traseras — Interruptor pedal" },
      { id: "luces-marcha-atras", name: "Luces de marcha atrás — Interruptor" },
      { id: "pulido-faros", name: "Pulido de faros" },
    ],
  },
  {
    id: "climatizacion-avanzada", name: "Climatización avanzada", icon: "🌬️",
    subs: [
      { id: "recarga-aa-fugas", name: "Recarga AA con detección de fugas" },
      { id: "fap-variante", name: "Filtro de partículas — Variante cliente con luz encendida" },
    ],
  },
  {
    id: "suspension-avanzada", name: "Suspensión avanzada", icon: "🚙",
    subs: [
      { id: "amort-x4", name: "Amortiguadores x4 — Coche de alta kilometraje" },
    ],
  },
  {
    id: "motor-avanzado", name: "Motor avanzado", icon: "🛢️",
    subs: [
      { id: "filtro-aire-motor", name: "Filtro de aire del motor" },
      { id: "filtro-gasoil", name: "Filtro de gasóil" },
    ],
  },
  {
    id: "frenos-especiales", name: "Frenos especiales", icon: "🦺",
    subs: [
      { id: "frenada-irregular", name: "Frenada irregular — Diagnóstico" },
    ],
  },
];

// Las 7 primeras son las primarias mostradas por defecto.
export const CATS_PRIMARY = FAMILIES.slice(0, 7).map((f) => f.id);

export function findFamily(id: string | null) {
  return FAMILIES.find((f) => f.id === id) || null;
}
export function findSubfamily(catId: string | null, subId: string | null) {
  const fam = findFamily(catId);
  if (!fam) return null;
  return fam.subs.find((s) => s.id === subId) || null;
}
