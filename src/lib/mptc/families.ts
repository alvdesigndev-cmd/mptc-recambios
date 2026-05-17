// Tipos para familias y subfamilias. Los datos viven ahora en Supabase
// (tablas `familias` y `subfamilias`) y se consumen vía `useFamilias()`.

export interface Subfamily {
  id: string;       // uuid en BD
  slug: string;     // identificador estable (se persiste en `gestiones.subfamilia`)
  name: string;
  mensaje: string;  // plantilla con "___" como marcador del importe
  orden: number;
}

export interface Family {
  id: string;
  slug: string;
  name: string;
  icon: string;
  orden: number;
  subs: Subfamily[];
}

export function findFamilyBySlug(fams: Family[], slug: string | null): Family | null {
  if (!slug) return null;
  return fams.find((f) => f.slug === slug) || null;
}

export function findSubfamilyBySlug(
  fams: Family[],
  famSlug: string | null,
  subSlug: string | null,
): Subfamily | null {
  const fam = findFamilyBySlug(fams, famSlug);
  if (!fam || !subSlug) return null;
  return fam.subs.find((s) => s.slug === subSlug) || null;
}
