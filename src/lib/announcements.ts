"use client";

// Messages from the teacher to a class or one group: saved as announcements (shown on the
// student's class page) and emailed by /api/notify. The same route emails "class has started".

import { supabase } from "@/lib/supabase/client";
import { announceChange, useRemote } from "@/lib/remote";

export type Announcement = {
  id: string;
  classId: string;
  groupId: string | null;
  kind: "message" | "schedule";
  subject: string;
  body: string;
  emailed: number;
  createdAt: number;
};

type Row = { id: string; class_id: string; group_id: string | null; kind: Announcement["kind"]; subject: string; body: string; emailed: number; created_at: string };

export function useAnnouncements(classId: string | undefined) {
  return useRemote(
    classId ? `announcements:${classId}` : null,
    async () => {
      const { data, error } = await supabase()
        .from("announcements")
        .select("*")
        .eq("class_id", classId!)
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return (data as Row[]).map((r) => ({
        id: r.id,
        classId: r.class_id,
        groupId: r.group_id,
        kind: r.kind,
        subject: r.subject,
        body: r.body,
        emailed: r.emailed,
        createdAt: new Date(r.created_at).getTime(),
      }));
    },
    [] as Announcement[],
    "announcements",
  );
}

async function authHeader(): Promise<Record<string, string>> {
  const { data } = await supabase().auth.getSession();
  return data.session ? { Authorization: `Bearer ${data.session.access_token}` } : {};
}

export type NotifyResult = { sent: number; failed: number; recipients: number };

async function notify(body: object): Promise<NotifyResult> {
  const res = await fetch("/api/notify", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(await authHeader()) },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`notify-${res.status}`);
  return (await res.json()) as NotifyResult;
}

/** Posts a message to the class (or one group) and emails the students. */
export async function postAnnouncement(input: {
  classId: string;
  groupId: string | null;
  kind: Announcement["kind"];
  subject: string;
  body: string;
  createdBy: string;
  email: boolean;
  locale: string;
}): Promise<NotifyResult | null> {
  const { data, error } = await supabase()
    .from("announcements")
    .insert({
      class_id: input.classId,
      group_id: input.groupId,
      kind: input.kind,
      subject: input.subject.trim().slice(0, 160),
      body: input.body.trim().slice(0, 4000),
      created_by: input.createdBy,
    })
    .select("id")
    .single();
  if (error) throw error;
  announceChange("announcements");
  if (!input.email) return null;
  const result = await notify({ type: "announcement", id: data.id, locale: input.locale });
  announceChange("announcements");
  return result;
}

/** Emails the students of the session's group that the class has started (once per session). */
export const notifyLive = (sessionId: string, locale: string) => notify({ type: "live", id: sessionId, locale });
