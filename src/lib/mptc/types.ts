export type EstadoGestion =
  | "borrador"
  | "en-curso"
  | "enviado"
  | "aceptado"
  | "rechazado"
  | "completado";

export interface Gestion {
  id: string;
  taller_id: string | null;
  taller_nombre: string | null;
  cliente_nombre: string | null;
  cliente_telefono: string | null;
  matricula: string | null;
  vehiculo: string | null;
  km: string | null;
  vin: string | null;
  marca: string | null;
  modelo: string | null;
  motor: string | null;
  fecha_matriculacion: string | null;
  categoria: string | null;
  subfamilia: string | null;
  descripcion: string | null;
  piezas: string | null;
  importe: string | null;
  estado: EstadoGestion | string;
  pedido_pena: boolean;
  fotos: string[] | null;
  confirm_token: string | null;
  objecion: string | null;
  mensaje?: string | null;
  borrador_step?: number | null;
  wa_abierto?: boolean;
  created_at: string;
}

export const ESTADO_META: Record<string, { label: string; cls: string }> = {
  "borrador": { label: "Reanudar", cls: "bg-accent/15 text-accent" },
  "en-curso": { label: "En curso", cls: "bg-warning/15 text-warning" },
  "enviado":  { label: "Enviado",  cls: "bg-primary/15 text-primary" },
  "aceptado": { label: "Aceptado", cls: "bg-success/15 text-success" },
  "rechazado":{ label: "Rechazado",cls: "bg-destructive/15 text-destructive" },
  "completado":{label: "Completado",cls:"bg-surface-3 text-text-2" },
};

export function estadoBadge(estado: string) {
  return ESTADO_META[estado] || { label: estado, cls: "bg-surface-2 text-text-2" };
}
