import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  GPA_URL_BASE_DEFAULT,
  gpaConfig,
  gpaConfigEnv,
  invalidateGpaConfigCache,
} from "./gpa.server";

export interface GpaConfigPublica {
  urlBase: string;
  usuario: string;
  tienePassword: boolean;
  activa: boolean;
  origen: "bd" | "env";
  modoMock: boolean;
  updatedAt: string | null;
}

async function assertAdmin(context: { supabase: unknown; userId: string }) {
  const supabase = context.supabase as {
    from: (t: string) => {
      select: (c: string) => {
        eq: (c: string, v: string) => { maybeSingle: () => Promise<{ data: { role?: string } | null }> };
      };
    };
  };
  const { data } = await supabase.from("profiles").select("role").eq("user_id", context.userId).maybeSingle();
  if (!data || data.role !== "admin") throw new Error("Solo los administradores pueden gestionar la integración");
}

/** Estado actual de la integración (nunca devuelve la contraseña). */
export const obtenerConfigGPA = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<GpaConfigPublica> => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin
      .from("gpa_config")
      .select("url_base, usuario, password, activa, updated_at")
      .eq("id", "default")
      .maybeSingle();
    const efectiva = await gpaConfig();
    const env = gpaConfigEnv();
    return {
      urlBase: data?.url_base || env.urlBase || GPA_URL_BASE_DEFAULT,
      usuario: data?.usuario || "",
      tienePassword: Boolean(data?.password) || Boolean(env.password),
      activa: data?.activa ?? env.activa,
      origen: efectiva.origen,
      modoMock: !efectiva.activa || !efectiva.usuario || !efectiva.password,
      updatedAt: data?.updated_at ?? null,
    };
  });

/** Guarda credenciales/URL y el estado activo de la integración. */
export const guardarConfigGPA = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (data: unknown) =>
      (data as { urlBase?: string; usuario?: string; password?: string; activa?: boolean }) ?? {},
  )
  .handler(async ({ data, context }): Promise<{ ok: boolean; error?: string }> => {
    await assertAdmin(context);
    const urlBase = (data.urlBase ?? "").trim() || GPA_URL_BASE_DEFAULT;
    const usuario = (data.usuario ?? "").trim();
    const password = (data.password ?? "").trim();

    if (urlBase.length > 300 || usuario.length > 200 || password.length > 200) {
      return { ok: false, error: "Alguno de los valores es demasiado largo" };
    }
    if (!/^https?:\/\//i.test(urlBase)) {
      return { ok: false, error: "La URL debe empezar por http:// o https://" };
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const update: Record<string, unknown> = {
      id: "default",
      url_base: urlBase,
      usuario,
      activa: Boolean(data.activa),
      updated_at: new Date().toISOString(),
      updated_by: context.userId,
    };
    // Solo se sobrescribe la contraseña si se ha escrito una nueva.
    if (password) update["password"] = password;

    const { error } = await supabaseAdmin.from("gpa_config").upsert(update, { onConflict: "id" });
    if (error) return { ok: false, error: "No se pudo guardar la configuración" };
    invalidateGpaConfigCache();
    return { ok: true };
  });

/** Activa/desactiva la integración sin tocar las credenciales. */
export const activarIntegracionGPA = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => (data as { activa?: boolean }) ?? {})
  .handler(async ({ data, context }): Promise<{ ok: boolean; activa: boolean; error?: string }> => {
    await assertAdmin(context);
    const activa = Boolean(data.activa);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("gpa_config")
      .upsert(
        { id: "default", activa, updated_at: new Date().toISOString(), updated_by: context.userId },
        { onConflict: "id" },
      );
    if (error) return { ok: false, activa: !activa, error: "No se pudo cambiar el estado" };
    invalidateGpaConfigCache();
    return { ok: true, activa };
  });

/** Valida las credenciales guardadas haciendo un IniciarSesion real contra GPCat. */
export const validarConfigGPA = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ ok: boolean; mensaje: string }> => {
    await assertAdmin(context);
    invalidateGpaConfigCache();
    const cfg = await gpaConfig();
    if (!cfg.usuario || !cfg.password) {
      return { ok: false, mensaje: "Faltan usuario o contraseña" };
    }
    try {
      const url = `${cfg.urlBase.replace(/\/+$/, "")}/api/SvcGPA/IniciarSesion`;
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ Usuario: cfg.usuario, Password: cfg.password }),
      });
      if (!res.ok) return { ok: false, mensaje: `GPCat respondió ${res.status}` };
      const json = (await res.json()) as { token?: string; Token?: string };
      const token = json.token ?? json.Token ?? "";
      if (!token) return { ok: false, mensaje: "GPCat no devolvió token de sesión" };
      return { ok: true, mensaje: "Conexión correcta con GPCat" };
    } catch {
      return { ok: false, mensaje: "No se pudo conectar con el servicio de GPCat" };
    }
  });
