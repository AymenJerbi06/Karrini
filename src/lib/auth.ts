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
  student?: { level: string; enrollments: string[] };
  teacher?: {
    classId: string;
    subject: string;
    levels: string[];
    years: number;
    status: "pending" | "verified";
  };
  parent?: { childPhone?: string };
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
  const [profile, teacher, enrollments, cls] = await Promise.all([
    sb.from("profiles").select("*").eq("id", userId).maybeSingle(),
    sb.from("teacher_profiles").select("*").eq("id", userId).maybeSingle(),
    sb.from("enrollments").select("class_id").eq("student_id", userId),
    sb.from("classes").select("id").eq("teacher_id", userId).order("created_at").limit(1).maybeSingle(),
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
          ? { level: p.school_level ?? "", enrollments: (enrollments.data ?? []).map((e) => e.class_id) }
          : undefined,
      teacher:
        p.role === "teacher"
          ? {
              classId: cls.data?.id ?? "",
              subject: t?.subject ?? "math",
              levels: t?.levels ?? [],
              years: t?.years ?? 0,
              status: t?.status ?? "pending",
            }
          : undefined,
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

export async function enroll(classId: string): Promise<boolean> {
  const account = currentAccount();
  if (!account) return false;
  const { error } = await supabase().from("enrollments").insert({ student_id: account.id, class_id: classId });
  if (error && error.code !== "23505") return false; // 23505 = already enrolled
  await refreshAuth();
  return true;
}
