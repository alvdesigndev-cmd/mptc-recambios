// Plantillas de mensaje WhatsApp por subfamilia.
// Más adelante se puede ampliar con guiones detallados con onomatopeyas.

import { findFamily, findSubfamily } from "./families";

export interface MsgContext {
  cliente: string;
  vehiculo: string;
  matricula: string;
  km: string;
  categoria: string | null;
  subfamilia: string | null;
  importe: string;
  taller: string;
  mecanico: string;
  confirmUrl: string;
  rejectUrl?: string;
  fotos?: string[];
}

// WhatsApp genera una vista previa (rich preview) de la primera URL del
// mensaje. Envolver las URLs con < > es la forma estándar de pedirle a
// WhatsApp que NO genere preview, manteniéndolas clicables.
const noPreview = (url: string) => `<${url}>`;

function actions(c: MsgContext): string {
  const lines = [`✅ Confirma aquí: ${noPreview(c.confirmUrl)}`];
  if (c.rejectUrl) lines.push(`❌ Rechazar aquí: ${noPreview(c.rejectUrl)}`);
  return lines.join("\n");
}

function fotosBlock(c: MsgContext): string {
  if (!c.fotos?.length) return "";
  return `\n\n📸 Fotos:\n${c.fotos.map(noPreview).join("\n")}`;
}

const SPECIFIC: Record<string, (c: MsgContext) => string> = {
  "pastillas-del": (c) =>
    `Hola ${c.cliente} 👋\n\nHe revisado tu ${c.vehiculo} (${c.matricula}) y las *pastillas delanteras* están al límite. Conviene cambiarlas ya para evitar dañar los discos.\n\n💰 Presupuesto: *${c.importe} €* (piezas + mano de obra, IVA incluido).\n\n${actions(c)}${fotosBlock(c)}\n\nUn saludo,\n${c.mecanico} — ${c.taller}`,
  "aceite-filtro": (c) =>
    `Hola ${c.cliente} 👋\n\nToca el *mantenimiento de aceite y filtro* de tu ${c.vehiculo} (${c.matricula}, ${c.km} km).\n\n💰 Presupuesto: *${c.importe} €*.\n\n${actions(c)}${fotosBlock(c)}\n\nGracias,\n${c.mecanico} — ${c.taller}`,
  "bateria-v1": (c) =>
    `Hola ${c.cliente} 👋\n\nTu ${c.vehiculo} (${c.matricula}) necesita *batería nueva* — la actual ya no aguanta la carga.\n\n💰 Presupuesto: *${c.importe} €* (batería + montaje).\n\n${actions(c)}${fotosBlock(c)}\n\nUn saludo,\n${c.mecanico} — ${c.taller}`,
};

export function buildMessage(c: MsgContext): string {
  if (c.subfamilia && SPECIFIC[c.subfamilia]) return SPECIFIC[c.subfamilia](c);

  const fam = findFamily(c.categoria);
  const sub = findSubfamily(c.categoria, c.subfamilia);
  const repairLine = sub
    ? `He revisado tu ${c.vehiculo} (${c.matricula}) y hay que actuar sobre *${sub.name}*${fam ? ` (${fam.name})` : ""}.`
    : `He revisado tu ${c.vehiculo} (${c.matricula}) y te paso presupuesto de la reparación.`;

  return `Hola ${c.cliente} 👋\n\n${repairLine}\n\n💰 Presupuesto: *${c.importe || "—"} €* (IVA incluido).\n\n${actions(c)}${fotosBlock(c)}\n\nUn saludo,\n${c.mecanico || c.taller}`;
}

export function buildPenaMessage(opts: {
  taller: string;
  vehiculo: string;
  matricula: string;
  piezas: string;
  notas: string;
  fotos?: string[];
}): string {
  const fotos = opts.fotos?.length ? `\n📸 Fotos:\n${opts.fotos.map((u) => `<${u}>`).join("\n")}\n` : "";
  return `🔧 *Pedido ${opts.taller}*\n\n🚗 ${opts.vehiculo} — ${opts.matricula}\n\n📦 Piezas:\n${opts.piezas}\n${fotos}\n${opts.notas ? `📝 ${opts.notas}\n\n` : ""}Gracias 🙌`;
}
