import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

interface CreateAdminInput {
  email: string;
  password: string;
  tallerName?: string;
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
    const { supabase, userId } = context;
    const { data: isAdmin, error: roleErr } = await supabase.rpc("is_admin", { _uid: userId });
    if (roleErr) throw new Error("No se pudo verificar el rol");
    if (!isAdmin) throw new Error("Solo un administrador puede crear otros administradores");

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
    return { ok: true as const, userId: created.user?.id ?? null };
  });
