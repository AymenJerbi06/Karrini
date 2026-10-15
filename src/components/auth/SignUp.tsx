"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";
import Link from "@/components/LocalizedLink";
import { Localized, T, useI18n } from "@/components/I18n";
import { OtpInput, PhoneField, SmsPreview } from "@/components/auth/Fields";
import { fieldClass, primaryButton, secondaryButton } from "@/components/SiteUi";
import { BookIcon, MailIcon, PhoneIcon, UsersIcon } from "@/components/icons";
import { labelFor, levels, placesLeft, subjects, teachers } from "@/data/catalog";
import {
  createAccount,
  enroll,
  newClassId,
  formatPhone,
  useAuth,
  hashPassword,
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

const steps = ["Who are you?", "Your account", "Verify your phone", "Your profile"];

export function SignUp() {
  const { locale, t } = useI18n();
  const router = useRouter();
  const params = useSearchParams();
  const auth = useAuth();
  const classOffer = teachers.find((x) => x.id === params.get("teacher"));
  const presetRole = (["student", "parent", "teacher"] as const).find((r) => r === params.get("role"));

  const [step, setStep] = useState(classOffer || presetRole ? 1 : 0);
  const [role, setRole] = useState<Role>(classOffer ? "student" : (presetRole ?? "student"));
  const [method, setMethod] = useState<"phone" | "email">("phone");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [sent, setSent] = useState<{ phone: string; code: string } | null>(null);
  const [level, setLevel] = useState("bac");
  const [enrollNow, setEnrollNow] = useState(true);
  const [childPhone, setChildPhone] = useState("");
  const [subject, setSubject] = useState("math");
  const [teachLevels, setTeachLevels] = useState<string[]>(["bac"]);
  const [years, setYears] = useState("5");
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState("");
  const [created, setCreated] = useState<Account | null>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const first = useRef(true);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    heading.current?.focus();
  }, [step, created]);

  const fail = (message: string) => {
    setError(message);
    return false;
  };

  function validateAccount() {
    if (!firstName.trim() || !lastName.trim()) return fail("Enter your first and last name.");
    if (!normalizeTunisianPhone(phone))
      return fail("A Tunisian phone number is required, for example 20 123 456.");
    if (method === "email") {
      if (!isEmail(email)) return fail("Enter a valid email address.");
      if (password.length < 8) return fail("Use a password of at least 8 characters.");
    }
    return true;
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (step === 0) return setStep(1);
    if (step === 1) {
      if (!validateAccount()) return;
      const normalized = normalizeTunisianPhone(phone)!;
      setSent({ phone: normalized, code: requestCode(normalized) });
      setCode("");
      return setStep(2);
    }
    if (step === 2) {
      if (!sent) return;
      const result = verifyCode(sent.phone, code);
      if (result !== "ok")
        return fail(
          result === "wrong"
            ? "That code is not correct. Check the SMS and try again."
            : "This code has expired. Request a new one.",
        );
      return setStep(3);
    }
    // Step 3: create the account.
    if (role === "teacher" && !teachLevels.length) return fail("Choose at least one school year you teach.");
    if (role === "parent" && childPhone && !normalizeTunisianPhone(childPhone))
      return fail("Check your child's phone number, or leave it empty.");
    if (!consent) return fail("Please accept the terms to create your account.");
    try {
      const base = {
        role,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phone: sent!.phone,
        phoneVerified: true,
        signUpMethod: method,
        ...(method === "email"
          ? { email: email.trim().toLowerCase(), passwordHash: await hashPassword(password) }
          : {}),
      };
      const account = createAccount({
        ...base,
        ...(role === "student"
          ? {
              student: {
                level,
                enrollments: classOffer && enrollNow && placesLeft(classOffer) ? [classOffer.id] : [],
              },
            }
          : role === "teacher"
            ? {
                teacher: {
                  classId: newClassId(),
                  subject,
                  levels: teachLevels,
                  years: Number(years) || 0,
                  status: "pending" as const,
                },
              }
            : {
                parent: {
                  childPhone: childPhone ? (normalizeTunisianPhone(childPhone) ?? undefined) : undefined,
                },
              }),
      });
      startSession(account.id, true);
      setCreated(account);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      if (msg === "phone-taken") {
        setStep(1);
        return fail("This phone number already has an account. Sign in instead.");
      }
      if (msg === "email-taken") {
        setStep(1);
        return fail("This email already has an account. Sign in instead.");
      }
      fail("Your browser could not save the account. Allow site storage and try again.");
    }
  }

  if (!created && classOffer && auth.account?.role === "student") {
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
          disabled={!already && !placesLeft(classOffer)}
          onClick={() => {
            if (!already) enroll(auth.account!.id, classOffer.id);
            router.push(`/${locale}/dashboard`);
          }}
          className={`${primaryButton} mt-6 w-full`}
        >
          <T>{already ? "Open my dashboard" : placesLeft(classOffer) ? "Add to my classes" : "Class full"}</T>
        </button>
      </div>
    );
  }

  if (created) {
    return (
      <div role="status" className="animate-rise">
        <span className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 text-3xl text-brand">✓</span>
        <h1
          ref={heading}
          tabIndex={-1}
          className="home-heading font-display mt-6 text-3xl font-extrabold text-gray-900 focus:outline-none"
        >
          {t("Welcome to Qarrini, {name}.", { name: created.firstName })}
        </h1>
        <p className="mt-4 leading-7 text-gray-500">
          <T>
            {created.role === "teacher"
              ? "Your teacher profile is saved and marked as pending verification. You can already prepare materials and questions."
              : created.student?.enrollments.length
                ? "Your account is ready and the class was added to your dashboard. No payment was taken."
                : "Your account is ready. Your phone number is verified."}
          </T>
        </p>
        <button
          type="button"
          onClick={() => router.push(`/${locale}${homeFor(created.role)}`)}
          className={`${primaryButton} mt-8 w-full`}
        >
          <T>{created.role === "teacher" ? "Open my teacher workspace" : "Open my dashboard"}</T>
        </button>
      </div>
    );
  }

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

      <h1
        ref={heading}
        tabIndex={-1}
        className="home-heading font-display text-3xl font-extrabold text-gray-900 focus:outline-none"
      >
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
                <input
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  autoComplete="given-name"
                  maxLength={40}
                  className={fieldClass}
                />
              </label>
              <label className="block text-sm font-semibold text-gray-700">
                <T>Last name</T>
                <input
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  autoComplete="family-name"
                  maxLength={40}
                  className={fieldClass}
                />
              </label>
            </div>

            <div>
              <p className="text-sm font-semibold text-gray-700">
                <T>Sign up with</T>
              </p>
              <div className="mt-2 grid grid-cols-2 gap-2">
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
                    onClick={() => setMethod(m)}
                    className={cn(
                      "inline-flex min-h-12 items-center justify-center gap-2 rounded-lg border px-3 text-sm font-semibold transition-colors",
                      method === m ? "border-brand bg-emerald-50 text-brand" : "border-gray-200 text-gray-500 hover:bg-gray-50",
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    <T>{label}</T>
                  </button>
                ))}
              </div>
            </div>

            {method === "email" && (
              <div className="animate-rise space-y-5">
                <label className="block text-sm font-semibold text-gray-700">
                  <T>Email</T>
                  <input
                    type="email"
                    dir="ltr"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={fieldClass}
                  />
                </label>
                <label className="block text-sm font-semibold text-gray-700">
                  <T>Password</T>
                  <input
                    type="password"
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={fieldClass}
                  />
                  <span className="mt-1 block text-xs font-normal text-gray-400">
                    <T>At least 8 characters.</T>
                  </span>
                </label>
              </div>
            )}

            <div>
              <PhoneField
                value={phone}
                onChange={setPhone}
                invalid={error.includes("phone")}
                label={method === "email" ? "Phone number (required)" : "Phone number"}
              />
              <p className="mt-2 text-xs leading-5 text-gray-500">
                <T>
                  {method === "email"
                    ? "Every Qarrini account needs a verified phone number for lesson reminders, schedule changes and family contact."
                    : "We'll send a 6-digit code by SMS to verify this number."}
                </T>
              </p>
            </div>
          </div>
        )}

        {step === 2 && sent && (
          <div className="mt-6">
            <p className="text-sm text-gray-600">
              <T>Enter the 6-digit code sent to</T>{" "}
              <bdi dir="ltr" className="font-semibold text-gray-900">
                {formatPhone(sent.phone)}
              </bdi>
            </p>
            <div className="mt-4">
              <OtpInput
                value={code}
                onChange={(v) => {
                  setCode(v);
                  setError("");
                }}
                invalid={!!error}
              />
            </div>
            <SmsPreview phone={formatPhone(sent.phone)} code={sent.code} />
            <button
              type="button"
              onClick={() => {
                setSent({ phone: sent.phone, code: requestCode(sent.phone) });
                setCode("");
                setError("");
              }}
              className="mt-3 min-h-11 text-sm font-semibold text-brand"
            >
              <T>Send a new code</T>
            </button>
          </div>
        )}

        {step === 3 && (
          <div className="mt-6 space-y-5">
            {role === "student" && (
              <>
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
                {classOffer && (
                  <label className="flex items-start gap-3 rounded-xl border border-gray-200 p-4 text-sm">
                    <input
                      type="checkbox"
                      checked={enrollNow && placesLeft(classOffer) > 0}
                      disabled={!placesLeft(classOffer)}
                      onChange={(e) => setEnrollNow(e.target.checked)}
                      className="mt-0.5 h-5 w-5"
                    />
                    <span>
                      <span className="block font-semibold text-gray-800">
                        <T>Add this class to my dashboard</T>
                      </span>
                      <span className="mt-1 block text-gray-500">
                        <T>{classOffer.price}</T> <T>DT / month</T> · <T>Due today: 0 DT. This is a demo enrollment.</T>
                      </span>
                    </span>
                  </label>
                )}
              </>
            )}
            {role === "parent" && (
              <div>
                <PhoneField value={childPhone} onChange={setChildPhone} label="Your child's phone number (optional)" />
                <p className="mt-2 text-xs text-gray-500">
                  <T>Used to link your child&apos;s account so you can follow their classes.</T>
                </p>
              </div>
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
                          onChange={(e) =>
                            setTeachLevels((v) => (e.target.checked ? [...v, l.slug] : v.filter((x) => x !== l.slug)))
                          }
                        />
                        <T>{l.label}</T>
                      </label>
                    ))}
                  </div>
                </fieldset>
                <label className="block text-sm font-semibold text-gray-700">
                  <T>Years of teaching experience</T>
                  <input
                    type="number"
                    min={0}
                    max={50}
                    value={years}
                    onChange={(e) => setYears(e.target.value)}
                    className={fieldClass}
                  />
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
          <T>{error}</T>{" "}
          {error.includes("Sign in instead") && (
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
              setStep(step === 3 ? 1 : step - 1);
            }}
          >
            <T>Back</T>
          </button>
        )}
        <button className={`${primaryButton} flex-1`} type="submit" disabled={step === 2 && code.length < 6}>
          <T>{step === 1 ? "Send verification code" : step === 2 ? "Verify phone" : step === 3 ? "Create my account" : "Continue"}</T>
        </button>
      </div>
      <p className="mt-6 text-center text-sm text-gray-500">
        <T>Already have an account?</T>{" "}
        <Link href="/login" className="font-semibold text-brand underline underline-offset-4">
          <T>Sign in</T>
        </Link>
      </p>
    </form>
  );
}
