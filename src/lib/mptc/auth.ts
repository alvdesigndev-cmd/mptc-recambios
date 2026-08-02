import { supabase } from "@/integrations/supabase/client";
import {
  clearSettings,
  loadSettings,
  saveSettings,
  settingsFromProfile,
  TALLER_INFO,
  type ProfileRow,
  type Role,
} from "./profiles";

export async function fetchMyProfile(): Promise<ProfileRow | null> {
  const { data: sess } = await supabase.auth.getSession();
  if (!sess.session) return null;
  const { data, error } = await supabase
    .from("profiles")
    .select("role,taller_id,taller_name,ciudad,mecanico")
    .eq("user_id", sess.session.user.id)
    .maybeSingle();
  if (error || !data) return null;
  return data as ProfileRow;
}

export async function syncProfileToSettings(): Promise<ProfileRow | null> {
  const p = await fetchMyProfile();
  if (!p) {
    clearSettings();
    return null;
  }
  const prev = loadSettings();
  saveSettings(settingsFromProfile(p, prev?.theme ?? "dark"));
  return p;
}

export interface SignUpInput {
  email: string;
  password: string;
  role: Role;
  tallerName: string;
  ciudad?: string;
  mecanico?: string;
  /** Override opcional del taller_id (para talleres creados dinámicamente). */
  tallerId?: string;
}

export async function signUp(input: SignUpInput) {
  const redirect = typeof window !== "undefined" ? `${window.location.origin}/login` : undefined;
  const isPena = input.role === "pena";
  const isAdmin = input.role === "admin";
  const default_taller_id = isPena
    ? "grupo-pena"
    : isAdmin
      ? "admin"
      : TALLER_INFO[input.role as Exclude<Role, "pena" | "admin">].id;
  const default_taller_name = isPena
    ? "Grupo Peña"
    : isAdmin
      ? "Administración"
      : TALLER_INFO[input.role as Exclude<Role, "pena" | "admin">].name;
  const taller_id = input.tallerId && !isPena && !isAdmin ? input.tallerId : default_taller_id;
  return await supabase.auth.signUp({
    email: normalizeEmail(input.email),
    password: input.password,
    options: {
      emailRedirectTo: redirect,
      data: {
        role: input.role,
        taller_id,
        taller_name: input.tallerName || default_taller_name,
        ciudad: input.ciudad ?? "",
        mecanico: input.mecanico ?? "",
      },
    },

  });
}

// Los emails no admiten "ñ" ni acentos: normalizamos lo que escribe el usuario
// (p. ej. grupopeñamptc@gmail.com -> grupopenamptc@gmail.com).
export function normalizeEmail(email: string) {
  return email
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export async function signIn(email: string, password: string) {
  return await supabase.auth.signInWithPassword({ email: normalizeEmail(email), password });
}


export async function signOut() {
  clearSettings();
  // Al salir a propósito olvidamos las credenciales guardadas para que el
  // acceso automático no vuelva a entrar de inmediato.
  if (typeof window !== "undefined") {
    try {
      window.localStorage.removeItem("mptc_remember_email_v1");
      window.localStorage.removeItem("mptc_remember_pass_v1");
      window.localStorage.removeItem("mptc_remember_profile_v1");
    } catch { /* noop */ }
  }
  await supabase.auth.signOut();
}

