"use client";
import { T, Localized } from "@/components/I18n";

import Link from "@/components/LocalizedLink";
import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  fieldClass,
  primaryButton,
  secondaryButton,
} from "@/components/SiteUi";
import {
  labelFor,
  levels,
  placesLeft,
  subjects,
  teachers,
} from "@/data/catalog";
import {
  saveDemoAccount,
  useDemoAccount,
  type DemoRole,
} from "@/lib/demo-account";

export function DemoEnrollment() {
  const params = useSearchParams();
  const account = useDemoAccount();
  const requested = params.get("teacher");
  const [id, setId] = useState(
    teachers.find((t) => t.id === requested)?.id ?? teachers[0].id,
  );
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [role, setRole] = useState<DemoRole>("student");
  const [error, setError] = useState("");
  const heading = useRef<HTMLHeadingElement>(null);
  const nicknameInput = useRef<HTMLInputElement>(null);
  const firstRender = useRef(true);
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    heading.current?.focus();
  }, [step]);
  const t = teachers.find((t) => t.id === id)!;

  function next(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    if (!placesLeft(t)) return;
    if (step === 1 && !name.trim()) {
      setError("Enter a nickname to continue.");
      nicknameInput.current?.focus();
      return;
    }
    if (step < 2) {
      setStep(step + 1);
      return;
    }
    try {
      saveDemoAccount({
        name: name.trim() || "Learner",
        role,
        enrollments: Array.from(
          new Set([...(account?.enrollments ?? []), t.id]),
        ),
      });
      setStep(3);
    } catch {
      setError(
        "Your browser could not save this demo. Allow local storage or explore the dashboard without enrolling.",
      );
    }
  }
  return (
    <div>
      {step < 3 && (
        <Localized
          as="ol"
          aria-label="Enrollment steps"
          className="mb-8 flex gap-2 text-xs"
        >
          {["Choose a class", "Demo account", "Review offer"].map((s, i) => (
            <li
              key={s}
              aria-current={step === i ? "step" : undefined}
              className={`flex-1 border-t-2 pt-3 ${i <= step ? "border-brand font-semibold text-gray-800" : "border-gray-200 text-gray-400"}`}
            >
              <button
                type="button"
                disabled={i >= step}
                onClick={() => {
                  setError("");
                  setStep(i);
                }}
                className="min-h-11 text-start disabled:cursor-default"
              >
                <T>{i < step ? "✓" : i + 1}</T>. <T>{s}</T>
              </button>
            </li>
          ))}
        </Localized>
      )}
      {step === 3 ? (
        <div role="status">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-3xl text-brand">
            ✓
          </span>
          <h1
            ref={heading}
            tabIndex={-1}
            className="home-heading font-display mt-5 text-3xl font-extrabold text-gray-900 focus:outline-none"
          >
            <T>Your demo class is ready.</T>
          </h1>
          <p className="mt-4 leading-7 text-gray-500">
            <T>{labelFor(subjects, t.subject)}</T> <T>with </T>
            <T>{t.name}</T>{" "}
            <T>
              is now in your demo dashboard. No account was created on a server,
              and no money was charged.
            </T>
          </p>
          <Link href="/dashboard" className={`${primaryButton} mt-7 w-full`}>
            <T>Open my dashboard</T>
          </Link>
        </div>
      ) : (
        <form onSubmit={next}>
          <h1
            ref={heading}
            tabIndex={-1}
            className="home-heading font-display text-3xl font-extrabold text-gray-900 focus:outline-none"
          >
            <T>
              {
                [
                  "Find your classroom",
                  "Make the demo yours",
                  "Your class, at a glance",
                ][step]
              }
            </T>
          </h1>
          <p className="mt-3 leading-7 text-gray-500">
            <T>
              {
                [
                  "Choose an example offer to try the enrollment journey.",
                  "Use a nickname. No email or password needed.",
                  "Check what is included before adding the class to your demo dashboard.",
                ][step]
              }
            </T>
          </p>
          {step === 0 && (
            <div className="mt-7">
              <label className="text-sm font-semibold text-gray-700">
                <T>Teacher and subject</T>
                <select
                  value={id}
                  onChange={(e) => setId(e.target.value)}
                  className={fieldClass}
                >
                  {teachers.map((t) => (
                    <option key={t.id} value={t.id} disabled={!placesLeft(t)}>
                      <T>{t.name}</T> · <T>{labelFor(subjects, t.subject)}</T>
                      <T>{!placesLeft(t) ? " (full)" : ""}</T>
                    </option>
                  ))}
                </select>
              </label>
              <p className="mt-4 text-sm text-gray-500">
                <T>{t.levels.map((l) => labelFor(levels, l)).join(" · ")}</T>
              </p>
              <div className="mt-5 rounded-lg bg-gray-50 p-5">
                <p className="font-display text-2xl font-bold text-gray-800">
                  <T>{t.price}</T> <T>DT</T>{" "}
                  <span className="text-sm font-normal text-gray-500">
                    <T>/ month (example)</T>
                  </span>
                </p>
                <p className="mt-3 text-sm leading-6 text-gray-500">
                  <T>
                    {t.timetable.map((s) => `${s.day} ${s.time}`).join(" · ")}
                  </T>
                  <br />
                  <T>Sfax time · </T>
                  <T>{t.lessonsPerMonth}</T> <T>lessons × </T>
                  <T>{t.duration}</T> <T>minutes</T>
                </p>
              </div>
              {!placesLeft(t) && (
                <p role="alert" className="mt-4 text-sm text-amber-700">
                  <T>
                    This example class is full. Please choose another teacher.
                  </T>
                </p>
              )}
            </div>
          )}
          {step === 1 && (
            <div className="mt-7 space-y-5">
              <label className="block text-sm font-semibold text-gray-700">
                <T>Demo nickname</T>
                <Localized
                  as="input"
                  ref={nicknameInput}
                  className={fieldClass}
                  maxLength={40}
                  required
                  autoComplete="off"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    setError("");
                  }}
                  aria-invalid={error ? true : undefined}
                  aria-describedby={error ? "enrollment-error" : undefined}
                  placeholder="e.g. Amine"
                />
              </label>
              <fieldset>
                <legend className="text-sm font-semibold text-gray-700">
                  <T>I am exploring as a</T>
                </legend>
                <div className="mt-3 grid grid-cols-2 gap-4">
                  {(["student", "parent"] as const).map((r) => (
                    <label
                      key={r}
                      className={`flex min-h-14 cursor-pointer items-center gap-3 rounded-lg border px-4 text-sm text-gray-600 ${role === r ? "border-brand bg-blue-50" : "border-gray-200"}`}
                    >
                      <input
                        type="radio"
                        name="role"
                        className="h-5 w-5"
                        checked={role === r}
                        onChange={() => setRole(r)}
                      />
                      <span className="capitalize">
                        <T>{r}</T>
                      </span>
                    </label>
                  ))}
                </div>
              </fieldset>
            </div>
          )}
          {step === 2 && (
            <div className="mt-7 rounded-lg border border-gray-200 p-5">
              <h2 className="font-semibold text-gray-800">
                <T>{t.name}</T> · <T>{labelFor(subjects, t.subject)}</T>
              </h2>
              <p className="mt-3 text-sm leading-7 text-gray-500">
                <T>
                  {t.timetable.map((s) => `${s.day} ${s.time}`).join(" · ")}
                </T>
              </p>
              <ul className="mt-4 space-y-2 text-sm text-gray-500">
                {t.includes.map((i) => (
                  <li key={i}>
                    ✓ <T>{i}</T>
                  </li>
                ))}
              </ul>
              <p className="mt-5 border-t border-gray-100 pt-4 font-semibold text-gray-800">
                <T>Illustrative subscription: </T>
                <T>{t.price}</T> <T>DT / month</T>
              </p>
              <p className="mt-3 rounded bg-emerald-50 p-3 text-sm text-emerald-800">
                <T>Due today: 0 DT. This is a demo enrollment.</T>
              </p>
            </div>
          )}
          {error && (
            <p
              id="enrollment-error"
              role="alert"
              className="mt-4 text-sm text-red-700"
            >
              <T>{error}</T>
            </p>
          )}
          <div className="mt-7 flex gap-3">
            {step > 0 && (
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
            <button
              className={`${primaryButton} flex-1`}
              disabled={!placesLeft(t)}
              type="submit"
            >
              <T>{step === 2 ? "Add to demo dashboard" : "Continue"}</T>
            </button>
          </div>
          <p className="mt-5 text-xs leading-5 text-gray-500">
            <T>Demo only · Details stay in this browser.</T>
          </p>
        </form>
      )}
    </div>
  );
}
