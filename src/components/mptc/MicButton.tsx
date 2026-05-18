import { useEffect, useRef, useState } from "react";
import { Mic, MicOff, Loader2 } from "lucide-react";

type SR = any;

interface Props {
  onResult: (text: string) => void;
  /** Si true, sustituye el texto; si false (por defecto), añade al existente vía onResult */
  mode?: "replace" | "append";
  lang?: string;
  className?: string;
  title?: string;
  /** Tamaño del icono y del botón */
  size?: "sm" | "md";
}

function getRecognition(): SR | null {
  if (typeof window === "undefined") return null;
  const Ctor = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
  return Ctor ? new Ctor() : null;
}

export function MicButton({
  onResult,
  lang = "es-ES",
  className = "",
  title = "Dictar por voz",
  size = "md",
}: Props) {
  const [listening, setListening] = useState(false);
  const [supported, setSupported] = useState(true);
  const recRef = useRef<SR | null>(null);

  useEffect(() => {
    const rec = getRecognition();
    if (!rec) { setSupported(false); return; }
    rec.lang = lang;
    rec.interimResults = true;
    rec.continuous = false;
    rec.maxAlternatives = 1;
    let finalText = "";
    rec.onresult = (e: any) => {
      let interim = "";
      finalText = "";
      for (let i = 0; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) finalText += r[0].transcript;
        else interim += r[0].transcript;
      }
      const text = (finalText || interim).trim();
      if (text) onResult(text);
    };
    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);
    recRef.current = rec;
    return () => { try { rec.stop(); } catch {} };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang]);

  if (!supported) return null;

  const toggle = () => {
    const rec = recRef.current;
    if (!rec) return;
    if (listening) { try { rec.stop(); } catch {} return; }
    try { rec.start(); setListening(true); } catch {}
  };

  const sz = size === "sm" ? "h-8 w-8" : "h-9 w-9";
  return (
    <button
      type="button"
      onClick={toggle}
      title={title}
      aria-label={title}
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

export { MicOff };
