"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";
import Link from "@/components/LocalizedLink";
import { Localized, T, useI18n } from "@/components/I18n";
import { OtpInput, PhoneField, SmsPreview } from "@/components/auth/Fields";
import { fieldClass, primaryButton, secondaryButton } from "@/components/SiteUi";
import { BookIcon, MailIcon, PhoneIcon, UsersIcon } from "@/components/icons";
import {
  checkPassword,
  DEMO_PASSWORD,
  DEMO_STUDENT_ID,
  DEMO_TEACHER_ID,
  findAccount,
  formatPhone,
  homeFor,
  isEmail,
  normalizeTunisianPhone,
  requestCode,
  startSession,
  verifyCode,
  type Account,
  type Role,
} from "@/lib/auth";
import { cn } from "@/lib/cn";

const roles: { role: Role; label: string; hint: string; Icon: typeof BookIcon }[] = [
  { role: "student", label: "Student", hint: "Classes, live lessons and corrections", Icon: BookIcon },
  { role: "parent", label: "Parent", hint: "Schedules, subscriptions and progress", Icon: UsersIcon },
  { role: "teacher", label: "Teacher", hint: "Your classes, materials and live results", Icon: PhoneIcon },
];

const roleWord: Record<Role, string> = { student: "student", parent: "parent", teacher: "teacher" };

export function SignIn() {
  const { locale, t } = useI18n();
  const router = useRouter();
  const params = useSearchParams();
  const initialRole = (["student", "parent", "teacher"] as const).find((r) => r === params.get("role")) ?? "student";
  const [role, setRole] = useState<Role>(initialRole);
  const [method, setMethod] = useState<"phone" | "email">("phone");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [sent, setSent] = useState<{ phone: string; code: string } | null>(null);
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState("");
  const [mismatch, setMismatch] = useState<Account | null>(null);
  const [busy, setBusy] = useState(false);

  const isTeacher = role === "teacher";

  function finish(account: Account) {
    startSession(account.id, remember);
    const next = params.get("next");
    router.push(next && next.startsWith("/") && !next.startsWith("//") ? `/${locale}${next}` : `/${locale}${homeFor(account.role)}`);
  }

  function guardRole(account: Account) {
    if (account.role !== role) {
      setMismatch(account);
      setError("");
      return false;
    }
    return true;
  }

  function sendCode(e: FormEvent) {
    e.preventDefault();
    setError("");
    setMismatch(null);
    const normalized = normalizeTunisianPhone(phone);
    if (!normalized) {
      setError("Enter a Tunisian number with 8 digits, for example 20 123 456.");
      return;
    }
    const account = findAccount(normalized);
    if (!account) {
      setError("No Qarrini account uses this number yet.");
      return;
    }
    if (!guardRole(account)) return;
    setSent({ phone: normalized, code: requestCode(normalized) });
    setCode("");
  }

  function confirmCode(e: FormEvent) {
    e.preventDefault();
    if (!sent) return;
    const result = verifyCode(sent.phone, code);
    if (result !== "ok") {
      setError(
        result === "wrong"
          ? "That code is not correct. Check the SMS and try again."
          : result === "locked"
            ? "Too many attempts. Request a new code."
            : "This code has expired. Request a new one.",
      );
      return;
    }
    const account = findAccount(sent.phone);
    if (account) finish(account);
  }

  async function emailSignIn(e: FormEvent) {
    e.preventDefault();
    setError("");
    setMismatch(null);
    if (!isEmail(email)) {
      setError("Enter a valid email address.");
      return;
    }
    if (!password) {
      setError("Enter your password.");
      return;
    }
    const account = findAccount(email);
    setBusy(true);
    const ok = account ? await checkPassword(account, password) : false;
    setBusy(false);
    if (!account || !ok) {
      setError("The email or password is not correct.");
      return;
    }
    if (guardRole(account)) finish(account);
  }

  function demo(r: "student" | "teacher") {
    const account = findAccount(r === "teacher" ? "+21620000001" : "+21650000002");
    if (account && (account.id === DEMO_STUDENT_ID || account.id === DEMO_TEACHER_ID)) finish(account);
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
                setSent(null);
              }}
              className={cn(
                "min-h-11 rounded-lg px-2 text-sm font-semibold transition-all duration-200",
                role === r
                  ? r === "teacher"
                    ? "bg-gray-800 text-white shadow"
                    : "bg-white text-gray-900 shadow"
                  : "text-gray-500 hover:text-gray-800",
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

      <div
        className={cn(
          "mt-6 rounded-2xl border p-5 transition-colors duration-300 md:p-6",
          isTeacher ? "border-gray-800 bg-gray-800/[0.03]" : "border-gray-200",
        )}
      >
        <Localized as="div" role="group" aria-label="Sign-in method" className="flex gap-2">
          {(
            [
              ["phone", "Phone number", PhoneIcon],
              ["email", "Email", MailIcon],
            ] as const
          ).map(([m, label, Icon]) => (
            <button
              key={m}
              type="button"
              aria-pressed={method === m}
              onClick={() => {
                setMethod(m);
                setError("");
                setMismatch(null);
              }}
              className={cn(
                "inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-lg border px-3 text-sm font-semibold transition-colors",
                method === m ? "border-brand bg-emerald-50 text-brand" : "border-gray-200 text-gray-500 hover:bg-gray-50",
              )}
            >
              <Icon className="h-4 w-4" />
              <T>{label}</T>
            </button>
          ))}
        </Localized>

        {method === "phone" ? (
          !sent ? (
            <form onSubmit={sendCode} className="mt-5" noValidate>
              <PhoneField value={phone} onChange={setPhone} invalid={!!error} describedBy="signin-error" autoFocus />
              <button type="submit" className={`${primaryButton} mt-5 w-full`}>
                <T>Send me a code</T>
              </button>
            </form>
          ) : (
            <form onSubmit={confirmCode} className="mt-5">
              <p className="text-sm text-gray-600">
                <T>Enter the 6-digit code sent to</T>{" "}
                <bdi dir="ltr" className="font-semibold text-gray-900">
                  {formatPhone(sent.phone)}
                </bdi>
              </p>
              <div className="mt-4">
                <OtpInput value={code} onChange={(v) => { setCode(v); setError(""); }} invalid={!!error} />
              </div>
              <SmsPreview phone={formatPhone(sent.phone)} code={sent.code} />
              <button type="submit" disabled={code.length < 6} className={`${primaryButton} mt-5 w-full`}>
                <T>Verify and sign in</T>
              </button>
              <div className="mt-3 flex justify-between text-sm">
                <button type="button" onClick={() => setSent(null)} className="min-h-11 text-gray-500 underline">
                  <T>Change number</T>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSent({ phone: sent.phone, code: requestCode(sent.phone) });
                    setCode("");
                    setError("");
                  }}
                  className="min-h-11 font-semibold text-brand"
                >
                  <T>Send a new code</T>
                </button>
              </div>
            </form>
          )
        ) : (
          <form onSubmit={emailSignIn} className="mt-5 space-y-4" noValidate>
            <label className="block text-sm font-semibold text-gray-700">
              <T>Email</T>
              <input
                type="email"
                autoComplete="email"
                dir="ltr"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={fieldClass}
              />
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
            <button type="submit" disabled={busy} className={`${primaryButton} w-full`}>
              <T>{busy ? "Checking…" : "Sign in"}</T>
            </button>
          </form>
        )}

        <label className="mt-4 flex min-h-11 items-center gap-3 text-sm text-gray-600">
          <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} className="h-5 w-5" />
          <T>Keep me signed in on this device</T>
        </label>

        {error && (
          <p id="signin-error" role="alert" className="animate-rise mt-2 text-sm leading-6 text-red-700">
            <T>{error}</T>{" "}
            {error === "No Qarrini account uses this number yet." && (
              <Link href={`/register?role=${role}`} className="font-semibold underline">
                <T>Create an account</T>
              </Link>
            )}
          </p>
        )}
        {mismatch && (
          <div role="alert" className="animate-rise mt-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            <p>{t("This account is registered as a {role}.", { role: t(roleWord[mismatch.role]) })}</p>
            <button
              type="button"
              onClick={() => {
                setRole(mismatch.role);
                setMismatch(null);
              }}
              className="mt-2 min-h-11 font-semibold underline"
            >
              {t("Switch to {role} sign-in", { role: t(roleWord[mismatch.role]) })}
            </button>
          </div>
        )}
      </div>

      <div className="mt-6 rounded-xl bg-gray-50 p-5">
        <p className="text-sm font-semibold text-gray-700">
          <T>Just exploring?</T>
        </p>
        <p className="mt-1 text-sm text-gray-500">
          <T>Open a ready-made demo account in one click.</T>
        </p>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <button type="button" onClick={() => demo("student")} className={secondaryButton}>
            <T>Student demo</T>
          </button>
          <button type="button" onClick={() => demo("teacher")} className={secondaryButton}>
            <T>Teacher demo</T>
          </button>
        </div>
        <p className="mt-3 text-xs leading-5 text-gray-400">
          {t("Teacher demo: hichem.demo@qarrini.tn · password {password}", { password: DEMO_PASSWORD })}
        </p>
      </div>

      <p className="mt-6 text-center text-sm text-gray-500">
        <T>New to Qarrini?</T>{" "}
        <Link href={`/register?role=${role}`} className="font-semibold text-brand underline underline-offset-4">
          <T>Create an account</T>
        </Link>
      </p>
    </>
  );
}
