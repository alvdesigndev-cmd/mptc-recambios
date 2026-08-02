import { createClient } from "@supabase/supabase-js";
import { createMiddleware } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import type { Database } from "@/integrations/supabase/types";
import { getSupabaseServerConfig } from "./supabase-env.server";

export const requireAuth = createMiddleware({ type: "function" }).server(async ({ next }) => {
  const { url, publishableKey } = getSupabaseServerConfig();


  const authHeader = getRequest().headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    throw new Error("Sesión no válida. Vuelve a iniciar sesión");
  }

  const token = authHeader.slice("Bearer ".length);
  if (!token) throw new Error("Sesión no válida. Vuelve a iniciar sesión");

  const supabase = createClient<Database>(url, publishableKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await supabase.auth.getClaims(token);
  const userId = data?.claims?.sub;
  if (error || !userId) throw new Error("La sesión ha caducado. Vuelve a iniciar sesión");

  return next({ context: { supabase, userId, claims: data.claims } });
});