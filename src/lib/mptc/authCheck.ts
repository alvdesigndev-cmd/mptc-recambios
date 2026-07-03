import { supabase } from "@/integrations/supabase/client";

/**
 * Comprueba la identidad del usuario tolerando fallos de red.
 *
 * En arranque en frío de un PWA (iOS/Android) es habitual que la primera
 * llamada de red falle antes de tener conectividad. `supabase.auth.getUser()`
 * lanza en ese caso con `AuthRetryableFetchError`, y no debemos interpretarlo
 * como "sesión caducada". Sólo consideramos expirada la sesión cuando el
 * servidor responde 401/invalid.
 *
 * Devuelve:
 *  - { user }            → sesión válida
 *  - { expired: true }   → sesión caducada/invalidada por el servidor
 *  - { offline: true }   → sin red / error transitorio; mantener sesión cacheada
 */
export async function checkAuthResilient(): Promise<
  | { user: { id: string; email?: string | null } }
  | { expired: true }
  | { offline: true }
> {
  // Si ni siquiera hay sesión en localStorage, está caducada seguro.
  const { data: sess } = await supabase.auth.getSession();
  if (!sess.session) return { expired: true };

  try {
    const { data, error } = await supabase.auth.getUser();
    if (error) {
      const status = (error as { status?: number }).status;
      const name = (error as { name?: string }).name;
      // 401/403 = token realmente inválido → expirada.
      if (status === 401 || status === 403 || name === "AuthApiError") {
        return { expired: true };
      }
      // Cualquier otra cosa (network, retryable) → offline, seguimos con sesión cacheada.
      return { offline: true };
    }
    if (!data.user) return { expired: true };
    return { user: data.user };
  } catch {
    // fetch rechazado (sin red)
    return { offline: true };
  }
}
