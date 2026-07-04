import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

interface CreateAdminInput {
  email: string;
  password: string;
  tallerName?: string;
}

async function ensureAdmin(context: { supabase: any; userId: string }) {
  const { data: isAdmin, error } = await context.supabase.rpc("is_admin", { _uid: context.userId });
  if (error) throw new Error("No se pudo verificar el rol");
  if (!isAdmin) throw new Error("Solo un administrador puede realizar esta acción");
}

async function getActorEmail(supabaseAdmin: any, userId: string): Promise<string | null> {
  try {
    const { data } = await supabaseAdmin.auth.admin.getUserById(userId);
    return data?.user?.email ?? null;
  } catch { return null; }
}

async function logAdminAction(
  supabaseAdmin: any,
  entry: {
    action: string;
    actor_user_id: string;
    target_user_id?: string | null;
    target_email?: string | null;
    metadata?: Record<string, unknown>;
  },
) {
  const actor_email = await getActorEmail(supabaseAdmin, entry.actor_user_id);
  await supabaseAdmin.from("admin_audit_log").insert({
    action: entry.action,
    actor_user_id: entry.actor_user_id,
    actor_email,
    target_user_id: entry.target_user_id ?? null,
    target_email: entry.target_email ?? null,
    metadata: entry.metadata ?? {},
  });
}

export const createAdminUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: CreateAdminInput) => {
    if (!data || typeof data.email !== "string" || typeof data.password !== "string") {
      throw new Error("Datos inválidos");
    }
    const email = data.email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("Email inválido");
    if (data.password.length < 8) throw new Error("La contraseña debe tener al menos 8 caracteres");
    const tallerName = (data.tallerName ?? "").trim().slice(0, 120) || "Administración";
    return { email, password: data.password, tallerName };
  })
  .handler(async ({ data, context }) => {
    await ensureAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: {
        role: "admin",
        taller_id: "admin",
        taller_name: data.tallerName,
      },
    });
    if (error) throw new Error(error.message);
    await logAdminAction(supabaseAdmin, {
      action: "admin.create",
      actor_user_id: context.userId,
      target_user_id: created.user?.id ?? null,
      target_email: data.email,
      metadata: { taller_name: data.tallerName },
    });
    return { ok: true as const, userId: created.user?.id ?? null };
  });

export interface AdminRow {
  user_id: string;
  email: string | null;
  taller_name: string;
  created_at: string | null;
  last_sign_in_at: string | null;
  banned: boolean;
  is_self: boolean;
}

export const listAdmins = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<AdminRow[]> => {
    await ensureAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: profiles, error: pErr } = await supabaseAdmin
      .from("profiles")
      .select("user_id,taller_name,created_at")
      .eq("role", "admin");
    if (pErr) throw new Error(pErr.message);

    const rows: AdminRow[] = [];
    for (const p of profiles ?? []) {
      const { data: u } = await supabaseAdmin.auth.admin.getUserById(p.user_id);
      const authUser: any = u?.user ?? null;
      const bannedUntil = authUser?.banned_until ? new Date(authUser.banned_until) : null;
      const banned = !!(bannedUntil && bannedUntil.getTime() > Date.now());
      rows.push({
        user_id: p.user_id,
        email: authUser?.email ?? null,
        taller_name: p.taller_name ?? "Administración",
        created_at: p.created_at ?? null,
        last_sign_in_at: authUser?.last_sign_in_at ?? null,
        banned,
        is_self: p.user_id === context.userId,
      });
    }
    rows.sort((a, b) => (a.email ?? "").localeCompare(b.email ?? ""));
    return rows;
  });

export const setAdminBanned = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { userId: string; banned: boolean }) => {
    if (!data || typeof data.userId !== "string" || typeof data.banned !== "boolean") {
      throw new Error("Datos inválidos");
    }
    return data;
  })
  .handler(async ({ data, context }) => {
    await ensureAdmin(context);
    if (data.userId === context.userId) throw new Error("No puedes desactivar tu propia cuenta");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.auth.admin.updateUserById(data.userId, {
      ban_duration: data.banned ? "876000h" : "none",
    } as any);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

export const deleteAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { userId: string }) => {
    if (!data || typeof data.userId !== "string") throw new Error("Datos inválidos");
    return data;
  })
  .handler(async ({ data, context }) => {
    await ensureAdmin(context);
    if (data.userId === context.userId) throw new Error("No puedes eliminar tu propia cuenta");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.auth.admin.deleteUser(data.userId);
    if (error) throw new Error(error.message);
    // Perfil se elimina en cascada por FK a auth.users.
    return { ok: true as const };
  });
