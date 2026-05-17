// Plantillas de mensaje WhatsApp.
//
// El guion específico de cada subfamilia se guarda en BD (`subfamilias.mensaje`)
// y se pasa a `buildMessage` como `template`. Solo se sustituye el marcador
// "___" por el importe y se anexan acciones (confirmar/rechazar) y fotos.

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
}

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

/**
 * Construye el mensaje final a partir de la plantilla de la subfamilia.
 * Si no hay plantilla, genera un mensaje genérico.
 */
export function buildMessage(
  c: MsgContext,
  opts?: { template?: string | null; subfamiliaNombre?: string | null; familiaNombre?: string | null },
): string {
  const template = opts?.template?.trim();
  if (template) {
    const body = template.replaceAll("___", c.importe || "___");
    return `${body}\n\n${actions(c)}${fotosBlock(c)}`;
  }

  const sub = opts?.subfamiliaNombre;
  const fam = opts?.familiaNombre;
  const repairLine = sub
    ? `He revisado tu ${c.vehiculo} (${c.matricula}) y hay que actuar sobre *${sub}*${fam ? ` (${fam})` : ""}.`
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
