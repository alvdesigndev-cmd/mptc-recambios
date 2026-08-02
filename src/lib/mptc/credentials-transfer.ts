// Exportación / importación cifrada de las credenciales guardadas, para poder
// llevarlas de un dispositivo a otro sin volver a escribirlas.
//
// El fichero exportado NUNCA contiene la contraseña en claro: se cifra con
// AES-GCM usando una clave derivada (PBKDF2-SHA256, 200k iteraciones) de la
// frase de paso que elige el usuario en el momento de exportar.
//
// En el propio dispositivo la contraseña se guarda también cifrada (AES-GCM con
// la clave no exportable de `device-crypto`) y se descifra al abrir la app.

import { decryptForDevice, encryptForDevice } from "./device-crypto";

export const REMEMBER_EMAIL_KEY = "mptc_remember_email_v1";
export const REMEMBER_PASS_KEY = "mptc_remember_pass_v1";
export const REMEMBER_PROFILE_KEY = "mptc_remember_profile_v1";


export type LoginProfile = "taller" | "admin" | "pena";

export function isLoginProfile(v: unknown): v is LoginProfile {
  return v === "taller" || v === "admin" || v === "pena";
}

export interface SavedCredentials {
  email: string;
  password: string;
  profile: LoginProfile;
}

const FORMAT = "mptc-credentials";
const VERSION = 1;

interface ExportFile {
  format: typeof FORMAT;
  version: number;
  createdAt: string;
  salt: string; // base64
  iv: string; // base64
  data: string; // base64 (AES-GCM)
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

function subtle(): SubtleCrypto {
  const c = typeof window !== "undefined" ? window.crypto : undefined;
  if (!c?.subtle) throw new Error("Este navegador no permite cifrar el fichero de credenciales.");
  return c.subtle;
}

async function deriveKey(passphrase: string, salt: Uint8Array): Promise<CryptoKey> {
  const base = await subtle().importKey("raw", new TextEncoder().encode(passphrase), "PBKDF2", false, [
    "deriveKey",
  ]);
  return await subtle().deriveKey(
    { name: "PBKDF2", salt: salt as unknown as BufferSource, iterations: 200_000, hash: "SHA-256" },
    base,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

/**
 * Lee y descifra las credenciales guardadas en este dispositivo (o null si no
 * hay). Si venían del formato antiguo (base64), se reescriben cifradas.
 */
export async function readSavedCredentials(): Promise<SavedCredentials | null> {
  if (typeof window === "undefined") return null;
  try {
    const email = window.localStorage.getItem(REMEMBER_EMAIL_KEY);
    const passEnc = window.localStorage.getItem(REMEMBER_PASS_KEY);
    const profile = window.localStorage.getItem(REMEMBER_PROFILE_KEY);
    if (!email || !passEnc) return null;
    const password = await decryptForDevice(passEnc);
    if (!password) return null;
    const creds: SavedCredentials = {
      email,
      password,
      profile: isLoginProfile(profile) ? profile : "taller",
    };
    // Migración transparente del formato legacy al cifrado del dispositivo.
    if (!passEnc.startsWith("v2:")) await writeSavedCredentials(creds);
    return creds;
  } catch {
    return null;
  }
}

/** Cifra y guarda las credenciales en este dispositivo. */
export async function writeSavedCredentials(c: SavedCredentials) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(REMEMBER_EMAIL_KEY, c.email);
    window.localStorage.setItem(REMEMBER_PASS_KEY, await encryptForDevice(c.password));
    window.localStorage.setItem(REMEMBER_PROFILE_KEY, c.profile);
  } catch {
    /* noop */
  }
}

/** Borra las credenciales guardadas en este dispositivo. */
export function clearSavedCredentials() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(REMEMBER_EMAIL_KEY);
    window.localStorage.removeItem(REMEMBER_PASS_KEY);
    window.localStorage.removeItem(REMEMBER_PROFILE_KEY);
  } catch {
    /* noop */
  }
}


/** Cifra las credenciales y devuelve el contenido del fichero a descargar. */
export async function exportCredentials(c: SavedCredentials, passphrase: string): Promise<string> {
  if (passphrase.length < 6) throw new Error("La frase de paso debe tener al menos 6 caracteres.");
  const salt = window.crypto.getRandomValues(new Uint8Array(16));
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(passphrase, salt);
  const payload = new TextEncoder().encode(JSON.stringify(c));
  const buf = await subtle().encrypt(
    { name: "AES-GCM", iv: iv as unknown as BufferSource },
    key,
    payload as unknown as BufferSource,
  );
  const file: ExportFile = {
    format: FORMAT,
    version: VERSION,
    createdAt: new Date().toISOString(),
    salt: toB64(salt),
    iv: toB64(iv),
    data: toB64(new Uint8Array(buf)),
  };
  return JSON.stringify(file, null, 2);
}

/** Descarga el texto como fichero .json en el dispositivo. */
export function downloadFile(filename: string, contents: string) {
  const blob = new Blob([contents], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

/** Descifra un fichero exportado y devuelve las credenciales. */
export async function importCredentials(fileText: string, passphrase: string): Promise<SavedCredentials> {
  let parsed: Partial<ExportFile>;
  try {
    parsed = JSON.parse(fileText);
  } catch {
    throw new Error("El fichero no es válido.");
  }
  if (parsed.format !== FORMAT || !parsed.salt || !parsed.iv || !parsed.data) {
    throw new Error("El fichero no es un export de credenciales de MPTC.");
  }
  const key = await deriveKey(passphrase, fromB64(parsed.salt));
  let plain: ArrayBuffer;
  try {
    plain = await subtle().decrypt(
      { name: "AES-GCM", iv: fromB64(parsed.iv) as unknown as BufferSource },
      key,
      fromB64(parsed.data) as unknown as BufferSource,
    );
  } catch {
    throw new Error("Frase de paso incorrecta o fichero dañado.");
  }
  const obj = JSON.parse(new TextDecoder().decode(plain)) as Partial<SavedCredentials>;
  if (!obj.email || !obj.password) throw new Error("El fichero no contiene credenciales completas.");
  return {
    email: String(obj.email),
    password: String(obj.password),
    profile: isLoginProfile(obj.profile) ? obj.profile : "taller",
  };
}
