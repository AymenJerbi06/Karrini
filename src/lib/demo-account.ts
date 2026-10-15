"use client";

import { useMemo, useSyncExternalStore } from "react";

export type DemoRole = "student" | "parent" | "teacher";
export type DemoAccount = {
  name: string;
  role: DemoRole;
  enrollments: string[];
};
const key = "qarrini-demo-account";
const event = "qarrini-demo-account-changed";

function subscribe(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener(event, callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(event, callback);
  };
}
function snapshot() {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}
function parse(raw: string | null): DemoAccount | null {
  try {
    const value = raw ? JSON.parse(raw) : null;
    if (
      !value ||
      typeof value.name !== "string" ||
      !["student", "parent", "teacher"].includes(value.role) ||
      !Array.isArray(value.enrollments) ||
      !value.enrollments.every((id: unknown) => typeof id === "string")
    )
      return null;
    return value;
  } catch {
    return null;
  }
}
export function useDemoAccount() {
  const raw = useSyncExternalStore(subscribe, snapshot, () => null);
  return useMemo(() => parse(raw), [raw]);
}
export function saveDemoAccount(account: DemoAccount) {
  window.localStorage.setItem(key, JSON.stringify(account));
  window.dispatchEvent(new Event(event));
}
export function clearDemoAccount() {
  window.localStorage.removeItem(key);
  window.dispatchEvent(new Event(event));
}
