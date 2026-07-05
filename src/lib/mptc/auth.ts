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
    email: input.email,
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

export async function signIn(email: string, password: string) {
  return await supabase.auth.signInWithPassword({ email, password });
}

export async function signOut() {
  clearSettings();
  await supabase.auth.signOut();
}
