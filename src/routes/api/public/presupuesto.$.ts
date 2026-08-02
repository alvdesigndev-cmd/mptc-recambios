// Sirve el PDF de un presupuesto con una URL limpia y permanente, para que el
// cliente lo abra como un PDF normal en WhatsApp (sin token ni caducidad).
import { createFileRoute } from "@tanstack/react-router";

const BUCKET = "presupuestos";

export const Route = createFileRoute("/api/public/presupuesto/$")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const raw = decodeURIComponent(url.pathname.split("/api/public/presupuesto/")[1] || "");
        const path = raw.replace(/^\/+/, "");
        if (!path || path.includes("..") || !/\.pdf$/i.test(path)) {
          return new Response("Not found", { status: 404 });
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data, error } = await supabaseAdmin.storage.from(BUCKET).download(path);
        if (error || !data) return new Response("Not found", { status: 404 });

        const filename = path.split("/").pop() || "presupuesto.pdf";
        return new Response(await data.arrayBuffer(), {
          headers: {
            "Content-Type": "application/pdf",
            "Content-Disposition": `inline; filename="${filename}"`,
            "Cache-Control": "public, max-age=31536000, immutable",
          },
        });
      },
    },
  },
});
