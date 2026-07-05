import { createClient } from "@supabase/supabase-js";
import { defineTool, type ToolContext } from "@lovable.dev/mcp-js";
import { z } from "zod";

function supabaseForUser(ctx: ToolContext) {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
    global: { headers: { Authorization: `Bearer ${ctx.getToken()}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export default defineTool({
  name: "list_gestiones",
  title: "Listar gestiones",
  description:
    "Lista las gestiones más recientes del taller del usuario autenticado. Se puede filtrar por matrícula, estado o categoría.",
  inputSchema: {
    matricula: z.string().trim().optional().describe("Filtrar por matrícula (búsqueda parcial)."),
    estado: z.string().trim().optional().describe("Filtrar por estado exacto (p. ej. 'pendiente', 'confirmada')."),
    categoria: z.string().trim().optional().describe("Filtrar por familia/categoría (slug)."),
    limit: z.number().int().min(1).max(50).default(20),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ matricula, estado, categoria, limit }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "No autenticado" }], isError: true };
    }
    let q = supabaseForUser(ctx)
      .from("gestiones")
      .select(
        "id,created_at,estado,matricula,marca,modelo,cliente_nombre,cliente_telefono,categoria,subfamilia,importe,piezas,taller_nombre",
      )
      .order("created_at", { ascending: false })
      .limit(limit);
    if (matricula) q = q.ilike("matricula", `%${matricula}%`);
    if (estado) q = q.eq("estado", estado);
    if (categoria) q = q.eq("categoria", categoria);
    const { data, error } = await q;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? [], null, 2) }],
      structuredContent: { gestiones: data ?? [] },
    };
  },
});
