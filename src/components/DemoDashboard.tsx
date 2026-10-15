"use client";
import { T, Localized } from "@/components/I18n";

import Link from "@/components/LocalizedLink";
import { useState } from "react";
import {
  clearDemoAccount,
  saveDemoAccount,
  useDemoAccount,
  type DemoRole,
} from "@/lib/demo-account";
import { initials, labelFor, subjects, teachers } from "@/data/catalog";
import {
  panelClass,
  primaryButton,
  secondaryButton,
} from "@/components/SiteUi";

export function DemoDashboard() {
  const account = useDemoAccount();
  const [previewRole, setPreviewRole] = useState<DemoRole | null>(null);
  const role = previewRole ?? account?.role ?? "student";
  const enrolled = teachers.filter((t) => account?.enrollments.includes(t.id));
  const classes = enrolled.length ? enrolled : [teachers[0]];
  const [active, setActive] = useState("");
  const t = classes.find((t) => t.id === active) ?? classes[0];
  const [tab, setTab] = useState("Materials");
  const [completed, setCompleted] = useState<string[]>([]);
  const [storageError, setStorageError] = useState("");
  const subject = labelFor(subjects, t.subject);
  const math = t.subject === "math";
  function changeRole(next: DemoRole) {
    setPreviewRole(next);
    if (account)
      try {
        saveDemoAccount({ ...account, role: next });
      } catch {
        /* The view still works without persistence. */
      }
  }
  function reset() {
    try {
      clearDemoAccount();
      setPreviewRole(null);
      setActive("");
      setCompleted([]);
      setStorageError("");
    } catch {
      setStorageError(
        "Your browser could not clear its saved demo. You can remove it through your browser's site data settings.",
      );
    }
  }
  return (
    <div className="bg-gray-50">
      <div className="mx-auto max-w-6xl px-6 py-10 md:py-14">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div>
            <p className="text-sm font-semibold tracking-wide text-brand uppercase">
              <T>{`${role} workspace · Demo`}</T>
            </p>
            <h1 className="font-display mt-3 text-3xl font-extrabold text-gray-900 md:text-4xl">
              <T>
                {role === "teacher"
                  ? "Your teaching, all together."
                  : role === "parent"
                    ? "A clear view of their learning."
                    : "Welcome"}
              </T>
              {role === "student" && (
                <>
                  {account?.name ? (
                    <>
                      , <bdi dir="auto">{account.name}</bdi>
                    </>
                  ) : (
                    <T> to your classroom</T>
                  )}
                  .
                </>
              )}
            </h1>
            <p className="mt-3 text-gray-500">
              <T>
                {role === "teacher"
                  ? "Prepare, teach and follow up from one place."
                  : role === "parent"
                    ? "Follow class schedules, subscriptions and shared progress."
                    : "Your next lesson, your materials and your progress."}
              </T>
            </p>
          </div>
          <details className="rounded-lg border border-gray-200 bg-white px-4">
            <summary className="flex min-h-11 cursor-pointer items-center text-sm text-gray-500">
              <T>Preview settings</T>
            </summary>
            <label className="block pb-4 text-sm font-semibold text-gray-600">
              <T>Explore another view</T>
              <select
                className="mt-2 block w-full rounded-md border border-gray-300 bg-white px-4 py-3 font-normal text-gray-800"
                value={role}
                onChange={(e) => changeRole(e.target.value as DemoRole)}
              >
                <option value="student">
                  <T>Student</T>
                </option>
                <option value="parent">
                  <T>Parent</T>
                </option>
                <option value="teacher">
                  <T>Teacher</T>
                </option>
              </select>
            </label>
          </details>
        </div>

        <p className="mt-5 text-xs leading-6 text-gray-500">
          <T>Demo only · Details stay in this browser.</T>
        </p>
        <section className="mt-8 flex flex-col justify-between gap-6 rounded-xl border border-gray-200 bg-white p-6 md:flex-row md:items-center md:p-8">
          <div>
            <p className="text-sm font-medium text-brand">
              <T>Next scheduled lesson</T>
            </p>
            <h2 className="font-display mt-3 text-2xl font-bold text-gray-900">
              <T>{subject}</T>
            </h2>
            <p className="mt-3 text-sm text-gray-500">
              <T>{t.timetable[0].day}</T> ·{" "}
              <bdi dir="ltr">{t.timetable[0].time}</bdi> · <T>Sfax time</T>
            </p>
          </div>
          <Link
            href={role === "parent" ? "/teachers/" + t.id : "/classroom"}
            className={primaryButton}
          >
            <T>
              {role === "parent"
                ? "View class offer"
                : role === "teacher"
                  ? "Start classroom demo"
                  : "Join classroom demo"}
            </T>
          </Link>
        </section>
        <div className="mt-8 grid items-start gap-7 lg:grid-cols-[1fr_320px]">
          <div className="space-y-7">
            <section className={panelClass}>
              <div className="flex flex-wrap items-center justify-between gap-4">
                <h2 className="font-display text-xl font-bold text-gray-800">
                  <T>
                    {role === "teacher" ? "Your example classes" : "My classes"}
                  </T>
                </h2>
                <Link
                  href="/find-a-teacher"
                  className="text-sm font-semibold text-blue-600 hover:underline"
                >
                  <T>Explore teachers →</T>
                </Link>
              </div>
              <div className="mt-5 space-y-3">
                {classes.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => setActive(c.id)}
                    type="button"
                    aria-pressed={c.id === t.id}
                    className={`flex w-full items-center gap-4 rounded-lg border p-4 text-start ${c.id === t.id ? "border-brand bg-emerald-50/50" : "border-gray-200 hover:bg-gray-50"}`}
                  >
                    <span
                      className={`${c.color} flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white`}
                    >
                      <T>{initials(c.name)}</T>
                    </span>
                    <span className="flex-1">
                      <span className="block font-semibold text-gray-800">
                        <T>{labelFor(subjects, c.subject)}</T>
                      </span>
                      <span className="mt-1 block text-sm text-gray-500">
                        <T>{c.name}</T>
                      </span>
                    </span>
                    <span className="text-xs font-semibold text-emerald-700">
                      <T>{enrolled.length ? "Demo enrollment" : "Example"}</T>
                    </span>
                  </button>
                ))}
              </div>
              <Link
                href={"/teachers/" + t.id}
                className="mt-5 inline-flex min-h-11 items-center text-sm text-brand underline underline-offset-4"
              >
                <T>View class offer</T>
              </Link>
            </section>
            {role === "parent" ? (
              <section className={panelClass}>
                <h2 className="font-display text-xl font-bold text-gray-800">
                  <T>Subscriptions &amp; payment history</T>
                </h2>
                <p className="mt-4 leading-7 text-gray-500">
                  <T>The example offer for </T>
                  <T>{subject.toLowerCase()}</T> <T>is </T>
                  <T>{t.price}</T> <T>DT per month, including </T>
                  <T>{t.lessonsPerMonth}</T> <T>lessons of</T>{" "}
                  <T>{t.duration}</T> <T>minutes.</T>
                </p>
                <div className="mt-5 rounded-lg bg-gray-50 p-5">
                  <p className="font-semibold text-gray-700">
                    <T>No transactions</T>
                  </p>
                  <p className="mt-2 text-sm text-gray-500">
                    <T>
                      No real subscription or recurring payment was started.
                      Payment methods and policies will be confirmed before
                      launch.
                    </T>
                  </p>
                </div>
              </section>
            ) : (
              <section className={panelClass}>
                <h2 className="font-display text-xl font-bold text-gray-800">
                  <T>{subject}</T> <T>· After class</T>
                </h2>
                <Localized
                  as="div"
                  className="mt-5 flex gap-2 border-b border-gray-200"
                  role="group"
                  aria-label="Class resources"
                >
                  {["Materials", "Homework", "Corrections"].map((label) => (
                    <button
                      key={label}
                      id={`tab-${label}`}
                      aria-controls="resource-panel"
                      aria-pressed={tab === label}
                      type="button"
                      onClick={() => setTab(label)}
                      className={`border-b-2 px-3 py-3 text-sm font-semibold ${tab === label ? "border-brand text-brand" : "border-transparent text-gray-500 hover:text-gray-800"}`}
                    >
                      <T>{label}</T>
                    </button>
                  ))}
                </Localized>
                <div
                  id="resource-panel"
                  role="region"
                  aria-labelledby={`tab-${tab}`}
                  className="pt-5"
                >
                  {tab === "Materials" && (
                    <details className="rounded-lg border border-gray-200 p-4">
                      <summary className="font-semibold text-gray-700">
                        <T>
                          {math
                            ? "Lesson notes · Quadratic equations"
                            : `Lesson notes · ${subject} revision`}
                        </T>
                      </summary>
                      <div className="mt-4 space-y-3 leading-7 text-gray-500">
                        <p>
                          <T>
                            {math
                              ? "To solve x² − 5x + 6 = 0, find two numbers whose product is 6 and sum is −5: −2 and −3."
                              : "Begin by reviewing the chapter's key ideas. Try an exercise without your notes, then compare your reasoning with the teacher's explanation."}
                          </T>
                        </p>
                        <p>
                          <T>
                            {math
                              ? "Factorise: (x − 2)(x − 3) = 0. One factor must be zero, so x = 2 or x = 3. Substitute both roots into the original equation to check."
                              : "Keep a short list of questions to ask during your next lesson. These are sample learning notes for the prototype."}
                          </T>
                        </p>
                      </div>
                    </details>
                  )}
                  {tab === "Homework" && (
                    <div>
                      <p className="font-semibold text-gray-700">
                        <T>
                          {math
                            ? "Practice · Solve x² − 7x + 12 = 0"
                            : "Practice · Review your latest chapter"}
                        </T>
                      </p>
                      <p className="mt-3 leading-7 text-gray-500">
                        <T>
                          {math
                            ? "Show your factorisation and check each root by substitution. Bring your working to the next class."
                            : "Write a short explanation of the main idea, then note one question you would like your teacher to cover."}
                        </T>
                      </p>
                      <button
                        type="button"
                        aria-pressed={completed.includes(t.id)}
                        onClick={() =>
                          setCompleted((c) =>
                            c.includes(t.id)
                              ? c.filter((id) => id !== t.id)
                              : [...c, t.id],
                          )
                        }
                        className={`${secondaryButton} mt-5`}
                      >
                        <T>
                          {completed.includes(t.id)
                            ? "✓ Practice marked done · Undo"
                            : "Mark practice as done"}
                        </T>
                      </button>
                      <p className="mt-2 text-xs text-gray-400">
                        <T>Personal checklist for this visit.</T>
                      </p>
                    </div>
                  )}
                  {tab === "Corrections" && (
                    <div>
                      <p className="text-xs font-semibold tracking-wide text-brand uppercase">
                        <T>Learn from mistakes · Example</T>
                      </p>
                      <h3 className="font-display mt-3 text-lg font-bold text-gray-800">
                        <T>
                          {math
                            ? "Watch the signs when finding roots"
                            : "Explain how you reached your answer"}
                        </T>
                      </h3>
                      <p className="mt-3 leading-7 text-gray-500">
                        <T>
                          {math
                            ? "x − 2 = 0 gives x = 2. The number inside the factor has the opposite sign from the root. A quick substitution helps catch this common error."
                            : "An answer tells your teacher what you think. Your reasoning helps them understand where you need guidance. Use the written-answer option in the classroom demo to try this."}
                        </T>
                      </p>
                      <Link
                        href="/classroom"
                        className="mt-4 inline-block font-semibold text-blue-600 hover:underline"
                      >
                        <T>Practise in the classroom demo →</T>
                      </Link>
                    </div>
                  )}
                </div>
              </section>
            )}
          </div>
          <aside className="space-y-6">
            <details className={panelClass}>
              <summary className="flex min-h-11 cursor-pointer items-center font-display text-lg font-bold text-gray-900">
                <T>Class announcements</T>
              </summary>
              <p className="mt-4 text-xs font-semibold text-brand uppercase">
                <T>Sample announcement</T>
              </p>
              <p className="mt-2 leading-7 text-gray-500">
                <T>
                  Bring your questions to the next lesson. We will begin by
                  reviewing the most common mistakes from the last exercise.
                </T>
              </p>
            </details>
            <details className={panelClass}>
              <summary className="flex min-h-11 cursor-pointer items-center font-display text-lg font-bold text-gray-900">
                <T>
                  {role === "teacher"
                    ? "Class participation"
                    : "Progress summary"}
                </T>
              </summary>
              <p className="mt-3 text-xs text-gray-400">
                <T>Illustrative classroom results</T>
              </p>
              <dl className="mt-5 space-y-4">
                {[
                  ["Submitted", "32 / 40"],
                  ["Correct", "21"],
                  ["Incorrect", "8"],
                  ["Awaiting review", "3"],
                ].map(([k, v]) => (
                  <div key={k} className="flex justify-between gap-3 text-sm">
                    <dt className="text-gray-500">
                      <T>{k}</T>
                    </dt>
                    <dd className="font-semibold text-gray-800">
                      <T>{v}</T>
                    </dd>
                  </div>
                ))}
              </dl>
              <p className="mt-5 text-xs leading-5 text-gray-500">
                <T>
                  Correct-answer rate: 72% of 29 graded submissions. Pending
                  work is excluded.
                </T>
              </p>
            </details>
          </aside>
        </div>
        <div className="mt-10 flex flex-wrap items-center justify-between gap-4 border-t border-gray-200 pt-6">
          <p className="text-xs text-gray-500">
            <T>Demo enrollment details stay in this browser.</T>
          </p>
          <button
            type="button"
            onClick={reset}
            className="min-h-11 px-2 text-sm text-gray-500 underline hover:text-gray-800"
          >
            <T>Reset my saved demo</T>
          </button>
        </div>
        {storageError && (
          <p role="alert" className="mt-3 text-sm text-red-700">
            <T>{storageError}</T>
          </p>
        )}
      </div>
    </div>
  );
}
