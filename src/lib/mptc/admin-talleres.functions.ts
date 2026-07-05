import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function ensureAdmin(context: { supabase: any; userId: string }) {
  const { data: isAdmin, error } = await context.supabase.rpc("is_admin", { _uid: context.userId });
  if (error) throw new Error("No se pudo verificar el rol");
  if (!isAdmin) throw new Error("Solo un administrador puede realizar esta acción");
}

export interface TallerUser {
  user_id: string;
  email: string | null;
  role: string;
  mecanico: string | null;
  created_at: string | null;
}

export const listTallerUsers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { tallerId: string }) => {
    if (!data?.tallerId) throw new Error("tallerId requerido");
    return { tallerId: data.tallerId.trim() };
  })
  .handler(async ({ data, context }): Promise<TallerUser[]> => {
    await ensureAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: profs, error } = await supabaseAdmin
      .from("profiles")
      .select("user_id, role, mecanico, created_at")
      .eq("taller_id", data.tallerId);
    if (error) throw new Error(error.message);
    const rows: TallerUser[] = [];
    for (const p of (profs as any[]) || []) {
      let email: string | null = null;
      try {
        const { data: u } = await supabaseAdmin.auth.admin.getUserById(p.user_id);
        email = u?.user?.email ?? null;
      } catch {}
      rows.push({
        user_id: p.user_id,
        email,
        role: p.role,
        mecanico: p.mecanico,
        created_at: p.created_at,
      });
    }
    return rows;
  });

export const setTallerUserPassword = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { userId: string; password: string }) => {
    if (!data?.userId || typeof data.password !== "string") throw new Error("Datos inválidos");
    if (data.password.length < 8) throw new Error("La contraseña debe tener al menos 8 caracteres");
    return { userId: data.userId, password: data.password };
  })
  .handler(async ({ data, context }) => {
    await ensureAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.auth.admin.updateUserById(data.userId, {
      password: data.password,
    });
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

// Mapa de tallerId → role slot predefinido. Los talleres dinámicos usan "taller-1" como slot genérico.
const PREDEFINED_ROLE_BY_ID: Record<string, string> = {
  "taller-1-mtc-recambios": "taller-1",
  "taller-2-mtc-recambios": "taller-2",
  "taller-3-tecniauto-express-marbella": "taller-3",
  "taller-4-mecanica-autofran": "taller-4",
  "taller-5-boxes-team-marbella": "taller-5",
};

export const createTallerUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { tallerId: string; email: string; password: string; mecanico?: string }) => {
    if (!data?.tallerId) throw new Error("tallerId requerido");
    if (!data?.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) throw new Error("Email no válido");
    if (typeof data.password !== "string" || data.password.length < 8) {
      throw new Error("La contraseña debe tener al menos 8 caracteres");
    }
    return {
      tallerId: data.tallerId.trim(),
      email: data.email.trim().toLowerCase(),
      password: data.password,
      mecanico: (data.mecanico || "").trim(),
    };
  })
  .handler(async ({ data, context }) => {
    await ensureAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Verifica que el taller existe y está activo
    const { data: t, error: te } = await supabaseAdmin
      .from("talleres")
      .select("taller_id,nombre,ciudad,activo")
      .eq("taller_id", data.tallerId)
      .maybeSingle();
    if (te) throw new Error(te.message);
    if (!t) throw new Error("Taller no encontrado");
    if (!t.activo) throw new Error("El taller está desactivado");

    const role = PREDEFINED_ROLE_BY_ID[data.tallerId] || "taller-1";

    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: {
        role,
        taller_id: t.taller_id,
        taller_name: t.nombre,
        ciudad: t.ciudad ?? "",
        mecanico: data.mecanico,
      },
    });
    if (error) throw new Error(error.message);
    return { ok: true as const, userId: created.user?.id ?? null };
  });

export const deleteTallerUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { userId: string }) => {
    if (!data?.userId) throw new Error("userId requerido");
    return { userId: data.userId };
  })
  .handler(async ({ data, context }) => {
    await ensureAdmin(context);
    if (data.userId === context.userId) throw new Error("No puedes eliminar tu propia cuenta");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.auth.admin.deleteUser(data.userId);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

