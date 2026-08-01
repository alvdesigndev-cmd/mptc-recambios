/** Categorías del catálogo GPCat — módulo compartido cliente/servidor. */
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

/** Lista ordenada para selectores de UI. */
export const CATEGORIA_OPCIONES: Array<{ key: string; label: string }> = Object.entries(
  CATEGORIA_LABELS,
).map(([key, label]) => ({ key, label }));
