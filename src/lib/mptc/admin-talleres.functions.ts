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
    // No permitir que un admin se cambie la contraseña a otro admin por esta vía sin control
    const { error } = await supabaseAdmin.auth.admin.updateUserById(data.userId, {
      password: data.password,
    });
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });
