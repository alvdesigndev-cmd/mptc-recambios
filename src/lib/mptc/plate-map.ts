// Utilidades compartidas para mapear la respuesta de APIVehículo a los campos
// de la app (matrículas y nueva gestión).

export function pickStr(data: Record<string, unknown>, ...keys: string[]): string {
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

export function isValidVin(v: string): boolean {
  const s = v.toUpperCase().replace(/\s+/g, "");
  return /^[A-HJ-NPR-Z0-9]{17}$/.test(s);
}

export function normalizeFecha(v: string): string {
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
  return {
    vin,
    marca,
    modelo,
    motor: motorRaw,
    fechaMatriculacion,
    vehiculo: `${marca} ${modelo}`.trim(),
  };
}
