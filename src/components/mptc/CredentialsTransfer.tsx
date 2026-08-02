import { useRef, useState } from "react";
import { Download, Upload, ShieldCheck } from "lucide-react";
import {
  downloadFile,
  exportCredentials,
  importCredentials,
  readSavedCredentials,
  writeSavedCredentials,
  type SavedCredentials,
} from "@/lib/mptc/credentials-transfer";

interface Props {
  /** Se llama tras importar correctamente, para rellenar el formulario. */
  onImported: (c: SavedCredentials) => void;
}

export function CredentialsTransfer({ onImported }: Props) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"export" | "import">("export");
  const [pass, setPass] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  function reset(next: "export" | "import") {
    setTab(next);
    setPass("");
    setMsg(null);
    setErr(null);
  }

  async function handleExport() {
    setErr(null);
    setMsg(null);
    const saved = await readSavedCredentials();
    if (!saved) {
      setErr("No hay credenciales guardadas en este dispositivo. Entra marcando “Guardar mis credenciales” y vuelve aquí.");
      return;
    }
    setBusy(true);
    try {
      const contents = await exportCredentials(saved, pass);
      const stamp = new Date().toISOString().slice(0, 10);
      downloadFile(`mptc-credenciales-${stamp}.json`, contents);
      setPass("");
      setMsg("Fichero descargado. Ábrelo en el otro dispositivo con la misma frase de paso.");
    } catch (e: any) {
      setErr(e?.message ?? "No se pudo exportar.");
    } finally {
      setBusy(false);
    }
  }

  async function handleImport(file: File) {
    setErr(null);
    setMsg(null);
    setBusy(true);
    try {
      const text = await file.text();
      const creds = await importCredentials(text, pass);
      await writeSavedCredentials(creds);
      onImported(creds);
      setPass("");
      setMsg("Credenciales importadas y guardadas en este dispositivo.");
    } catch (e: any) {
      setErr(e?.message ?? "No se pudo importar.");
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex w-full items-center justify-center gap-2 rounded-xl border border-border px-3 py-2 text-[13px] text-muted-foreground"
      >
        <ShieldCheck className="h-4 w-4" />
        Pasar mis credenciales a otro dispositivo
      </button>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-surface-2 p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[13px] font-semibold">Credenciales entre dispositivos</p>
        <button type="button" onClick={() => setOpen(false)} className="text-[12px] text-muted-foreground underline">
          Cerrar
        </button>
      </div>

      <div className="mt-2 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => reset("export")}
          className={`rounded-lg px-2 py-1.5 text-[13px] font-medium ${tab === "export" ? "bg-primary text-primary-foreground" : "border border-border text-muted-foreground"}`}
        >
          Exportar
        </button>
        <button
          type="button"
          onClick={() => reset("import")}
          className={`rounded-lg px-2 py-1.5 text-[13px] font-medium ${tab === "import" ? "bg-primary text-primary-foreground" : "border border-border text-muted-foreground"}`}
        >
          Importar
        </button>
      </div>

      <p className="mt-2 text-[11px] leading-snug text-muted-foreground">
        {tab === "export"
          ? "Elige una frase de paso: el fichero se cifra con ella y sin la frase no se puede abrir."
          : "Introduce la frase de paso que usaste al exportar y selecciona el fichero."}
      </p>

      <input
        type="password"
        value={pass}
        onChange={(e) => setPass(e.target.value)}
        placeholder="Frase de paso (mín. 6 caracteres)"
        autoComplete="off"
        className="mt-2 w-full rounded-lg border border-border bg-surface px-3 py-2 text-base"
      />

      {tab === "export" ? (
        <button
          type="button"
          disabled={busy || pass.length < 6}
          onClick={handleExport}
          className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-3 py-2 text-[13px] font-semibold text-primary-foreground disabled:opacity-60"
        >
          <Download className="h-4 w-4" />
          {busy ? "Cifrando…" : "Descargar fichero cifrado"}
        </button>
      ) : (
        <>
          <button
            type="button"
            disabled={busy || pass.length < 6}
            onClick={() => fileRef.current?.click()}
            className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-3 py-2 text-[13px] font-semibold text-primary-foreground disabled:opacity-60"
          >
            <Upload className="h-4 w-4" />
            {busy ? "Descifrando…" : "Seleccionar fichero…"}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void handleImport(f);
            }}
          />
        </>
      )}

      {err && <p className="mt-2 text-[12px] text-destructive">{err}</p>}
      {msg && <p className="mt-2 text-[12px] text-emerald-500">{msg}</p>}
    </div>
  );
}

export default CredentialsTransfer;
