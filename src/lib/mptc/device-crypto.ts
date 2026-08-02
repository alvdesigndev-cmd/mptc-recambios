// Cifrado local ligado al dispositivo.
//
// Las credenciales recordadas se guardan cifradas con AES-GCM. La clave se
// genera una sola vez por dispositivo/navegador y se almacena en IndexedDB como
// CryptoKey **no exportable**: el navegador nunca deja leer su material, así que
// el contenido de localStorage no se puede descifrar copiándolo a otro sitio.

const DB_NAME = "mptc-secure";
const STORE = "keys";
const KEY_ID = "device-key-v1";
const PREFIX = "v2:";

function idb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = window.indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function idbGet(db: IDBDatabase, key: string): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const req = db.transaction(STORE, "readonly").objectStore(STORE).get(key);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function idbPut(db: IDBDatabase, key: string, value: unknown): Promise<void> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(value as any, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

let cached: Promise<CryptoKey | null> | null = null;

/** Clave AES-GCM propia de este dispositivo (se crea la primera vez). */
export function getDeviceKey(): Promise<CryptoKey | null> {
  if (cached) return cached;
  cached = (async () => {
    if (typeof window === "undefined" || !window.crypto?.subtle || !window.indexedDB) return null;
    try {
      const db = await idb();
      const existing = await idbGet(db, KEY_ID);
      if (existing) return existing as CryptoKey;
      const key = await window.crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, false, [
        "encrypt",
        "decrypt",
      ]);
      await idbPut(db, KEY_ID, key);
      return key;
    } catch {
      return null;
    }
  })();
  return cached;
}

function toB64(bytes: Uint8Array): string {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s);
}

function fromB64(b64: string): Uint8Array {
  const s = atob(b64);
  const out = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
  return out;
}

/** Cifra un texto para guardarlo en este dispositivo. */
export async function encryptForDevice(plain: string): Promise<string> {
  const key = await getDeviceKey();
  // Sin WebCrypto/IndexedDB (navegadores muy antiguos o modo restringido)
  // caemos al formato legacy ofuscado para no romper el "recordar".
  if (!key) return btoa(unescape(encodeURIComponent(plain)));
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const buf = await window.crypto.subtle.encrypt(
    { name: "AES-GCM", iv: iv as unknown as BufferSource },
    key,
    new TextEncoder().encode(plain) as unknown as BufferSource,
  );
  return `${PREFIX}${toB64(iv)}.${toB64(new Uint8Array(buf))}`;
}

/** Descifra un valor guardado. Acepta también el formato legacy base64. */
export async function decryptForDevice(stored: string): Promise<string> {
  if (!stored) return "";
  if (!stored.startsWith(PREFIX)) {
    try { return decodeURIComponent(escape(atob(stored))); } catch { return ""; }
  }
  const [ivB64, dataB64] = stored.slice(PREFIX.length).split(".");
  if (!ivB64 || !dataB64) return "";
  const key = await getDeviceKey();
  if (!key) return "";
  try {
    const plain = await window.crypto.subtle.decrypt(
      { name: "AES-GCM", iv: fromB64(ivB64) as unknown as BufferSource },
      key,
      fromB64(dataB64) as unknown as BufferSource,
    );
    return new TextDecoder().decode(plain);
  } catch {
    return "";
  }
}

/** True si el valor guardado ya está cifrado con la clave del dispositivo. */
export function isEncrypted(stored: string | null): boolean {
  return !!stored && stored.startsWith(PREFIX);
}
