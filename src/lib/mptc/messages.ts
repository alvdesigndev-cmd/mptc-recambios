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

// Mensajes EXACTOS proporcionados por el taller. Solo se sustituye el
// marcador "___" por el importe introducido. El bloque de confirmación
// y las fotos se anexan al final por la app (no forman parte del guion).
const SPECIFIC: Record<string, (c: MsgContext) => string> = {
  // FRENOS — Pastillas de freno delanteras
  "pastillas-del": (c) =>
    `Hola, te llamo del taller por tu coche.
Hemos revisado tu coche y está bien de todo, lo único que hemos visto que tiene
mal son las pastillas de freno delanteras, están ya muy gastadas al límite, las
pastillas, es una pieza de desgaste pasa mucho, las cambiamos a diario tarde o
pronto hay que cambiarlas, te recomendamos que lo cambies cuando puedas lo
antes posible antes de que te arañe el disco. Por qué si no la broma sube.
Te hemos enviado unas fotos al WhatsApp para que le des un vistazo.
Al ser pieza de desgaste normal tiene una vida limitada, lo tenemos en stock, si lo
hacemos todo pastillas, líquido de frenos y mano de obra te sale todo en ${c.importe || "___"} euros.
Y en una hora o así se queda listo, un saludo.\n\n${actions(c)}${fotosBlock(c)}`,

  // FRENOS — Discos y pastillas delanteras
  "discos-pastillas-del": (c) =>
    `Hola, te llamo del taller
Hemos revisado tu coche, está bien de todo, lo único que tienes mal para cambiar
son los Discos y pastillas delanteras, los discos están muy gastados y las pastillas
están al límite, no has notado un ruido geeeee, geeee, eso es por qué roza la
pastilla con filo del disco, si cambiamos sólo la pastilla en ese disco tal cómo lo
tienes no va a frenar como debería, te va a vibrar al frenar y no solucionas el
problema, vas a gastar el dinero doble primero en una pastilla que no va a durarte
nada y luego otra vez tienes que ponerlas además de los discos.
Lo tenemos todo en stock, si lo hacemos todo, discos, pastillas delanteras y líquido
de frenos con 30000km de garantía y primera marca te sale en ${c.importe || "___"} euros y en un
par de horas lo tienes listo, un saludo.\n\n${actions(c)}${fotosBlock(c)}`,

  // FRENOS — Líquido de frenos
  "liquido-frenos": (c) =>
    `Hola, te llamo del taller, hemos revisado tu coche y está bien de todo, lo único que
hemos visto mal para cambiar es el líquido de frenos, está ya muy negro, le hemos
puesto el comprobador y se ha puesto rojo del tirón, lo que mide el comprobador es
la humedad acumulada.
El líquido de frenos con el tiempo chupa agua y pierde sus propiedades, eso hace
que cuando frenas fuerte o en cuestas abajo largas el líquido se calienta y puede
llegar a hervir, cuando hierve se forman burbujas y el pedal de freno se queda
esponjoso o incluso se va al suelo, aunque ahora mismo frena lo suyo es cambiarlo.
¿No has notado que el pedal a veces está más blando de lo normal?
Es un mantenimiento normal, el fabricante recomienda cambiar cada dos años o
30.000 km. Lo tenemos en stock, si lo hacemos todo líquido de frenos y purga del
circuito te sale en ${c.importe || "___"} euros. Y en 1 hora se queda listo, un saludo.\n\n${actions(c)}${fotosBlock(c)}`,

  // SUSPENSIÓN — Amortiguadores delanteros (mensaje provisto por el cliente)
  "amort-del-v1": (c) =>
    `Hola, te llamo del taller por tu coche.
Hemos revisado tu coche y está bien de todo, lo único que hemos visto mal son los
amortiguadores delanteros. ¿No has notado que hace un golpe seco al pasar por
baches, clonc clonc? Eso es que el amortiguador ya ha cumplido su vida útil y pasa
a ser un hierro con un muelle en tu coche que no sirve para su funcionamiento, es
como si a las hojas de una ventana no le pones los cristales, están puestas en la
pared si pero el aire, polvo entran dentro, también las gomas que son las que lo
sujetan arriba del todo, están gastadas y sueltas. Es metal contra metal.
Si el amortiguador está mal la rueda va dando saltitos aunque tú no lo notes, y eso
hace que si tienes que frenar de pronto el coche tarde más en pararse. Además los
neumáticos se gastan escalonados, como dientes de sierra.
Te hemos mandado fotos al WhatsApp para que les des un vistazo. Lo tenemos en
stock, si lo hacemos todo amortiguadores delanteros, copelas (las gomas de arriba
del amortiguador), mano de obra y alineación te sale en ${c.importe || "___"} euros. Y en el día lo
tienes listo, un saludo.\n\n${actions(c)}${fotosBlock(c)}`,

  // SUSPENSIÓN — Amortiguadores traseros
  "amort-tras": (c) =>
    `Hola, te llamo del taller por tu coche.
Hemos revisado tu coche y está bien de todo, lo único que hemos visto mal son los
amortiguadores traseros, los amortiguadores lo que hacen es sujetar los neumáticos
a la carretera y evita que vaya dando saltitos.
No has notado ningún ruido? ñigo-ñigo o clack al pasar por baches, bandas sonoras
son los amortiguadores que han perdido sus prestaciones, por la perdida de aceite y
ya no da el rebote bien y va como dando saltitos.
Te hemos mandado fotos al WhatsApp para que la veas. Eso es desgaste normal, si
el amortiguador está mal, la rueda va dando saltitos (aunque tú no los veas). Eso
hace que, si tienes que frenar de pronto, el coche tarde más en pararse porque la
rueda no está bien pegada a la carretera. Además los neumáticos se deforman
dejándolos escalonados, como con dientes de sierra.
Lo tenemos en stock, si lo hacemos todo con mano de obra, te sale solamente en
${c.importe || "___"} euros y en el día se queda listo, un saludo.\n\n${actions(c)}${fotosBlock(c)}`,

  // NEUMÁTICOS — Neumáticos delanteros
  "neumaticos-del": (c) =>
    `Hola, te llamo del taller, hemos revisado tu coche y está bien de todo, lo único que
hemos visto que tiene mal son las ruedas delanteras, ¿no has notado que el coche
te hace, buuum, buuum, buuum? Eso es que la rueda está ya gastada y pidiendo un
cambio cómo el futbolista que lo ha dado todo y en minuto 70 Ya no puede ni con su
alma pide el cambio a gritos, pisa mal por el desgaste, es muy típico pasa mucho,
las cambiamos a diario, te recomendamos que las cambies cuando puedas lo antes
posible están ya listas.
Te hemos enviado unas fotos al WhatsApp para que le des un vistazo y veas que
están ya en los avisadores y cuando las cambies lo notarás una barbaridad.
Es una pieza de desgaste normal, las tenemos en stock, si lo hacemos todo, dos
neumáticos, montaje, equilibrado, válvulas, ecotasa y alineación te sale en ${c.importe || "___"}
euros. Y en un par de horas o así lo tienes listo, un saludo.\n\n${actions(c)}${fotosBlock(c)}`,

  // NEUMÁTICOS — Neumáticos x4 (desgaste y cristalización)
  "neumaticos-x4": (c) =>
    `Hola, te llamo del taller, hemos revisado tu coche y está bien de todo, lo único que
hemos visto que tiene mal son los cuatro neumáticos, están ya en los límites de
desgaste. ¿Cuánto tiempo hace que no las cambias? Aparte de gastadas, también
están cristalizadas y cuarteadas, están ya con bastante tiempo, por lo menos la
fecha de fabricación que trae.
Si te fijas en la foto que te hemos mandado se ve la fecha, el recuadrito ese, los dos
primeros números es la semana de fabricación y los dos últimos el año.
Con las cuatro ruedas así el coche no agarra como debe, sobre todo en mojado.
Te hemos enviado unas fotos al WhatsApp para que le des un vistazo.
Los tenemos en stock. Si ponemos los cuatro neumáticos, montaje, equilibrado,
válvulas (si no son eléctricas), alineación y tasa ecológica de residuos de
neumáticos te sale en ${c.importe || "___"} euros. Y en unas dos horas lo tienes listo.\n\n${actions(c)}${fotosBlock(c)}`,
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
