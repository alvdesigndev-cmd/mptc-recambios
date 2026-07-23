import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function ensureAdmin(context: { supabase: any; userId: string }) {
  const { data: isAdmin, error } = await context.supabase.rpc("is_admin", { _uid: context.userId });
  if (error) throw new Error("No se pudo verificar el rol");
  if (!isAdmin) throw new Error("Solo un administrador puede realizar esta acción");
}

async function getUserEmail(supabaseAdmin: any, userId: string): Promise<string | null> {
  try {
    const { data } = await supabaseAdmin.auth.admin.getUserById(userId);
    return data?.user?.email ?? null;
  } catch { return null; }
}

async function logAudit(
  supabaseAdmin: any,
  entry: {
    action: string;
    actor_user_id: string;
    target_user_id?: string | null;
    target_email?: string | null;
    metadata?: Record<string, unknown>;
  },
) {
  const actor_email = await getUserEmail(supabaseAdmin, entry.actor_user_id);
  try {
    await supabaseAdmin.from("admin_audit_log").insert({
      action: entry.action,
      actor_user_id: entry.actor_user_id,
      actor_email,
      target_user_id: entry.target_user_id ?? null,
      target_email: entry.target_email ?? null,
      metadata: entry.metadata ?? {},
    });
  } catch {
    // no bloquear la operación si falla el log
  }
}

function normalizeReason(reason: unknown): string | null {
  if (typeof reason !== "string") return null;
  const t = reason.trim().slice(0, 500);
  return t.length ? t : null;
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
      const email = await getUserEmail(supabaseAdmin, p.user_id);
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
  .inputValidator((data: { userId: string; password: string; reason?: string }) => {
    if (!data?.userId || typeof data.password !== "string") throw new Error("Datos inválidos");
    if (data.password.length < 8) throw new Error("La contraseña debe tener al menos 8 caracteres");
    return { userId: data.userId, password: data.password, reason: normalizeReason(data.reason) };
  })
  .handler(async ({ data, context }) => {
    await ensureAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.auth.admin.updateUserById(data.userId, {
      password: data.password,
    });
    if (error) throw new Error(error.message);
    const email = await getUserEmail(supabaseAdmin, data.userId);
    await logAudit(supabaseAdmin, {
      action: "taller_user.password_reset",
      actor_user_id: context.userId,
      target_user_id: data.userId,
      target_email: email,
      metadata: { reason: data.reason },
    });
    return { ok: true as const };
  });

export const setTallerUserEmail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { userId: string; email: string; reason?: string }) => {
    if (!data?.userId) throw new Error("userId requerido");
    const email = (data.email || "").trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("Email no válido");
    return { userId: data.userId, email, reason: normalizeReason(data.reason) };
  })
  .handler(async ({ data, context }) => {
    await ensureAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const previousEmail = await getUserEmail(supabaseAdmin, data.userId);
    const { error } = await supabaseAdmin.auth.admin.updateUserById(data.userId, {
      email: data.email,
      email_confirm: true,
    } as any);
    if (error) throw new Error(error.message);
    await logAudit(supabaseAdmin, {
      action: "taller_user.email_change",
      actor_user_id: context.userId,
      target_user_id: data.userId,
      target_email: data.email,
      metadata: { previous_email: previousEmail, new_email: data.email, reason: data.reason },
    });
    return { ok: true as const };
  });

export const setTallerUserMecanico = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { userId: string; mecanico: string; reason?: string }) => {
    if (!data?.userId) throw new Error("userId requerido");
    return {
      userId: data.userId,
      mecanico: (data.mecanico || "").trim().slice(0, 120),
      reason: normalizeReason(data.reason),
    };
  })
  .handler(async ({ data, context }) => {
    await ensureAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: prev } = await supabaseAdmin
      .from("profiles")
      .select("mecanico")
      .eq("user_id", data.userId)
      .maybeSingle();
    const { error } = await supabaseAdmin
      .from("profiles")
      .update({ mecanico: data.mecanico })
      .eq("user_id", data.userId);
    if (error) throw new Error(error.message);
    const email = await getUserEmail(supabaseAdmin, data.userId);
    await logAudit(supabaseAdmin, {
      action: "taller_user.mecanico_change",
      actor_user_id: context.userId,
      target_user_id: data.userId,
      target_email: email,
      metadata: {
        previous_mecanico: prev?.mecanico ?? null,
        new_mecanico: data.mecanico,
        reason: data.reason,
      },
    });
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
  .inputValidator((data: { tallerId: string; email: string; password: string; mecanico?: string; reason?: string }) => {
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
      reason: normalizeReason(data.reason),
    };
  })
  .handler(async ({ data, context }) => {
    await ensureAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

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
    await logAudit(supabaseAdmin, {
      action: "taller_user.create",
      actor_user_id: context.userId,
      target_user_id: created.user?.id ?? null,
      target_email: data.email,
      metadata: {
        taller_id: t.taller_id,
        taller_name: t.nombre,
        mecanico: data.mecanico,
        reason: data.reason,
      },
    });
    return { ok: true as const, userId: created.user?.id ?? null };
  });

export const deleteTallerUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { userId: string; reason?: string }) => {
    if (!data?.userId) throw new Error("userId requerido");
    return { userId: data.userId, reason: normalizeReason(data.reason) };
  })
  .handler(async ({ data, context }) => {
    await ensureAdmin(context);
    if (data.userId === context.userId) throw new Error("No puedes eliminar tu propia cuenta");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const email = await getUserEmail(supabaseAdmin, data.userId);
    const { data: prof } = await supabaseAdmin
      .from("profiles")
      .select("taller_id, taller_name, mecanico")
      .eq("user_id", data.userId)
      .maybeSingle();
    const { error } = await supabaseAdmin.auth.admin.deleteUser(data.userId);
    if (error) throw new Error(error.message);
    await logAudit(supabaseAdmin, {
      action: "taller_user.delete",
      actor_user_id: context.userId,
      target_user_id: data.userId,
      target_email: email,
      metadata: {
        taller_id: prof?.taller_id ?? null,
        taller_name: prof?.taller_name ?? null,
        mecanico: prof?.mecanico ?? null,
        reason: data.reason,
      },
    });
    return { ok: true as const };
  });
