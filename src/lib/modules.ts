"use client";

// Course modules (chapters) that organise a class's documents. Documents without a module
// appear under "Other documents".

import { supabase } from "@/lib/supabase/client";
import { announceChange, useRemote } from "@/lib/remote";

export type Module = { id: string; classId: string; title: string; position: number };

export function useModules(classId: string | undefined) {
  return useRemote(
    classId ? `modules:${classId}` : null,
    async () => {
      const { data, error } = await supabase()
        .from("modules")
        .select("id, class_id, title, position")
        .eq("class_id", classId!)
        .order("position")
        .order("created_at");
      if (error) throw error;
      return (data as { id: string; class_id: string; title: string; position: number }[]).map((r) => ({
        id: r.id,
        classId: r.class_id,
        title: r.title,
        position: r.position,
      }));
    },
    [] as Module[],
    "modules",
  );
}

export async function addModule(classId: string, title: string, position: number) {
  const { error } = await supabase().from("modules").insert({ class_id: classId, title: title.trim().slice(0, 120), position });
  if (error) throw error;
  announceChange("modules");
}

export async function renameModule(id: string, title: string) {
  const { error } = await supabase().from("modules").update({ title: title.trim().slice(0, 120) }).eq("id", id);
  if (error) throw error;
  announceChange("modules");
}

export async function deleteModule(id: string) {
  const { error } = await supabase().from("modules").delete().eq("id", id);
  if (error) throw error;
  announceChange("modules");
  announceChange("materials");
}

/** Saves a new order (positions follow the array order). */
export async function reorderModules(list: Module[]) {
  const sb = supabase();
  await Promise.all(list.map((m, i) => sb.from("modules").update({ position: i }).eq("id", m.id)));
  announceChange("modules");
}

export async function moveMaterial(materialId: string, moduleId: string | null) {
  const { error } = await supabase().from("materials").update({ module_id: moduleId }).eq("id", materialId);
  if (error) throw error;
  announceChange("materials");
}
