// Normalizadores compartidos para entrada de cliente/gestión.
// Mantienen el mismo formato en todas las pantallas y en la base de datos.

export const normalizeMatricula = (v: string) =>
  v.replace(/[\s-]/g, "").toUpperCase();

export const normalizeTelefono = (v: string) => {
  const t = v.replace(/[\s\-().]/g, "");
  return t.startsWith("+")
    ? "+" + t.slice(1).replace(/\D/g, "")
    : t.replace(/\D/g, "");
};
