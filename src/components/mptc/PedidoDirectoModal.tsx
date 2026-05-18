import { useEffect, useRef, useState } from "react";
import { Loader2, X, Truck, Mic, Square, Share2, Download, Trash2, Play, Pause } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { buildWAUrl } from "@/lib/mptc/wa";
import { buildPenaMessage } from "@/lib/mptc/messages";
import { PENA_PHONE, type AppSettings } from "@/lib/mptc/profiles";
import { MicButton } from "@/components/mptc/MicButton";

interface Props {
  settings: AppSettings;
  onClose: () => void;
  onSaved?: () => void;
}

export function PedidoDirectoModal({ settings, onClose, onSaved }: Props) {
  const [f, setF] = useState({ matricula: "", vehiculo: "", piezas: "", notas: "" });
  const [saving, setSaving] = useState(false);

  // Grabación de audio
  const [recording, setRecording] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioMime, setAudioMime] = useState<string>("audio/webm");
  const [recError, setRecError] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [playing, setPlaying] = useState(false);
  const mediaRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<number | null>(null);
  const audioElRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Cleanup
  useEffect(() => {
    return () => {
      try { mediaRef.current?.stop(); } catch {}
      streamRef.current?.getTracks().forEach((t) => t.stop());
      if (timerRef.current) window.clearInterval(timerRef.current);
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pickMime = (): string => {
    const candidates = [
      "audio/mp4;codecs=mp4a.40.2", // Safari iOS
      "audio/mp4",
      "audio/webm;codecs=opus",
      "audio/webm",
      "audio/ogg;codecs=opus",
    ];
    const MR = (window as any).MediaRecorder;
    if (!MR?.isTypeSupported) return "";
    for (const c of candidates) if (MR.isTypeSupported(c)) return c;
    return "";
  };

  const startRecording = async () => {
    setRecError(null);
    if (audioUrl) { URL.revokeObjectURL(audioUrl); setAudioUrl(null); setAudioBlob(null); }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mime = pickMime();
      const mr = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);
      mediaRef.current = mr;
      chunksRef.current = [];
      mr.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mr.onstop = () => {
        const usedMime = mr.mimeType || mime || "audio/webm";
        const blob = new Blob(chunksRef.current, { type: usedMime });
        setAudioBlob(blob);
        setAudioMime(usedMime);
        setAudioUrl(URL.createObjectURL(blob));
        streamRef.current?.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      };
      mr.start();
      setRecording(true);
      setElapsed(0);
      timerRef.current = window.setInterval(() => setElapsed((s) => s + 1), 1000);
    } catch (err: any) {
      setRecError(err?.message || "No se pudo acceder al micrófono.");
    }
  };

  const stopRecording = () => {
    try { mediaRef.current?.stop(); } catch {}
    if (timerRef.current) { window.clearInterval(timerRef.current); timerRef.current = null; }
    setRecording(false);
  };

  const discardAudio = () => {
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioUrl(null);
    setAudioBlob(null);
    setElapsed(0);
    setPlaying(false);
  };

  const audioFileName = () => {
    const ext = audioMime.includes("mp4") ? "m4a" : audioMime.includes("ogg") ? "ogg" : "webm";
    const ts = new Date().toISOString().replace(/[:.]/g, "-");
    return `pedido-${settings.tallerId}-${ts}.${ext}`;
  };

  const shareAudio = async () => {
    if (!audioBlob) return;
    const file = new File([audioBlob], audioFileName(), { type: audioMime });
    const nav: any = navigator;
    if (nav.canShare && nav.canShare({ files: [file] })) {
      try {
        await nav.share({
          files: [file],
          title: "Pedido a Peña",
          text: `Pedido de ${settings.tallerName}`,
        });
        return;
      } catch {
        // usuario canceló o falló — caer a descarga
      }
    }
    // Fallback: descargar
    const a = document.createElement("a");
    a.href = audioUrl!;
    a.download = audioFileName();
    a.click();
    alert("Tu navegador no permite compartir directamente. El audio se ha descargado: adjúntalo en WhatsApp manualmente.");
  };

  const togglePlay = () => {
    const el = audioElRef.current;
    if (!el) return;
    if (el.paused) { el.play(); setPlaying(true); }
    else { el.pause(); setPlaying(false); }
  };

  const fmt = (s: number) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  const save = async () => {
    if (!f.piezas.trim()) {
      alert("Indica al menos las piezas que quieres pedir (puedes dictarlas con el micro).");
      return;
    }
    const msg = buildPenaMessage({
      taller: settings.tallerName,
      vehiculo: f.vehiculo,
      matricula: f.matricula,
      piezas: f.piezas,
      notas: f.notas,
    });
    const url = buildWAUrl(PENA_PHONE, msg);
    const win = window.open(url, "_blank");

    setSaving(true);
    try {
      const { error } = await supabase.from("pedidos_pena").insert({
        taller_id: settings.tallerId,
        taller_nombre: settings.tallerName,
        matricula: f.matricula || null,
        vehiculo: f.vehiculo || null,
        piezas: f.piezas,
        notas: f.notas || null,
        estado: "pendiente",
      });
      if (error) throw error;
      onSaved?.();
      onClose();
    } catch (e: any) {
      console.error("pedidos_pena insert", e);
      alert("No se pudo guardar el pedido: " + (e?.message || "error desconocido"));
    } finally {
      setSaving(false);
      if (!win) window.location.href = url;
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center">
      <div className="max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-surface p-5 sm:rounded-3xl">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent/15 text-accent">
              <Truck className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-lg font-bold leading-tight">Pedido directo a Peña</h2>
              <div className="text-[11px] text-muted-foreground">No genera gestión — sólo el pedido.</div>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-2 text-muted-foreground hover:bg-surface-2">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Grabadora de audio */}
        <div className="mb-4 rounded-2xl border border-border bg-surface-2 p-3">
          <div className="mb-2 flex items-center justify-between gap-2">
            <div className="text-sm font-semibold">Pedido por voz</div>
            <span className="text-[11px] text-muted-foreground">
              {recording ? `Grabando · ${fmt(elapsed)}` : audioBlob ? `Listo · ${fmt(elapsed)}` : "Habla el pedido y elige cómo enviarlo"}
            </span>
          </div>

          {!audioBlob ? (
            <button
              type="button"
              onClick={recording ? stopRecording : startRecording}
              className={
                "inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition " +
                (recording
                  ? "bg-destructive text-destructive-foreground animate-pulse"
                  : "bg-accent text-accent-foreground active:scale-95")
              }
            >
              {recording ? <Square className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
              {recording ? "Detener grabación" : "Empezar a grabar"}
            </button>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center gap-2 rounded-xl bg-surface px-3 py-2">
                <button
                  type="button"
                  onClick={togglePlay}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground"
                  aria-label={playing ? "Pausar" : "Reproducir"}
                >
                  {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                </button>
                <audio
                  ref={audioElRef}
                  src={audioUrl ?? undefined}
                  onEnded={() => setPlaying(false)}
                  onPause={() => setPlaying(false)}
                  className="flex-1"
                  controls
                />
                <button
                  type="button"
                  onClick={discardAudio}
                  className="rounded-md p-2 text-muted-foreground hover:bg-surface-2"
                  title="Descartar audio"
                  aria-label="Descartar"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={shareAudio}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-accent px-3 py-2 text-sm font-semibold text-accent-foreground active:scale-95"
                >
                  <Share2 className="h-4 w-4" /> Enviar audio
                </button>
                <a
                  href={audioUrl ?? "#"}
                  download={audioFileName()}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-border-strong bg-surface px-3 py-2 text-sm font-semibold text-foreground"
                >
                  <Download className="h-4 w-4" /> Descargar
                </a>
              </div>
              <p className="text-[11px] text-muted-foreground">
                «Enviar audio» abre WhatsApp en el móvil para adjuntarlo. También puedes dictar el texto abajo con el micro y enviar el pedido escrito.
              </p>
            </div>
          )}
          {recError && (
            <p className="mt-2 text-[11px] font-semibold text-destructive">{recError}</p>
          )}
        </div>

        <div className="space-y-3">
          <Label k="Matrícula (opcional)">
            <input
              value={f.matricula}
              onChange={(e) => setF({ ...f, matricula: e.target.value.toUpperCase() })}
              placeholder="1234 ABC"
              className={inputCls + " font-mono uppercase"}
            />
          </Label>
          <Label k="Vehículo (opcional)">
            <input
              value={f.vehiculo}
              onChange={(e) => setF({ ...f, vehiculo: e.target.value })}
              placeholder="Marca y modelo"
              className={inputCls}
            />
          </Label>
          <Label k="Piezas" action={
            <MicButton
              size="sm"
              title="Dictar piezas"
              onResult={(t) => setF((prev) => ({ ...prev, piezas: prev.piezas ? prev.piezas.trimEnd() + " " + t : t }))}
            />
          }>
            <textarea
              value={f.piezas}
              onChange={(e) => setF({ ...f, piezas: e.target.value })}
              rows={3}
              placeholder="Ej. 2x pastillas delanteras OEM"
              className={inputCls}
            />
          </Label>
          <Label k="Notas" action={
            <MicButton
              size="sm"
              title="Dictar notas"
              onResult={(t) => setF((prev) => ({ ...prev, notas: prev.notas ? prev.notas.trimEnd() + " " + t : t }))}
            />
          }>
            <textarea
              value={f.notas}
              onChange={(e) => setF({ ...f, notas: e.target.value })}
              rows={2}
              className={inputCls}
            />
          </Label>
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-xl border border-border-strong bg-surface px-4 py-2 text-sm font-semibold"
          >
            Cancelar
          </button>
          <button
            onClick={save}
            disabled={saving || !f.piezas.trim()}
            className="inline-flex items-center gap-2 rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground active:scale-95 disabled:opacity-50"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Truck className="h-4 w-4" />}
            Enviar a Peña
          </button>
        </div>
      </div>
    </div>
  );
}

function Label({ k, children, action }: { k: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <label className="block space-y-1">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-semibold uppercase text-muted-foreground">{k}</span>
        {action}
      </div>
      {children}
    </label>
  );
}

const inputCls =
  "w-full rounded-xl bg-surface-2 px-3 py-2.5 text-sm outline-none placeholder:text-muted-foreground/60 focus:bg-surface-3";
