// Identidades fijas de taller — coinciden con la app HTML original.
// No son UUIDs aleatorios: cualquier dispositivo que entra como un mismo
// taller ve los mismos datos en Supabase.

export type Role = "taller-1" | "taller-2" | "pena";

export interface TallerProfile {
  role: Role;
  tallerId: string;
  tallerName: string;
  ciudad: string;
  mecanico: string;
}

export const TALLER_PROFILES: Record<Exclude<Role, "pena">, TallerProfile> = {
  "taller-1": {
    role: "taller-1",
    tallerId: "taller-1-mtc-recambios",
    tallerName: "Taller 1",
    ciudad: "",
    mecanico: "",
  },
  "taller-2": {
    role: "taller-2",
    tallerId: "taller-2-mtc-recambios",
    tallerName: "Taller 2",
    ciudad: "",
    mecanico: "",
  },
};

export const PENA_PHONE = "34634954491";

const SETTINGS_KEY = "mptc_settings_v1";

export interface AppSettings {
  role: Role;
  tallerId: string;
  tallerName: string;
  ciudad: string;
  mecanico: string;
  theme: "dark" | "light";
}

export function loadSettings(): AppSettings | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as AppSettings;
  } catch {
    return null;
  }
}

export function saveSettings(s: AppSettings) {
  if (typeof window === "undefined") return;
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
}

export function clearSettings() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(SETTINGS_KEY);
}

export function settingsFromRole(role: Role): AppSettings {
  if (role === "pena") {
    return {
      role,
      tallerId: "grupo-pena",
      tallerName: "Grupo Peña",
      ciudad: "",
      mecanico: "",
      theme: "dark",
    };
  }
  const p = TALLER_PROFILES[role];
  return {
    role: p.role,
    tallerId: p.tallerId,
    tallerName: p.tallerName,
    ciudad: p.ciudad,
    mecanico: p.mecanico,
    theme: "dark",
  };
}
