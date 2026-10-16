"use client";

// Groups of a class: the same course taught at different times to different students
// (e.g. "1st Secondary Economics" on Tuesday 08:00–10:00 and Tuesday 12:00–14:00).

import { supabase } from "@/lib/supabase/client";
import { announceChange, useRemote } from "@/lib/remote";

/** day: 0 = Monday … 6 = Sunday; times are "HH:MM" in Sfax time. */
export type Slot = { day: number; start: string; end: string };
export type Group = { id: string; classId: string; name: string; slots: Slot[]; position: number };

export const weekdays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

type Row = { id: string; class_id: string; name: string; slots: Slot[] | null; position: number };
const toGroup = (r: Row): Group => ({ id: r.id, classId: r.class_id, name: r.name, slots: r.slots ?? [], position: r.position });

export async function fetchGroups(classIds: string[]): Promise<Group[]> {
  if (!classIds.length) return [];
  const { data, error } = await supabase()
    .from("class_groups")
    .select("id, class_id, name, slots, position")
    .in("class_id", classIds)
    .order("position")
    .order("created_at");
  if (error) throw error;
  return (data as Row[]).map(toGroup);
}

export function useGroups(classIds: string[]) {
  const key = classIds.join(",");
  return useRemote(key ? `groups:${key}` : null, () => fetchGroups(classIds), [] as Group[], "groups");
}

export async function saveGroup(g: { id?: string; classId: string; name: string; slots: Slot[]; position: number }) {
  const row = { class_id: g.classId, name: g.name.trim().slice(0, 80), slots: g.slots, position: g.position };
  const sb = supabase();
  const { error } = g.id ? await sb.from("class_groups").update(row).eq("id", g.id) : await sb.from("class_groups").insert(row);
  if (error) throw error;
  announceChange("groups");
}

export async function deleteGroup(id: string) {
  const { error } = await supabase().from("class_groups").delete().eq("id", id);
  if (error) throw error;
  announceChange("groups");
  announceChange("roster");
}

/** "Tuesday 08:00–10:00 · Friday 08:00–10:00" (weekday names translated by `t`). */
export function formatSlots(slots: Slot[], t: (s: string) => string) {
  return slots.map((s) => `${t(weekdays[s.day] ?? "")} ${s.start}–${s.end}`).join(" · ");
}

/** Display name: the teacher's name for the group, or its timetable. */
export function groupLabel(g: Group | undefined, t: (s: string) => string) {
  if (!g) return t("Whole class");
  return g.name || formatSlots(g.slots, t) || t("Group");
}

/** Next start time of any slot, in the browser's clock (Sfax time is assumed for the prototype). */
export function nextSlot(slots: Slot[], from = new Date()): Date | null {
  let best: Date | null = null;
  for (const s of slots) {
    const [h, m] = s.start.split(":").map(Number);
    const jsDay = (s.day + 1) % 7; // JS: 0 = Sunday
    const d = new Date(from);
    d.setHours(h, m, 0, 0);
    let add = (jsDay - d.getDay() + 7) % 7;
    if (add === 0 && d <= from) add = 7;
    d.setDate(d.getDate() + add);
    if (!best || d < best) best = d;
  }
  return best;
}
