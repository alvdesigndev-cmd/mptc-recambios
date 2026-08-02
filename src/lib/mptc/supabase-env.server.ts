// Resolución robusta de la configuración del backend en el servidor.
// Distintos entornos (dev, preview, Workers) exponen los valores con nombres
// distintos, así que probamos todos los alias conocidos antes de fallar.
const URL_KEYS = ["SUPABASE_URL", "VITE_SUPABASE_URL"] as const;
const KEY_KEYS = [
  "SUPABASE_PUBLISHABLE_KEY",
  "SUPABASE_ANON_KEY",
  "VITE_SUPABASE_PUBLISHABLE_KEY",
  "VITE_SUPABASE_ANON_KEY",
] as const;

function firstEnv(names: readonly string[]): string | undefined {
  for (const name of names) {
    const value = process.env[name];
    if (typeof value === "string" && value.trim().length > 0) return value.trim();
  }
  return undefined;
}

export function getSupabaseServerConfig(): { url: string; publishableKey: string } {
  const url = firstEnv(URL_KEYS);
  const publishableKey = firstEnv(KEY_KEYS);
  if (!url || !publishableKey) {
    const missing = [...(!url ? ["URL"] : []), ...(!publishableKey ? ["KEY"] : [])].join(", ");
    console.error(`[backend] Configuración no disponible (${missing})`);
    throw new Error("La conexión con el backend no está disponible temporalmente. Inténtalo de nuevo.");
  }
  return { url, publishableKey };
}
