"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { announceChange, useRemote } from "@/lib/remote";
import { COMMISSION_PCT, labelFor, subjects } from "@/data/catalog";

/** A class as the screens need it. Public details come from the teacher's approved application. */
export type ClassInfo = {
  id: string;
  subject: string;
  levels: string[];
  /** Teacher's display name. */
  teacherName: string;
  /** Name given by the teacher, e.g. "1st Secondary Economics" (may be empty). */
  name: string;
  teacherId: string;
  headline: string;
  bio: string;
  location: string;
  methods: string[];
  sessionsPerWeek?: number;
  sessionMinutes?: number;
  schedule: string;
  years: number;
  price?: number;
  capacity: number;
  published: boolean;
  color: string;
  /** Stable index used to pick an illustration. */
  portrait: number;
};

const palette = ["bg-emerald-600", "bg-blue-600", "bg-violet-700", "bg-amber-500", "bg-teal-600", "bg-pink-600", "bg-sky-600"];
const hash = (id: string) => [...id].reduce((s, c) => s + c.charCodeAt(0), 0);

const COLUMNS =
  "id, teacher_id, subject, title, name, levels, capacity, price_dt, headline, bio, location, methods, sessions_per_week, session_minutes, schedule, years, published";

type ClassRow = {
  id: string;
  teacher_id: string | null;
  subject: string;
  title: string;
  name: string;
  levels: string[] | null;
  capacity: number;
  price_dt: number | null;
  headline: string;
  bio: string;
  location: string;
  methods: string[] | null;
  sessions_per_week: number | null;
  session_minutes: number | null;
  schedule: string;
  years: number;
  published: boolean;
};

/** The class's own name, or its subject. */
export const classTitle = (c: Pick<ClassInfo, "name" | "subject">, t: (s: string) => string) => c.name || t(labelFor(subjects, c.subject));

export function toClassInfo(row: ClassRow): ClassInfo {
  return {
    id: row.id,
    subject: row.subject,
    levels: row.levels ?? [],
    teacherName: row.title,
    name: row.name ?? "",
    teacherId: row.teacher_id ?? "",
    headline: row.headline ?? "",
    bio: row.bio ?? "",
    location: row.location ?? "",
    methods: row.methods ?? [],
    sessionsPerWeek: row.sessions_per_week ?? undefined,
    sessionMinutes: row.session_minutes ?? undefined,
    schedule: row.schedule ?? "",
    years: row.years ?? 0,
    price: row.price_dt ?? undefined,
    capacity: row.capacity,
    published: row.published,
    color: palette[hash(row.id) % palette.length],
    portrait: hash(row.id),
  };
}

export async function fetchClasses(ids: string[]): Promise<ClassInfo[]> {
  if (!ids.length) return [];
  const { data, error } = await supabase().from("classes").select(COLUMNS).in("id", ids);
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

/** Published classes of all teachers (not rejected), for the directory and the home page. */
export function useDirectory(limit?: number) {
  return useRemote(
    `directory:${limit ?? "all"}`,
    async () => {
      let query = supabase().from("classes").select(COLUMNS).eq("published", true).order("created_at");
      if (limit) query = query.limit(limit);
      const { data, error } = await query;
      if (error) throw error;
      return (data as ClassRow[]).map(toClassInfo);
    },
    [] as ClassInfo[],
    "directory",
  );
}

/* ---------------- Teacher: class roster ---------------- */

export type RosterStudent = { id: string; firstName: string; lastName: string; phone: string; joinedAt: number; groupId: string | null };

export function useRoster(classId: string | undefined) {
  return useRemote(
    classId ? `roster:${classId}` : null,
    async () => {
      const { data, error } = await supabase()
        .from("enrollments")
        .select("student_id, group_id, created_at, profiles(first_name, last_name, phone)")
        .eq("class_id", classId!)
        .order("created_at");
      if (error) throw error;
      type Row = { student_id: string; group_id: string | null; created_at: string; profiles: { first_name: string; last_name: string; phone: string | null } | null };
      return (data as unknown as Row[]).map((r) => ({
        id: r.student_id,
        firstName: r.profiles?.first_name ?? "",
        lastName: r.profiles?.last_name ?? "",
        phone: r.profiles?.phone ?? "",
        joinedAt: new Date(r.created_at).getTime(),
        groupId: r.group_id,
      }));
    },
    [] as RosterStudent[],
    "roster",
  );
}

/** Moves a student to another group of the class (teacher only). */
export async function moveStudent(classId: string, studentId: string, groupId: string | null) {
  const { error } = await supabase().from("enrollments").update({ group_id: groupId }).eq("class_id", classId).eq("student_id", studentId);
  if (error) throw error;
  announceChange("roster");
}

/** Student counts per class, for the teacher's classes. */
export function useEnrollmentCounts(classIds: string[]) {
  const key = classIds.join(",");
  return useRemote(
    key ? `counts:${key}` : null,
    async () => {
      const { data, error } = await supabase().from("enrollments").select("class_id, group_id").in("class_id", classIds);
      if (error) throw error;
      const byClass: Record<string, number> = {};
      const byGroup: Record<string, number> = {};
      for (const r of data as { class_id: string; group_id: string | null }[]) {
        byClass[r.class_id] = (byClass[r.class_id] ?? 0) + 1;
        if (r.group_id) byGroup[r.group_id] = (byGroup[r.group_id] ?? 0) + 1;
      }
      return { byClass, byGroup };
    },
    { byClass: {} as Record<string, number>, byGroup: {} as Record<string, number> },
    "roster",
  );
}

/* ---------------- Teacher: creating and editing classes ---------------- */

export async function createClass(input: { subject: string; levels: string[]; name: string; price: number | null }) {
  const { data, error } = await supabase().rpc("create_class", {
    p_subject: input.subject,
    p_levels: input.levels,
    p_name: input.name,
    p_price: input.price,
  });
  if (error) throw error;
  return data as string;
}

export async function updateClass(id: string, input: { name: string; levels: string[]; price: number | null }) {
  const { error } = await supabase().rpc("update_class", { p_id: id, p_name: input.name, p_levels: input.levels, p_price: input.price });
  if (error) throw error;
  announceChange("enrollments"); // useClasses reloads on this topic
}

/* ---------------- Earnings ---------------- */

/** Monthly amounts for one class: what students pay, Karrini's commission and the teacher's share. */
export function classEarnings(price: number | undefined, students: number) {
  const gross = (price ?? 0) * students;
  const fee = Math.round(gross * COMMISSION_PCT) / 100;
  return { gross, fee, net: gross - fee };
}

/** Payouts: on the 5th of each month, for the previous month's lessons. */
export const PAYOUT_DAY = 5;
export function nextPayoutDate(from = new Date()) {
  const d = new Date(from.getFullYear(), from.getMonth(), PAYOUT_DAY);
  if (from.getDate() >= PAYOUT_DAY) d.setMonth(d.getMonth() + 1);
  return d;
}

/* ---------------- Live sessions ("live now" badges) ---------------- */

export type LiveSession = { id: string; classId: string; groupId: string | null; startedAt: number };

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
      const { data } = await sb.from("sessions").select("id, class_id, group_id, started_at").in("class_id", ids).is("ended_at", null);
      if (!alive) return;
      setLive({
        key,
        sessions: Object.fromEntries(
          (data ?? []).map((s) => [s.class_id, { id: s.id, classId: s.class_id, groupId: s.group_id ?? null, startedAt: new Date(s.started_at).getTime() }]),
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
