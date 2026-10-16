"use client";

import { useState } from "react";
import Link from "@/components/LocalizedLink";
import { T, useI18n } from "@/components/I18n";
import { panelClass, primaryButton, secondaryButton } from "@/components/SiteUi";
import { BookIcon, DownloadIcon, TrendIcon, VideoIcon } from "@/components/icons";
import { CountUp, Reveal } from "@/components/ui/Motion";
import { RequireRole } from "@/components/workspace/Guard";
import { statusLabel, statusTone } from "@/components/classroom/ResultsPanel";
import { kindLabels } from "@/components/workspace/TeacherMaterials";
import { displayName, formatPhone, signOut, type Account } from "@/lib/auth";
import { useClasses, useLiveSessions, type ClassInfo } from "@/lib/classes";
import { fileBadge, formatSize, openMaterial, useMaterials, type Material } from "@/lib/materials";
import { useMyAnswers } from "@/lib/questions";
import { labelFor, subjects } from "@/data/catalog";
import { cn } from "@/lib/cn";

export function StudentDashboard() {
  return (
    <RequireRole roles={["student", "parent"]}>
      {(account) => (account.role === "parent" ? <ParentView account={account} /> : <StudentView account={account} />)}
    </RequireRole>
  );
}

function Header({ account, title, intro }: { account: Account; title: string; intro: string }) {
  const { t } = useI18n();
  return (
    <div className="flex flex-wrap items-start justify-between gap-6">
      <div>
        <p className="text-sm font-semibold tracking-wide text-brand uppercase">
          <T>{account.role === "parent" ? "Parent space" : "Student space"}</T>
        </p>
        <h1 className="home-heading font-display mt-3 text-3xl font-extrabold text-gray-900 md:text-4xl">{t(title, { name: account.firstName })}</h1>
        <p className="mt-3 text-gray-500">
          <T>{intro}</T>
        </p>
      </div>
      <div className="rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm">
        <p className="font-semibold text-gray-800">
          <bdi dir="auto">{displayName(account)}</bdi>
        </p>
        {account.email && (
          <p className="mt-0.5 text-gray-500">
            <bdi dir="ltr">{account.email}</bdi>
          </p>
        )}
        {account.phone && (
          <p className="mt-0.5 text-gray-500">
            <bdi dir="ltr">{formatPhone(account.phone)}</bdi>
          </p>
        )}
        <button type="button" onClick={() => void signOut()} className="mt-1 min-h-9 text-xs text-gray-500 underline">
          <T>Sign out</T>
        </button>
      </div>
    </div>
  );
}

const teacherLabel = (c: ClassInfo) => c.teacherName;

function StudentView({ account }: { account: Account }) {
  const { t, locale } = useI18n();
  const ids = account.student?.enrollments ?? [];
  const { data: classes, loading: classesLoading } = useClasses(ids);
  const live = useLiveSessions(ids);
  const liveClass = classes.find((c) => live[c.id]);
  const materials = useMaterials(ids);
  const { answers: myAnswers } = useMyAnswers(account.id);
  const released = myAnswers.filter((a) => a.released);
  const right = released.filter((a) => a.status === "correct").length;
  const wrong = released.filter((a) => a.status === "incorrect").length;
  const [tab, setTab] = useState<"materials" | "results">("materials");
  const next = classes.find((c) => c.schedule) ?? classes[0];

  return (
    <div className="bg-gray-50">
      <div className="mx-auto max-w-6xl px-6 py-10 md:py-14">
        <Header account={account} title="Welcome, {name}." intro="Your live lessons, your teachers' materials and your progress." />

        {liveClass ? (
          <Reveal className="mt-8">
            <section className="flex flex-col justify-between gap-6 rounded-2xl bg-gray-800 p-6 text-white md:flex-row md:items-center md:p-8">
              <div className="flex items-center gap-4">
                <span className="animate-live flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-red-600">
                  <VideoIcon className="h-6 w-6" />
                </span>
                <div>
                  <p className="text-sm font-semibold text-red-300">
                    <T>Live now</T>
                  </p>
                  <h2 className="font-display mt-1 text-2xl font-bold">
                    <T>{labelFor(subjects, liveClass.subject)}</T>
                  </h2>
                  <p className="mt-1 text-sm text-gray-300">
                    <bdi dir="auto">{teacherLabel(liveClass)}</bdi> <T>has started the lesson.</T>
                  </p>
                </div>
              </div>
              <Link
                href={`/classroom?class=${liveClass.id}`}
                className="inline-flex min-h-12 items-center justify-center rounded-md bg-white px-6 font-semibold text-gray-900 transition-transform hover:scale-[1.03]"
              >
                <T>Join the live class</T>
              </Link>
            </section>
          </Reveal>
        ) : next ? (
          <section className="mt-8 flex flex-col justify-between gap-6 rounded-2xl border border-gray-200 bg-white p-6 md:flex-row md:items-center md:p-8">
            <div>
              <p className="text-sm font-medium text-brand">
                <T>{next.schedule ? "Next scheduled lesson" : "Your class"}</T>
              </p>
              <h2 className="font-display mt-2 text-2xl font-bold text-gray-900">
                <T>{labelFor(subjects, next.subject)}</T>
              </h2>
              {next.schedule ? (
                <p className="mt-2 text-sm text-gray-500">
                  <bdi dir="auto">{next.schedule}</bdi> · <T>Sfax time</T>
                </p>
              ) : (
                <p className="mt-2 text-sm text-gray-500">
                  <T>The classroom opens here as soon as your teacher goes live.</T>
                </p>
              )}
            </div>
            <Link href={`/classroom?class=${next.id}`} className={primaryButton}>
              <T>Open the classroom</T>
            </Link>
          </section>
        ) : classesLoading && ids.length ? (
          <div className="mt-8 h-32 animate-pulse rounded-2xl bg-gray-100" aria-busy="true" />
        ) : (
          <section className="mt-8 rounded-2xl border border-dashed border-gray-300 bg-white p-8 text-center">
            <h2 className="font-display text-xl font-bold text-gray-800">
              <T>You haven&apos;t joined a class yet.</T>
            </h2>
            <p className="mt-2 text-gray-500">
              <T>Open the class link your teacher sent you, or find a teacher to join their class.</T>
            </p>
            <Link href="/find-a-teacher" className={`${primaryButton} mt-6`}>
              <T>Find a Teacher</T>
            </Link>
          </section>
        )}

        <div className="mt-8 grid items-start gap-7 lg:grid-cols-[1fr_320px]">
          <div className="space-y-7">
            <section className={panelClass}>
              <div className="flex flex-wrap items-center justify-between gap-4">
                <h2 className="font-display text-xl font-bold text-gray-800">
                  <T>My classes</T>
                </h2>
                <Link href="/find-a-teacher" className="text-sm font-semibold text-blue-600 hover:underline">
                  <T>Explore teachers →</T>
                </Link>
              </div>
              <ul className="mt-5 space-y-3">
                {classes.map((c) => (
                  <ClassRow key={c.id} c={c} live={!!live[c.id]} />
                ))}
              </ul>
            </section>

            <section className={panelClass}>
              <div className="flex gap-2 border-b border-gray-200" role="group" aria-label={t("Class resources")}>
                {(
                  [
                    ["materials", "Materials from my teachers"],
                    ["results", "My answers & feedback"],
                  ] as const
                ).map(([k, label]) => (
                  <button
                    key={k}
                    type="button"
                    aria-pressed={tab === k}
                    onClick={() => setTab(k)}
                    className={cn(
                      "min-h-12 border-b-2 px-3 text-sm font-semibold transition-colors",
                      tab === k ? "border-brand text-brand" : "border-transparent text-gray-500 hover:text-gray-800",
                    )}
                  >
                    <T>{label}</T>
                  </button>
                ))}
              </div>
              <div key={tab} className="animate-rise pt-5">
                {tab === "materials" ? (
                  <MaterialList items={materials.items} loading={materials.loading} classes={classes} locale={locale} />
                ) : myAnswers.length ? (
                  <ul className="divide-y divide-gray-100">
                    {myAnswers.slice(0, 15).map((a, i) => (
                      <li key={i} className="py-4">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <p dir="auto" className="min-w-0 font-semibold break-words text-gray-800">
                            {a.prompt}
                          </p>
                          <span
                            className={cn(
                              "shrink-0 rounded px-2 py-1 text-xs font-semibold",
                              a.released ? statusTone[a.status] : "bg-gray-100 text-gray-600",
                            )}
                          >
                            <T>{a.released ? statusLabel[a.status] : "Waiting for your teacher"}</T>
                          </span>
                        </div>
                        <p dir="auto" className="mt-1 text-sm text-gray-600">
                          <T>My answer:</T> <span className="font-mono">{a.text}</span>
                        </p>
                        {a.feedback && (
                          <p dir="auto" className="mt-2 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-900">
                            <span className="font-semibold">
                              <T>Your teacher:</T>
                            </span>{" "}
                            {a.feedback}
                          </p>
                        )}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="rounded-lg bg-gray-50 p-5 text-sm leading-6 text-gray-500">
                    <T>Your answers from live lessons appear here after each session, with your teacher&apos;s feedback.</T>
                  </p>
                )}
              </div>
            </section>
          </div>

          <aside className="space-y-6">
            <section className={panelClass}>
              <h2 className="flex items-center gap-2 font-display text-lg font-bold text-gray-900">
                <TrendIcon className="h-5 w-5 text-brand" />
                <T>My progress</T>
              </h2>
              <dl className="mt-5 grid grid-cols-2 gap-3 text-center">
                <div className="rounded-lg bg-emerald-50 p-3">
                  <dd className="font-display text-2xl font-extrabold text-emerald-700">
                    <CountUp value={right} />
                  </dd>
                  <dt className="text-xs text-emerald-800">
                    <T>Right</T>
                  </dt>
                </div>
                <div className="rounded-lg bg-red-50 p-3">
                  <dd className="font-display text-2xl font-extrabold text-red-700">
                    <CountUp value={wrong} />
                  </dd>
                  <dt className="text-xs text-red-800">
                    <T>To review</T>
                  </dt>
                </div>
              </dl>
              <p className="mt-4 text-xs leading-5 text-gray-500">
                {right + wrong
                  ? t("{pct}% correct across {n} graded answers.", { pct: Math.round((right / (right + wrong)) * 100), n: right + wrong })
                  : t("Answer questions in a live lesson to see your progress.")}
              </p>
            </section>
            <section className={panelClass}>
              <h2 className="flex items-center gap-2 font-display text-lg font-bold text-gray-900">
                <BookIcon className="h-5 w-5 text-brand" />
                <T>Good to know</T>
              </h2>
              <ul className="mt-4 space-y-3 text-sm leading-6 text-gray-500">
                <li>
                  <T>Your answers are private. Classmates never see your name next to a mistake.</T>
                </li>
                <li>
                  <T>Written answers wait for your teacher. They are not counted as wrong.</T>
                </li>
              </ul>
            </section>
          </aside>
        </div>
      </div>
    </div>
  );
}

function ClassRow({ c, live }: { c: ClassInfo; live: boolean }) {
  return (
    <li className="flex flex-wrap items-center gap-4 rounded-xl border border-gray-200 p-4">
      <span className={`${c.color} flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white`}>
        {c.teacherName.replace(/^(Mr\.|Ms\.)\s*/, "").split(" ").map((w) => w[0]).join("").slice(0, 2)}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-semibold text-gray-800">
          <T>{labelFor(subjects, c.subject)}</T>
        </span>
        <span className="mt-1 block text-sm text-gray-500">
          <bdi dir="auto">{teacherLabel(c)}</bdi>
          {c.schedule && (
            <>
              {" · "}
              <bdi dir="auto">{c.schedule}</bdi>
            </>
          )}
        </span>
      </span>
      {live ? (
        <Link href={`/classroom?class=${c.id}`} className="inline-flex min-h-11 items-center gap-2 rounded-md bg-red-600 px-4 text-sm font-semibold text-white">
          <span className="h-2 w-2 animate-pulse rounded-full bg-white" />
          <T>Join live</T>
        </Link>
      ) : (
        <Link href={`/classroom?class=${c.id}`} className="text-sm font-semibold text-brand hover:underline">
          <T>Open the classroom</T>
        </Link>
      )}
    </li>
  );
}

function MaterialList({
  items,
  loading,
  classes,
  locale,
}: {
  items: Material[];
  loading: boolean;
  classes: ClassInfo[];
  locale: string;
}) {
  const { t } = useI18n();
  const [error, setError] = useState("");
  if (loading) return <div className="h-20 animate-pulse rounded-xl bg-gray-100" />;
  if (!items.length)
    return (
      <p className="rounded-lg bg-gray-50 p-5 text-sm leading-6 text-gray-500">
        <T>When your teachers upload notes, exercises or corrections, they appear here.</T>
      </p>
    );
  const open = async (m: Material, download: boolean) => {
    setError("");
    try {
      await openMaterial(m, download);
    } catch {
      setError(t("This file could not be opened. Try again in a moment."));
    }
  };
  return (
    <>
      {error && (
        <p role="alert" className="mb-3 text-sm text-red-700">
          {error}
        </p>
      )}
      <ul className="space-y-3">
        {items.map((m) => {
          const cls = classes.find((c) => c.id === m.classId);
          return (
            <li key={m.id} className="flex flex-wrap items-center gap-4 rounded-xl border border-gray-200 p-4">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-gray-800 text-xs font-bold text-white">
                {fileBadge(m.mime, m.fileName)}
              </span>
              <div className="min-w-0 flex-1">
                <p dir="auto" className="font-semibold break-words text-gray-800">
                  {m.title}
                </p>
                <p className="mt-0.5 text-xs text-gray-500">
                  {cls && (
                    <>
                      <T>{labelFor(subjects, cls.subject)}</T> ·{" "}
                    </>
                  )}
                  <T>{kindLabels[m.kind]}</T> · <span dir="ltr">{formatSize(m.size)}</span> ·{" "}
                  {new Date(m.uploadedAt).toLocaleDateString(locale === "ar" ? "ar-TN" : "fr-TN", { day: "numeric", month: "short" })}
                </p>
                {m.note && (
                  <p dir="auto" className="mt-1 text-sm text-gray-600">
                    {m.note}
                  </p>
                )}
              </div>
              <button type="button" onClick={() => void open(m, false)} className="min-h-11 rounded-md px-3 text-sm font-semibold text-brand hover:bg-emerald-50">
                <T>Open</T>
              </button>
              <button type="button" onClick={() => void open(m, true)} className={`${secondaryButton} min-h-11 px-3 py-0 text-sm`}>
                <DownloadIcon className="h-4 w-4" />
                <T>Download</T>
              </button>
            </li>
          );
        })}
      </ul>
    </>
  );
}

function ParentView({ account }: { account: Account }) {
  return (
    <div className="bg-gray-50">
      <div className="mx-auto max-w-6xl px-6 py-10 md:py-14">
        <Header account={account} title="A clear view of their learning." intro="Follow class schedules, subscriptions and shared progress." />
        <section className="mt-8 rounded-2xl border border-dashed border-gray-300 bg-white p-8 text-center">
          <h2 className="font-display text-xl font-bold text-gray-800">
            <T>No student account linked yet.</T>
          </h2>
          <p className="mt-2 text-gray-500">
            <T>Linking your account to your child&apos;s account will be available soon.</T>
          </p>
        </section>
      </div>
    </div>
  );
}
