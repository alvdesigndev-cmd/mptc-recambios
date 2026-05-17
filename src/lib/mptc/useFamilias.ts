import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Family, Subfamily } from "./families";

const QK = ["familias"] as const;

interface FamiliaRow { id: string; slug: string; nombre: string; icono: string; orden: number }
interface SubRow { id: string; familia_id: string; slug: string; nombre: string; mensaje: string; orden: number }

async function fetchFamilias(): Promise<Family[]> {
  const [{ data: fams, error: e1 }, { data: subs, error: e2 }] = await Promise.all([
    supabase.from("familias").select("*").order("orden"),
    supabase.from("subfamilias").select("*").order("orden"),
  ]);
  if (e1) throw e1;
  if (e2) throw e2;
  const byFam = new Map<string, Subfamily[]>();
  for (const s of (subs as SubRow[]) || []) {
    const arr = byFam.get(s.familia_id) || [];
    arr.push({ id: s.id, slug: s.slug, name: s.nombre, mensaje: s.mensaje, orden: s.orden });
    byFam.set(s.familia_id, arr);
  }
  return ((fams as FamiliaRow[]) || []).map((f) => ({
    id: f.id,
    slug: f.slug,
    name: f.nombre,
    icon: f.icono,
    orden: f.orden,
    subs: byFam.get(f.id) || [],
  }));
}

export function useFamilias() {
  return useQuery({ queryKey: QK, queryFn: fetchFamilias, staleTime: 60_000 });
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || `item-${Date.now()}`;
}

export function useFamiliaMutations() {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: QK });

  const createFamilia = useMutation({
    mutationFn: async (input: { nombre: string; icono?: string }) => {
      const { count } = await supabase.from("familias").select("*", { count: "exact", head: true });
      const { error } = await supabase.from("familias").insert({
        slug: `${slugify(input.nombre)}-${Math.random().toString(36).slice(2, 6)}`,
        nombre: input.nombre,
        icono: input.icono || "🔧",
        orden: count ?? 0,
      });
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const updateFamilia = useMutation({
    mutationFn: async (input: { id: string; nombre: string; icono: string }) => {
      const { error } = await supabase
        .from("familias")
        .update({ nombre: input.nombre, icono: input.icono })
        .eq("id", input.id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const deleteFamilia = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("familias").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const createSub = useMutation({
    mutationFn: async (input: { familiaId: string; nombre: string; mensaje: string }) => {
      const { count } = await supabase
        .from("subfamilias").select("*", { count: "exact", head: true })
        .eq("familia_id", input.familiaId);
      const { error } = await supabase.from("subfamilias").insert({
        familia_id: input.familiaId,
        slug: `${slugify(input.nombre)}-${Math.random().toString(36).slice(2, 6)}`,
        nombre: input.nombre,
        mensaje: input.mensaje,
        orden: count ?? 0,
      });
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const updateSub = useMutation({
    mutationFn: async (input: { id: string; nombre: string; mensaje: string }) => {
      const { error } = await supabase
        .from("subfamilias")
        .update({ nombre: input.nombre, mensaje: input.mensaje })
        .eq("id", input.id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const deleteSub = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("subfamilias").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  return { createFamilia, updateFamilia, deleteFamilia, createSub, updateSub, deleteSub };
}
