"use client";

import { useEffect, useState } from "react";
import Link from "@/components/LocalizedLink";
import { T, useI18n } from "@/components/I18n";
import { panelClass, primaryButton, secondaryButton } from "@/components/SiteUi";
import { BookIcon, DownloadIcon, TrendIcon, VideoIcon } from "@/components/icons";
import { CountUp, Reveal } from "@/components/ui/Motion";
import { RequireRole } from "@/components/workspace/Guard";
import { statusLabel, statusTone } from "@/components/classroom/ResultsPanel";
import { kindLabels } from "@/components/workspace/TeacherMaterials";
import { displayName, formatPhone, signOut, useAccounts, type Account } from "@/lib/auth";
import { fileBadge, formatSize, useMaterials, type Material } from "@/lib/materials";
import { useHistory } from "@/lib/questions";
import { readLive, type LiveEntry } from "@/lib/realtime";
import { initials, labelFor, subjects, teachers, type Teacher } from "@/data/catalog";
import { cn } from "@/lib/cn";

function useLiveClasses() {
  const [live, setLive] = useState<Record<string, LiveEntry>>({});
  useEffect(() => {
    const read = () => setLive(readLive());
    read();
    const id = setInterval(read, 4000);
    window.addEventListener("storage", read);
    window.addEventListener("qarrini-live-changed", read);
    return () => {
      clearInterval(id);
      window.removeEventListener("storage", read);
      window.removeEventListener("qarrini-live-changed", read);
    };
  }, []);
  return live;
}

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
        <p className="mt-0.5 text-gray-500">
          <bdi dir="ltr">{formatPhone(account.phone)}</bdi> {account.phoneVerified && <span className="text-emerald-600">✓</span>}
        </p>
        <button type="button" onClick={signOut} className="mt-1 min-h-9 text-xs text-gray-500 underline">
          <T>Sign out</T>
        </button>
      </div>
    </div>
  );
}

function StudentView({ account }: { account: Account }) {
  const { t, locale } = useI18n();
  const classes = teachers.filter((x) => account.student?.enrollments.includes(x.id));
  const live = useLiveClasses();
  const liveClass = classes.find((c) => live[c.id]);
  const materials = useMaterials(classes.map((c) => c.id));
  const history = useHistory();
  const myAnswers = history
    .flatMap((s) =>
      s.asked.flatMap((a) =>
        a.answers.filter((x) => x.studentId === account.id).map((x) => ({ ...x, prompt: a.question.prompt, classId: s.classId, at: x.at })),
      ),
    )
    .sort((a, b) => b.at - a.at);
  const right = myAnswers.filter((a) => a.status === "correct").length;
  const wrong = myAnswers.filter((a) => a.status === "incorrect").length;
  const [tab, setTab] = useState<"materials" | "results">("materials");
  const next = classes[0];

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
                    <T>{liveClass.name}</T> <T>has started the lesson.</T>
                  </p>
                </div>
              </div>
              <Link href={`/classroom?class=${liveClass.id}`} className="inline-flex min-h-12 items-center justify-center rounded-md bg-white px-6 font-semibold text-gray-900 transition-transform hover:scale-[1.03]">
                <T>Join the live class</T>
              </Link>
            </section>
          </Reveal>
        ) : next ? (
          <section className="mt-8 flex flex-col justify-between gap-6 rounded-2xl border border-gray-200 bg-white p-6 md:flex-row md:items-center md:p-8">
            <div>
              <p className="text-sm font-medium text-brand">
                <T>Next scheduled lesson</T>
              </p>
              <h2 className="font-display mt-2 text-2xl font-bold text-gray-900">
                <T>{labelFor(subjects, next.subject)}</T>
              </h2>
              <p className="mt-2 text-sm text-gray-500">
                <T>{next.timetable[0].day}</T> · <bdi dir="ltr">{next.timetable[0].time}</bdi> · <T>Sfax time</T>
              </p>
            </div>
            <Link href={`/classroom?class=${next.id}`} className={primaryButton}>
              <T>Open the classroom</T>
            </Link>
          </section>
        ) : (
          <section className="mt-8 rounded-2xl border border-dashed border-gray-300 bg-white p-8 text-center">
            <h2 className="font-display text-xl font-bold text-gray-800">
              <T>You haven&apos;t joined a class yet.</T>
            </h2>
            <p className="mt-2 text-gray-500">
              <T>Find a teacher and add their class to start attending live lessons.</T>
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
                    {myAnswers.slice(0, 12).map((a, i) => (
                      <li key={i} className="py-4">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <p dir="auto" className="min-w-0 font-semibold break-words text-gray-800">
                            {a.prompt}
                          </p>
                          <span className={cn("shrink-0 rounded px-2 py-1 text-xs font-semibold", statusTone[a.status])}>
                            <T>{statusLabel[a.status]}</T>
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

function ClassRow({ c, live }: { c: Teacher; live: boolean }) {
  return (
    <li className="flex flex-wrap items-center gap-4 rounded-xl border border-gray-200 p-4">
      <span className={`${c.color} flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white`}>
        <T>{initials(c.name)}</T>
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-semibold text-gray-800">
          <T>{labelFor(subjects, c.subject)}</T>
        </span>
        <span className="mt-1 block text-sm text-gray-500">
          <T>{c.name}</T> · <T>{c.timetable.map((s) => s.day).join(" · ")}</T>
        </span>
      </span>
      {live ? (
        <Link href={`/classroom?class=${c.id}`} className="inline-flex min-h-11 items-center gap-2 rounded-md bg-red-600 px-4 text-sm font-semibold text-white">
          <span className="h-2 w-2 animate-pulse rounded-full bg-white" />
          <T>Join live</T>
        </Link>
      ) : (
        <Link href={`/teachers/${c.id}`} className="text-sm font-semibold text-brand hover:underline">
          <T>View class offer</T>
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
  classes: Teacher[];
  locale: string;
}) {
  if (loading) return <div className="h-20 animate-pulse rounded-xl bg-gray-100" />;
  if (!items.length)
    return (
      <p className="rounded-lg bg-gray-50 p-5 text-sm leading-6 text-gray-500">
        <T>When your teachers upload notes, exercises or corrections, they appear here.</T>
      </p>
    );
  const open = (m: Material, download: boolean) => {
    const url = URL.createObjectURL(m.blob);
    const a = document.createElement("a");
    a.href = url;
    if (download) a.download = m.fileName;
    else a.target = "_blank";
    a.rel = "noopener";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  };
  return (
    <ul className="space-y-3">
      {items.map((m) => {
        const cls = classes.find((c) => c.id === m.classId);
        return (
          <li key={m.id} className="flex flex-wrap items-center gap-4 rounded-xl border border-gray-200 p-4">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-gray-800 text-xs font-bold text-white">{fileBadge(m.mime, m.fileName)}</span>
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
            <button type="button" onClick={() => open(m, false)} className="min-h-11 rounded-md px-3 text-sm font-semibold text-brand hover:bg-emerald-50">
              <T>Open</T>
            </button>
            <button type="button" onClick={() => open(m, true)} className={`${secondaryButton} min-h-11 px-3 py-0 text-sm`}>
              <DownloadIcon className="h-4 w-4" />
              <T>Download</T>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

function ParentView({ account }: { account: Account }) {
  const { t } = useI18n();
  const accounts = useAccounts();
  const child = accounts.find((a) => a.role === "student" && a.phone === account.parent?.childPhone);
  const classes = teachers.filter((x) => child?.student?.enrollments.includes(x.id));
  const history = useHistory();
  const answers = child ? history.flatMap((s) => s.asked.flatMap((a) => a.answers.filter((x) => x.studentId === child.id))) : [];
  const right = answers.filter((a) => a.status === "correct").length;
  const graded = answers.filter((a) => a.status !== "review").length;

  return (
    <div className="bg-gray-50">
      <div className="mx-auto max-w-6xl px-6 py-10 md:py-14">
        <Header account={account} title="A clear view of their learning." intro="Follow class schedules, subscriptions and shared progress." />
        {!child ? (
          <section className="mt-8 rounded-2xl border border-dashed border-gray-300 bg-white p-8 text-center">
            <h2 className="font-display text-xl font-bold text-gray-800">
              <T>No student account linked yet.</T>
            </h2>
            <p className="mt-2 text-gray-500">
              <T>When your child signs up with the phone number you gave, their classes and progress appear here.</T>
            </p>
          </section>
        ) : (
          <div className="mt-8 grid items-start gap-7 lg:grid-cols-[1fr_320px]">
            <section className={panelClass}>
              <h2 className="font-display text-xl font-bold text-gray-800">{t("{name}'s classes", { name: child.firstName })}</h2>
              <ul className="mt-5 space-y-3">
                {classes.map((c) => (
                  <li key={c.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gray-200 p-4">
                    <span>
                      <span className="block font-semibold text-gray-800">
                        <T>{labelFor(subjects, c.subject)}</T>
                      </span>
                      <span className="mt-1 block text-sm text-gray-500">
                        <T>{c.name}</T>
                      </span>
                    </span>
                    <span className="text-sm font-semibold text-gray-800">
                      <T>{c.price}</T> <T>DT / month</T>
                    </span>
                  </li>
                ))}
              </ul>
              <p className="mt-5 rounded-lg bg-gray-50 p-4 text-sm text-gray-500">
                <T>No real subscription or recurring payment was started. Payment methods and policies will be confirmed before launch.</T>
              </p>
            </section>
            <aside className={panelClass}>
              <h2 className="font-display text-lg font-bold text-gray-900">
                <T>Progress summary</T>
              </h2>
              <p className="font-display mt-4 text-4xl font-extrabold text-brand">
                <CountUp value={graded ? Math.round((right / graded) * 100) : 0} suffix="%" />
              </p>
              <p className="mt-1 text-sm text-gray-500">{t("correct across {n} graded answers", { n: graded })}</p>
            </aside>
          </div>
        )}
      </div>
    </div>
  );
}
