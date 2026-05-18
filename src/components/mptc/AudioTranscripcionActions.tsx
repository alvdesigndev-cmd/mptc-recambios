import { useState } from "react";
import { Download, Copy, Check, FileText } from "lucide-react";

interface Props {
  audioUrl?: string | null;
  transcripcion?: string | null;
  baseName?: string | null;
}

function inferExt(url: string): string {
  const m = url.split("?")[0].match(/\.([a-z0-9]+)$/i);
  return m ? m[1].toLowerCase() : "m4a";
}

async function forceDownload(url: string, filename: string) {
  try {
    const r = await fetch(url);
    const blob = await r.blob();
    const objUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = objUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(objUrl), 1000);
  } catch {
    window.open(url, "_blank", "noopener,noreferrer");
  }
}

export function AudioTranscripcionActions({ audioUrl, transcripcion, baseName }: Props) {
  const [copied, setCopied] = useState(false);
  const safeBase = (baseName || "pedido").replace(/[^\w.-]+/g, "_");

  const copy = async () => {
    if (!transcripcion) return;
    try {
      await navigator.clipboard.writeText(transcripcion);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {}
  };

  const downloadTxt = () => {
    if (!transcripcion) return;
    const blob = new Blob([transcripcion], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${safeBase}-transcripcion.txt`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const downloadAudio = () => {
    if (!audioUrl) return;
    forceDownload(audioUrl, `${safeBase}-audio.${inferExt(audioUrl)}`);
  };

  if (!audioUrl && !transcripcion) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {audioUrl && (
        <button
          type="button"
          onClick={downloadAudio}
          className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-2.5 py-1.5 text-[12px] font-semibold text-foreground hover:bg-surface-2 active:scale-95"
        >
          <Download className="h-3.5 w-3.5" /> Descargar audio
        </button>
      )}
      {transcripcion && (
        <>
          <button
            type="button"
            onClick={copy}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-2.5 py-1.5 text-[12px] font-semibold text-foreground hover:bg-surface-2 active:scale-95"
          >
            {copied ? <Check className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5" />}
            {copied ? "Copiado" : "Copiar texto"}
          </button>
          <button
            type="button"
            onClick={downloadTxt}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-2.5 py-1.5 text-[12px] font-semibold text-foreground hover:bg-surface-2 active:scale-95"
          >
            <FileText className="h-3.5 w-3.5" /> Descargar .txt
          </button>
        </>
      )}
    </div>
  );
}
