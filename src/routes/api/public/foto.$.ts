// Sirve una foto de gestión con una URL limpia y estable, para que
// WhatsApp pueda previsualizarla (los enlaces firmados con token no se abren
// bien en el navegador in-app y caducan).
import { createFileRoute } from "@tanstack/react-router";

const BUCKET = "fotos-gestiones";

const TYPES: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
  heic: "image/heic",
};

export const Route = createFileRoute("/api/public/foto/$")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const raw = decodeURIComponent(url.pathname.split("/api/public/foto/")[1] || "");
        const path = raw.replace(/^\/+/, "");
        if (!path || path.includes("..")) return new Response("Not found", { status: 404 });

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data, error } = await supabaseAdmin.storage.from(BUCKET).download(path);
        if (error || !data) return new Response("Not found", { status: 404 });

        const ext = (path.split(".").pop() || "").toLowerCase();
        const type = TYPES[ext] || data.type || "application/octet-stream";
        return new Response(await data.arrayBuffer(), {
          headers: {
            "Content-Type": type,
            "Content-Disposition": "inline",
            "Cache-Control": "public, max-age=31536000, immutable",
          },
        });
      },
    },
  },
});
