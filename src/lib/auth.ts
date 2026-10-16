"use client";

// Accounts on Supabase Auth. Email + password with email confirmation (sent through the SMTP
// provider configured in Supabase, e.g. Resend). A +216 phone number is required on every profile;
// SMS verification will be added later. The profile row is created by a database trigger from the
// sign-up metadata (see supabase/migrations).

import { useSyncExternalStore } from "react";
import { supabase, supabaseConfigured } from "@/lib/supabase/client";

export type Role = "student" | "parent" | "teacher";

export type Account = {
  id: string;
  role: Role;
  firstName: string;
  lastName: string;
  /** E.164, e.g. +21620123456. */
  phone: string;
  phoneVerified: boolean;
  email?: string;
  createdAt: number;
  student?: { level: string; enrollments: string[]; /** Group chosen in each class (null = whole class). */ groups: Record<string, string | null> };
  teacher?: {
    /** First class (created with the account). */
    classId: string;
    /** Every class the teacher teaches, oldest first. */
    classIds: string[];
    subject: string;
    levels: string[];
    years: number;
    status: "pending" | "verified" | "rejected";
    /** The teacher's application to join Karrini (null = not submitted yet). */
    application: { status: "pending" | "approved" | "rejected"; adminNote?: string } | null;
  };
  parent?: { childPhone?: string };
  /** Signed in with an admin email (reviews teacher applications). */
  isAdmin: boolean;
};

/* ---------------- Phone & email helpers ---------------- */

/** Accepts "20 123 456", "+216 20123456", "0021620123456"… Returns +216XXXXXXXX or null. */
export function normalizeTunisianPhone(input: string): string | null {
  let digits = input.replace(/[^\d+]/g, "");
  if (digits.startsWith("00216")) digits = digits.slice(5);
  else if (digits.startsWith("+216")) digits = digits.slice(4);
  else if (digits.startsWith("216") && digits.length === 11) digits = digits.slice(3);
  digits = digits.replace(/\D/g, "");
  // Tunisian numbers have 8 digits. Mobile prefixes: 2, 4, 5, 9; landlines: 3, 7.
  if (!/^[234579]\d{7}$/.test(digits)) return null;
  return `+216${digits}`;
}

export function formatPhone(e164: string) {
  if (!e164) return "";
  const d = e164.replace(/^\+216/, "");
  return `+216 ${d.slice(0, 2)} ${d.slice(2, 5)} ${d.slice(5)}`;
}

export const isEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value.trim());

export const displayName = (a: Pick<Account, "firstName" | "lastName">) => `${a.firstName} ${a.lastName}`.trim();

export function homeFor(role: Role) {
  return role === "teacher" ? "/teach" : "/dashboard";
}

/* ---------------- Auth store (one Supabase subscription for the whole app) ---------------- */

type AuthState = { ready: boolean; account: Account | null | undefined };

const SERVER_STATE: AuthState = { ready: false, account: undefined };
let state: AuthState = SERVER_STATE;
const listeners = new Set<() => void>();
let started = false;
let loadToken = 0;

function emit(next: AuthState) {
  state = next;
  listeners.forEach((l) => l());
}

async function loadAccount(userId: string | undefined, email: string | undefined) {
  const token = ++loadToken;
  if (!userId) {
    emit({ ready: true, account: null });
    return;
  }
  const sb = supabase();
  const [profile, teacher, enrollments, cls, application, admin] = await Promise.all([
    sb.from("profiles").select("*").eq("id", userId).maybeSingle(),
    sb.from("teacher_profiles").select("*").eq("id", userId).maybeSingle(),
    sb.from("enrollments").select("class_id, group_id").eq("student_id", userId),
    sb.from("classes").select("id").eq("teacher_id", userId).order("created_at"),
    sb.from("teacher_applications").select("status, admin_note").eq("teacher_id", userId).maybeSingle(),
    sb.rpc("is_admin"),
  ]);
  if (token !== loadToken) return; // a newer auth event superseded this load
  const p = profile.data;
  if (!p) {
    // Signed in but the profile is missing (should not happen; the trigger creates it).
    emit({ ready: true, account: null });
    return;
  }
  const t = teacher.data;
  emit({
    ready: true,
    account: {
      id: p.id,
      role: p.role,
      firstName: p.first_name ?? "",
      lastName: p.last_name ?? "",
      phone: p.phone ?? "",
      phoneVerified: !!p.phone_verified,
      email,
      createdAt: new Date(p.created_at).getTime(),
      student:
        p.role === "student"
          ? {
              level: p.school_level ?? "",
              enrollments: (enrollments.data ?? []).map((e) => e.class_id),
              groups: Object.fromEntries((enrollments.data ?? []).map((e) => [e.class_id, e.group_id ?? null])),
            }
          : undefined,
      teacher:
        p.role === "teacher"
          ? {
              classId: cls.data?.[0]?.id ?? "",
              classIds: (cls.data ?? []).map((c) => c.id),
              subject: t?.subject ?? "math",
              levels: t?.levels ?? [],
              years: t?.years ?? 0,
              status: t?.status ?? "pending",
              application: application.data
                ? { status: application.data.status, adminNote: application.data.admin_note ?? undefined }
                : null,
            }
          : undefined,
      isAdmin: admin.data === true,
    },
  });
}

function start() {
  if (started) return;
  started = true;
  if (!supabaseConfigured) {
    emit({ ready: true, account: null });
    return;
  }
  const sb = supabase();
  sb.auth.getSession().then(({ data }) => loadAccount(data.session?.user.id, data.session?.user.email));
  sb.auth.onAuthStateChange((_event, session) => {
    // Supabase recommends not awaiting other calls inside this callback.
    setTimeout(() => void loadAccount(session?.user.id, session?.user.email), 0);
  });
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  start();
  return () => listeners.delete(cb);
}

/** The signed-in account: `ready` is false until the session is known; `account` is null when signed out. */
export function useAuth() {
  return useSyncExternalStore(subscribe, () => state, () => SERVER_STATE);
}

/** Reloads the profile (after enrolling, editing the profile, …). */
export async function refreshAuth() {
  const { data } = await supabase().auth.getSession();
  await loadAccount(data.session?.user.id, data.session?.user.email);
}

/* ---------------- Actions ---------------- */

export type AuthError =
  | "invalid-credentials"
  | "email-not-confirmed"
  | "rate-limited"
  | "email-taken"
  | "phone-taken"
  | "weak-password"
  | "not-configured"
  | "unknown";

function mapError(err: { message?: string; status?: number; code?: string } | null | undefined): AuthError {
  const m = (err?.message ?? "").toLowerCase();
  const code = err?.code ?? "";
  if (code === "invalid_credentials" || m.includes("invalid login")) return "invalid-credentials";
  if (code === "email_not_confirmed" || m.includes("not confirmed")) return "email-not-confirmed";
  if (err?.status === 429 || m.includes("rate limit")) return "rate-limited";
  if (code === "user_already_exists" || m.includes("already registered")) return "email-taken";
  if (code === "weak_password" || m.includes("password should")) return "weak-password";
  if (m.includes("database error saving new user")) return "phone-taken";
  return "unknown";
}

export async function isPhoneTaken(phone: string): Promise<boolean> {
  try {
    const res = await fetch("/api/check-phone", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone }),
    });
    if (!res.ok) return false;
    return Boolean((await res.json()).taken);
  } catch {
    return false;
  }
}

export type SignUpInput = {
  email: string;
  password: string;
  role: Role;
  firstName: string;
  lastName: string;
  phone: string;
  schoolLevel?: string;
  subject?: string;
  levels?: string[];
  years?: number;
  /** Where the confirmation link should land, e.g. https://site/fr/auth/callback?next=/teach */
  redirectTo: string;
};

export async function signUp(input: SignUpInput): Promise<{ ok: true; confirmed: boolean } | { ok: false; error: AuthError }> {
  if (!supabaseConfigured) return { ok: false, error: "not-configured" };
  const { data, error } = await supabase().auth.signUp({
    email: input.email.trim().toLowerCase(),
    password: input.password,
    options: {
      emailRedirectTo: input.redirectTo,
      data: {
        role: input.role,
        first_name: input.firstName.trim(),
        last_name: input.lastName.trim(),
        phone: input.phone,
        school_level: input.schoolLevel,
        subject: input.subject,
        levels: input.levels,
        years: input.years,
      },
    },
  });
  if (error) return { ok: false, error: mapError(error) };
  // With confirmation on, an existing email returns a user with no identities (no email is sent).
  if (data.user && (data.user.identities?.length ?? 0) === 0) return { ok: false, error: "email-taken" };
  return { ok: true, confirmed: !!data.session };
}

export async function signIn(email: string, password: string): Promise<{ ok: true } | { ok: false; error: AuthError }> {
  if (!supabaseConfigured) return { ok: false, error: "not-configured" };
  const { error } = await supabase().auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
  if (error) return { ok: false, error: mapError(error) };
  await refreshAuth();
  return { ok: true };
}

export async function resendConfirmation(email: string, redirectTo: string): Promise<AuthError | null> {
  const { error } = await supabase().auth.resend({
    type: "signup",
    email: email.trim().toLowerCase(),
    options: { emailRedirectTo: redirectTo },
  });
  return error ? mapError(error) : null;
}

export async function requestPasswordReset(email: string, redirectTo: string): Promise<AuthError | null> {
  const { error } = await supabase().auth.resetPasswordForEmail(email.trim().toLowerCase(), { redirectTo });
  return error ? mapError(error) : null;
}

export async function signOut() {
  await supabase().auth.signOut();
}

/** Current account snapshot outside React (e.g. inside event handlers). */
export const currentAccount = () => state.account ?? null;

export async function enroll(classId: string, groupId: string | null = null): Promise<boolean> {
  const account = currentAccount();
  if (!account) return false;
  const { error } = await supabase().from("enrollments").insert({ student_id: account.id, class_id: classId, group_id: groupId });
  if (error && error.code !== "23505") return false; // 23505 = already enrolled
  await refreshAuth();
  return true;
}

/* ---------------- Account settings ---------------- */

export async function updateProfile(input: { firstName: string; lastName: string; phone: string; schoolLevel?: string }) {
  const account = currentAccount();
  if (!account) throw new Error("signed-out");
  const row: Record<string, string | null> = {
    first_name: input.firstName.trim(),
    last_name: input.lastName.trim(),
    phone: input.phone || null,
  };
  if (input.schoolLevel !== undefined) row.school_level = input.schoolLevel;
  const { error } = await supabase().from("profiles").update(row).eq("id", account.id);
  if (error) throw error;
  await refreshAuth();
}

/** Changes the password after checking the current one. */
export async function changePassword(current: string, next: string): Promise<AuthError | "wrong-password" | null> {
  const account = currentAccount();
  if (!account?.email) return "unknown";
  const check = await supabase().auth.signInWithPassword({ email: account.email, password: current });
  if (check.error) return "wrong-password";
  const { error } = await supabase().auth.updateUser({ password: next });
  return error ? mapError(error) : null;
}

/** Sends a confirmation link to the new address; the email changes once it is confirmed. */
export async function changeEmail(email: string, redirectTo: string): Promise<AuthError | null> {
  const { error } = await supabase().auth.updateUser({ email: email.trim().toLowerCase() }, { emailRedirectTo: redirectTo });
  return error ? mapError(error) : null;
}

/** Signs out on every device (revokes all sessions). */
export async function signOutEverywhere() {
  await supabase().auth.signOut({ scope: "global" });
}
