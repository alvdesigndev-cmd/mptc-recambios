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
  name: "search_clientes",
  title: "Buscar clientes",
  description:
    "Busca clientes del taller del usuario autenticado por matrícula, teléfono o nombre (búsqueda parcial insensible a mayúsculas).",
  inputSchema: {
    query: z.string().trim().min(1).describe("Texto a buscar en matrícula, teléfono o nombre."),
    limit: z.number().int().min(1).max(50).default(20),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ query, limit }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "No autenticado" }], isError: true };
    }
    const like = `%${query}%`;
    const { data, error } = await supabaseForUser(ctx)
      .from("clientes")
      .select(
        "id,nombre,telefono,matricula,vehiculo,km,notas,total_gestiones,ultima_gestion,taller_nombre",
      )
      .or(`matricula.ilike.${like},telefono.ilike.${like},nombre.ilike.${like}`)
      .order("ultima_gestion", { ascending: false, nullsFirst: false })
      .limit(limit);
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? [], null, 2) }],
      structuredContent: { clientes: data ?? [] },
    };
  },
});
