# Mechanic Connect

# PROMPT COMPLETO — MPTC · App de Gestión de Talleres Mecánicos

## DESCRIPCIÓN GENERAL

Aplicación web PWA (Progressive Web App) para talleres mecánicos llamada **MPTC - Taller Conectado**. Permite a los mecánicos gestionar presupuestos de reparación, comunicarse con clientes vía WhatsApp, coordinar pedidos con el proveedor (Grupo Peña) y llevar un historial de clientes y gestiones. Está desplegada en Cloudflare Pages (`mtc-recambios.pages.dev`) como un único archivo HTML autocontenido con CSS y JavaScript inline, sin frameworks ni bundlers.

-----

## STACK TÉCNICO

- **Frontend**: HTML5 + CSS3 + JavaScript vanilla (ES2020+), sin frameworks
- **Base de datos**: Supabase (PostgreSQL) con `@supabase/supabase-js v2.45`
- **CDN Supabase**: `https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.0/dist/umd/supabase.min.js`
- **Storage fotos**: Supabase Storage (bucket `fotos-gestiones`)
- **OCR matrículas**: Google Cloud Vision API (`AIzaSyBFXv-4-95CxltwApEQqeFfmdTDJlkVgvQ`)
- **Hosting**: Cloudflare Pages (deploy por ZIP)
- **PWA**: manifest, apple-mobile-web-app-capable, viewport-fit=cover

-----

## ESTRUCTURA DE SUPABASE

### Tabla `gestiones`

```sql
id               UUID PRIMARY KEY DEFAULT gen_random_uuid()
taller_nombre    TEXT
taller_id        TEXT        -- ID fijo por taller (ej: 'taller-1-mtc-recambios')
cliente_nombre   TEXT
cliente_telefono TEXT
matricula        TEXT
vehiculo         TEXT
km               TEXT
categoria        TEXT        -- id de familia (ej: 'motor', 'frenos')
subfamilia       TEXT        -- id de subfamilia (ej: 'turbo', 'bateria')
objecion         TEXT
descripcion      TEXT        -- mensaje generado completo
piezas           TEXT
importe          TEXT
estado           TEXT DEFAULT 'en-curso'  -- en-curso | enviado | aceptado | pedido | cerrado
pedido_pena      BOOLEAN DEFAULT false
fotos            TEXT[]      -- array de URLs públicas de Supabase Storage
confirm_token    TEXT        -- token único para confirmación del cliente
created_at       TIMESTAMPTZ DEFAULT now()
```

### Tabla `clientes`

```sql
id               UUID PRIMARY KEY DEFAULT gen_random_uuid()
taller_id        TEXT
taller_nombre    TEXT
nombre           TEXT
telefono         TEXT
matricula        TEXT
vehiculo         TEXT
km               TEXT
notas            TEXT
total_gestiones  INT DEFAULT 0
ultima_gestion   TIMESTAMPTZ
created_at       TIMESTAMPTZ DEFAULT now()
updated_at       TIMESTAMPTZ DEFAULT now()
```

### Tabla `pedidos_pena`

```sql
id               UUID PRIMARY KEY DEFAULT gen_random_uuid()
taller_id        TEXT
taller_nombre    TEXT
matricula        TEXT
vehiculo         TEXT
piezas           TEXT
notas            TEXT
estado           TEXT DEFAULT 'pendiente'
pedido_numero    INT
fotos            TEXT[]
created_at       TIMESTAMPTZ DEFAULT now()
```

### RLS

Todas las tablas tienen RLS activado con política `anon_all` que permite acceso completo al rol `anon` (la app usa anon key sin auth de usuarios).

-----

## IDENTIDADES DE TALLER (FIJAS)

Los talleres tienen IDs fijos definidos en el código — no UUID aleatorios — para que cualquier dispositivo que entre como el mismo taller vea los mismos datos:

```javascript
const TALLER_PROFILES = {
  'taller-1': { tallerId: 'taller-1-mtc-recambios', tallerName: 'Taller 1', ... },
  'taller-2': { tallerId: 'taller-2-mtc-recambios', tallerName: 'Taller 2', ... },
};
```

-----

## ROLES Y ACCESO

La app tiene **3 roles** seleccionables desde el splash:

### 1. Taller 1 / Taller 2

- Acceso completo a nueva gestión (3 pasos), historial, clientes, ajustes
- Ve solo sus gestiones filtradas por `taller_id`
- Menú inferior: Inicio · Historial · Clientes · Ajustes (+ FAB flotante para nueva gestión)

### 2. Grupo Peña (proveedor)

- Ve todos los pedidos con `pedido_pena=true` de todos los talleres
- Panel propio con KPIs, filtros y botones de acción
- Sin menú inferior de taller

-----

## DISEÑO Y ESTILOS

### Tema

- **Oscuro por defecto** con modo claro disponible (toggle en ajustes)
- **Dark**: fondo `#070B18`, superficie `#0E1425`, borde `rgba(255,255,255,.07)`
- **Light**: fondo `#F4F6FB`, superficie `#FFFFFF`, borde `rgba(11,16,32,.08)`

### Variables CSS principales

```css
--bg, --surface, --surface-2, --surface-3
--border, --border-2
--text, --text-2, --text-3, --text-4
--primary: #3B82F6    /* azul */
--primary-d: #2563EB
--primary-l: rgba(59,130,246,.12)
--accent: #E51A2B     /* rojo Grupo Peña */
--green: #22c55e
--r: 14px             /* border-radius base */
--r-lg: 18px
--r-xl: 22px
--shadow, --shadow-lg
--glow-blue: 0 8px 24px rgba(59,130,246,.3)
```

### Tipografía

- Sistema: `system-ui, -apple-system, 'Segoe UI', sans-serif`
- Monospace (matrículas, IDs): `'JetBrains Mono', 'Fira Code', monospace`

### Splash / Pantalla de selección de rol

- Fondo oscuro con gradiente azul arriba y rojo abajo + rejilla de puntos
- Título grande con palabra en gradiente naranja-rojo
- Cards diferenciadas por rol con icono, descripción y CTA
- Selector secundario de Taller 1 / Taller 2 al pulsar “Soy del taller”

### Layout general

- `html, body { overflow-x: hidden }` — scroll vertical libre
- `.app { display:block; min-height:100dvh }` — modelo de bloque, no flex
- Topbar sticky con logo, nombre del taller, badge de rol e icono notificaciones
- Tabbar `position:fixed` en bottom solo para taller (oculto para Peña)
- FAB azul circular `position:fixed` encima del tab de Ajustes (bottom-right)
- Contenido en `.page { max-width:1200px; margin:0 auto; padding:20px 18px 120px }`

### Componentes principales

- **Cards de gestión** (`.r-row`): avatar inicial, nombre, matrícula, vehículo, badge de estado
- **Modal de detalle** (`.modal-overlay`): bottom sheet en móvil, centrado en desktop
- **Toast** (`.toast`): notificación temporal bottom-center
- **Badges de estado**:
  - `en-curso` → amarillo/pending
  - `enviado` → amarillo/pending
  - `aceptado` → verde
  - `pedido` → rojo/peña
  - `cerrado` → gris

-----

## PANTALLAS Y FLUJOS

### PANTALLA: Inicio (Dashboard Taller)

- KPIs: gestiones hoy, pendientes de respuesta, aceptadas, total
- Panel “Pendientes de respuesta” con cards por cliente y estado:
  - `⏳ Esperando respuesta` (enviado, no confirmado)
  - `✅ Cliente confirmó` (cliente pulsó enlace de confirmación)
  - Botones: Ver detalle, Recordar (reenvía WA), Cerrar (archiva)
- Panel “Últimas gestiones” (últimas 4), al pulsar abre modal de detalle
- Notificaciones de confirmación en verde cuando el cliente acepta

### PANTALLA: Nueva gestión (3 pasos)

**Paso 1 — Datos del cliente**

- Campos: Nombre* (obligatorio), Teléfono* (obligatorio), Matrícula* (obligatorio), Vehículo, Piezas a pedir, Importe €, Km
- Autocompletado de clientes: al escribir 2+ letras busca en Supabase tabla `clientes` por `nombre+taller_id`, muestra sugerencias con nombre, teléfono, matrícula, vehículo y nº de gestiones previas
- Botones cámara y galería para foto de matrícula
- OCR automático con Google Vision API: detecta matrícula (patrón `\d{4}\s*[A-Z]{3}`) e inserta en el campo
- Navegación: Cancelar | Siguiente →

**Paso 2 — ¿Qué avería tiene?**

- Título “¿Qué avería tiene?” + indicador de selección actual
- Buscador de familia (filtro en tiempo real)
- Grid de familias: 2 columnas en móvil, 3 en tablet
- 7 familias visibles por defecto (CATS_PRIMARY), botón “Ver más familias (N)” para el resto
- Al pulsar una familia se despliegan sus subfamilias inline debajo
- La 7ª tarjeta (Diagnóstico Eléctrico) ocupa las 2 columnas
- Botón flecha adelante (→) en la cabecera del flujo + botón atrás (←)
- Navegación: ← Atrás | Generar mensaje →

**Paso 3 — Mensaje y envío**

- Burbuja de mensaje editable (contenteditable) con el guion generado automáticamente
- El mensaje incluye: saludo con nombre, descripción de la avería con onomatopeyas, recomendación, fotos al WA, precio con `___` euros relleno del campo importe, “Responde SÍ si quieres que lo hagamos”
- Al final del mensaje (en el WA): `👉 Confirma aquí: [URL única de confirmación]`
- Si hay fotos: se suben a Supabase Storage y se añaden como URLs numeradas al mensaje
- 3 botones de acción:
  - **Enviar al cliente** (verde, WhatsApp): sube fotos → abre WA con mensaje completo → guarda gestión como `enviado`
  - **Pedir a Peña** (rojo): abre WA con Grupo Peña → guarda como `pedido`
  - **Guardar gestión** (ghost): guarda como `en-curso` sin enviar

### PANTALLA: Historial

- Buscador por nombre, matrícula, vehículo
- Filtros de estado: Todos | En curso | Aceptados | Pedido Peña | Cerradas
- Lista de todas las gestiones, al pulsar abre modal de detalle

### PANTALLA: Clientes

- Buscador en tiempo real por nombre, matrícula o teléfono
- Filtros: Todos | Recientes (último mes) | +1 gestión
- Cards con avatar (iniciales), nombre, teléfono · matrícula, vehículo, contador de gestiones, fecha última gestión
- Al pulsar: ficha completa con todos los datos + botón “Nueva gestión con este cliente” → salta directamente al **paso 2** con el paso 1 ya relleno
- Botón `+` en cabecera para añadir cliente manualmente (nombre, teléfono, matrícula, vehículo, notas)
- Los clientes se guardan automáticamente en Supabase cada vez que se crea una gestión (identificador único: nombre + teléfono del mismo taller)

### PANTALLA: Ajustes

- Datos del taller: Nombre, Ciudad, Nombre del mecánico, Identificador (readonly)
- Selector de tema: Oscuro / Claro
- Zona de desarrollo: botón “Limpiar pendientes y datos locales de prueba” (limpia localStorage)

### PANEL: Grupo Peña

- KPIs propios: pedidos hoy, pendientes, preparados, total
- Filtros: Todos | 📦 Pedidos de gestión | ✅ Cliente aceptó | ⚡ Pedido directo
- Cards de pedido con taller origen, matrícula, vehículo, piezas, estado
- Botones: ✓ Preparado (marca como listo) + 💬 WhatsApp (abre WA con el taller)
- Formulario de pedido directo (sin gestión previa): matrícula, vehículo, piezas, notas, fotos + OCR

-----

## FAMILIAS Y SUBFAMILIAS DE REPARACIÓN

```
MOTOR (visible por defecto)
  · Inyectores kit de juntas / Inyectores cambio completo / Culata-junta
  · Radiador-refrigerante / Bomba de agua / Válvula EGR
  · Correa alternador / Caudalímetro / Turbo
  · Filtro de partículas DPF / Bujías / Calentadores / Bomba lavaparabrisas

FRENOS (visible por defecto)
  · Pastillas delanteras / Discos y pastillas / Kit freno trasero

SUSPENSIÓN (visible por defecto)
  · Amortiguadores del (v1 y v2 con copelas) / Amortiguadores traseros
  · Rótulas suspensión / Rótulas dirección / Brazos suspensión / Bieletas / Muelles

ELECTRICIDAD - BATERÍA Y CARGA (visible por defecto)
  · Batería (v1) / Batería con comprobador (v2) / Alternador / Motor de arranque

NEUMÁTICOS (visible por defecto)
  · Pareja / Cuatro neumáticos

MANTENIMIENTO (visible por defecto)
  · Aceite y filtro / Filtro aire motor / Filtro combustible diésel
  · Bujías gasolina / Mantenimiento completo

DIAGNÓSTICO ELÉCTRICO (visible por defecto — ocupa 2 columnas)
  · Diagnóstico general / Airbag-SRS / ABS-ESP / Avería motor

--- "Ver más familias" ---

TRANSMISIÓN
  · Junta homocinética / Fuelles transmisión
  · Embrague-bimasa (vibración) / Embrague-bimasa (ruido)

CARROCERÍA
  · Elevalunas / Escobillas limpiaparabrisas

AIRE ACONDICIONADO
  · Carga de gas / Compresor / Filtro de habitáculo (polen)

DIRECCIÓN
  · Fuelles de dirección

DISTRIBUCIÓN
  · Kit distribución correa / Distribución 1.2 PureTech / Kit distribución cadena

ESCAPE
  · FAP-DPF / Catalizador / Sonda lambda
```

-----

## MENSAJES GENERADOS (MSG_TEMPLATES)

Cada subfamilia tiene un guion curado basado en documentos reales de formación de mecánicos. Los guiones:

- Comienzan con `Hola [nombre], te llamo del taller...`
- Incluyen `ctx.vehicle` entre paréntesis si está disponible
- Describen la avería con onomatopeyas reales (shee shee shee, cloc cloc cloc, etc.)
- Explican por qué sucede de forma coloquial
- Mencionan que es “pieza de desgaste normal”
- Incluyen precio: `${ctx.importe||'___'} euros`
- Terminan con `Responde *SÍ* si quieres que lo hagamos. Un saludo.`
- Fallback genérico (`_default`) para subfamilias sin guion específico

-----

## SISTEMA DE CONFIRMACIÓN DEL CLIENTE

1. Al enviar por WA se genera `token = generateToken()` (random base36 + timestamp)
1. Se añade al mensaje: `👉 Confirma aquí: https://mtc-recambios.pages.dev/?confirmar=TOKEN`
1. El token se guarda en Supabase `gestiones.confirm_token` + estado `enviado`
1. Cuando el cliente pulsa el enlace:
- `checkConfirmationToken()` detecta `?confirmar=TOKEN` en la URL
- Espera hasta 5s a que el SDK de Supabase cargue
- Busca la gestión por `confirm_token` en Supabase
- Actualiza `estado='aceptado'` y borra el token
- Muestra pantalla personalizada: “¡Confirmado! ✓” con nombre del cliente y matrícula
- Botón “Cerrar” para volver
1. El taller detecta la confirmación por:
- `visibilitychange`: cuando vuelve a la app desde WhatsApp, dispara `loadGestiones()` + `pollConfirmations()`
- `pollConfirmations()` cada 90s: busca gestiones `aceptado` del último día, cruza con `DEMO_CASES` por ID/teléfono/matrícula y actualiza el estado local
- Toast: `✅ [Nombre] ha confirmado la reparación`

-----

## FLUJO DE DATOS Y ESTADO LOCAL

### Estado global

```javascript
const state = {
  role: 'taller',        // 'taller' | 'pena'
  selCat: null,          // id familia seleccionada
  selSub: null,          // id subfamilia seleccionada
  selObj: null,
  famFilter: '',         // texto buscador de familias
  famShowAll: false,     // mostrar todas las familias o solo primarias
  step: 1,              // paso actual en nueva gestión (1-3)
  histFilter: 'all',     // filtro de historial
  retomandoId: null,     // ID de gestión que se está retomando
  retomandoData: null,   // datos de la gestión retomada (respaldo)
};
```

### Persistencia

- `localStorage['mptc_settings_v1']`: ajustes del taller (nombre, ciudad, mecánico, tema, tallerId)
- `localStorage['mptc_pendientes_v1']`: lista de gestiones enviadas pendientes de respuesta
- `localStorage['mptc_gestiones_local_v1']`: gestiones guardadas sin conexión (se sincroniza cuando hay Supabase)
- `localStorage['mptc_clients_v1']`: historial de clientes local (fallback offline)
- `localStorage['mptc_confirm_notifs']`: notificaciones de confirmaciones recientes
- `localStorage['mptc_deleted_ids']`: IDs de gestiones eliminadas localmente

### Array global

```javascript
let DEMO_CASES = [];  // Gestiones en memoria. Se carga de Supabase.
                      // Si Supabase falla, usa DEMO_CASES_FALLBACK (datos demo)
                      // Filtrado por _filterDeleted() para evitar que reaparezcan eliminadas
```

-----

## FUNCIONES PRINCIPALES

### Navegación

- `enterApp(role)` — sincrónica, muestra app, oculta splash, carga datos en background
- `exitApp()` — vuelve al splash, resetea todo el estado
- `goTo(screen)` — navega entre flows (dash, new, hist, clientes, set, pena)
- `goStep(n)` — navega entre pasos 1-3 con validaciones; paso 1→2 valida nombre+tel+matrícula obligatorios

### Gestiones

- `saveCase()` — guarda como `en-curso`, añade a DEMO_CASES, sincroniza Supabase en background
- `sendWANative()` — sube fotos si las hay, construye mensaje con fotos+confirmar URL, abre WA, guarda como `enviado`
- `_doSendWA(msg, digits, f, rd, fotoUrls)` — función interna que ejecuta el envío
- `orderPena()` — abre WA con Peña, guarda como `pedido`
- `retomarGestion(id)` — carga datos de gestión en formulario, salta al paso 3
- `pedirPenaDesdeGestion(id)` — desde modal de gestión `aceptado`, abre WA con Peña
- `insertGestion(payload)` — INSERT en Supabase con retry defensivo si hay columnas opcionales faltantes
- `loadGestiones()` — carga de Supabase filtrando por `taller_id` o `pedido_pena`, mezcla con pendientes locales

### Clientes

- `saveClientToHistory(nombre, tel, mat, vehiculo)` — guarda en local + Supabase; clave única: `nombre+telefono+taller_id`
- `loadClientes()` — carga de Supabase con fallback a localStorage
- `searchClients(q)` — busca por nombre en Supabase con fallback local
- `startGestionFromClient(id)` — rellena paso 1 y salta directamente al paso 2

### OCR

- `runOCR(dataUrl)` — llama a Google Vision API con `TEXT_DETECTION`+`DOCUMENT_TEXT_DETECTION`
- `extractPlateFromText(text)` — regex: patrón moderno `\d{4}\s*[A-Z]{3}` + fallback sin espacios

### UI

- `renderAll()` — renderiza todas las pantallas activas
- `renderModalActions(c)` — acciones del popup según estado:
  - `en-curso` → botón azul “Retomar gestión · paso 3”
  - `enviado` → aviso “⏳ Esperando confirmación”
  - `aceptado` → botón rojo “✅ Cliente aceptó · Pedir a Grupo Peña”
  - `pedido` → aviso “📦 Pedido enviado a Grupo Peña”
- `renderFamGrid()` — grid de familias con “ver más”, subfamilias inline, flechas animadas
- `showToast(msg, type)` — toast temporal (ok=verde, err=rojo, ‘’=neutro)

-----

## WHATSAPP

```javascript
const PENA_PHONE = '34634954491';

function buildWAUrl(phone, msg){
  const digits = phone.replace(/\D/g,'');
  // Si son 9 dígitos (España sin prefijo), añade 34
  const final = digits.length === 9 ? '34'+digits : digits;
  return `https://wa.me/${final}?text=${encodeURIComponent(msg)}`;
}

function openWA(phone, msg){
  window.open(buildWAUrl(phone, msg), '_blank');
}
```

Para enviar al cliente se usa `<a>` creado programáticamente y `.click()` para compatibilidad con iOS/Android/PWA.

-----

## META TAGS (SEO / WA Preview)

```html
<title>Confirmar reparación</title>
<meta property="og:title" content="Confirmación de reparación">
<meta property="og:description" content="Pulsa el enlace para confirmar que autorizas la reparación de tu vehículo.">
<!-- Preview neutra para que WhatsApp no muestre el logo de la app al cliente -->
```

-----

## SEGURIDAD Y LIMITACIONES ACTUALES

- **Sin autenticación de usuarios**: la app usa directamente la `anon key` de Supabase
- **RLS con `USING(true)`**: las tablas tienen RLS activado pero permiten acceso a `anon` — protege contra exposición accidental pero no entre talleres a nivel DB
- **El aislamiento entre talleres** se hace por `taller_id` en las queries, no por auth real
- **Roadmap de seguridad**: implementar Supabase Auth con login por taller para RLS real con `auth.uid()`

-----

## DESPLIEGUE

- Archivo único: `index.html` (≈4700 líneas, ≈101KB minificado)
- Assets: `assets/logo.jpg`
- Deploy: subir ZIP a Cloudflare Pages (archivos en raíz del ZIP, no en subcarpeta)
- El ZIP correcto se genera desde dentro de la carpeta: `cd mptc-deploy && zip -r ../deploy.zip .`
- Supabase URL: `https://atbaxzbxtgmdnfghlqlh.supabase.co`

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://mptc-recambios.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/f5cc7062-6125-455f-9af2-f46c45295327).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
