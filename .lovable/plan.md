## Objetivo

Permitir gestionar familias y subfamilias desde la propia app (crear, editar, eliminar con confirmación y ver el mensaje asociado), en lugar de tenerlo hardcodeado en `src/lib/mptc/families.ts` y `src/lib/mptc/messages.ts`.

## Cambios

### 1. Base de datos (migración)

Crear dos tablas nuevas:

- `familias`: `id` (uuid), `slug` (text único), `nombre`, `icono`, `orden` (int), `created_at`, `updated_at`.
- `subfamilias`: `id` (uuid), `familia_id` (uuid → familias), `slug` (text único), `nombre`, `mensaje` (text con el guion EXACTO, puede usar `___` como marcador del importe), `orden`, `created_at`, `updated_at`.

RLS abierto (igual que `clientes`/`gestiones`) para mantener consistencia con el resto del proyecto. Trigger de `updated_at`.

Seed inicial con TODAS las familias y subfamilias actuales y sus mensajes literales (los mismos que ya están en `messages.ts`).

### 2. Lectura de datos

- Nuevo hook `useFamilias()` (React Query) que carga familias + subfamilias desde Supabase.
- `findFamily` / `findSubfamily` siguen exponiéndose pero leyendo desde el cache de React Query.
- `buildMessage` recibe el `mensaje` (template) como argumento en vez de buscarlo en un map estático. Sustituye `___` por el importe y añade al final `actions(c)` + `fotosBlock(c)`. El array `SPECIFIC` se elimina.
- `app.nueva.tsx` pasa el template del mensaje (obtenido de la subfamilia seleccionada) a `buildMessage`.

### 3. Pantalla de administración

Nueva ruta `src/routes/app.familias.tsx` (enlazada desde Ajustes y desde el menú lateral si existe). Layout:

- Lista de familias a la izquierda (en móvil, arriba) con botón “+ Nueva familia”.
- Al seleccionar una familia: cabecera editable (nombre + icono) con botones Guardar / Eliminar; debajo, lista de subfamilias con su nombre y, plegado, el mensaje. Cada subfamilia tiene Editar / Eliminar y un botón “+ Nueva subfamilia”.
- Editor de subfamilia (Sheet o Dialog): campos `nombre` y `mensaje` (textarea grande, multilinea, ayuda “usa `___` donde irá el importe”).
- Eliminaciones siempre con `AlertDialog` de confirmación. Eliminar familia avisa que se eliminarán también sus subfamilias.
- Toasts con sonner para éxito/error.

### 4. Detalles técnicos

```text
src/
  lib/mptc/
    families.ts          # types + helpers (sin datos)
    messages.ts          # buildMessage(template, ctx) + buildPenaMessage
    useFamilias.ts       # hook con React Query + mutaciones CRUD
  routes/
    app.familias.tsx     # nueva pantalla de admin
    app.nueva.tsx        # adaptado a la nueva firma de buildMessage
    app.ajustes.tsx      # enlace a "Gestionar familias"
```

Acceso desde Ajustes con un botón “Gestionar familias y mensajes”.

### 5. Compatibilidad

Las gestiones ya guardadas referencian `categoria` y `subfamilia` por slug; mantenemos los slugs actuales en el seed para no romper el historial existente.

### Fuera de alcance

- Reordenar familias/subfamilias por drag & drop (se podrá editar `orden` manualmente más adelante).
- Importar/exportar en lote.