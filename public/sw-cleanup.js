// Complementa el SW generado por Workbox. Se ejecuta vía `importScripts`
// desde /sw.js. Sus responsabilidades:
//   1. En cada `activate` (nueva versión), borrar cachés obsoletos que
//      pertenecen a esta app pero ya no están en la lista permitida.
//   2. Reclamar los clientes de inmediato para que el SW nuevo controle
//      las pestañas abiertas sin esperar a otra recarga.
//   3. Responder a mensajes `PURGE_APP_CACHES` desde la app para forzar
//      una limpieza manual (útil desde ajustes / debug).
/* global self, caches */

// Prefijos de cachés que "poseemos". No tocamos cachés de otros scopes
// (por ejemplo, si alguna vez se añade Firebase Messaging).
const OWNED_PREFIXES = [
  "mptc-",           // runtimeCaching custom
  "workbox-precache-", // precache de Workbox
  "workbox-runtime-",  // runtime buckets por defecto de Workbox
];

// Nombres de cachés vigentes en esta versión del SW. Los cachés propios
// que no estén en esta lista se consideran obsoletos y se eliminan.
// El precache de Workbox se identifica por su sufijo con la scope URL,
// así que se conserva siempre que coincida con el registration scope.
const CURRENT_RUNTIME_CACHES = new Set([
  "mptc-html",
  "mptc-assets",
]);

function isOwnedCache(name) {
  return OWNED_PREFIXES.some((p) => name.startsWith(p));
}

function isCurrentPrecache(name) {
  // Workbox nombra el precache así: `workbox-precache-v2-<scope>`.
  // Solo conservamos el que coincida con la scope de ESTE SW.
  return name.startsWith("workbox-precache-") && name.endsWith(self.registration.scope);
}

async function pruneStaleCaches() {
  const names = await caches.keys();
  const toDelete = names.filter((name) => {
    if (!isOwnedCache(name)) return false;              // no tocar cachés ajenos
    if (CURRENT_RUNTIME_CACHES.has(name)) return false; // runtime en uso
    if (isCurrentPrecache(name)) return false;           // precache actual
    return true;
  });
  await Promise.allSettled(toDelete.map((n) => caches.delete(n)));
  return toDelete;
}

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    try {
      await pruneStaleCaches();
    } catch (_) { /* noop */ }
    try {
      await self.clients.claim();
    } catch (_) { /* noop */ }
  })());
});

self.addEventListener("message", (event) => {
  const data = event.data;
  if (!data || typeof data !== "object") return;
  if (data.type === "PURGE_APP_CACHES") {
    event.waitUntil((async () => {
      const deleted = await pruneStaleCaches();
      event.source && event.source.postMessage({ type: "PURGED", deleted });
    })());
  }
});
