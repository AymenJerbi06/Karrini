"use client";

import { useState, type FormEvent } from "react";
import Link from "@/components/LocalizedLink";
import { Localized, T, useI18n } from "@/components/I18n";
import { fieldClass, panelClass, primaryButton, secondaryButton } from "@/components/SiteUi";
import { CheckCircleIcon, ClockIcon } from "@/components/icons";
import { COMMISSION_PCT, formatLabel, formats, labelFor, levels, subjects } from "@/data/catalog";
import { submitApplication, useMyApplication, type ApplicationInput, type MyApplication } from "@/lib/applications";
import { displayName, signOut, type Account } from "@/lib/auth";
import { cn } from "@/lib/cn";

/**
 * What a teacher sees until an admin approves them: the application form, the "under review" state,
 * or the admin's note with the form to resubmit.
 */
export function TeacherOnboarding({ account }: { account: Account }) {
  const { data: application, loading } = useMyApplication(account.id);
  const [editing, setEditing] = useState(false);

  return (
    <div className="min-h-[70vh] bg-gray-50">
      <div className="mx-auto max-w-3xl px-6 py-10 md:py-14">
        <p className="text-sm font-semibold tracking-wide text-brand uppercase">
          <T>Teacher application</T>
        </p>
        <h1 className="home-heading font-display mt-3 text-3xl font-extrabold text-gray-900 md:text-4xl">
          <T>
            {!application || editing
              ? "Tell us how you would like to teach."
              : application.status === "pending"
                ? "Your application is being reviewed."
                : "Your application needs a few changes."}
          </T>
        </h1>
        <p className="mt-3 leading-7 text-gray-500">
          <T>
            Every teacher on Karrini is reviewed before they can open the teacher portal and appear to students.
          </T>
        </p>

        {loading ? (
          <div className="mt-8 h-64 animate-pulse rounded-2xl bg-gray-100" aria-busy="true" />
        ) : !application || editing ? (
          <ApplicationForm account={account} existing={application} onSubmitted={() => setEditing(false)} />
        ) : application.status === "pending" ? (
          <Pending application={application} onEdit={() => setEditing(true)} />
        ) : (
          <Rejected application={application} onEdit={() => setEditing(true)} />
        )}

        <p className="mt-8 text-center text-sm text-gray-500">
          <bdi dir="auto">{displayName(account)}</bdi> ·{" "}
          <button type="button" onClick={() => void signOut()} className="min-h-11 underline">
            <T>Sign out</T>
          </button>
        </p>
      </div>
    </div>
  );
}

function Summary({ a }: { a: MyApplication }) {
  const { t } = useI18n();
  const rows: [string, string][] = [
    ["Subject", t(labelFor(subjects, a.subject))],
    ["School years", a.levels.map((l) => t(labelFor(levels, l))).join(" · ")],
    ["Sessions per week", String(a.sessionsPerWeek)],
    ["Lesson length", t("{n} min", { n: a.sessionMinutes })],
    ["Teaching methods", a.methods.map((m) => t(formatLabel(m))).join(" · ")],
    ["Monthly price per student", a.monthlyPrice != null ? `${a.monthlyPrice} ${t("DT")}` : "—"],
  ];
  return (
    <dl className="mt-5 grid gap-x-6 gap-y-4 sm:grid-cols-2">
      {rows.map(([k, v]) => (
        <div key={k}>
          <dt className="text-xs text-gray-500">
            <T>{k}</T>
          </dt>
          <dd dir="auto" className="mt-1 font-medium text-gray-800">
            {v}
          </dd>
        </div>
      ))}
    </dl>
  );
}

function Pending({ application, onEdit }: { application: MyApplication; onEdit: () => void }) {
  const { t, locale } = useI18n();
  return (
    <section className={`${panelClass} animate-rise mt-8`}>
      <div className="flex items-center gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-full bg-amber-50 text-amber-700">
          <ClockIcon className="h-6 w-6" />
        </span>
        <div>
          <p className="font-semibold text-gray-800">
            <T>Under review</T>
          </p>
          <p className="text-sm text-gray-500">
            {t("Submitted on {date}", {
              date: new Date(application.submittedAt).toLocaleDateString(locale === "ar" ? "ar-TN" : "fr-TN", {
                day: "numeric",
                month: "long",
              }),
            })}
          </p>
        </div>
      </div>
      <p className="mt-5 leading-7 text-gray-600">
        <T>We will email you as soon as an admin has reviewed your application. You can still update it while you wait.</T>
      </p>
      <Summary a={application} />
      <button type="button" onClick={onEdit} className={`${secondaryButton} mt-6`}>
        <T>Edit my application</T>
      </button>
    </section>
  );
}

function Rejected({ application, onEdit }: { application: MyApplication; onEdit: () => void }) {
  return (
    <section className={`${panelClass} animate-rise mt-8`}>
      <p className="font-semibold text-red-800">
        <T>Not approved yet</T>
      </p>
      {application.adminNote && (
        <div className="mt-4 rounded-lg bg-red-50 p-4 text-sm leading-6 text-red-900">
          <p className="font-semibold">
            <T>Message from the Karrini team:</T>
          </p>
          <p dir="auto" className="mt-1">
            {application.adminNote}
          </p>
        </div>
      )}
      <Summary a={application} />
      <button type="button" onClick={onEdit} className={`${primaryButton} mt-6`}>
        <T>Update and resubmit</T>
      </button>
    </section>
  );
}

function ApplicationForm({
  account,
  existing,
  onSubmitted,
}: {
  account: Account;
  existing: MyApplication | null;
  onSubmitted: () => void;
}) {
  const { t } = useI18n();
  const [v, setV] = useState<ApplicationInput>(
    existing ?? {
      subject: account.teacher?.subject ?? "economics",
      levels: account.teacher?.levels?.length ? account.teacher.levels : ["bac"],
      sessionsPerWeek: 2,
      sessionMinutes: 90,
      methods: ["online"],
      schedule: "",
      monthlyPrice: null,
      capacity: 30,
      location: "",
      headline: "",
      bio: "",
      years: account.teacher?.years ?? 0,
      acceptedTerms: false,
      acceptedCommission: false,
    },
  );
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const set = <K extends keyof ApplicationInput>(k: K, value: ApplicationInput[K]) => setV((x) => ({ ...x, [k]: value }));
  const toggle = (k: "levels" | "methods", value: string, on: boolean) =>
    set(k, on ? [...v[k], value] : v[k].filter((x) => x !== value));

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (!v.levels.length) return setError(t("Choose at least one school year you teach."));
    if (!v.methods.length) return setError(t("Choose at least one teaching method."));
    if (v.sessionsPerWeek < 1 || v.sessionsPerWeek > 30) return setError(t("Enter between 1 and 30 sessions per week."));
    if (!v.headline.trim()) return setError(t("Write a short headline for your class."));
    if (!v.acceptedTerms || !v.acceptedCommission) return setError(t("Please accept the Terms of Use and the commission to submit."));
    setBusy(true);
    try {
      await submitApplication(account.id, v, !!existing);
      onSubmitted();
    } catch {
      setError(t("Your application could not be sent. Check your connection and try again."));
    } finally {
      setBusy(false);
    }
  }

  const number = (k: "sessionsPerWeek" | "sessionMinutes" | "capacity" | "years", min: number, max: number) => (
    <input
      type="number"
      min={min}
      max={max}
      value={v[k]}
      onChange={(e) => set(k, Math.max(0, Math.round(Number(e.target.value) || 0)))}
      className={fieldClass}
    />
  );

  return (
    <form onSubmit={submit} noValidate className="animate-rise mt-8 space-y-6">
      <section className={panelClass}>
        <h2 className="font-display text-lg font-bold text-gray-800">
          <T>Your class</T>
        </h2>
        <div className="mt-5 grid gap-5 sm:grid-cols-2">
          <label className="block text-sm font-semibold text-gray-700">
            <T>Subject</T>
            <select value={v.subject} onChange={(e) => set("subject", e.target.value)} className={fieldClass}>
              {subjects.slice(1).map((s) => (
                <option key={s.slug} value={s.slug}>
                  {t(s.label)}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm font-semibold text-gray-700">
            <T>Years of teaching experience</T>
            {number("years", 0, 60)}
          </label>
        </div>
        <fieldset className="mt-5">
          <legend className="text-sm font-semibold text-gray-700">
            <T>School years you teach</T>
          </legend>
          <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {levels.slice(1).map((l) => (
              <label
                key={l.slug}
                className={cn(
                  "flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border px-3 text-sm",
                  v.levels.includes(l.slug) ? "border-brand bg-emerald-50 text-gray-800" : "border-gray-200 text-gray-600",
                )}
              >
                <input type="checkbox" className="h-4 w-4" checked={v.levels.includes(l.slug)} onChange={(e) => toggle("levels", l.slug, e.target.checked)} />
                <T>{l.label}</T>
              </label>
            ))}
          </div>
        </fieldset>
        <label className="mt-5 block text-sm font-semibold text-gray-700">
          <T>Short headline</T>
          <Localized
            as="input"
            dir="auto"
            maxLength={160}
            value={v.headline}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => set("headline", e.target.value)}
            placeholder="e.g. Bac economics: understand the concepts and master the exam"
            className={fieldClass}
          />
        </label>
        <label className="mt-5 block text-sm font-semibold text-gray-700">
          <T>About you and your teaching</T>
          <Localized
            as="textarea"
            dir="auto"
            rows={4}
            maxLength={2000}
            value={v.bio}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => set("bio", e.target.value)}
            placeholder="Your experience, your approach and what students can expect."
            className={fieldClass}
          />
        </label>
      </section>

      <section className={panelClass}>
        <h2 className="font-display text-lg font-bold text-gray-800">
          <T>How often and how you will teach</T>
        </h2>
        <div className="mt-5 grid gap-5 sm:grid-cols-3">
          <label className="block text-sm font-semibold text-gray-700">
            <T>Sessions per week</T>
            {number("sessionsPerWeek", 1, 30)}
          </label>
          <label className="block text-sm font-semibold text-gray-700">
            <T>Lesson length (minutes)</T>
            <select value={v.sessionMinutes} onChange={(e) => set("sessionMinutes", Number(e.target.value))} className={fieldClass}>
              {[45, 60, 90, 120, 150, 180].map((m) => (
                <option key={m} value={m}>
                  {t("{n} min", { n: m })}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm font-semibold text-gray-700">
            <T>Maximum students</T>
            {number("capacity", 1, 200)}
          </label>
        </div>
        <fieldset className="mt-5">
          <legend className="text-sm font-semibold text-gray-700">
            <T>Teaching methods</T>
          </legend>
          <div className="mt-2 grid gap-2 sm:grid-cols-3">
            {formats.slice(1).map((f) => (
              <label
                key={f.value}
                className={cn(
                  "flex min-h-12 cursor-pointer items-center gap-2 rounded-lg border px-3 text-sm",
                  v.methods.includes(f.value) ? "border-brand bg-emerald-50 text-gray-800" : "border-gray-200 text-gray-600",
                )}
              >
                <input type="checkbox" className="h-4 w-4" checked={v.methods.includes(f.value)} onChange={(e) => toggle("methods", f.value, e.target.checked)} />
                <T>{f.label}</T>
              </label>
            ))}
          </div>
        </fieldset>
        <label className="mt-5 block text-sm font-semibold text-gray-700">
          <T>Preferred days and times</T>
          <Localized
            as="input"
            dir="auto"
            maxLength={300}
            value={v.schedule}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => set("schedule", e.target.value)}
            placeholder="e.g. Tuesday and Thursday 18:00–19:30"
            className={fieldClass}
          />
        </label>
        <div className="mt-5 grid gap-5 sm:grid-cols-2">
          <label className="block text-sm font-semibold text-gray-700">
            <T>Monthly price per student (DT)</T>
            <input
              type="number"
              min={0}
              max={5000}
              value={v.monthlyPrice ?? ""}
              onChange={(e) => set("monthlyPrice", e.target.value === "" ? null : Math.max(0, Math.round(Number(e.target.value))))}
              className={fieldClass}
            />
          </label>
          <label className="block text-sm font-semibold text-gray-700">
            <T>City or area</T>
            <Localized
              as="input"
              dir="auto"
              maxLength={120}
              value={v.location}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => set("location", e.target.value)}
              placeholder="e.g. Sfax"
              className={fieldClass}
            />
          </label>
        </div>
        {v.monthlyPrice != null && v.monthlyPrice > 0 && (
          <p className="mt-4 rounded-lg bg-gray-50 p-4 text-sm text-gray-600">
            {t("For a student paying {price} DT, you receive {net} DT and Karrini keeps {fee} DT ({pct}%).", {
              price: v.monthlyPrice,
              net: (v.monthlyPrice * (100 - COMMISSION_PCT)) / 100,
              fee: (v.monthlyPrice * COMMISSION_PCT) / 100,
              pct: COMMISSION_PCT,
            })}
          </p>
        )}
      </section>

      <section className={panelClass}>
        <h2 className="font-display text-lg font-bold text-gray-800">
          <T>Terms</T>
        </h2>
        <label className="mt-4 flex items-start gap-3 text-sm leading-6 text-gray-700">
          <input type="checkbox" checked={v.acceptedTerms} onChange={(e) => set("acceptedTerms", e.target.checked)} className="mt-0.5 h-5 w-5 shrink-0" />
          <span>
            <T>I have read and accept the</T>{" "}
            <Link href="/terms-of-use" target="_blank" className="font-semibold text-brand underline">
              <T>Terms of Use</T>
            </Link>
            .
          </span>
        </label>
        <label className="mt-4 flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-950">
          <input
            type="checkbox"
            checked={v.acceptedCommission}
            onChange={(e) => set("acceptedCommission", e.target.checked)}
            className="mt-0.5 h-5 w-5 shrink-0"
          />
          <span>{t("I agree that Karrini keeps {pct}% of every payment a student makes for my classes.", { pct: COMMISSION_PCT })}</span>
        </label>
      </section>

      {error && (
        <p role="alert" className="text-sm text-red-700">
          {error}
        </p>
      )}
      <button type="submit" disabled={busy} className={`${primaryButton} w-full`}>
        <CheckCircleIcon className="h-5 w-5" />
        <T>{busy ? "Please wait…" : existing ? "Resubmit my application" : "Submit my application"}</T>
      </button>
    </form>
  );
}
