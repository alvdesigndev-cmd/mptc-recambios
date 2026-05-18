import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Pencil, Plus, Trash2, Loader2, Save, X, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { loadSettings } from "@/lib/mptc/profiles";
import { useFamilias, useFamiliaMutations } from "@/lib/mptc/useFamilias";
import type { Family, Subfamily } from "@/lib/mptc/families";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

export const Route = createFileRoute("/app/familias")({
  component: FamiliasGate,
});

const primaryBtn = "inline-flex items-center justify-center gap-1.5 rounded-xl bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50";
const ghostBtn = "inline-flex items-center justify-center gap-1.5 rounded-xl border border-border bg-surface px-3 py-2 text-sm font-medium hover:bg-surface-2";
const dangerBtn = "inline-flex items-center justify-center gap-1.5 rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive hover:bg-destructive/20";

const FAMILIAS_PIN = "1234";
const FAMILIAS_UNLOCK_KEY = "mptc:familias:unlocked";

function FamiliasGate() {
  const [unlocked, setUnlocked] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return sessionStorage.getItem(FAMILIAS_UNLOCK_KEY) === "1";
  });
  const [pin, setPin] = useState("");
  const [error, setError] = useState(false);
  

  if (unlocked) return <FamiliasAdmin />;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pin === FAMILIAS_PIN) {
      try { sessionStorage.setItem(FAMILIAS_UNLOCK_KEY, "1"); } catch {}
      setUnlocked(true);
    } else {
      setError(true);
      setPin("");
    }
  };

  return (
    <div className="mx-auto max-w-sm space-y-4 p-4">
      <Link to="/app/ajustes" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Volver a ajustes
      </Link>
      <div className="rounded-2xl border border-border bg-surface p-5 shadow-sm">
        <h1 className="text-lg font-bold">Acceso restringido</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Introduce el PIN para gestionar familias y subfamilias.
        </p>
        <form onSubmit={submit} className="mt-4 space-y-3">
          <input
            type="password"
            inputMode="numeric"
            pattern="[0-9]*"
            autoFocus
            value={pin}
            onChange={(e) => { setPin(e.target.value); setError(false); }}
            placeholder="PIN"
            aria-label="PIN de acceso"
            className="w-full rounded-xl border border-border bg-surface-2 px-3 py-2.5 text-center text-lg tracking-[0.5em] font-mono outline-none focus:border-primary"
          />
          {error && (
            <div className="text-center text-sm font-medium text-destructive">PIN incorrecto</div>
          )}
          <button type="submit" className={primaryBtn + " w-full"}>
            Entrar
          </button>
        </form>
      </div>
    </div>
  );
}

function FamiliasAdmin() {
  const navigate = useNavigate();
  const { data: familias = [], isLoading } = useFamilias();
  const M = useFamiliaMutations();

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editFam, setEditFam] = useState<Family | null>(null);
  const [newFamOpen, setNewFamOpen] = useState(false);
  const [editSub, setEditSub] = useState<{ familiaId: string; sub: Subfamily | null } | null>(null);
  const [confirmDel, setConfirmDel] = useState<
    | { kind: "fam"; id: string; name: string; subsCount: number }
    | { kind: "sub"; id: string; name: string }
    | null
  >(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  useEffect(() => {
    const s = loadSettings();
    if (!s || s.role === "pena") navigate({ to: "/" });
  }, [navigate]);

  useEffect(() => {
    if (!selectedId && familias[0]) setSelectedId(familias[0].id);
  }, [familias, selectedId]);

  const selected = useMemo(
    () => familias.find((f) => f.id === selectedId) || null,
    [familias, selectedId],
  );

  const toggleExpanded = (id: string) => {
    setExpanded((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-2">
        <Link to="/app/ajustes" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Ajustes
        </Link>
        <button type="button" onClick={() => setNewFamOpen(true)} className={primaryBtn}>
          <Plus className="h-4 w-4" /> Nueva familia
        </button>
      </div>

      <header>
        <h1 className="text-2xl font-bold tracking-tight">Familias y mensajes</h1>
        <p className="text-sm text-muted-foreground">
          Crea, edita o elimina familias y subfamilias. Usa <code className="rounded bg-surface-2 px-1">___</code> en el mensaje donde quieras que aparezca el importe.
        </p>
      </header>

      {isLoading ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-[260px_1fr]">
          {/* Lista de familias */}
          <aside className="space-y-1.5 rounded-2xl border border-border bg-surface p-2">
            {familias.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setSelectedId(f.id)}
                className={
                  "flex w-full items-center justify-between gap-2 rounded-xl px-3 py-2 text-left text-sm transition " +
                  (selectedId === f.id ? "bg-primary/15 text-primary" : "hover:bg-surface-2")
                }
              >
                <span className="flex min-w-0 items-center gap-2">
                  <span className="text-base">{f.icon}</span>
                  <span className="truncate font-medium">{f.name}</span>
                </span>
                <span className="text-[11px] text-muted-foreground">{f.subs.length}</span>
              </button>
            ))}
            {familias.length === 0 && (
              <p className="px-3 py-6 text-center text-sm text-muted-foreground">
                Aún no hay familias.
              </p>
            )}
          </aside>

          {/* Detalle de familia */}
          <section className="space-y-3">
            {selected ? (
              <>
                <div className="flex items-center justify-between gap-2 rounded-2xl border border-border bg-surface p-4">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="text-2xl">{selected.icon}</span>
                    <div className="min-w-0">
                      <div className="truncate text-base font-semibold">{selected.name}</div>
                      <div className="text-[11px] text-muted-foreground">{selected.subs.length} subfamilias</div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => setEditFam(selected)} className={ghostBtn}>
                      <Pencil className="h-4 w-4" /> Editar
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmDel({ kind: "fam", id: selected.id, name: selected.name, subsCount: selected.subs.length })}
                      className={dangerBtn}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-semibold">Subfamilias</h2>
                  <button
                    type="button"
                    onClick={() => setEditSub({ familiaId: selected.id, sub: null })}
                    className={primaryBtn}
                  >
                    <Plus className="h-4 w-4" /> Nueva
                  </button>
                </div>

                <div className="space-y-2">
                  {selected.subs.map((s) => {
                    const open = expanded.has(s.id);
                    return (
                      <div key={s.id} className="rounded-2xl border border-border bg-surface">
                        <div className="flex items-center justify-between gap-2 p-3">
                          <button
                            type="button"
                            onClick={() => toggleExpanded(s.id)}
                            className="flex min-w-0 flex-1 items-center gap-2 text-left"
                          >
                            <ChevronDown className={"h-4 w-4 shrink-0 text-muted-foreground transition-transform " + (open ? "rotate-180" : "")} />
                            <span className="truncate text-sm font-medium">{s.name}</span>
                          </button>
                          <div className="flex shrink-0 gap-1.5">
                            <button type="button" onClick={() => setEditSub({ familiaId: selected.id, sub: s })} className={ghostBtn}>
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmDel({ kind: "sub", id: s.id, name: s.name })}
                              className={dangerBtn}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                        {open && (
                          <pre className="whitespace-pre-wrap border-t border-border bg-surface-2 px-4 py-3 text-[12px] leading-relaxed text-foreground">
                            {s.mensaje || <span className="italic text-muted-foreground">(Sin mensaje)</span>}
                          </pre>
                        )}
                      </div>
                    );
                  })}
                  {selected.subs.length === 0 && (
                    <p className="rounded-2xl border border-dashed border-border-strong py-6 text-center text-sm text-muted-foreground">
                      Esta familia aún no tiene subfamilias.
                    </p>
                  )}
                </div>
              </>
            ) : (
              <p className="rounded-2xl border border-dashed border-border-strong p-10 text-center text-sm text-muted-foreground">
                Selecciona una familia.
              </p>
            )}
          </section>
        </div>
      )}

      {/* Diálogos */}
      <FamiliaDialog
        open={newFamOpen}
        onOpenChange={setNewFamOpen}
        title="Nueva familia"
        initial={{ nombre: "", icono: "🔧" }}
        onSubmit={async (v) => {
          await M.createFamilia.mutateAsync(v);
          toast.success("Familia creada");
          setNewFamOpen(false);
        }}
        busy={M.createFamilia.isPending}
      />

      <FamiliaDialog
        open={!!editFam}
        onOpenChange={(o) => { if (!o) setEditFam(null); }}
        title="Editar familia"
        initial={editFam ? { nombre: editFam.name, icono: editFam.icon } : { nombre: "", icono: "🔧" }}
        onSubmit={async (v) => {
          if (!editFam) return;
          await M.updateFamilia.mutateAsync({ id: editFam.id, ...v });
          toast.success("Familia actualizada");
          setEditFam(null);
        }}
        busy={M.updateFamilia.isPending}
      />

      <SubDialog
        open={!!editSub}
        onOpenChange={(o) => { if (!o) setEditSub(null); }}
        title={editSub?.sub ? "Editar subfamilia" : "Nueva subfamilia"}
        initial={editSub?.sub ? { nombre: editSub.sub.name, mensaje: editSub.sub.mensaje } : { nombre: "", mensaje: "" }}
        onSubmit={async (v) => {
          if (!editSub) return;
          if (editSub.sub) {
            await M.updateSub.mutateAsync({ id: editSub.sub.id, ...v });
            toast.success("Subfamilia actualizada");
          } else {
            await M.createSub.mutateAsync({ familiaId: editSub.familiaId, ...v });
            toast.success("Subfamilia creada");
          }
          setEditSub(null);
        }}
        busy={M.createSub.isPending || M.updateSub.isPending}
      />

      <AlertDialog open={!!confirmDel} onOpenChange={(o) => { if (!o) setConfirmDel(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmDel?.kind === "fam" ? "Eliminar familia" : "Eliminar subfamilia"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmDel?.kind === "fam"
                ? `Se eliminará "${confirmDel.name}"${confirmDel.subsCount > 0 ? ` y sus ${confirmDel.subsCount} subfamilias` : ""}. Esta acción no se puede deshacer.`
                : confirmDel?.kind === "sub"
                ? `Se eliminará "${confirmDel.name}". Esta acción no se puede deshacer.`
                : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={async () => {
                if (!confirmDel) return;
                try {
                  if (confirmDel.kind === "fam") {
                    await M.deleteFamilia.mutateAsync(confirmDel.id);
                    if (selectedId === confirmDel.id) setSelectedId(null);
                  } else {
                    await M.deleteSub.mutateAsync(confirmDel.id);
                  }
                  toast.success("Eliminado");
                } catch (e: any) {
                  toast.error(e?.message || "No se pudo eliminar");
                } finally {
                  setConfirmDel(null);
                }
              }}
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function FamiliaDialog({
  open, onOpenChange, title, initial, onSubmit, busy,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  title: string;
  initial: { nombre: string; icono: string };
  onSubmit: (v: { nombre: string; icono: string }) => Promise<void> | void;
  busy: boolean;
}) {
  const [nombre, setNombre] = useState(initial.nombre);
  const [icono, setIcono] = useState(initial.icono);

  useEffect(() => {
    if (open) { setNombre(initial.nombre); setIcono(initial.icono); }
  }, [open, initial.nombre, initial.icono]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>{title}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <label className="block">
            <span className="mb-1 block text-[11px] uppercase tracking-wide text-muted-foreground">Nombre</span>
            <input
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              className="w-full rounded-xl border border-input bg-surface-2 px-3 py-2.5 text-sm outline-none focus:border-primary"
              placeholder="Ej. Frenos"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-[11px] uppercase tracking-wide text-muted-foreground">Icono (emoji)</span>
            <input
              value={icono}
              onChange={(e) => setIcono(e.target.value)}
              maxLength={4}
              className="w-24 rounded-xl border border-input bg-surface-2 px-3 py-2.5 text-center text-xl outline-none focus:border-primary"
            />
          </label>
        </div>
        <DialogFooter>
          <button type="button" onClick={() => onOpenChange(false)} className={ghostBtn}>
            <X className="h-4 w-4" /> Cancelar
          </button>
          <button
            type="button"
            disabled={busy || nombre.trim().length < 1}
            onClick={async () => {
              try { await onSubmit({ nombre: nombre.trim(), icono: icono.trim() || "🔧" }); }
              catch (e: any) { toast.error(e?.message || "Error al guardar"); }
            }}
            className={primaryBtn}
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Guardar
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SubDialog({
  open, onOpenChange, title, initial, onSubmit, busy,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  title: string;
  initial: { nombre: string; mensaje: string };
  onSubmit: (v: { nombre: string; mensaje: string }) => Promise<void> | void;
  busy: boolean;
}) {
  const [nombre, setNombre] = useState(initial.nombre);
  const [mensaje, setMensaje] = useState(initial.mensaje);

  useEffect(() => {
    if (open) { setNombre(initial.nombre); setMensaje(initial.mensaje); }
  }, [open, initial.nombre, initial.mensaje]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92dvh] max-w-2xl overflow-y-auto">
        <DialogHeader><DialogTitle>{title}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <label className="block">
            <span className="mb-1 block text-[11px] uppercase tracking-wide text-muted-foreground">Nombre</span>
            <input
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              className="w-full rounded-xl border border-input bg-surface-2 px-3 py-2.5 text-sm outline-none focus:border-primary"
              placeholder="Ej. Pastillas de freno delanteras"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-[11px] uppercase tracking-wide text-muted-foreground">
              Mensaje · usa <code className="rounded bg-surface-2 px-1">___</code> donde irá el importe
            </span>
            <textarea
              value={mensaje}
              onChange={(e) => setMensaje(e.target.value)}
              rows={16}
              className="w-full rounded-xl border border-input bg-surface-2 px-3 py-2.5 text-[13px] leading-relaxed outline-none focus:border-primary font-mono"
              placeholder="Hola, te llamo del taller..."
            />
          </label>
        </div>
        <DialogFooter>
          <button type="button" onClick={() => onOpenChange(false)} className={ghostBtn}>
            <X className="h-4 w-4" /> Cancelar
          </button>
          <button
            type="button"
            disabled={busy || nombre.trim().length < 1}
            onClick={async () => {
              try { await onSubmit({ nombre: nombre.trim(), mensaje }); }
              catch (e: any) { toast.error(e?.message || "Error al guardar"); }
            }}
            className={primaryBtn}
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Guardar
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
