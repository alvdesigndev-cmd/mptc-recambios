import { createClient } from "@supabase/supabase-js";
import { defineTool, type ToolContext } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { getSupabaseServerConfig } from "@/lib/mptc/supabase-env.server";

function supabaseForUser(ctx: ToolContext) {
  const { url, publishableKey } = getSupabaseServerConfig();
  return createClient(url, publishableKey, {
    global: { headers: { Authorization: `Bearer ${ctx.getToken()}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export default defineTool({
  name: "get_perfil",
  title: "Mi perfil",
  description:
    "Devuelve el perfil (rol, taller, ciudad, mecánico) del usuario autenticado.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (_input, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "No autenticado" }], isError: true };
    }
    const { data, error } = await supabaseForUser(ctx)
      .from("profiles")
      .select("role,taller_id,taller_name,ciudad,mecanico")
      .eq("user_id", ctx.getUserId())
      .maybeSingle();
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? {}, null, 2) }],
      structuredContent: { profile: data ?? null },
    };
  },
});
