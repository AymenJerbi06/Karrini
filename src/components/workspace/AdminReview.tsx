"use client";

import { useState } from "react";
import Link from "@/components/LocalizedLink";
import { Localized, T, useI18n } from "@/components/I18n";
import { fieldClass, panelClass, primaryButton, secondaryButton } from "@/components/SiteUi";
import { CheckCircleIcon, ClockIcon, UsersIcon } from "@/components/icons";
import { Toast } from "@/components/ui/Motion";
import { reviewApplication, useAdminApplications, type AdminApplication } from "@/lib/applications";
import { formatPhone, useAuth } from "@/lib/auth";
import { formatLabel, labelFor, levels, subjects } from "@/data/catalog";
import { cn } from "@/lib/cn";

const tabs = [
  ["pending", "Pending"],
  ["approved", "Approved"],
  ["rejected", "Rejected"],
] as const;

/** Admin-only page to review teacher applications. The database refuses anyone who is not an admin. */
export function AdminReview() {
  const { ready, account } = useAuth();
  const isAdmin = !!account?.isAdmin;
  const { data: apps, loading, reload } = useAdminApplications(isAdmin);
  const [tab, setTab] = useState<(typeof tabs)[number][0]>("pending");
  const [toast, setToast] = useState("");

  if (!ready) return <div className="min-h-[60vh] bg-gray-50" aria-busy="true" />;
  if (!isAdmin)
    return (
      <div className="bg-gray-50 px-6 py-16 md:py-24">
        <div className="mx-auto max-w-xl rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-sm md:p-10">
          <h1 className="home-heading font-display text-2xl font-extrabold text-gray-900">
            <T>This page is for Karrini admins.</T>
          </h1>
          <Link href={account ? "/" : "/login?next=/admin"} className={`${primaryButton} mt-8`}>
            <T>{account ? "Back to Karrini" : "Sign in"}</T>
          </Link>
        </div>
      </div>
    );

  const shown = apps.filter((a) => a.status === tab);
  const count = (s: string) => apps.filter((a) => a.status === s).length;

  return (
    <div className="min-h-[70vh] bg-gray-50">
      <div className="mx-auto max-w-5xl px-6 py-10 md:py-14">
        <p className="text-sm font-semibold tracking-wide text-brand uppercase">
          <T>Admin</T>
        </p>
        <h1 className="home-heading font-display mt-3 text-3xl font-extrabold text-gray-900 md:text-4xl">
          <T>Teacher applications</T>
        </h1>
        <p className="mt-3 leading-7 text-gray-500">
          <T>Approved teachers can open the teacher portal and their class becomes visible to students.</T>
        </p>

        <div className="mt-8 flex flex-wrap gap-2" role="group">
          {tabs.map(([k, label]) => (
            <button
              key={k}
              type="button"
              aria-pressed={tab === k}
              onClick={() => setTab(k)}
              className={cn(
                "inline-flex min-h-11 items-center gap-2 rounded-full border px-4 text-sm font-semibold transition-colors",
                tab === k ? "border-brand bg-emerald-50 text-brand" : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50",
              )}
            >
              <T>{label}</T>
              <span className="rounded-full bg-gray-100 px-2 text-xs text-gray-600" dir="ltr">
                {count(k)}
              </span>
            </button>
          ))}
        </div>

        <div className="mt-6 space-y-5">
          {loading ? (
            <div className="h-48 animate-pulse rounded-2xl bg-gray-100" aria-busy="true" />
          ) : shown.length === 0 ? (
            <div className={`${panelClass} py-12 text-center text-gray-500`}>
              <UsersIcon className="mx-auto h-8 w-8 text-gray-300" />
              <p className="mt-3">
                <T>No applications here.</T>
              </p>
            </div>
          ) : (
            shown.map((a) => (
              <ApplicationCard
                key={a.id}
                a={a}
                onDone={(msg) => {
                  setToast(msg);
                  reload();
                }}
              />
            ))
          )}
        </div>
      </div>
      <Toast message={toast} onDone={() => setToast("")} />
    </div>
  );
}

function ApplicationCard({ a, onDone }: { a: AdminApplication; onDone: (message: string) => void }) {
  const { t, locale } = useI18n();
  const [note, setNote] = useState(a.adminNote ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const date = (ts: number) =>
    new Date(ts).toLocaleString(locale === "ar" ? "ar-TN" : "fr-TN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

  async function decide(decision: "approved" | "rejected") {
    setBusy(true);
    setError("");
    try {
      await reviewApplication(a.id, decision, note);
      onDone(t(decision === "approved" ? "{name} is approved and now visible to students." : "{name} was not approved. They can see your note.", { name: `${a.firstName} ${a.lastName}` }));
    } catch {
      setError(t("The decision could not be saved. Try again."));
    } finally {
      setBusy(false);
    }
  }

  const rows: [string, string][] = [
    ["Subject", t(labelFor(subjects, a.subject))],
    ["School years", a.levels.map((l) => t(labelFor(levels, l))).join(" · ")],
    ["Sessions per week", String(a.sessionsPerWeek)],
    ["Lesson length", t("{n} min", { n: a.sessionMinutes })],
    ["Teaching methods", a.methods.map((m) => t(formatLabel(m))).join(" · ")],
    ["Preferred days and times", a.schedule || "—"],
    ["Monthly price per student", a.monthlyPrice != null ? `${a.monthlyPrice} ${t("DT")}` : "—"],
    ["Maximum students", String(a.capacity)],
    ["City or area", a.location || "—"],
    ["Years of teaching experience", String(a.years)],
  ];

  return (
    <article className={`${panelClass} animate-rise`}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="font-display text-xl font-bold text-gray-900">
            <bdi dir="auto">
              {a.firstName} {a.lastName}
            </bdi>
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            <bdi dir="ltr">{a.email}</bdi>
            {a.phone && (
              <>
                {" · "}
                <bdi dir="ltr">{formatPhone(a.phone)}</bdi>
              </>
            )}
          </p>
        </div>
        <span
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold",
            a.status === "pending" ? "bg-amber-50 text-amber-800" : a.status === "approved" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700",
          )}
        >
          {a.status === "pending" ? <ClockIcon className="h-4 w-4" /> : <CheckCircleIcon className="h-4 w-4" />}
          <T>{a.status === "pending" ? "Pending" : a.status === "approved" ? "Approved" : "Rejected"}</T>
        </span>
      </div>

      {a.headline && (
        <p dir="auto" className="mt-4 font-semibold text-gray-800">
          {a.headline}
        </p>
      )}
      {a.bio && (
        <p dir="auto" className="mt-2 text-sm leading-6 whitespace-pre-wrap text-gray-600">
          {a.bio}
        </p>
      )}

      <dl className="mt-5 grid gap-x-6 gap-y-4 sm:grid-cols-2">
        {rows.map(([k, v]) => (
          <div key={k}>
            <dt className="text-xs text-gray-500">
              <T>{k}</T>
            </dt>
            <dd dir="auto" className="mt-1 text-sm font-medium text-gray-800">
              {v}
            </dd>
          </div>
        ))}
      </dl>

      <p className="mt-5 flex flex-wrap gap-x-5 gap-y-1 text-sm text-emerald-700">
        <span>✓ {t("Terms of Use accepted")}</span>
        <span>✓ {t("{pct}% commission accepted", { pct: a.commissionPct })}</span>
        <span className="text-gray-400">{t("Submitted {date}", { date: date(a.submittedAt) })}</span>
      </p>

      <label className="mt-5 block text-sm font-semibold text-gray-700">
        <T>Note for the teacher (optional)</T>
        <Localized
          as="textarea"
          dir="auto"
          rows={2}
          value={note}
          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setNote(e.target.value)}
          placeholder="Explain what to change if you do not approve."
          className={fieldClass}
        />
      </label>
      {error && (
        <p role="alert" className="mt-3 text-sm text-red-700">
          {error}
        </p>
      )}
      <div className="mt-5 flex flex-wrap gap-3">
        {a.status !== "approved" && (
          <button type="button" disabled={busy} onClick={() => void decide("approved")} className={primaryButton}>
            <T>Approve</T>
          </button>
        )}
        {a.status !== "rejected" && (
          <button type="button" disabled={busy} onClick={() => void decide("rejected")} className={secondaryButton}>
            <T>{a.status === "approved" ? "Revoke approval" : "Reject"}</T>
          </button>
        )}
      </div>
    </article>
  );
}
