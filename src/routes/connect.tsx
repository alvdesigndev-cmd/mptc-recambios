import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Check, Copy, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/connect")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Conectar asistentes IA · MPTC Recambios" },
      {
        name: "description",
        content:
          "Instrucciones para conectar ChatGPT o Claude a MPTC Recambios y consultar tus gestiones y clientes desde el asistente.",
      },
    ],
  }),
  component: ConnectPage,
});

function ConnectPage() {
  const [mcpUrl, setMcpUrl] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setMcpUrl(new URL("/mcp", window.location.origin).toString());
  }, []);

  async function copy() {
    if (!mcpUrl) return;
    try {
      await navigator.clipboard.writeText(mcpUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* noop */
    }
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-10 space-y-8">
      <header className="space-y-2">
        <div className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1 text-xs font-medium text-muted-foreground">
          <Sparkles className="h-3.5 w-3.5" /> Asistentes IA
        </div>
        <h1 className="text-3xl font-bold tracking-tight">Conectar ChatGPT o Claude</h1>
        <p className="text-sm text-muted-foreground">
          Añade MPTC Recambios como conector en tu asistente para consultar
          gestiones y clientes de tu taller con tu propia cuenta.
        </p>
      </header>

      <section className="space-y-3 rounded-2xl border border-border bg-surface p-5">
        <h2 className="text-sm font-semibold">URL del servidor</h2>
        <div className="flex items-center gap-2">
          <code className="flex-1 truncate rounded-xl border border-input bg-surface-2 px-3 py-2.5 text-sm font-mono">
            {mcpUrl || "…"}
          </code>
          <Button type="button" variant="outline" onClick={copy} disabled={!mcpUrl}>
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            <span className="ml-2">{copied ? "Copiada" : "Copiar"}</span>
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Al conectar, tu asistente te pedirá iniciar sesión en MPTC Recambios y
          autorizar el acceso. Solo verá los datos de tu taller.
        </p>
      </section>

      <section className="space-y-3 rounded-2xl border border-border bg-surface p-5">
        <h2 className="text-sm font-semibold">ChatGPT</h2>
        <ol className="list-decimal space-y-2 pl-5 text-sm text-foreground/90">
          <li>
            Abre{" "}
            <a
              className="text-primary underline"
              href="https://chatgpt.com/#settings/Connectors/Advanced"
              target="_blank"
              rel="noreferrer"
            >
              Ajustes → Conectores → Avanzado
            </a>{" "}
            y activa el <strong>Modo desarrollador</strong> (acepta el aviso de riesgo).
          </li>
          <li>
            En el menú <strong>“+”</strong> del cuadro de chat, activa también el modo desarrollador.
          </li>
          <li>
            Pulsa <strong>“Añadir fuentes”</strong> y después <strong>“Conectar más”</strong>.
          </li>
          <li>
            Ponle nombre al conector (por ejemplo, <em>MPTC Recambios</em>) y pega la URL de arriba.
          </li>
          <li>Pide a ChatGPT que use la app (por ejemplo, «lista mis últimas gestiones»).</li>
        </ol>
      </section>

      <section className="space-y-3 rounded-2xl border border-border bg-surface p-5">
        <h2 className="text-sm font-semibold">Claude</h2>
        <ol className="list-decimal space-y-2 pl-5 text-sm text-foreground/90">
          <li>
            Abre{" "}
            <a
              className="text-primary underline"
              href="https://claude.ai/customize/connectors?modal=add-custom-connector"
              target="_blank"
              rel="noreferrer"
            >
              Añadir conector personalizado
            </a>
            .
          </li>
          <li>
            Ponle nombre al conector (por ejemplo, <em>MPTC Recambios</em>) y pega la URL de arriba.
          </li>
          <li>
            Actívalo desde el cuadro de chat y pide a Claude que use la app.
          </li>
        </ol>
      </section>

      <p className="text-xs text-muted-foreground">
        El asistente descubrirá automáticamente las herramientas disponibles.
        Podrá consultar tus gestiones, buscar clientes y ver tu perfil, siempre
        limitado a tu taller.
      </p>
    </main>
  );
}
