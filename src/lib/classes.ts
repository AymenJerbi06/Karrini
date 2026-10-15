"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { useRemote } from "@/lib/remote";
import { teachers, type Teacher } from "@/data/catalog";

/** A class as the student/teacher screens need it, whether it is a real class or a directory example. */
export type ClassInfo = {
  id: string;
  subject: string;
  /** Teacher's display name. */
  teacherName: string;
  isExample: boolean;
  price?: number;
  capacity: number;
  timetable: { day: string; time: string }[];
  color: string;
  /** Directory profile for example classes. */
  profile?: Teacher;
};

const palette = ["bg-emerald-600", "bg-blue-600", "bg-violet-700", "bg-amber-500", "bg-teal-600", "bg-pink-600", "bg-sky-600"];
const colorFor = (id: string) => palette[[...id].reduce((s, c) => s + c.charCodeAt(0), 0) % palette.length];

type ClassRow = {
  id: string;
  subject: string;
  title: string;
  capacity: number;
  price_dt: number | null;
  is_example: boolean;
};

export function toClassInfo(row: ClassRow): ClassInfo {
  const profile = teachers.find((t) => t.id === row.id);
  return {
    id: row.id,
    subject: row.subject,
    teacherName: profile?.name ?? row.title,
    isExample: row.is_example,
    price: profile?.price ?? row.price_dt ?? undefined,
    capacity: profile?.capacity ?? row.capacity,
    timetable: profile?.timetable ?? [],
    color: profile?.color ?? colorFor(row.id),
    profile,
  };
}

export async function fetchClasses(ids: string[]): Promise<ClassInfo[]> {
  if (!ids.length) return [];
  const { data, error } = await supabase()
    .from("classes")
    .select("id, subject, title, capacity, price_dt, is_example")
    .in("id", ids);
  if (error) throw error;
  const byId = new Map((data as ClassRow[]).map((r) => [r.id, toClassInfo(r)]));
  return ids.map((id) => byId.get(id)).filter((c): c is ClassInfo => !!c);
}

export function useClasses(ids: string[]) {
  const key = ids.join(",");
  return useRemote(`classes:${key}`, () => fetchClasses(ids), [] as ClassInfo[], "enrollments");
}

export async function fetchClass(id: string): Promise<ClassInfo | null> {
  return (await fetchClasses([id]))[0] ?? null;
}

/* ---------------- Teacher: class roster ---------------- */

export type RosterStudent = { id: string; firstName: string; lastName: string; phone: string; joinedAt: number };

export function useRoster(classId: string | undefined) {
  return useRemote(
    classId ? `roster:${classId}` : null,
    async () => {
      const { data, error } = await supabase()
        .from("enrollments")
        .select("student_id, created_at, profiles(first_name, last_name, phone)")
        .eq("class_id", classId!)
        .order("created_at");
      if (error) throw error;
      type Row = { student_id: string; created_at: string; profiles: { first_name: string; last_name: string; phone: string | null } | null };
      return (data as unknown as Row[]).map((r) => ({
        id: r.student_id,
        firstName: r.profiles?.first_name ?? "",
        lastName: r.profiles?.last_name ?? "",
        phone: r.profiles?.phone ?? "",
        joinedAt: new Date(r.created_at).getTime(),
      }));
    },
    [] as RosterStudent[],
    "roster",
  );
}

/* ---------------- Live sessions ("live now" badges) ---------------- */

export type LiveSession = { id: string; classId: string; startedAt: number };

/** Running sessions for the given classes, updated in real time when a teacher starts or ends one. */
export function useLiveSessions(classIds: string[]) {
  const key = classIds.slice().sort().join(",");
  const [live, setLive] = useState<{ key: string; sessions: Record<string, LiveSession> }>({ key: "", sessions: {} });

  useEffect(() => {
    if (!key) return;
    const ids = key.split(",");
    const sb = supabase();
    let alive = true;
    const load = async () => {
      const { data } = await sb.from("sessions").select("id, class_id, started_at").in("class_id", ids).is("ended_at", null);
      if (!alive) return;
      setLive({
        key,
        sessions: Object.fromEntries(
          (data ?? []).map((s) => [s.class_id, { id: s.id, classId: s.class_id, startedAt: new Date(s.started_at).getTime() }]),
        ),
      });
    };
    void load();
    const channel = sb
      .channel(`live-index:${key}:${Math.random().toString(36).slice(2, 7)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "sessions" }, () => void load())
      .subscribe();
    const poll = setInterval(load, 30_000); // safety net if a realtime event is missed
    return () => {
      alive = false;
      clearInterval(poll);
      void sb.removeChannel(channel);
    };
  }, [key]);

  return useMemo(() => (live.key === key ? live.sessions : {}), [live, key]);
}
