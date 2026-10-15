"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";
import Link from "@/components/LocalizedLink";
import { T, useI18n } from "@/components/I18n";
import { fieldClass, primaryButton } from "@/components/SiteUi";
import {
  currentAccount,
  homeFor,
  isEmail,
  requestPasswordReset,
  resendConfirmation,
  signIn,
  type AuthError,
  type Role,
} from "@/lib/auth";
import { cn } from "@/lib/cn";

const roles: { role: Role; label: string; hint: string }[] = [
  { role: "student", label: "Student", hint: "Classes, live lessons and corrections" },
  { role: "parent", label: "Parent", hint: "Schedules, subscriptions and progress" },
  { role: "teacher", label: "Teacher", hint: "Your classes, materials and live results" },
];

const errorText: Record<AuthError, string> = {
  "invalid-credentials": "The email or password is not correct.",
  "email-not-confirmed": "Please confirm your email first. Check your inbox for the link we sent.",
  "rate-limited": "Too many attempts. Please wait a few minutes and try again.",
  "email-taken": "This email already has an account. Sign in instead.",
  "phone-taken": "This phone number already has an account. Sign in instead.",
  "weak-password": "Use a password of at least 8 characters.",
  "not-configured": "Sign-in is not available on this version of the site.",
  unknown: "Something went wrong. Please try again.",
};

const safeNext = (next: string | null) => (next && next.startsWith("/") && !next.startsWith("//") ? next : null);

export function SignIn() {
  const { locale, t } = useI18n();
  const router = useRouter();
  const params = useSearchParams();
  const initialRole = (["student", "parent", "teacher"] as const).find((r) => r === params.get("role")) ?? "student";
  const next = safeNext(params.get("next"));
  const [role, setRole] = useState<Role>(initialRole);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<AuthError | "">("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [mismatch, setMismatch] = useState<Role | null>(null);

  const callback = (path: string) => `${window.location.origin}/${locale}/auth/callback?next=${encodeURIComponent(path)}`;

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setNotice("");
    setMismatch(null);
    if (!isEmail(email)) return setNotice(t("Enter a valid email address."));
    if (!password) return setNotice(t("Enter your password."));
    setBusy(true);
    const result = await signIn(email, password);
    setBusy(false);
    if (!result.ok) return setError(result.error);
    const account = currentAccount();
    if (account && account.role !== role) {
      setMismatch(account.role);
      return;
    }
    router.push(`/${locale}${next ?? homeFor(account?.role ?? role)}`);
  }

  async function resend() {
    setBusy(true);
    const err = await resendConfirmation(email, callback(next ?? homeFor(role)));
    setBusy(false);
    setError("");
    setNotice(err ? t(errorText[err]) : t("We sent a new confirmation link. Check your inbox and spam folder."));
  }

  async function forgot() {
    setError("");
    if (!isEmail(email)) return setNotice(t("Type your email above, then choose “Forgot password?” again."));
    setBusy(true);
    const err = await requestPasswordReset(email, callback("/reset-password"));
    setBusy(false);
    setNotice(err ? t(errorText[err]) : t("If an account exists for this email, we sent a link to choose a new password."));
  }

  return (
    <>
      <p className="text-sm font-medium text-brand">
        <T>Welcome back</T>
      </p>
      <h1 className="home-heading font-display mt-4 text-3xl font-extrabold text-gray-900">
        <T>Sign in to Qarrini</T>
      </h1>

      <fieldset className="mt-7">
        <legend className="text-sm font-semibold text-gray-700">
          <T>I am signing in as a</T>
        </legend>
        <div className="mt-3 grid grid-cols-3 gap-2 rounded-xl bg-gray-100 p-1.5">
          {roles.map(({ role: r, label }) => (
            <button
              key={r}
              type="button"
              aria-pressed={role === r}
              onClick={() => {
                setRole(r);
                setError("");
                setMismatch(null);
              }}
              className={cn(
                "min-h-11 rounded-lg px-2 text-sm font-semibold transition-all duration-200",
                role === r ? (r === "teacher" ? "bg-gray-800 text-white shadow" : "bg-white text-gray-900 shadow") : "text-gray-500 hover:text-gray-800",
              )}
            >
              <T>{label}</T>
            </button>
          ))}
        </div>
        <p key={role} className="animate-rise mt-3 text-sm text-gray-500">
          <T>{roles.find((r) => r.role === role)!.hint}</T>
        </p>
      </fieldset>

      <form
        onSubmit={submit}
        noValidate
        className={cn(
          "mt-6 space-y-4 rounded-2xl border p-5 transition-colors duration-300 md:p-6",
          role === "teacher" ? "border-gray-800 bg-gray-800/[0.03]" : "border-gray-200",
        )}
      >
        <label className="block text-sm font-semibold text-gray-700">
          <T>Email</T>
          <input type="email" autoComplete="email" dir="ltr" value={email} onChange={(e) => setEmail(e.target.value)} className={fieldClass} />
        </label>
        <label className="block text-sm font-semibold text-gray-700">
          <T>Password</T>
          <input
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={fieldClass}
          />
        </label>
        <div className="flex justify-end">
          <button type="button" onClick={forgot} disabled={busy} className="min-h-11 text-sm font-semibold text-brand hover:underline">
            <T>Forgot password?</T>
          </button>
        </div>
        <button type="submit" disabled={busy} className={`${primaryButton} w-full`}>
          <T>{busy ? "Checking…" : "Sign in"}</T>
        </button>

        {error && (
          <div role="alert" className="animate-rise text-sm leading-6 text-red-700">
            <T>{errorText[error]}</T>
            {error === "email-not-confirmed" && (
              <button type="button" onClick={resend} disabled={busy} className="ms-2 min-h-11 font-semibold underline">
                <T>Send the link again</T>
              </button>
            )}
          </div>
        )}
        {notice && (
          <p role="status" className="animate-rise text-sm leading-6 text-gray-700">
            {notice}
          </p>
        )}
        {mismatch && (
          <div role="alert" className="animate-rise rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            <p>{t("This account is registered as a {role}.", { role: t(mismatch) })}</p>
            <button
              type="button"
              onClick={() => router.push(`/${locale}${homeFor(mismatch)}`)}
              className="mt-2 min-h-11 font-semibold underline"
            >
              <T>{mismatch === "teacher" ? "Go to my teacher workspace" : "Go to my dashboard"}</T>
            </button>
          </div>
        )}
      </form>

      <p className="mt-6 text-center text-sm text-gray-500">
        <T>New to Qarrini?</T>{" "}
        <Link
          href={`/register?role=${role}${next ? `&next=${encodeURIComponent(next)}` : ""}`}
          className="font-semibold text-brand underline underline-offset-4"
        >
          <T>Create an account</T>
        </Link>
      </p>
    </>
  );
}
