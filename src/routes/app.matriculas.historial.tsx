import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  History,
  Trash2,
  Loader2,
  Search,
  Database,
  AlertCircle,
  Pin,
  PinOff,
  ArrowDownWideNarrow,
  ArrowUpWideNarrow,
  X,
} from "lucide-react";
import {
  listPlateHistory,
  deletePlateHistoryItem,
  clearPlateHistory,
  type PlateHistoryItem,
} from "@/lib/mptc/matriculas.functions";

export const Route = createFileRoute("/app/matriculas/historial")({
  component: HistorialMatriculasPage,
  head: () => ({
    meta: [
      { title: "Historial de matrículas" },
      { name: "description", content: "Consulta el historial de matrículas que has buscado." },
    ],
  }),
});

const PINNED_KEY = "mptc:plate-history:pinned";
const SORT_KEY = "mptc:plate-history:sort";

type SortOrder = "desc" | "asc";

function loadPinned(): string[] {
  try {
    const raw = localStorage.getItem(PINNED_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr.filter((v) => typeof v === "string") : [];
  } catch {
    return [];
  }
}

function savePinned(pins: string[]) {
  try {
    localStorage.setItem(PINNED_KEY, JSON.stringify(pins));
  } catch {
    // ignore
  }
}

function formatDateTime(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleString("es-ES", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function HistorialMatriculasPage() {
  const listFn = useServerFn(listPlateHistory);
  const deleteFn = useServerFn(deletePlateHistoryItem);
  const clearFn = useServerFn(clearPlateHistory);
  const [items, setItems] = useState<PlateHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [clearing, setClearing] = useState(false);
  const [pinned, setPinned] = useState<string[]>([]);
  const [sort, setSort] = useState<SortOrder>("desc");
  const [query, setQuery] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [activeSuggestion, setActiveSuggestion] = useState(-1);

  useEffect(() => {
    setPinned(loadPinned());
    try {
      const s = localStorage.getItem(SORT_KEY);
      if (s === "asc" || s === "desc") setSort(s);
    } catch {
      // ignore
    }
  }, []);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await listFn({ data: { limit: 100 } });
      setItems(res.items);
    } catch (e: any) {
      setError(e?.message ?? "No se pudo cargar el historial");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const removeOne = async (id: string) => {
    setBusyId(id);
    try {
      await deleteFn({ data: { id } });
      setItems((prev) => prev.filter((i) => i.id !== id));
    } catch (e: any) {
      setError(e?.message ?? "No se pudo eliminar");
    } finally {
      setBusyId(null);
    }
  };

  const clearAll = async () => {
    if (!confirm("¿Borrar todo el historial de matrículas?")) return;
    setClearing(true);
    try {
      await clearFn({});
      setItems([]);
    } catch (e: any) {
      setError(e?.message ?? "No se pudo borrar");
    } finally {
      setClearing(false);
    }
  };

  const togglePin = (plate: string) => {
    setPinned((prev) => {
      const next = prev.includes(plate)
        ? prev.filter((p) => p !== plate)
        : [plate, ...prev];
      savePinned(next);
      return next;
    });
  };

  const toggleSort = () => {
    setSort((prev) => {
      const next: SortOrder = prev === "desc" ? "asc" : "desc";
      try {
        localStorage.setItem(SORT_KEY, next);
      } catch {
        // ignore
      }
      return next;
    });
  };

  const filteredItems = useMemo(() => {
    const q = query.trim().toUpperCase();
    if (!q) return items;
    return items.filter((i) => {
      const plate = i.plate.toUpperCase();
      const vehiculo = (i.vehiculo || "").toUpperCase();
      const marca = (i.marca || "").toUpperCase();
      const modelo = (i.modelo || "").toUpperCase();
      return plate.includes(q) || vehiculo.includes(q) || marca.includes(q) || modelo.includes(q);
    });
  }, [items, query]);

  const suggestions = useMemo(() => {
    const q = query.trim().toUpperCase();
    const seen = new Map<string, { value: string; kind: "plate" | "vehiculo" }>();
    for (const i of items) {
      const plate = i.plate?.trim();
      if (plate) {
        const key = `p:${plate.toUpperCase()}`;
        if (!seen.has(key)) seen.set(key, { value: plate.toUpperCase(), kind: "plate" });
      }
      const vehiculo = (i.vehiculo || [i.marca, i.modelo].filter(Boolean).join(" ")).trim();
      if (vehiculo) {
        const key = `v:${vehiculo.toUpperCase()}`;
        if (!seen.has(key)) seen.set(key, { value: vehiculo, kind: "vehiculo" });
      }
    }
    let list = Array.from(seen.values());
    if (q) list = list.filter((s) => s.value.toUpperCase().includes(q));
    list.sort((a, b) => {
      const ai = a.value.toUpperCase().startsWith(q) ? 0 : 1;
      const bi = b.value.toUpperCase().startsWith(q) ? 0 : 1;
      return ai - bi || a.value.localeCompare(b.value);
    });
    return list.slice(0, 8);
  }, [items, query]);

  const applySuggestion = (value: string) => {
    setQuery(value);
    setShowSuggestions(false);
    setActiveSuggestion(-1);
  };

  const onSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showSuggestions || suggestions.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveSuggestion((p) => (p + 1) % suggestions.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveSuggestion((p) => (p <= 0 ? suggestions.length - 1 : p - 1));
    } else if (e.key === "Enter") {
      if (activeSuggestion >= 0) {
        e.preventDefault();
        applySuggestion(suggestions[activeSuggestion].value);
      } else {
        setShowSuggestions(false);
      }
    } else if (e.key === "Escape") {
      setShowSuggestions(false);
      setActiveSuggestion(-1);
    }
  };

  const sortedItems = useMemo(() => {
    const pinSet = new Set(pinned);
    const byDate = (a: PlateHistoryItem, b: PlateHistoryItem) => {
      const av = new Date(a.created_at).getTime();
      const bv = new Date(b.created_at).getTime();
      return sort === "desc" ? bv - av : av - bv;
    };
    const pins = filteredItems.filter((i) => pinSet.has(i.plate)).sort(byDate);
    const rest = filteredItems.filter((i) => !pinSet.has(i.plate)).sort(byDate);
    return { pins, rest };
  }, [filteredItems, pinned, sort]);

  const renderItem = (it: PlateHistoryItem) => {
    const vehiculo = it.vehiculo || [it.marca, it.modelo].filter(Boolean).join(" ").trim();
    const isPinned = pinned.includes(it.plate);
    return (
      <li
        key={it.id}
        className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-3 shadow-sm"
      >
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Search className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Link
              to="/app/matriculas"
              search={{ q: it.plate } as any}
              className="font-mono text-base font-semibold tracking-wider text-foreground hover:text-primary"
            >
              {it.plate}
            </Link>
            {isPinned && (
              <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                <Pin className="h-3 w-3" />
                Fijada
              </span>
            )}
            {it.cached && (
              <span
                title="Resultado servido desde caché"
                className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground"
              >
                <Database className="h-3 w-3" />
                Caché
              </span>
            )}
            {!it.ok && (
              <span className="inline-flex items-center rounded-full bg-destructive/10 px-2 py-0.5 text-[10px] font-medium text-destructive">
                Sin datos
              </span>
            )}
          </div>
          <p className="truncate text-xs text-muted-foreground">
            {vehiculo || it.error || "—"}
          </p>
          <p className="text-[11px] text-muted-foreground/80">
            {formatDateTime(it.created_at)}
          </p>
        </div>
        <button
          type="button"
          onClick={() => togglePin(it.plate)}
          className={`flex h-9 w-9 items-center justify-center rounded-xl hover:bg-primary/10 ${
            isPinned ? "text-primary" : "text-muted-foreground hover:text-primary"
          }`}
          aria-label={isPinned ? "Desfijar" : "Fijar"}
          title={isPinned ? "Desfijar" : "Fijar arriba"}
        >
          {isPinned ? <PinOff className="h-4 w-4" /> : <Pin className="h-4 w-4" />}
        </button>
        <button
          type="button"
          onClick={() => removeOne(it.id)}
          disabled={busyId === it.id}
          className="flex h-9 w-9 items-center justify-center rounded-xl text-muted-foreground hover:bg-destructive/10 hover:text-destructive disabled:opacity-50"
          aria-label="Eliminar"
        >
          {busyId === it.id ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Trash2 className="h-4 w-4" />
          )}
        </button>
      </li>
    );
  };

  return (
    <div className="space-y-5">
      <header className="flex items-center gap-3">
        <Link
          to="/app/matriculas"
          className="flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-surface text-muted-foreground hover:text-primary"
          aria-label="Volver"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15 text-primary">
          <History className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <h1 className="text-xl font-semibold">Historial de matrículas</h1>
          <p className="text-xs text-muted-foreground">
            Consultas realizadas desde tu cuenta
          </p>
        </div>
        {items.length > 0 && (
          <button
            type="button"
            onClick={clearAll}
            disabled={clearing}
            className="flex items-center gap-1.5 rounded-xl border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs font-medium text-destructive hover:bg-destructive/10 disabled:opacity-50"
          >
            {clearing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
            Borrar todo
          </button>
        )}
      </header>

      {error && (
        <div className="flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="relative">
        <div className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-muted-foreground">
          <Search className="h-4 w-4" />
        </div>
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setShowSuggestions(true);
            setActiveSuggestion(-1);
          }}
          onFocus={() => setShowSuggestions(true)}
          onBlur={() => window.setTimeout(() => setShowSuggestions(false), 120)}
          onKeyDown={onSearchKeyDown}
          role="combobox"
          aria-expanded={showSuggestions && suggestions.length > 0}
          aria-autocomplete="list"
          autoComplete="off"
          placeholder="Buscar por matrícula, marca o modelo..."
          className="w-full rounded-2xl border border-border bg-surface py-3 pl-10 pr-10 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery("")}
            className="absolute inset-y-0 right-2 flex items-center justify-center text-muted-foreground hover:text-foreground"
            aria-label="Limpiar búsqueda"
          >
            <X className="h-4 w-4" />
          </button>
        )}
        {showSuggestions && suggestions.length > 0 && (
          <ul
            role="listbox"
            className="absolute z-20 mt-1 w-full overflow-hidden rounded-2xl border border-border bg-surface shadow-lg"
          >
            {suggestions.map((s, idx) => (
              <li key={`${s.kind}:${s.value}`}>
                <button
                  type="button"
                  role="option"
                  aria-selected={idx === activeSuggestion}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => applySuggestion(s.value)}
                  onMouseEnter={() => setActiveSuggestion(idx)}
                  className={`flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm ${
                    idx === activeSuggestion ? "bg-primary/10 text-primary" : "text-foreground"
                  }`}
                >
                  {s.kind === "plate" ? (
                    <Search className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground" />
                  ) : (
                    <History className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground" />
                  )}
                  <span className={s.kind === "plate" ? "font-mono tracking-wider" : "truncate"}>
                    {s.value}
                  </span>
                  <span className="ml-auto flex-shrink-0 text-[10px] uppercase text-muted-foreground">
                    {s.kind === "plate" ? "Matrícula" : "Vehículo"}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center rounded-2xl border border-border bg-surface p-8 text-muted-foreground">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Cargando…
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-border bg-surface p-8 text-center text-sm text-muted-foreground">
          Aún no has consultado ninguna matrícula.
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="rounded-2xl border border-border bg-surface p-8 text-center text-sm text-muted-foreground">
          Ninguna entrada coincide con “{query}”.
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs text-muted-foreground">
              {filteredItems.length} de {items.length} {filteredItems.length === 1 ? "consulta" : "consultas"}
              {sortedItems.pins.length > 0 && ` · ${sortedItems.pins.length} fijada${sortedItems.pins.length === 1 ? "" : "s"}`}
            </p>
            <button
              type="button"
              onClick={toggleSort}
              className="flex items-center gap-1.5 rounded-xl border border-border bg-surface px-3 py-2 text-xs font-medium text-foreground hover:text-primary"
              aria-label="Cambiar orden por fecha"
              title={sort === "desc" ? "Más recientes primero" : "Más antiguas primero"}
            >
              {sort === "desc" ? (
                <ArrowDownWideNarrow className="h-3.5 w-3.5" />
              ) : (
                <ArrowUpWideNarrow className="h-3.5 w-3.5" />
              )}
              {sort === "desc" ? "Recientes" : "Antiguas"}
            </button>
          </div>

          {sortedItems.pins.length > 0 && (
            <div className="space-y-2">
              <p className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                <Pin className="h-3 w-3" /> Fijadas
              </p>
              <ul className="space-y-2">{sortedItems.pins.map(renderItem)}</ul>
            </div>
          )}

          {sortedItems.rest.length > 0 && (
            <div className="space-y-2">
              {sortedItems.pins.length > 0 && (
                <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                  Historial
                </p>
              )}
              <ul className="space-y-2">{sortedItems.rest.map(renderItem)}</ul>
            </div>
          )}
        </>
      )}
    </div>
  );
}
