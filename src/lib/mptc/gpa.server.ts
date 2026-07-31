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

const MOCK_PIEZAS: GpaArticulo[] = [
  { referencia: "1234567", descripcion: "Pastillas de freno delanteras", marca: "BREMBO", precio: 45.9, stock: "Disponible", plazo: "24h" },
  { referencia: "2345678", descripcion: "Disco de freno delantero", marca: "ATE", precio: 38.5, stock: "Disponible", plazo: "24h" },
  { referencia: "3456789", descripcion: "Kit frenos delanteros", marca: "TEXTAR", precio: 79.9, stock: "Bajo pedido", plazo: "48h" },
  { referencia: "4567890", descripcion: "Pastillas freno traseras", marca: "BOSCH", precio: 32.0, stock: "Disponible", plazo: "24h" },
];

export function mockIniciarSesion() {
  return {
    ok: true,
    mock: true,
    token: `mock-token-${Date.now().toString(36)}`,
    expiraEn: 3600,
  };
}

export function mockConsultaArticulos(query: string): GpaArticulo[] {
  const q = (query || "").trim().toLowerCase();
  if (!q) return MOCK_PIEZAS;
  return MOCK_PIEZAS.filter(
    (p) =>
      p.referencia.toLowerCase().includes(q) ||
      p.descripcion.toLowerCase().includes(q) ||
      p.marca.toLowerCase().includes(q),
  );
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
