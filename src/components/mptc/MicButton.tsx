import { useEffect, useRef, useState } from "react";
import { Mic, Loader2 } from "lucide-react";

type SR = any;

interface Props {
  /** Llamado con cada texto interim (mientras se habla). */
  onInterim?: (text: string) => void;
  /** Llamado cuando un segmento se finaliza. */
  onFinal?: (text: string) => void;
  /**
   * Compatibilidad: si no se pasan onInterim/onFinal, se llama con el último
   * texto disponible (interim o final). Mantiene el comportamiento previo.
   */
  onResult?: (text: string) => void;
  /** Llamado al iniciar la escucha (útil para snapshot del valor previo). */
  onStart?: () => void;
  /** Llamado al terminar la escucha. */
  onStop?: () => void;
  lang?: string;
  className?: string;
  title?: string;
  size?: "sm" | "md";
}

function getRecognition(): SR | null {
  if (typeof window === "undefined") return null;
  const Ctor = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
  return Ctor ? new Ctor() : null;
}

export function MicButton({
  onInterim,
  onFinal,
  onResult,
  onStart,
  onStop,
  lang = "es-ES",
  className = "",
  title = "Dictar por voz",
  size = "md",
}: Props) {
  const [listening, setListening] = useState(false);
  const [supported, setSupported] = useState(true);
  const recRef = useRef<SR | null>(null);
  // Índice del próximo result a procesar. Necesario porque en algunos
  // navegadores (Chrome) e.resultIndex no avanza correctamente con
  // continuous=true, lo que provoca que los finales se emitan repetidos.
  const nextIndexRef = useRef(0);
  // Mantener handlers en refs para no re-crear el recognition cada render.
  const handlers = useRef({ onInterim, onFinal, onResult, onStart, onStop });
  handlers.current = { onInterim, onFinal, onResult, onStart, onStop };

  useEffect(() => {
    const rec = getRecognition();
    if (!rec) { setSupported(false); return; }
    rec.lang = lang;
    rec.interimResults = true;
    rec.continuous = true;
    rec.maxAlternatives = 1;

    rec.onresult = (e: any) => {
      let interim = "";
      let finalChunk = "";
      const start = nextIndexRef.current;
      for (let i = start; i < e.results.length; i++) {
        const r = e.results[i];
        const txt = r[0]?.transcript || "";
        if (r.isFinal) {
          finalChunk += txt;
          // Marcamos este índice como ya procesado.
          nextIndexRef.current = i + 1;
        } else {
          interim += txt;
        }
      }
      const h = handlers.current;
      if (finalChunk.trim()) {
        const t = finalChunk.trim();
        h.onFinal?.(t);
        if (!h.onFinal && !h.onInterim) h.onResult?.(t);
      }
      if (interim.trim() && h.onInterim) {
        h.onInterim(interim.trim());
      }
    };
    rec.onend = () => {
      setListening(false);
      nextIndexRef.current = 0;
      handlers.current.onStop?.();
    };
    rec.onerror = () => {
      setListening(false);
      nextIndexRef.current = 0;
      handlers.current.onStop?.();
    };
    recRef.current = rec;
    return () => { try { rec.stop(); } catch {} };
  }, [lang]);

  if (!supported) return null;

  const toggle = () => {
    const rec = recRef.current;
    if (!rec) return;
    if (listening) { try { rec.stop(); } catch {} return; }
    try {
      rec.start();
      setListening(true);
      handlers.current.onStart?.();
    } catch {}
  };

  const sz = size === "sm" ? "h-8 w-8" : "h-9 w-9";
  return (
    <button
      type="button"
      onClick={toggle}
      title={title}
      aria-label={title}
      aria-pressed={listening}
      className={
        "inline-flex shrink-0 items-center justify-center rounded-xl border border-border-strong transition " +
        sz + " " +
        (listening
          ? "bg-destructive text-destructive-foreground animate-pulse"
          : "bg-surface-2 text-muted-foreground hover:bg-surface-3") +
        " " + className
      }
    >
      {listening ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mic className="h-4 w-4" />}
    </button>
  );
}
