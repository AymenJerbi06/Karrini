"use client";

// Teacher applications: a teacher submits one form; an admin approves or rejects it.
// Approval (database function review_application) publishes the class and unlocks the teacher portal.

import { supabase } from "@/lib/supabase/client";
import { announceChange, useRemote } from "@/lib/remote";
import { refreshAuth } from "@/lib/auth";
import { COMMISSION_PCT } from "@/data/catalog";

export type ApplicationInput = {
  subject: string;
  levels: string[];
  sessionsPerWeek: number;
  sessionMinutes: number;
  methods: string[];
  schedule: string;
  monthlyPrice: number | null;
  capacity: number;
  location: string;
  headline: string;
  bio: string;
  years: number;
  acceptedTerms: boolean;
  acceptedCommission: boolean;
};

export type MyApplication = ApplicationInput & {
  status: "pending" | "approved" | "rejected";
  adminNote?: string;
  submittedAt: number;
};

type Row = {
  subject: string;
  levels: string[];
  sessions_per_week: number;
  session_minutes: number;
  methods: string[];
  schedule: string;
  monthly_price_dt: number | null;
  capacity: number;
  location: string;
  headline: string;
  bio: string;
  years: number;
  accepted_terms: boolean;
  accepted_commission: boolean;
  status: MyApplication["status"];
  admin_note: string | null;
  submitted_at: string;
};

const fromRow = (r: Row): MyApplication => ({
  subject: r.subject,
  levels: r.levels,
  sessionsPerWeek: r.sessions_per_week,
  sessionMinutes: r.session_minutes,
  methods: r.methods,
  schedule: r.schedule,
  monthlyPrice: r.monthly_price_dt,
  capacity: r.capacity,
  location: r.location,
  headline: r.headline,
  bio: r.bio,
  years: r.years,
  acceptedTerms: r.accepted_terms,
  acceptedCommission: r.accepted_commission,
  status: r.status,
  adminNote: r.admin_note ?? undefined,
  submittedAt: new Date(r.submitted_at).getTime(),
});

export function useMyApplication(teacherId: string | undefined) {
  return useRemote(
    teacherId ? `application:${teacherId}` : null,
    async () => {
      const { data, error } = await supabase().from("teacher_applications").select("*").eq("teacher_id", teacherId!).maybeSingle();
      if (error) throw error;
      return data ? fromRow(data as Row) : null;
    },
    null as MyApplication | null,
    "application",
  );
}

/** Submits (or resubmits after a rejection) the teacher's application. */
export async function submitApplication(teacherId: string, input: ApplicationInput, existing: boolean) {
  const row = {
    teacher_id: teacherId,
    subject: input.subject,
    levels: input.levels,
    sessions_per_week: input.sessionsPerWeek,
    session_minutes: input.sessionMinutes,
    methods: input.methods,
    schedule: input.schedule.trim(),
    monthly_price_dt: input.monthlyPrice,
    capacity: input.capacity,
    location: input.location.trim(),
    headline: input.headline.trim(),
    bio: input.bio.trim(),
    years: input.years,
    accepted_terms: input.acceptedTerms,
    accepted_commission: input.acceptedCommission,
    commission_pct: COMMISSION_PCT,
    status: "pending",
    admin_note: null,
    reviewed_at: null,
    reviewed_by: null,
    submitted_at: new Date().toISOString(),
  };
  const sb = supabase();
  const { error } = existing
    ? await sb.from("teacher_applications").update(row).eq("teacher_id", teacherId)
    : await sb.from("teacher_applications").insert(row);
  if (error) throw error;
  announceChange("application");
  await refreshAuth();
}

/* ---------------- Admin ---------------- */

export type AdminApplication = MyApplication & {
  id: string;
  teacherId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  commissionPct: number;
  reviewedAt?: number;
};

export function useAdminApplications(enabled: boolean) {
  return useRemote(
    enabled ? "admin-applications" : null,
    async () => {
      const { data, error } = await supabase().rpc("admin_applications");
      if (error) throw error;
      return (data as (Row & { id: string; teacher_id: string; first_name: string; last_name: string; email: string; phone: string | null; commission_pct: number; reviewed_at: string | null })[]).map(
        (r) => ({
          ...fromRow(r),
          id: r.id,
          teacherId: r.teacher_id,
          firstName: r.first_name,
          lastName: r.last_name,
          email: r.email,
          phone: r.phone ?? "",
          commissionPct: r.commission_pct,
          reviewedAt: r.reviewed_at ? new Date(r.reviewed_at).getTime() : undefined,
        }),
      );
    },
    [] as AdminApplication[],
    "admin-applications",
  );
}

export async function reviewApplication(id: string, decision: "approved" | "rejected", note: string) {
  const { error } = await supabase().rpc("review_application", { application_id: id, decision, note });
  if (error) throw error;
  announceChange("admin-applications");
  announceChange("directory");
}
