// Plantillas de mensaje WhatsApp.
//
// El guion específico de cada subfamilia se guarda en BD (`subfamilias.mensaje`)
// y se pasa a `buildMessage` como `template`. Solo se sustituye el marcador
// "___" por el importe y se anexan acciones (confirmar/rechazar) y fotos.

import { publicFotoUrls } from "./public-links";

export interface MsgContext {
  cliente: string;
  vehiculo: string;
  matricula: string;
  km: string;
  importe: string;
  taller: string;
  mecanico: string;
  confirmUrl: string;
  rejectUrl?: string;
  fotos?: string[];
  /** Piezas presupuestadas en el paso 4 (una por línea). */
  piezas?: string;
}

const noPreview = (url: string) => `<${url}>`;

function actions(c: MsgContext): string {
  const lines = [`✅ Confirma aquí: ${noPreview(c.confirmUrl)}`];
  if (c.rejectUrl) lines.push(`❌ Rechazar aquí: ${noPreview(c.rejectUrl)}`);
  return lines.join("\n");
}

function fotosBlock(c: MsgContext): string {
  if (!c.fotos?.length) return "";
  // Enlace público limpio y SIN <> para que WhatsApp muestre la vista previa.
  return `\n\n📸 Fotos:\n${publicFotoUrls(c.fotos).join("\n")}`;
}

/** Resumen de piezas del paso 4, listo para el cliente. */
export function piezasBlock(piezas?: string): string {
  const lineas = (piezas || "")
    .split("\n")
    .map((l) => l.replace(/^[-•·]\s*/, "").trim())
    .filter(Boolean);
  if (!lineas.length) return "";
  return `\n\n🔧 Trabajo/piezas incluidas:\n${lineas.map((l) => `• ${l}`).join("\n")}`;
}

/** Línea de precio final. */
function precioBlock(importe: string): string {
  return `\n\n💰 Total: *${importe || "—"} €* (IVA incluido).`;
}

/**
 * Construye el mensaje final a partir de la plantilla de la subfamilia.
 * Siempre incluye el precio final y el resumen de piezas del paso 4.
 */
export function buildMessage(
  c: MsgContext,
  opts?: { template?: string | null; subfamiliaNombre?: string | null; familiaNombre?: string | null },
): string {
  const template = opts?.template?.trim();
  if (template) {
    const body = template.replaceAll("___", c.importe || "___");
    // Si la plantilla no muestra el importe, lo añadimos para no enviar presupuestos sin precio.
    const yaTienePrecio = template.includes("___") || (!!c.importe && body.includes(c.importe));
    return `${body}${piezasBlock(c.piezas)}${yaTienePrecio ? "" : precioBlock(c.importe)}\n\n${actions(c)}${fotosBlock(c)}`;
  }

  const sub = opts?.subfamiliaNombre;
  const fam = opts?.familiaNombre;
  const repairLine = sub
    ? `He revisado tu ${c.vehiculo} (${c.matricula}) y hay que actuar sobre *${sub}*${fam ? ` (${fam})` : ""}.`
    : `He revisado tu ${c.vehiculo} (${c.matricula}) y te paso presupuesto de la reparación.`;

  return `Hola ${c.cliente} 👋\n\n${repairLine}${piezasBlock(c.piezas)}${precioBlock(c.importe)}\n\n${actions(c)}${fotosBlock(c)}\n\nUn saludo,\n${c.mecanico || c.taller}`;
}


export function buildPenaMessage(opts: {
  taller: string;
  vehiculo: string;
  matricula: string;
  piezas: string;
  notas: string;
  fotos?: string[];
}): string {
  const fotos = opts.fotos?.length ? `\n📸 Fotos:\n${publicFotoUrls(opts.fotos).join("\n")}\n` : "";
  return `🔧 *Pedido ${opts.taller}*\n\n🚗 ${opts.vehiculo} — ${opts.matricula}\n\n📦 Piezas:\n${opts.piezas}\n${fotos}\n${opts.notas ? `📝 ${opts.notas}\n\n` : ""}Gracias 🙌`;
}
