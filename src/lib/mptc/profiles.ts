// Perfil del taller — la fuente de verdad vive ahora en la tabla `profiles`
// de Supabase. Aquí mantenemos una caché en localStorage (poblada tras login)
// para que el resto de la app pueda leer `tallerId`, `tallerName`, etc. de
// forma síncrona, igual que antes.

export type Role = "taller-1" | "taller-2" | "pena";

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

export interface ProfileRow {
  role: Role;
  taller_id: string;
  taller_name: string;
  ciudad: string;
  mecanico: string;
}

export function settingsFromProfile(p: ProfileRow, theme: "dark" | "light" = "light"): AppSettings {
  return {
    role: p.role,
    tallerId: p.taller_id,
    tallerName: p.taller_name,
    ciudad: p.ciudad ?? "",
    mecanico: p.mecanico ?? "",
    theme,
  };
}
