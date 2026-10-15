"use client";

// Browser-local account store for the prototype.
// Accounts live in localStorage; the signed-in session is per tab (sessionStorage),
// so a teacher and a student can be signed in side by side in two windows.
// Production replaces this module with a server API (see docs/ARCHITECTURE.md).

import { useMemo, useSyncExternalStore } from "react";

export type Role = "student" | "parent" | "teacher";

export type Account = {
  id: string;
  role: Role;
  firstName: string;
  lastName: string;
  /** E.164, e.g. +21620123456. Required for every account. */
  phone: string;
  phoneVerified: boolean;
  email?: string;
  /** SHA-256 of the password, only for accounts that use one. */
  passwordHash?: string;
  signUpMethod: "phone" | "email";
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

const ACCOUNTS = "qarrini-accounts";
const SESSION = "qarrini-session";
const REMEMBER = "qarrini-remember";
const EVENT = "qarrini-auth-changed";

export const DEMO_TEACHER_ID = "demo-teacher";
export const DEMO_STUDENT_ID = "demo-student";
export const DEMO_PASSWORD = "qarrini2026";

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
  const d = e164.replace(/^\+216/, "");
  return `+216 ${d.slice(0, 2)} ${d.slice(2, 5)} ${d.slice(5)}`;
}

export const isEmail = (value: string) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value.trim());

export async function hashPassword(password: string) {
  const data = new TextEncoder().encode(`qarrini:${password}`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/* ---------------- One-time codes (simulated SMS) ---------------- */

type PendingCode = { phone: string; code: string; expires: number; tries: number };
const codes = new Map<string, PendingCode>();

/** Creates a 6-digit code. In production an SMS gateway sends it; the demo shows it on screen. */
export function requestCode(phone: string) {
  const code = String(Math.floor(100000 + Math.random() * 900000));
  codes.set(phone, { phone, code, expires: Date.now() + 5 * 60_000, tries: 0 });
  return code;
}

export function verifyCode(phone: string, code: string): "ok" | "wrong" | "expired" | "locked" {
  const pending = codes.get(phone);
  if (!pending || pending.expires < Date.now()) return "expired";
  if (pending.tries >= 5) return "locked";
  if (pending.code !== code.trim()) {
    pending.tries += 1;
    return "wrong";
  }
  codes.delete(phone);
  return "ok";
}

/* ---------------- Storage ---------------- */

function seedAccounts(): Account[] {
  return [
    {
      id: DEMO_TEACHER_ID,
      role: "teacher",
      firstName: "Hichem",
      lastName: "Trabelsi",
      phone: "+21620000001",
      phoneVerified: true,
      email: "hichem.demo@qarrini.tn",
      // SHA-256("qarrini:qarrini2026"), computed lazily on first sign-in check.
      signUpMethod: "email",
      createdAt: 0,
      teacher: {
        classId: "hichem-trabelsi",
        subject: "math",
        levels: ["3rd-secondary", "bac"],
        years: 18,
        status: "verified",
      },
    },
    {
      id: DEMO_STUDENT_ID,
      role: "student",
      firstName: "Yasmine",
      lastName: "Ben Ali",
      phone: "+21650000002",
      phoneVerified: true,
      signUpMethod: "phone",
      createdAt: 0,
      student: { level: "bac", enrollments: ["hichem-trabelsi", "sonia-kammoun"] },
    },
  ];
}

function readAccounts(): Account[] {
  try {
    const raw = window.localStorage.getItem(ACCOUNTS);
    const list = raw ? (JSON.parse(raw) as Account[]) : [];
    if (!Array.isArray(list)) return seedAccounts();
    const ids = new Set(list.map((a) => a.id));
    return [...seedAccounts().filter((s) => !ids.has(s.id)), ...list];
  } catch {
    return seedAccounts();
  }
}

function writeAccounts(list: Account[]) {
  window.localStorage.setItem(ACCOUNTS, JSON.stringify(list));
  notify();
}

function notify() {
  window.dispatchEvent(new Event(EVENT));
}

function currentId(): string | null {
  try {
    return (
      window.sessionStorage.getItem(SESSION) ?? window.localStorage.getItem(REMEMBER)
    );
  } catch {
    return null;
  }
}

/* ---------------- React hook ---------------- */

function subscribe(cb: () => void) {
  window.addEventListener("storage", cb);
  window.addEventListener(EVENT, cb);
  return () => {
    window.removeEventListener("storage", cb);
    window.removeEventListener(EVENT, cb);
  };
}

function snapshot() {
  try {
    return `${currentId() ?? ""}|${window.localStorage.getItem(ACCOUNTS) ?? ""}`;
  } catch {
    return "|";
  }
}

/** Returns the signed-in account (undefined while hydrating on the server, null when signed out). */
export function useAuth() {
  const raw = useSyncExternalStore(subscribe, snapshot, () => null);
  return useMemo(() => {
    if (raw === null) return { ready: false as const, account: undefined };
    const id = raw.split("|")[0];
    const account = id ? (readAccounts().find((a) => a.id === id) ?? null) : null;
    return { ready: true as const, account };
  }, [raw]);
}

export function useAccounts() {
  const raw = useSyncExternalStore(subscribe, snapshot, () => null);
  return useMemo(() => (raw === null ? [] : readAccounts()), [raw]);
}

/* ---------------- Actions ---------------- */

export function findAccount(identifier: string): Account | undefined {
  const list = readAccounts();
  const phone = normalizeTunisianPhone(identifier);
  if (phone) return list.find((a) => a.phone === phone);
  const email = identifier.trim().toLowerCase();
  return list.find((a) => a.email?.toLowerCase() === email);
}

export function startSession(id: string, remember: boolean) {
  window.sessionStorage.setItem(SESSION, id);
  if (remember) window.localStorage.setItem(REMEMBER, id);
  else window.localStorage.removeItem(REMEMBER);
  notify();
}

export function signOut() {
  try {
    window.sessionStorage.removeItem(SESSION);
    window.localStorage.removeItem(REMEMBER);
  } finally {
    notify();
  }
}

export async function checkPassword(account: Account, password: string) {
  const hash = await hashPassword(password);
  if (account.passwordHash) return account.passwordHash === hash;
  // Seeded demo accounts share the published demo password.
  return account.id === DEMO_TEACHER_ID && hash === (await hashPassword(DEMO_PASSWORD));
}

export function createAccount(input: Omit<Account, "id" | "createdAt">): Account {
  const list = readAccounts();
  if (list.some((a) => a.phone === input.phone)) throw new Error("phone-taken");
  if (input.email && list.some((a) => a.email?.toLowerCase() === input.email!.toLowerCase()))
    throw new Error("email-taken");
  const account: Account = {
    ...input,
    id: `acc-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
    createdAt: Date.now(),
  };
  writeAccounts([...list, account]);
  return account;
}

export function updateAccount(id: string, patch: (a: Account) => Account) {
  const list = readAccounts();
  writeAccounts(list.map((a) => (a.id === id ? patch(a) : a)));
}

export function enroll(accountId: string, classId: string) {
  updateAccount(accountId, (a) => ({
    ...a,
    student: {
      level: a.student?.level ?? "bac",
      enrollments: Array.from(new Set([...(a.student?.enrollments ?? []), classId])),
    },
  }));
}

export const newClassId = () => `class-${Date.now().toString(36)}`;

export const displayName = (a: Pick<Account, "firstName" | "lastName">) =>
  `${a.firstName} ${a.lastName}`.trim();

export function homeFor(role: Role) {
  return role === "teacher" ? "/teach" : "/dashboard";
}
