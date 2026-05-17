// Plantillas de mensaje WhatsApp por subfamilia.
// Los textos son EXACTOS provistos por el taller. Solo se sustituye
// el marcador "___" por el importe. Las acciones (confirmar/rechazar)
// y el bloque de fotos se anexan al final por la app.

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

// WhatsApp no genera vista previa cuando la URL va entre < >.
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

const tail = (c: MsgContext) => `\n\n${actions(c)}${fotosBlock(c)}`;
const imp = (c: MsgContext) => c.importe || "___";

const SPECIFIC: Record<string, (c: MsgContext) => string> = {
  // ===================== FRENOS =====================
  "pastillas-del": (c) =>
    `Hola, te llamo del taller por tu coche.
Hemos revisado tu coche y está bien de todo, lo único que hemos visto que tiene
mal son las pastillas de freno delanteras, están ya muy gastadas al límite, las
pastillas, es una pieza de desgaste pasa mucho, las cambiamos a diario tarde o
pronto hay que cambiarlas, te recomendamos que lo cambies cuando puedas lo
antes posible antes de que te arañe el disco. Por qué si no la broma sube.
Te hemos enviado unas fotos al WhatsApp para que le des un vistazo.
Al ser pieza de desgaste normal tiene una vida limitada, lo tenemos en stock, si lo
hacemos todo pastillas, líquido de frenos y mano de obra te sale todo en ${imp(c)} euros.
Y en una hora o así se queda listo, un saludo.${tail(c)}`,

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
de frenos con 30000km de garantía y primera marca te sale en ${imp(c)} euros y en un
par de horas lo tienes listo, un saludo.${tail(c)}`,

  "amort-del": (c) =>
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
del amortiguador), mano de obra y alineación te sale en ${imp(c)} euros. Y en el día lo
tienes listo, un saludo.${tail(c)}`,

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
${imp(c)} euros y en el día se queda listo, un saludo.${tail(c)}`,

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
circuito te sale en ${imp(c)} euros. Y en 1 hora se queda listo, un saludo.${tail(c)}`,

  // ===================== NEUMÁTICOS =====================
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
neumáticos, montaje, equilibrado, válvulas, ecotasa y alineación te sale en ${imp(c)}
euros. Y en un par de horas o así lo tienes listo, un saludo.${tail(c)}`,

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
neumáticos te sale en ${imp(c)} euros. Y en unas dos horas lo tienes listo.${tail(c)}`,

  // ===================== SUSPENSIÓN =====================
  "rotulas-susp": (c) =>
    `Hola, te llamo del taller por tu coche.
Hemos revisado tu coche y está bien de todo, lo único que hemos visto mal son las
rotulas de suspensión.
No has notado ningún ruido? cloc cloc al pasar por baches, o al girar, las gomas
están rotas y tienen holgura, es como si un hueso se sale de su sitio cada instante y
se recolocara sólo, cada vez que se sale llegará el momento que rompa.
Te hemos mandado fotos al WhatsApp para que le des un vistazo.
Eso es desgaste normal, con el tiempo las rotulas de suspensión se rompen con el
uso es completamente normal. La tenemos en stock.
Si lo hacemos todo rotulas de suspensión con la mano de obra te sale solamente en
${imp(c)} euros. En un par de horitas o así lo tienes listo, un saludo.${tail(c)}`,

  "rotulas-dir": (c) =>
    `Hola, te llamo.
Hemos revisado tu coche y está bien de todo, lo único que hemos visto mal son las
rotulas de dirección.
No has notado ningún ruido? clac-clac al girar a poca velocidad, al aparcar o al pillar
un bache, oirás crujidos o golpes metálicos secos. Porque ya tiene las gomas rotas
y tienen holgura. La rótula de dirección es como la bisagra de una puerta, la que
conecta el volante con las ruedas para que giren cuando tú giras el volante. Las
gomas están rotas y tienen holgura. Con las rotulas de dirección en mal estado
dañas otras partes de tu coche como las ruedas, si la rueda no asienta bien en la
carretera, se gastará por un lado más que por el otro, al final, tendrás que cambiar
también las ruedas.
Te hemos mandado fotos al WhatsApp para que le des un vistazo.
Eso es desgaste normal, con el tiempo las rotulas se van rompiendo con el uso es
completamente normal. Las tenemos en stock.
Si hacemos todo rotulas de dirección, mano de obra y alineación te sale solamente
en ${imp(c)} euros. En un par de horitas o así lo tienes listo, un saludo.${tail(c)}`,

  "brazos-susp-del": (c) =>
    `Hola, te llamo del taller por tu coche.
Hemos revisado tu coche y está bien de todo, lo único que hemos visto que tiene
mal son los brazos de suspensión delanteros.
No has notado ningún ruido o se va mas hacia un lado? cloc-cloc cloc-cloc cada vez
que pillas un bache, un resalto o incluso al frenar fuerte, oirás un golpe metálico
CLACK. Eso es porque las gomas (silentblocks) que lleva el brazo están rajadas,
cuarteadas o gastadas y el metal del brazo está pegando directamente contra el
chasis. Es metal contra metal.
Tener los brazos de suspensión rotos es como intentar correr con una rodilla que se
te sale del sitio. Puedes moverte, sí, pero vas cojeando, te duele todo el cuerpo por
el sobreesfuerzo y, en cualquier momento, te vas al suelo. Con los brazos de
suspensión en mal estado dañas otras partes de tu coche como las ruedas, si la
rueda no pisa bien la carretera, se gastará mucho más por un lado que por el otro, al
final, tendrás que cambiar también neumáticos.
Te hemos mandado fotos al WhatsApp para que la veas.
Eso es desgaste normal, con el tiempo los brazos de suspension se van
deteriorando con el uso es completamente normal.
Si lo hacemos todo brazos con mano de obra y alineación te sale solamente en ${imp(c)}
euros. Lo tenemos en stock y en un par de horitas o así lo tienes listo, un saludo.${tail(c)}`,

  // ===================== TRANSMISIÓN =====================
  "fuelles-trans": (c) =>
    `Hola, te llamo del taller por tu coche.
Hemos revisado tu coche y está bien de todo, lo único que hemos visto que tiene
mal son los fuelles de transmisión, son esa goma negra con forma de acordeón que
envuelve que están rellenas de grasa y sirven para proteger las articulaciones del
coche de las ruedas. Su único trabajo es guardar la grasa dentro para que todo
resbale bien y evitar que entre polvo y suciedad.
No has notado ningún ruido? clac-clac-clac-clac al girar, porque ya han perdido la
grasa, las gomas están rotas, dañas otras partes de tu coche como la punta de la
transmisión. Cambiar el fuelle es como cambiarle una tirita a un niño, es barato y
rápido. Pero si no lo cambias y dejas que la pieza de dentro se rompa, es como
tener que operar la pierna entera.
Te hemos mandado fotos al WhatsApp para que la veas.
Eso es desgaste normal, con el tiempo los fuelles se van rompiendo con el uso es
completamente normal.
Si lo hacemos todo fuelles con mano de obra te sale solamente en ${imp(c)} euros. Lo
tenemos en stock y en un par de horitas o así lo tienes listo, un saludo.${tail(c)}`,

  "punta-trans": (c) =>
    `Hola, te llamo del taller, hemos revisado tu coche y está bien de todo, lo único que
hemos visto que tiene mal es la punta de la transmisión, ¿no has notado que
cuando giras a tope hacía un lado y hacia otro te hace un traqueteo fuerte y hace,
cloc, cloc, cloc?
Eso es que la pieza está el estriado de la punta gastado y hace ruido tiene holgura
por el desgaste, es muy típico pasa mucho, se rompen más de lo que imaginas, te
recomendamos que la cambies cuando puedas lo antes posible antes de que se
parta y te deje tirado sin tracción.
Te hemos enviado unas fotos al WhatsApp para que le des un vistazo y veas que el
fuelle de goma también está rajado y ha perdido toda la grasa.
Es una pieza de desgaste normal, la tenemos en stock, si la cambiamos todo junta
homocinética (punta transmisión), fuelle transmisión, grasa, abrazaderas y mano de
obra te sale en ${imp(c)} euros. Y en el día se queda listo, un saludo.${tail(c)}`,

  "embrague": (c) =>
    `Hola, te llamo del taller.
Hemos revisado tu coche y está bien de todo, lo único que hemos notado es que tu
coche le suena el embrague, no has notado que te vibra cuando pones el pie en el
pedal de embrague y hace, trr, trarr, trar, y cuando lo pisas para cambiar se quita el
ruido? Eso es qué el embrague ya no acopla bien al volante motor y vibra por el
desgaste, es muy típico pasa mucho, los cambiamos casi a diario es una pieza de
desgaste, tarde o temprano hay que cambiarlo en la mayoría de los casos, lo suyo
es cambiarlo cuando puedas, más pronto que tarde, es una avería que va a más, y
en cualquier momento el coche deja de andar por mucho que aceleres.
No te podemos enviar fotos al WhatsApp por qué un ruido no es visual pero si se
desmontará se vería perfectamente el desgaste y cuando lo cambies lo notarás una
barbaridad.
Es una pieza de desgaste normal tiene una vida limitada unos duran más y otros
menos pero terminan cambiándose la gran mayoría al final, lo tenemos en stock, si
lo hacemos te sale todo, kit de embrague, cojinete de empuje, volante motor o
bimasa que es lo mismo, sangrado de embrague y mano de obra, solamente en ${imp(c)}
euros y en el día se queda listo, un saludo.${tail(c)}`,

  // ===================== MOTOR =====================
  "distribucion-correa": (c) =>
    `Hola, te llamo del taller.
Hemos revisado tu coche y está bien de todo, lo único que hemos visto es que tu
coche tiene ya los km y el tiempo para hacer la distribución si aún no la hiciste, pero
la correa del alternador está ya muy cuarteada lo que indica que la de distribución
tiene que estar parecida, la correa de distribución es una pieza de desgaste no se
rompe por un mal uso, tarde o temprano hay que hacerla, lo suyo es cambiarla
antes de que parta la correa por qué si rompe la broma no es chica te sale ya por un
pico importante.
Te hemos mandado fotos al WhatsApp para que la veas.
Es una pieza de desgaste normal tiene una vida limitada unas duran más y otras
menos pero terminan cambiándose todas al final, la tenemos en stock, si no lo has
hecho ya te recomendamos hacerla, te sale todo kit distribución, Correa accesorios,
bomba de agua, anticongelante y mano de obra, solamente en ${imp(c)} euros y en el día
se queda listo, un saludo.${tail(c)}`,

  "distribucion-puretech": (c) =>
    `Hola, soy del taller. Hemos revisado tu coche y está bien de todo, lo único que está
para cambiar es la distribución, la correa de tu coche va bañada en aceite y está
hinchada eso pasa por que se mete la gasolina en el carter que es donde va el
aceite, la correa se va deshilachando y se tapona la chupona de la bomba de aceite.
Cuando cambiamos la distribución también cambiamos la bomba de agua, la correa
auxiliar y el anticongelante y en tu caso todas las juntas de tapas, reten de aceite,
aceite, filtro de aceite y también se limpia el carter, se cambia todo a la vez. Antes
de que parta la correa.
Te pasamos fotos al WhatsApp para que le des un vistazo.
Lo tenemos en stock, si lo hacemos te sale todo completo, kit distribución, correa
accesorios, bomba de agua, anticongelante y mano de obra en ${imp(c)} euros. En el día
lo tienes listo. Un saludo.${tail(c)}`,

  "bomba-agua": (c) =>
    `Hola, te llamo del taller, hemos revisado tu coche y está bien de todo, lo único que
hemos visto que tiene mal es la bomba de agua, ¿no has notado que te pierde
refrigerante? Eso es que la pieza está ya gastada y no va como debería, tiene
holgura por el desgaste, es muy típico pasa mucho, es una pieza de desgaste, tarde
o temprano hay que cambiarla en la mayoría de los casos.
¿Le has cambiado la distribución hace mucho? Normalmente cuando se cambia la
bomba de agua como la tuya que la mueve la distribución recomendamos que
cambies las dos cosas a la vez por la sencilla razón que hay que desmontar la
distribución para quitar la bomba de agua hay la mano de obra es la misma
prácticamente y aparte una vez que quitas la correa luego ya el tensado no queda lo
mismo.
Te hemos enviado unas fotos al WhatsApp para que le des un vistazo y veas por
dónde pierde.
Es una pieza de desgaste normal tiene una vida limitada, la tenemos en stock, si la
cambiamos te sale todo en ${imp(c)} euros. Y en el día se queda listo, un saludo.${tail(c)}`,

  "junta-culata": (c) =>
    `Hola, te llamo del taller, hemos revisado tu coche y está bien de todo, lo único que
hemos visto que tiene mal es la junta de culata, ¿no has notado que el coche te va a
tirones, echa humo blanco o se te sube la temperatura muy rápido? Eso pasa
normalmente por un calentón, no refrigera bien por qué se mezcla el aceite con el
refrigerante en el bote, es uno de los síntomas más típico, pasa mucho, te
recomendamos que la repares cuando puedas lo antes posible antes de que el
motor sufra más y se puedan romper otras cosas.
Te hemos enviado un informe y una foto del bote con aceite al WhatsApp para que
le des un vistazo.
Es una avería que se causa por varios motivos, uno es por el paso de los años se
va desgastando la junta y se mete el agua a través de ella. Si lo hacemos te sale
todo, comprobación y plano culata, junta de culata, juego de tornillos de culata,
enfriador de aceite, kit distribución, bomba de agua, anticongelante y mano de obra
te sale todo en ${imp(c)} euros.
Te avisamos cuando esté lista, luego aunque nosotros lo vamos a dejar lo más
limpio posible te recomendamos que limpies el circuito con máquina para dejarlo
completamente limpio y refrigere como debe. Un saludo.${tail(c)}`,

  "radiador": (c) =>
    `Hola, te llamo del taller, hemos revisado tu coche y está bien de todo, lo único que
hemos visto que tiene mal es el radiador, ¿no has notado que te huele a
anticongelante cuando el coche está caliente o que te baja el nivel del bote? Eso es
qué hay una perdida de anticongelante, está el radiador picado por una esquina por
el tiempo, es muy normal pasa mucho, te recomendamos que lo cambies cuando
puedas lo antes posible antes de que le des un calentón sin que te des cuenta por
falta de agua.
Te hemos enviado unas fotos al WhatsApp para que le des un vistazo y veas por
dónde pierde.
Es una pieza de desgaste, lo tenemos en stock, si lo hacemos sale todo, radiador,
anticongelante y mano de obra en ${imp(c)} euros en el día se queda listo, un saludo.${tail(c)}`,

  "turbo": (c) =>
    `Hola, te llamo del taller, hemos revisado tu coche y está bien de todo, lo único que
hemos visto que tiene mal es el turbo, ¿no has notado que te silba mucho al
acelerar y hace, fiuuu, fiuuu, fiuuu? Eso es que el turbo no va como debería, vibra
por el desgaste, te puede meter aceite dentro y quedarse el coche acelerado a tope
solo, te recomendamos que lo cambies cuando puedas lo antes posible antes de
que vaya a más.
No te hemos enviado fotos al WhatsApp porque el fallo es interno, si se desmontara
se vería la holgura y cuando lo cambies lo notarás una barbaridad.
Es una pieza de desgaste normal, lo tenemos en stock, si lo hacemos todo turbo,
juntas, tubo de engrase del turbo, aceite, filtro de aceite y mano de obra te sale en
${imp(c)} euros. Y de un día para otro se queda listo más que nada para verificar que
todo va bien y poder entregarlo correctamente, un saludo.${tail(c)}`,

  "fap-dpf": (c) =>
    `Hola, te llamo del taller por tu coche.
Hemos revisado tu coche y está bien de todo, le hemos puesto la maquina de
diagnosis, sale filtro de particulas. El filtro de partículas si está mal o taponado,
imagínate que es como si intentaras correr una maratón respirando a través de una
pajita o como si el aspirador de tu casa tuviera la bolsa llena de cemento, el motor
quiere soltar aire, pero no puede porque tiene un tapón en el trasero.
No has notado ninguna perdida de potencia? Notarás que, por mucho que pises, el
coche no tiene fuerza, le cuesta subir cuestas o no sube de revoluciones. Es como
si el coche estuviera siempre cansado, para intentar compensar que está atascado,
el motor trabaja mucho más fuerte y mete más combustible para intentar quemar
esa suciedad. Verás que la aguja del combustible baja mucho más rápido de lo
normal sin que tú corras más, un filtro de partículas sucio es como tener un
estreñimiento crónico en el coche. Nada sale, todo se acumula dentro, el motor se
calienta de más y, si no lo solucionas, puede acabar rompiendo piezas como el
turbo.
Te hemos mandado fotos y el informe al WhatsApp para que la veas.
Es una avería muy común en coches modernos con este sistema, ocurre porque la
mayoría de las veces si haces mucha ciudad, el filtro no llega a calentarse para
limpiarse solo. Aquí hay dos opciones: lo podemos enviar a limpiar, tarda 3 días más
o menos, queda bastante bien pero también se puede volver a taponar antes, eso
sale en 400 eur aprox, montaje desmontaje y limpieza. O ponerlo nuevo que eso
hay que preguntar disponibilidad pero es más recomendable. Las dos opciones son
buenas, ya me dices. Un saludo.${tail(c)}`,

  "bujias": (c) =>
    `Hola, te llamo del taller por tu coche.
Hemos revisado tu coche y está bien de todo, lo único que hemos visto mal son las
bujías, están quemadas y gastadas. ¿No has notado que el motor es como si
desafinara un poco, se sube y se baja el ritmo del ruido? Hace papapapa y de
pronto hace papaa 2 o tres veces seguidas? Eso es que las bujías ya no hacen la
chispa bien y el motor no quema la gasolina como debería. Es muy típico, pasa
mucho, las cambiamos casi a diario. Cuando las bujías están mal afecta al
consumo, el coche gasta más sin que tú corras más.
Te hemos mandado fotos al WhatsApp para que les des un vistazo.
Es una pieza de desgaste normal, la tenemos en stock. Si lo hacemos todo bujías,
mano de obra y diagnóstico electrónico para la lectura el borrado del error te sale en
${imp(c)} euros. Y en una horita lo tienes listo, un saludo.${tail(c)}`,

  "correa-auxiliar": (c) =>
    `Hola, te llamo del taller, hemos revisado tu coche y está bien de todo, lo único que
hemos visto mal para cambiar es la correa auxiliar, ¿no has notado que te chirría al
arrancar o al girar y hace, guiii, guiii, guiii? Eso es que la correa está ya gastada y
no va como debería, es muy típico pasa mucho, las cambiamos a diario, te
recomendamos que la cambies cuando puedas lo antes posible antes de que se
rompa y te la líe.
Si rompe y no te das cuenta la correa sigue dando vueltas dentro loca, si de
casualidad se metiera en la distribución una cosa de 70 euros hace magia y se
convierte en una cantidad elevada, aparte de quedarte sin coche unas semanas.
Te hemos enviado unas fotos al WhatsApp para que le des un vistazo y veas que
está ya cuarteada.
Es una pieza de desgaste normal y muy barata, la tenemos en stock, si la ponemos
te sale en ${imp(c)} euros. Y en un momento se queda listo, un saludo.${tail(c)}`,

  "caudalimetro": (c) =>
    `Hola, te llamo del taller, hemos revisado tu coche y está bien de todo, lo único que
hemos visto que tiene mal para cambiar es el caudalímetro, ¿no has notado que el
coche le cuesta coger fuerzas y hace, uun-uun-uun al acelerar? El caudalímetro
malo hace que el motor inyecte mal la mezcla, consume más y a la larga perjudica
los inyectores.
Ya no va como debería porque no mide bien el aire. Es muy típico, pasa mucho. Lo
suyo sería cambiarlo cuando puedas antes de que vaya a más.
Te hemos enviado el informe de la diagnosis al WhatsApp para que le des un
vistazo. Cuando lo cambies lo notarás una barbaridad.
Lo tenemos en stock. Si lo hacemos todo — caudalímetro, diagnóstico electrónico y
mano de obra — te sale en ${imp(c)} euros solamente y en el día se queda listo.${tail(c)}`,

  // ===================== ELECTRICIDAD =====================
  "bateria": (c) =>
    `Hola, te llamo del taller por tu coche.
Hemos revisado tu coche y está bien de todo, lo único que hemos visto que tiene
mal es la batería, no has notado qué le cuesta arrancar, sobre todo en frío? Tiene
que tener 640 de arranque y tiene menos de la mitad, está a punto de que cualquier
día falle, está ya muy baja deberías tenerlo en cuenta, con los Cambios de
temperatura las baterías sufren más de la cuenta y mueren no avisan.
Te hemos mandado el informe y fotos al WhatsApp para que la veas.
Es una pieza de desgaste normal tiene una vida limitada unas duran más y otras
menos pero terminan cambiándose todas al final, la tenemos en stock con 2 años de
garantía, si lo hacemos todo con mano de obra, te sale solamente en ${imp(c)} euros y en
media horita lo tienes listo, un saludo.${tail(c)}`,

  "alternador": (c) =>
    `Hola, te llamo del taller, hemos revisado tu coche y está bien de todo, lo único que
hemos visto que tiene mal es el alternador, ¿no has notado que te hace un zumbido
y hace, iiiiii, iiiiii, iiiiii? Eso es que el alternador por dentro que están ya gastadas las
escobillas y no va como debería, vibra por el desgaste, es muy común pasa mucho,
los cambiamos casi a diario, te recomendamos que lo cambies cuando puedas lo
antes posible antes que vaya a más y termines agotando la batería.
Ten en cuenta que el alternador es lo que mete carga a la batería, si está mal, es
como si trabajas en pareja y tu compañero solo mira por qué está mal pero por no
dejarte solo te acompaña. Al final terminas agotado tú también.
No te hemos enviado fotos al WhatsApp porque un ruido de rodamiento no es
visual, pero está en las últimas.
Es una pieza de desgaste normal, lo tenemos en stock, si lo hacemos todo
alternador, correa accesorios (correa alternador) y mano de obra te sale en ${imp(c)}
euros. Y en el día se queda listo, un saludo.${tail(c)}`,

  "motor-arranque": (c) =>
    `Hola, te llamo del taller, hemos revisado tu coche y está bien de todo, lo único que
hemos visto que tiene mal es el motor de arranque, ¿no has notado que a veces le
das a la llave y hace, clac, clac, clac y no arranca? Eso es que el motor de arranque
está ya a punto de caer, cuestión de días, es como cuando esperas a la suegra no
quieres que venga pero el día que menos te lo espera se presenta y tienes que
cambiar los planes para atenderla como sólo ella merece, a la suegra no la puedes
cambiar pero al motor de arranque no te queda más remedio, no va como debería
porque se queda enganchada, es muy típico pasa mucho, los cambiamos a diario,
te recomendamos que lo cambies cuando puedas lo antes posible antes de que te
deje tirado.
No te hemos enviado fotos al WhatsApp porque el fallo es eléctrico interno, pero va
a fallar del todo pronto.
Es una pieza de desgaste normal, lo tenemos en stock, si lo hacemos todo, motor
de arranque y mano de obra te sale todo en ${imp(c)} euros. Y en el día se queda listo,
un saludo.${tail(c)}`,

  "calentadores": (c) =>
    `Hola, te llamo del taller.
Hemos revisado tu coche y está bien de todo, lo único que hemos visto mal son los
calentadores, aunque sólo haya 2 mal, te recomendamos cambiar los 4, se van en
serie uno detrás de otro y la luz de avería la tienes encendida cada momento, están
gastados. No has notado que por las mañanas sobre todo en frío que le cuesta
arrancar? Es una avería sorda, por qué el coche sigue arrancando aunque le
cueste, es como un deportista profesional entrena todos los días y el día del partido
aunque esté cansado juega, lo suyo sería cambiarlos cuando puedas, más pronto
que tarde, te afecta al consumo, a la batería por qué la fuerzas más, motor de
arranque y el coche no va como debería.
Te hemos mandado fotos al WhatsApp para que la veas.
Es una pieza de desgaste normal tiene una vida limitada unas duran más y otras
menos pero terminan cambiándose todas al final, la tenemos en stock, si lo
hacemos todo calentadores, mano de obra y diagnóstico electrónico para la lectura
y borrado del error, te sale solamente en ${imp(c)} euros y en una horita lo tienes listo, un
saludo.${tail(c)}`,

  "elevalunas-del": (c) =>
    `Hola, te llamo del taller, hemos revisado tu coche y está bien de todo, lo único que
hemos visto que tiene mal es el elevalunas delantero ¿no has notado que al subir el
cristal te cruje y hace, craaac, craaac, craaac? Eso es que el elevalunas ya no va
como debería porque el cable se está rompiendo, es muy típico pasa mucho, los
cambiamos casi a diario, te recomendamos que lo cambies cuando puedas lo antes
posible antes de que se te caiga el cristal dentro de la puerta.
No te hemos enviado fotos al WhatsApp porque va por dentro del panel, lo que sí es
fijo es que está a punto de partir.
Es una pieza de desgaste normal, lo tenemos en stock, si lo hacemos todo
elevalunas delantero y mano de obra te sale en ${imp(c)} euros. Y en el día se queda
listo, un saludo.${tail(c)}`,

  // ===================== ESCAPE Y EMISIONES =====================
  "egr": (c) =>
    `Hola, te llamo del taller, hemos revisado tu coche y está bien de todo, lo único que
hemos visto que tiene mal es la válvula EGR, ¿no has notado que el coche te da
tirones cuando vas despacio y hace, pruf, pruf, pruf? Eso es que la egr, que no es
otra cosa que una válvula que recircula los gases de escape a la admisión, y no va
como debería por la suciedad, es muy típico pasa mucho, nosotros por ejemplo en
vez de limpiarlas las cambiamos porque en mano de obra y limpieza se va más
tiempo y dinero que el cambio por una nueva, el dicho de lo más barato sale caro
aquí va como anillo al dedo, te recomendamos que la cambies cuando puedas lo
antes posible antes de que vaya a más y te rompa más cosas.
Te hemos enviado unas fotos y el diagnóstico electrónico con la lectura de los
valores mal de la EGR al WhatsApp para que le des un vistazo y veas la carbonilla
que tiene.
Es una pieza de desgaste normal, la tenemos en stock, si lo hacemos todo, EGR,
mano de obra, diagnóstico electrónico (solo lo cobramos una vez aunque hay que
hacerlo 2) y descarbonización sale en ${imp(c)} euros. Y en el día se queda listo, un
saludo.${tail(c)}`,

  // ===================== INYECCIÓN =====================
  "inyectores-gasolina-juntas": (c) =>
    `Hola, te llamo del taller, hemos revisado tu coche está bien de todo, lo único que
hemos visto que tiene mal son los inyectores, ¿no has notado que hace ruido como
una cafetera, shee, shee, shee, o que le cuesta arrancar a veces? No va como
debería porque los inyectores están fogueando por las juntas, es más común de lo
que crees, pasa mucho. No hace falta cambiar los inyectores, se cambia sólo el
juego de juntas, arandelas, cortafuegos, y se limpian todos los huecos de los
inyectores muy bien para que no quede ningún resto de carbonilla.
Te hemos enviado fotos al WhatsApp para que le des un vistazo.
Si hacemos todo juego de juntas, arandelas, cortafuegos, diagnóstico electrónico,
descarbonización y mano de obra te sale todo en ${imp(c)} euros. Y en el día se queda
listo, un saludo.${tail(c)}`,

  "inyectores-diesel-completos": (c) =>
    `Hola, te llamo del taller, hemos revisado tu coche está bien de todo, lo único que
hemos visto que tiene mal son los inyectores, ¿no has notado que el motor te
cabecea mucho en parado y hace ruido, o que le cuesta arrancar y a veces se para?
No va como debería porque no pulveriza bien el gasoil, es muy típico pasa mucho,
te recomendamos que los cambies cuando puedas lo antes posible antes de que te
deje tirado o te rompa un pistón.
Te hemos enviado el informe del diagnóstico electrónico al WhatsApp para que le
des un vistazo.
Es una pieza de desgaste, si hacemos todo inyectores, diagnóstico electrónico,
descarbonización y mano de obra te sale todo en ${imp(c)} euros. Y en el día se queda
listo, un saludo.${tail(c)}`,

  // ===================== VARIOS =====================
  "escobillas": (c) =>
    `Hola, te llamo del taller por tu coche.
Hemos revisado tu coche y está bien de todo, lo único que hemos visto mal son las
escobillas limpiabrisas. Las gomas están cristalizadas y ya no barren bien el agua,
te deja marcas en el cristal y no ves bien, lo que hace es restregar más la suciedad.
Te hemos mandado unas fotos al WhatsApp para que la veas.
Eso es desgaste normal, con el tiempo las escobillas se cristalizan y se rompen. No
son caras. Si las quieres hacer te salen todo con el montaje incluido en ${imp(c)} euros
solamente.
Lo tenemos en stock y en menos de 10 minutos lo tienes listo, un saludo.${tail(c)}`,

  "bomba-lavaparabrisas": (c) =>
    `Hola, te llamo del taller por tu coche.
Hemos revisado lo que nos ha comentado de que no echaba agua por los chorritos
del limpiaparabrisas. Es por la bomba lavaparabrisas que tiene el motorcillo
quemado, es una pieza de desgaste, es muy normal que se rompa por el uso, es
una reparación fácil y barata.
La tenemos en stock. Te sale todo completo, Bomba lavaparabrisas, agua
lavaparabrisas y mano de obra solamente en 55 euros. Tienes el coche listo en una
hora.${tail(c)}`,

  // ===================== CLIMATIZACIÓN =====================
  "recarga-aa-filtro": (c) =>
    `Hola, te llamo del taller, hemos revisado tu coche y está bien de todo, lo único qué
hemos visto regular es el aire acondicionado, no has notado muy poca cantidad de
aire por las rejillas? Eso normalmente es porque necesita una recarga y por eso no
enfría bien.
Pero aparte de eso, hemos visto que el filtro de habitáculo está bastante sucio, está
ya muy obstruido y por eso sale poco caudal de aire por las rejillas del salpicadero,
no sale como debería.
Te hemos enviado las fotos al WhatsApp para que le des un vistazo y lo veas.
Ten en cuenta que hacer solo la recarga y no cambiar el filtro es como ducharse y
ponerse otra vez la misma ropa interior, al final el aire va a seguir saliendo pero con
menos fuerza, todas las bacterias y suciedad las respiras e incluso puede coger
olor.
El filtro de habitáculo es una pieza de desgaste normal, no es ninguna avería rara,
simplemente con el uso cogen polvo, suciedad y humedad.
Si hacemos todo la recarga más el filtro de habitáculo y mano de obra en 119 euros.
En una hora o así lo tienes listo, un saludo.${tail(c)}`,

  // ===================== MANTENIMIENTO =====================
  "mantenimiento-completo": (c) =>
    `Hola, te llamo del taller, hemos revisado tu coche y está bien de todo, lo único es
que en la revisión hemos visto que los demás filtros no están bien. Sin problema,
podemos hacer solo aceite y filtro, eso no hay ningún inconveniente, pero tienes que
tener en cuenta que las dos últimas revisiones sólo has cambiado aceite y filtro de
aceite, eso es ya bastante tiempo sin hacer la revisión completa.
Lo suyo sería cambiar en esta revisión el filtro de aire, el de combustible y el del
habitáculo, también van acumulando suciedad con el tiempo. Si no se cambian, el
motor sin querer sufre más, puede consumir más y a la larga no es del todo bueno
ni para ti ni para tu coche.
Te paso presupuesto de todo y ya me dices, ¿te parece? Si quieres, te aviso cuando
esté terminado, calcúlate un par de horas o así.
Si lo hacemos todo, aceite, filtro de aceite, filtro de aire, filtro de combustible, filtro de
habitáculo, niveles completados, presiones, revisión de luces, estado de la batería y
revisión visual general, por ${imp(c)} euros solamente lo tienes listo de mantenimiento
otra temporada, un saludo.${tail(c)}`,

  "revision-pre-itv": (c) =>
    `Hola, te llamo del taller, hemos revisado tu coche para la ITV y hay varias cosas que
te pueden echar el coche para atrás si vas así. Hemos visto que tienes una luz
delantera fundida, las luces de freno no encienden bien todas y el líquido de frenos
está muy negro. El líquido no te lo van a mirar pero lo tienes que tener en cuenta.
También hemos visto que las pastillas de freno están al límite y los neumáticos
tienen poco dibujo.
Te hemos enviado fotos al WhatsApp para que le des un vistazo y valores.
Lo único que no hemos mirado porque no tenemos es los gases y la intensidad de la
frenada. Para los gases hay un truquillo, llévalo todo lo caliente que puedas a ITV,
apúrale las marchas y un día antes échale un aditivo limpia inyectores, eso ayuda
bastante a bajar la opacidad que es lo que miden en ITV.
Si lo hacemos todo te sale en ${imp(c)} euros y en el día se queda listo. Ya nos dices, un
saludo.${tail(c)}`,

  // ===================== LUCES =====================
  "lampara-estandar": (c) =>
    `Hola, te llamo del taller, hemos revisado tu coche y está bien de todo, lo único que
hemos visto mal para cambiar son las luces, tienes una lámpara delantera fundida.
¿No has notado que por la noche ves que alumbra solo por un lado? Es una avería
muy común, las lámparas se suelen fundir por las vibraciones de la carretera, los
baches, y porque tienen una vida útil determinada, de un momento a otro toca
cambiarlas.
Ten en cuenta que con una luz fundida te pueden multar y quitarte puntos en
cualquier control, no merece la pena arriesgarse por algo tan barato y rápido.
Si lo hacemos todo lámpara delantera y mano de obra te sale en ${imp(c)} euros y en 20
minutos se queda listo, un saludo.${tail(c)}`,

  "lampara-xenon": (c) =>
    `Hola, te llamo del taller, hemos revisado tu coche y está bien de todo, lo único que
hemos visto mal para cambiar son las luces, tienes una lámpara delantera de xenón
fundida. ¿No has notado que por la noche no alumbra por un lado? Es una avería
muy común, las lámparas se suelen fundir por las vibraciones de la carretera, los
baches, fuga del gas, porque las lámparas de xenón llevan dentro un gas noble, el
xenón, que es lo que genera la luz. Tienen una vida útil normalmente determinada
por horas de duración.
Otras veces el alojamiento donde van (balastro) también se daña y hay que sustituir
también, pero primero hay que descartar la lámpara. Depende del fabricante la
calidad y duración puede ser mayor, pero aún así de un momento a otro toca
cambiarlas.
Si te para la policía tienes premio doble, el regalito y la lámpara, y es un pico las dos
cosas juntas.
Si lo hacemos todo lámpara delantera de xenón y mano de obra te sale en ${imp(c)}
euros y en 40 minutos se queda listo, un saludo.${tail(c)}`,

  "luces-freno-interruptor": (c) =>
    `Hola, te llamo del taller, hemos revisado tu coche y está bien de todo, lo único que
hemos visto mal para cambiar son las luces de freno traseras, tienes las tres
lámparas traseras que no encienden. ¿No has notado cuando frenas que no se
iluminan las luces de freno o no te lo ha dicho alguien que iba detrás en otro coche?
Lo que está mal en este caso aparte de que haya alguna luz fundida es el interruptor
del pedal de frenos. La válvula lleva como un pinchito pequeño que cuando pisas el
freno se presiona y encienden las luces, pues bueno ese pincho se ha quedado
pillado y no funciona. Es una avería muy común y barata.
Ten en cuenta que ir sin luces de freno tiene regalito de la policía si te paran, y te
aseguro que es un poco más caro que cambiar el interruptor de freno. Cuando
puedas deberías cambiarlo más pronto que tarde.
Si lo hacemos todo interruptor o válvula de frenos y mano de obra te sale en ${imp(c)}
euros y en 40 minutos se queda listo, un saludo.${tail(c)}`,

  "luces-marcha-atras": (c) =>
    `Hola, te llamo del taller, hemos revisado tu coche y está bien de todo, lo único que
hemos visto mal para cambiar son las luces de marcha atrás, tienes las lámparas
traseras que no encienden. ¿No has notado cuando metes la marcha atrás que no
se iluminan las luces de marcha atrás o no te lo ha dicho alguien que iba detrás en
otro coche?
Lo que está mal en este caso aparte de que haya alguna luz fundida es el interruptor
de marcha atrás. La válvula lleva como un pinchito pequeño que cuando pisas el
embrague y metes marcha atrás se acciona y encienden las luces. Ese interruptor
suele estar cerca de la caja de cambios o incluso en ella, pues bueno ese interruptor
se ha quedado pillado y no funciona. Es una avería muy común y barata.
Ten en cuenta que ir sin luces de marcha atrás tiene regalito de la policía si te
paran, y te aseguro que es un poco más caro que cambiar el interruptor de marcha
atrás. Cuando puedas deberías cambiarlo más pronto que tarde.
Si lo hacemos todo interruptor o válvula de marcha atrás y mano de obra te sale en
${imp(c)} euros y en 1 hora o así se queda listo, un saludo.${tail(c)}`,

  "pulido-faros": (c) =>
    `Hola, te llamo del taller, hemos revisado tu coche y está bien de todo, lo único que
hemos visto mal son los faros delanteros, que están opacos y amarillentos. ¿No has
notado que por la noche ves muy poco en la carretera? Los faros se ponen así por
el tiempo y porque de estar fuera muchas horas el sol los quema poco a poco. Es
una cosa muy común, tu coche no es el único, le pasa a la mayoría.
Ten en cuenta que si te para la policía tienes premio doble, el regalito y el pulido de
faros, y es un pico las dos cosas juntas.
Si lo hacemos todo pulido de los dos faros y mano de obra te sale en ${imp(c)} euros y en
un par de horas se queda listo, un saludo.${tail(c)}`,

  // ===================== CLIMATIZACIÓN AVANZADA =====================
  "recarga-aa-fugas": (c) =>
    `Hola, te llamo del taller referente a lo que has comentado del AA. Una pregunta, ¿el
coche enfría algo? Si no enfría podemos probar con una carga de AA, normalmente
el coche no pierde toda la carga y viene vacío, lo más seguro es que haya fuga por
alguna parte. Si quieres le podemos cargar y poner un tinte detector de fugas y
vemos por dónde pierde, para que no tires el dinero ya que la carga no tiene
garantía.
Aun así si lo tenemos que volver a cargar cuando reparemos la fuga se vuelve a
cobrar ya que es un problema del coche no de la carga. De todas formas si decides
repararlo para compensar te haré un descuento en la mano de obra de la reparación
de la fuga.
Lo tenemos en stock, si lo hacemos te sale todo, vacío, carga AA y tinte detector de
fugas en ${imp(c)} euros solamente y en una hora lo tienes listo, un saludo.${tail(c)}`,

  "fap-variante": (c) =>
    `Hola Pedro, si quieres le podemos poner la máquina de diagnosis para ver qué
fallos hay registrados. Si es el filtro de partículas, si quieres podemos hacer un
borrado de errores y listo, pero eso no te soluciona el problema porque a la vuelta
de la esquina se va a volver a encender, o mañana, pero se enciende seguro.
Lo que yo haría primero es ver la saturación que tiene el filtro. Muchas veces está
tan taponado, es como cuando quieres respirar y te pones un pañuelo en la nariz, te
cuesta verdad? Pues a tu coche le pasa lo mismo.
Si no te quieres gastar mucho ahora, lo podemos limpiar, que es una solución más a
largo plazo incluso bastante, pero todo depende de los recorridos que hagas porque
a veces los recorridos cortos impiden que hagas las regeneraciones correctamente
y se sigue saturando.
Ahora nos dices y te pasamos presupuesto con lo que decidas. Un saludo.${tail(c)}`,

  // ===================== SUSPENSIÓN AVANZADA =====================
  "amort-x4": (c) =>
    `Hola, te llamo del taller, hemos revisado tu coche y está bien de todo. Hemos salido
a probarlo por el problema que me comentaste al bachear y en curvas, ¿verdad?
Aunque los amortiguadores no están con fugas de aceite, están ya bastante
rendidos, por eso notas el coche más blandito, como una barca.
Ten en cuenta que el coche tiene 200.000 km y el fabricante recomienda el cambio
entre 80 y 100.000 km. La función principal del amortiguador es sujetar el neumático
sobre la carretera para absorber los pequeños baches de la carretera. Tu coche va
dando como saltitos, eso también deforma los neumáticos a la larga.
En definitiva, deberías cambiar los 4 amortiguadores si no quieres cambiar en breve
los 4 amortiguadores más los neumáticos, porque se deforman rápido con los
amortiguadores así como están.
Los tenemos en stock. Si lo hacemos todo, 4 amortiguadores, montaje y alineación
te sale en ${imp(c)} euros y en el día se queda listo, un saludo.${tail(c)}`,

  // ===================== MOTOR AVANZADO =====================
  "filtro-aire-motor": (c) =>
    `Hola, te llamo del taller, hemos revisado tu coche y está bien de todo, lo único que
hemos visto que tiene mal para cambiar es el filtro de aire del motor, ¿no has notado
que el coche no va tan desahogado como antes o que gasta un poco más?
Eso es que el filtro del aire está ya muy sucio y no deja respirar bien al motor.
Imagínate intentar correr con un pañuelo puesto en la nariz y la boca, pues el motor
igual. Es muy típico, pasa mucho.
Te hemos enviado unas fotos al WhatsApp para que le des un vistazo y veas la
suciedad que tiene.
Lo tenemos en stock. Si lo hacemos todo — filtro de aire y mano de obra — te sale
solamente en ${imp(c)} euros. Y en un momento lo tienes listo.${tail(c)}`,

  "filtro-gasoil": (c) =>
    `Hola, te llamo del taller, hemos revisado tu coche y está bien de todo, lo único que
hemos visto que tiene mal es el filtro del gasóil, ¿no has notado que a veces el
coche arranca un poco peor o que le cuesta un poco arrancar en frío? Tiene como
tos, jujuju, jujuju, jujuju.
Eso es que el filtro está ya muy sucio y no deja pasar bien el gasóil al motor. Con el
tiempo se va llenando de suciedad del propio combustible. Si no se cambia puede
acabar dañando los inyectores o la propia bomba inyectora.
Te hemos enviado unas fotos al WhatsApp para que le des un vistazo.
Lo tenemos en stock. Si lo hacemos todo — filtro y mano de obra — te sale
solamente en ${imp(c)} euros. Y en media hora lo tienes listo.${tail(c)}`,

  // ===================== FRENOS ESPECIALES =====================
  "frenada-irregular": (c) =>
    `Hola, te llamo del taller.
Hemos revisado tu coche y hemos notado que la frenada no es uniforme, el coche
frena más de un lado que de otro y eso normalmente viene porque alguna pinza se
queda agarrada o porque un latiguillo está ya deteriorado por dentro.
Es una avería bastante común con el tiempo, sobre todo en coches con años o que
pasan tiempo parados. Lo recomendable es revisarlo cuanto antes porque aparte de
frenar mal también desgasta mal las pastillas y puede llegar a deformar los discos.
Te hemos enviado fotos y el informe al WhatsApp para que le des un vistazo.
Cuando quieras te pasamos presupuesto exacto según la pieza que finalmente haya
que sustituir. Un saludo.${tail(c)}`,
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
