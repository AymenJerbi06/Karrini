"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";
import Link from "@/components/LocalizedLink";
import { Localized, T, useI18n } from "@/components/I18n";
import { PhoneField } from "@/components/auth/Fields";
import { fieldClass, primaryButton, secondaryButton } from "@/components/SiteUi";
import { BookIcon, MailIcon, PhoneIcon, UsersIcon } from "@/components/icons";
import { labelFor, levels, placesLeft, subjects, teachers } from "@/data/catalog";
import {
  enroll,
  homeFor,
  isEmail,
  isPhoneTaken,
  normalizeTunisianPhone,
  resendConfirmation,
  signUp,
  useAuth,
  type AuthError,
  type Role,
} from "@/lib/auth";
import { cn } from "@/lib/cn";

const steps = ["Who are you?", "Your account", "Your profile"];

const errorText: Record<AuthError, string> = {
  "invalid-credentials": "The email or password is not correct.",
  "email-not-confirmed": "Please confirm your email first. Check your inbox for the link we sent.",
  "rate-limited": "Too many sign-ups right now. Please wait a few minutes and try again.",
  "email-taken": "This email already has an account. Sign in instead.",
  "phone-taken": "This phone number already has an account. Sign in instead.",
  "weak-password": "Use a password of at least 8 characters.",
  "not-configured": "Sign-up is not available on this version of the site.",
  unknown: "Something went wrong. Please try again.",
};

const safeNext = (next: string | null) => (next && next.startsWith("/") && !next.startsWith("//") ? next : null);

export function SignUp() {
  const { locale, t } = useI18n();
  const router = useRouter();
  const params = useSearchParams();
  const auth = useAuth();
  const classOffer = teachers.find((x) => x.id === params.get("teacher"));
  const presetRole = (["student", "parent", "teacher"] as const).find((r) => r === params.get("role"));
  const next = safeNext(params.get("next")) ?? (classOffer ? `/join?class=${classOffer.id}` : null);

  const [step, setStep] = useState(classOffer || presetRole ? 1 : 0);
  const [role, setRole] = useState<Role>(classOffer ? "student" : (presetRole ?? "student"));
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [level, setLevel] = useState("bac");
  const [subject, setSubject] = useState("math");
  const [teachLevels, setTeachLevels] = useState<string[]>(["bac"]);
  const [years, setYears] = useState("5");
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [resent, setResent] = useState("");
  const heading = useRef<HTMLHeadingElement>(null);
  const first = useRef(true);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    heading.current?.focus();
  }, [step, sentTo]);

  const callback = () =>
    `${window.location.origin}/${locale}/auth/callback?next=${encodeURIComponent(next ?? homeFor(role))}`;

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (step === 0) return setStep(1);
    if (step === 1) {
      if (!firstName.trim() || !lastName.trim()) return setError(t("Enter your first and last name."));
      if (!isEmail(email)) return setError(t("Enter a valid email address."));
      if (password.length < 8) return setError(t("Use a password of at least 8 characters."));
      const normalized = normalizeTunisianPhone(phone);
      if (!normalized) return setError(t("A Tunisian phone number is required, for example 20 123 456."));
      setBusy(true);
      const taken = await isPhoneTaken(normalized);
      setBusy(false);
      if (taken) return setError(t(errorText["phone-taken"]));
      return setStep(2);
    }
    if (role === "teacher" && !teachLevels.length) return setError(t("Choose at least one school year you teach."));
    if (!consent) return setError(t("Please accept the terms to create your account."));
    setBusy(true);
    const result = await signUp({
      email,
      password,
      role,
      firstName,
      lastName,
      phone: normalizeTunisianPhone(phone)!,
      schoolLevel: role === "student" ? level : undefined,
      subject: role === "teacher" ? subject : undefined,
      levels: role === "teacher" ? teachLevels : undefined,
      years: role === "teacher" ? Number(years) || 0 : undefined,
      redirectTo: callback(),
    });
    setBusy(false);
    if (!result.ok) {
      if (result.error === "email-taken" || result.error === "phone-taken") setStep(1);
      return setError(t(errorText[result.error]));
    }
    if (result.confirmed) {
      router.push(`/${locale}${next ?? homeFor(role)}`);
      return;
    }
    setSentTo(email.trim().toLowerCase());
  }

  /* ---------- Already signed in as a student and arriving from a class offer ---------- */
  if (classOffer && auth.account?.role === "student") {
    const already = auth.account.student?.enrollments.includes(classOffer.id);
    return (
      <div className="animate-rise">
        <p className="text-sm font-medium text-brand">{t("Signed in as {name}", { name: auth.account.firstName })}</p>
        <h1 className="home-heading font-display mt-4 text-3xl font-extrabold text-gray-900">
          <T>{already ? "You're already in this class." : "Add this class to your account"}</T>
        </h1>
        <div className="mt-6 rounded-xl border border-gray-200 p-5">
          <p className="font-semibold text-gray-800">
            <T>{labelFor(subjects, classOffer.subject)}</T> · <T>{classOffer.name}</T>
          </p>
          <p className="mt-2 text-sm text-gray-500">
            <T>{classOffer.timetable.map((s) => `${s.day} ${s.time}`).join(" · ")}</T>
          </p>
          <ul className="mt-4 space-y-1.5 text-sm text-gray-500">
            {classOffer.includes.map((i) => (
              <li key={i}>
                ✓ <T>{i}</T>
              </li>
            ))}
          </ul>
          <p className="mt-4 border-t border-gray-100 pt-4 font-semibold text-gray-800">
            <T>{classOffer.price}</T> <T>DT / month</T>
          </p>
          <p className="mt-2 rounded bg-emerald-50 p-3 text-sm text-emerald-800">
            <T>Due today: 0 DT. This is a demo enrollment.</T>
          </p>
        </div>
        <button
          type="button"
          disabled={busy || (!already && !placesLeft(classOffer))}
          onClick={async () => {
            if (!already) {
              setBusy(true);
              const ok = await enroll(classOffer.id);
              setBusy(false);
              if (!ok) return setError(t("We could not add the class. Please try again."));
            }
            router.push(`/${locale}/dashboard`);
          }}
          className={`${primaryButton} mt-6 w-full`}
        >
          <T>{already ? "Open my dashboard" : placesLeft(classOffer) ? "Add to my classes" : "Class full"}</T>
        </button>
        {error && (
          <p role="alert" className="mt-4 text-sm text-red-700">
            {error}
          </p>
        )}
      </div>
    );
  }

  /* ---------- Check your email ---------- */
  if (sentTo) {
    return (
      <div role="status" className="animate-rise">
        <span className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 text-brand">
          <MailIcon className="h-8 w-8" />
        </span>
        <h1 ref={heading} tabIndex={-1} className="home-heading font-display mt-6 text-3xl font-extrabold text-gray-900 focus:outline-none">
          <T>Check your email</T>
        </h1>
        <p className="mt-4 leading-7 text-gray-500">
          <T>We sent a confirmation link to</T>{" "}
          <bdi dir="ltr" className="font-semibold text-gray-900">
            {sentTo}
          </bdi>
          . <T>Open it to activate your account, then you will be signed in.</T>
        </p>
        <ul className="mt-6 space-y-2 rounded-xl bg-gray-50 p-5 text-sm leading-6 text-gray-600">
          <li>
            <T>It can take a minute to arrive. Check your spam or promotions folder too.</T>
          </li>
          <li>
            <T>You can open the link on any device.</T>
          </li>
        </ul>
        <button
          type="button"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            const err = await resendConfirmation(sentTo, callback());
            setBusy(false);
            setResent(err ? t(errorText[err]) : t("We sent a new confirmation link. Check your inbox and spam folder."));
          }}
          className={`${secondaryButton} mt-6 w-full`}
        >
          <T>Send the link again</T>
        </button>
        {resent && (
          <p role="status" className="mt-3 text-sm text-gray-700">
            {resent}
          </p>
        )}
        <p className="mt-6 text-center text-sm text-gray-500">
          <T>Already confirmed?</T>{" "}
          <Link href={`/login?role=${role}${next ? `&next=${encodeURIComponent(next)}` : ""}`} className="font-semibold text-brand underline">
            <T>Sign in</T>
          </Link>
        </p>
      </div>
    );
  }

  /* ---------- Steps ---------- */
  return (
    <form onSubmit={submit} noValidate>
      <Localized as="ol" aria-label="Sign-up steps" className="mb-8 flex gap-2 text-xs">
        {steps.map((s, i) => (
          <li
            key={s}
            aria-current={step === i ? "step" : undefined}
            className={cn(
              "flex-1 border-t-2 pt-3 transition-colors duration-300",
              i <= step ? "border-brand font-semibold text-gray-800" : "border-gray-200 text-gray-400",
            )}
          >
            <span className="hidden sm:inline">
              <T>{s}</T>
            </span>
            <span className="sm:hidden" dir="ltr">
              {i + 1}
            </span>
          </li>
        ))}
      </Localized>

      <h1 ref={heading} tabIndex={-1} className="home-heading font-display text-3xl font-extrabold text-gray-900 focus:outline-none">
        <T>{steps[step]}</T>
      </h1>

      {classOffer && step > 0 && (
        <div className="mt-5 flex items-center gap-3 rounded-lg bg-gray-50 p-4 text-sm">
          <span className={`${classOffer.color} h-10 w-10 shrink-0 rounded-full`} aria-hidden />
          <p className="text-gray-600">
            <T>Joining</T> <T>{labelFor(subjects, classOffer.subject)}</T> <T>with </T>
            <span className="font-semibold text-gray-800">
              <T>{classOffer.name}</T>
            </span>
          </p>
        </div>
      )}

      <div key={step} className="animate-rise">
        {step === 0 && (
          <fieldset className="mt-7 space-y-3">
            <legend className="sr-only">
              <T>Choose your account type</T>
            </legend>
            {(
              [
                ["student", "I'm a student", "Join classes, answer live questions, get corrections.", BookIcon],
                ["parent", "I'm a parent", "Follow schedules, subscriptions and progress.", UsersIcon],
                ["teacher", "I'm a teacher", "Publish classes, upload materials, teach live.", PhoneIcon],
              ] as const
            ).map(([r, title, body, Icon]) => (
              <label
                key={r}
                className={cn(
                  "flex min-h-20 cursor-pointer items-center gap-4 rounded-xl border p-5 transition-all duration-200",
                  role === r ? "border-brand bg-blue-50 shadow-sm" : "border-gray-200 hover:border-gray-400",
                )}
              >
                <input type="radio" name="role" checked={role === r} onChange={() => setRole(r)} className="sr-only" />
                <span
                  className={cn(
                    "flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition-colors",
                    role === r ? "bg-brand text-white" : "bg-gray-100 text-gray-500",
                  )}
                >
                  <Icon className="h-5 w-5" />
                </span>
                <span>
                  <span className="block font-semibold text-gray-900">
                    <T>{title}</T>
                  </span>
                  <span className="mt-1 block text-sm text-gray-500">
                    <T>{body}</T>
                  </span>
                </span>
              </label>
            ))}
          </fieldset>
        )}

        {step === 1 && (
          <div className="mt-6 space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <label className="block text-sm font-semibold text-gray-700">
                <T>First name</T>
                <input value={firstName} onChange={(e) => setFirstName(e.target.value)} autoComplete="given-name" maxLength={40} className={fieldClass} />
              </label>
              <label className="block text-sm font-semibold text-gray-700">
                <T>Last name</T>
                <input value={lastName} onChange={(e) => setLastName(e.target.value)} autoComplete="family-name" maxLength={40} className={fieldClass} />
              </label>
            </div>
            <label className="block text-sm font-semibold text-gray-700">
              <T>Email</T>
              <input type="email" dir="ltr" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className={fieldClass} />
              <span className="mt-1 block text-xs font-normal text-gray-400">
                <T>We send a link to this address to confirm your account.</T>
              </span>
            </label>
            <label className="block text-sm font-semibold text-gray-700">
              <T>Password</T>
              <input type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} className={fieldClass} />
              <span className="mt-1 block text-xs font-normal text-gray-400">
                <T>At least 8 characters.</T>
              </span>
            </label>
            <div>
              <PhoneField value={phone} onChange={setPhone} label="Phone number (required)" />
              <p className="mt-2 text-xs leading-5 text-gray-500">
                <T>Every Qarrini account needs a phone number for lesson reminders, schedule changes and family contact.</T>
              </p>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="mt-6 space-y-5">
            {role === "student" && (
              <label className="block text-sm font-semibold text-gray-700">
                <T>School year</T>
                <select value={level} onChange={(e) => setLevel(e.target.value)} className={fieldClass}>
                  {levels.slice(1).map((l) => (
                    <option key={l.slug} value={l.slug}>
                      {t(l.label)}
                    </option>
                  ))}
                </select>
              </label>
            )}
            {role === "parent" && (
              <p className="rounded-lg bg-gray-50 p-4 text-sm leading-6 text-gray-600">
                <T>Linking your account to your child&apos;s account will be available soon.</T>
              </p>
            )}
            {role === "teacher" && (
              <>
                <label className="block text-sm font-semibold text-gray-700">
                  <T>Main subject</T>
                  <select value={subject} onChange={(e) => setSubject(e.target.value)} className={fieldClass}>
                    {subjects.slice(1).map((s) => (
                      <option key={s.slug} value={s.slug}>
                        {t(s.label)}
                      </option>
                    ))}
                  </select>
                </label>
                <fieldset>
                  <legend className="text-sm font-semibold text-gray-700">
                    <T>School years you teach</T>
                  </legend>
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    {levels.slice(1).map((l) => (
                      <label
                        key={l.slug}
                        className={cn(
                          "flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border px-3 text-sm",
                          teachLevels.includes(l.slug) ? "border-brand bg-emerald-50 text-gray-800" : "border-gray-200 text-gray-600",
                        )}
                      >
                        <input
                          type="checkbox"
                          className="h-4 w-4"
                          checked={teachLevels.includes(l.slug)}
                          onChange={(e) => setTeachLevels((v) => (e.target.checked ? [...v, l.slug] : v.filter((x) => x !== l.slug)))}
                        />
                        <T>{l.label}</T>
                      </label>
                    ))}
                  </div>
                </fieldset>
                <label className="block text-sm font-semibold text-gray-700">
                  <T>Years of teaching experience</T>
                  <input type="number" min={0} max={50} value={years} onChange={(e) => setYears(e.target.value)} className={fieldClass} />
                </label>
                <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
                  <T>Qarrini reviews every teacher profile before it appears in public search.</T>
                </p>
              </>
            )}
            <label className="flex items-start gap-3 text-sm text-gray-600">
              <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-0.5 h-5 w-5" />
              <span>
                <T>I accept the</T>{" "}
                <Link href="/terms-of-use" className="underline">
                  <T>Terms of Use</T>
                </Link>{" "}
                <T>and the</T>{" "}
                <Link href="/privacy-policy" className="underline">
                  <T>Privacy Policy</T>
                </Link>
                .
              </span>
            </label>
          </div>
        )}
      </div>

      {error && (
        <p role="alert" className="animate-rise mt-4 text-sm leading-6 text-red-700">
          {error}{" "}
          {(error === t(errorText["email-taken"]) || error === t(errorText["phone-taken"])) && (
            <Link href="/login" className="font-semibold underline">
              <T>Sign in</T>
            </Link>
          )}
        </p>
      )}

      <div className="mt-7 flex gap-3">
        {step > (classOffer || presetRole ? 1 : 0) && (
          <button
            type="button"
            className={secondaryButton}
            onClick={() => {
              setError("");
              setStep(step - 1);
            }}
          >
            <T>Back</T>
          </button>
        )}
        <button className={`${primaryButton} flex-1`} type="submit" disabled={busy}>
          <T>{busy ? "Please wait…" : step === 2 ? "Create my account" : "Continue"}</T>
        </button>
      </div>
      <p className="mt-6 text-center text-sm text-gray-500">
        <T>Already have an account?</T>{" "}
        <Link href={`/login${next ? `?next=${encodeURIComponent(next)}` : ""}`} className="font-semibold text-brand underline underline-offset-4">
          <T>Sign in</T>
        </Link>
      </p>
    </form>
  );
}
