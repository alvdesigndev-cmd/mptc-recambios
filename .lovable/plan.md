
# MPTC — Plan de reconstrucción

Reconstruimos la app **MPTC - Taller Conectado** en este stack (TanStack Start + React + Lovable Cloud/Supabase). Como son ~4700 líneas en el original, lo dividimos en **5 fases** entregables. Cada fase queda funcional antes de pasar a la siguiente.

---

## Fase 1 — Cimientos (esta entrega)

- Activar **Lovable Cloud** (Supabase gestionado).
- Crear tablas `gestiones`, `clientes`, `pedidos_pena` con RLS abierta al rol anónimo (como en el original; añadiremos auth real en Fase 5).
- **Design system** en `src/styles.css`: tema oscuro por defecto, claro opcional, paleta azul `#3B82F6` + rojo `#E51A2B`, mono JetBrains.
- **Splash de selección de rol**: Taller / Grupo Peña, con sub-selector Taller 1 / Taller 2. Persistencia del perfil en `localStorage`.
- **Shell de app**: topbar + tabbar inferior (oculto para Peña) + FAB azul.
- Rutas vacías: `/`, `/app`, `/app/historial`, `/app/clientes`, `/app/ajustes`, `/app/nueva`, `/pena`, `/confirmar/$token`.
- Constantes: `TALLER_PROFILES`, `PENA_PHONE`, familias/subfamilias (catálogo completo de reparaciones).

## Fase 2 — Nueva gestión (3 pasos)

- Paso 1: datos del cliente + autocompletado desde `clientes` + cámara/galería + OCR de matrícula con Google Vision.
- Paso 2: grid de familias (7 primarias + “ver más”), subfamilias inline.
- Paso 3: mensaje generado editable con `MSG_TEMPLATES` (guiones por subfamilia con onomatopeyas), botones Enviar al cliente / Pedir a Peña / Guardar.
- Subida de fotos a Supabase Storage (`fotos-gestiones`).
- Generación de `confirm_token` + URL de confirmación.

## Fase 3 — Dashboard, Historial, Clientes

- Dashboard con KPIs y “pendientes de respuesta”.
- Historial con filtros por estado y buscador.
- Pantalla Clientes con buscador, filtros, alta manual, ficha y “nueva gestión con este cliente”.
- Modal de detalle de gestión con acciones según estado (`renderModalActions`).

## Fase 4 — Panel Grupo Peña + Confirmación cliente

- Ruta `/pena`: KPIs, filtros (gestión / aceptado / directo), cards con botones Preparado + WhatsApp.
- Formulario de pedido directo con fotos y OCR.
- Ruta `/confirmar/$token`: marca la gestión como `aceptado`, pantalla de confirmación al cliente.
- Polling `pollConfirmations` cada 90s + `visibilitychange`.

## Fase 5 — Pulido, PWA y seguridad

- Manifest PWA + iconos + `display: standalone`.
- Toasts, ajustes (tema claro/oscuro, datos del taller).
- Sustitución de RLS abierta por **Supabase Auth por taller** con `auth.uid()` (mejora real de seguridad vs. la app actual).
- QA general en móvil y desktop.

---

## Detalles técnicos clave

- **Stack**: TanStack Start (file routing en `src/routes/`), React 19, Tailwind v4, shadcn, Lovable Cloud.
- **Cliente Supabase**: `@/integrations/supabase/client` desde componentes; server functions con `requireSupabaseAuth` cuando metamos auth real.
- **OCR Google Vision**: la API key se guarda como **secret** (`GOOGLE_VISION_API_KEY`) y se llama desde un `createServerFn` para no exponerla en el cliente.
- **WhatsApp**: helper `buildWAUrl(phone, msg)` idéntico al original, abriendo `https://wa.me/...` en nueva pestaña.
- **Identidades fijas de taller**: `taller-1-mtc-recambios`, `taller-2-mtc-recambios` (no UUIDs aleatorios), igual que el original.
- **PWA**: la añadimos en Fase 5 con manifest simple (sin service worker) para que funcione instalable sin romper la preview de Lovable.

---

¿Tiro con la **Fase 1** tal cual está descrita?
