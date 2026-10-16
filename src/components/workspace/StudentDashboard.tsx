"use client";

import Link from "@/components/LocalizedLink";
import { T, useI18n } from "@/components/I18n";
import { panelClass, primaryButton } from "@/components/SiteUi";
import { ChevronRightIcon, UsersIcon, VideoIcon } from "@/components/icons";
import { Reveal } from "@/components/ui/Motion";
import { RequireRole } from "@/components/workspace/Guard";
import { displayName, type Account } from "@/lib/auth";
import { classTitle, useClasses, useLiveSessions, type ClassInfo, type LiveSession } from "@/lib/classes";
import { formatSlots, groupLabel, useGroups, type Group } from "@/lib/groups";
import { useClassProgress } from "@/lib/progress";

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
      <Link href="/account" className="flex min-h-12 items-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm hover:border-gray-300">
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-800 text-xs font-bold text-white">
          {(account.firstName[0] ?? "") + (account.lastName[0] ?? "")}
        </span>
        <span>
          <bdi dir="auto" className="block font-semibold text-gray-800">
            {displayName(account)}
          </bdi>
          <span className="text-xs text-gray-500">
            <T>Account settings</T>
          </span>
        </span>
      </Link>
    </div>
  );
}

/** The session running for this student's group, if any. */
export function liveForStudent(account: Account, live: Record<string, LiveSession>, classId: string) {
  const s = live[classId];
  const mine = account.student?.groups[classId] ?? null;
  return s && (s.groupId === null || s.groupId === mine) ? s : undefined;
}

function StudentView({ account }: { account: Account }) {
  const ids = account.student?.enrollments ?? [];
  const { data: classes, loading } = useClasses(ids);
  const { data: groups } = useGroups(ids);
  const live = useLiveSessions(ids);
  const liveClass = classes.find((c) => liveForStudent(account, live, c.id));
  const { t } = useI18n();

  return (
    <div className="bg-gray-50">
      <div className="mx-auto max-w-6xl px-6 py-10 md:py-14">
        <Header account={account} title="Welcome, {name}." intro="Your classes, your attendance and your progress in each one." />

        {liveClass && (
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
                    <bdi dir="auto">{classTitle(liveClass, t)}</bdi>
                  </h2>
                  <p className="mt-1 text-sm text-gray-300">
                    <bdi dir="auto">{liveClass.teacherName}</bdi> <T>has started the lesson.</T>
                  </p>
                </div>
              </div>
              <Link
                href={`/classroom?class=${liveClass.id}`}
                className="inline-flex min-h-12 items-center justify-center rounded-md bg-white px-6 font-semibold text-gray-900 transition-transform hover:scale-[1.03]"
              >
                <T>Join the class</T>
              </Link>
            </section>
          </Reveal>
        )}

        <div className="mt-10 flex flex-wrap items-center justify-between gap-4">
          <h2 className="font-display text-xl font-bold text-gray-800">
            <T>My classes</T>
          </h2>
          <Link href="/find-a-teacher" className="text-sm font-semibold text-blue-600 hover:underline">
            <T>Explore teachers →</T>
          </Link>
        </div>

        {loading && ids.length ? (
          <div className="mt-5 h-40 animate-pulse rounded-2xl bg-gray-100" aria-busy="true" />
        ) : classes.length ? (
          <div className="mt-5 grid gap-5 md:grid-cols-2">
            {classes.map((c, i) => (
              <Reveal key={c.id} delay={i * 60}>
                <ClassCard account={account} c={c} group={groups.find((g) => g.id === account.student?.groups[c.id])} live={!!liveForStudent(account, live, c.id)} />
              </Reveal>
            ))}
          </div>
        ) : (
          <section className="mt-5 rounded-2xl border border-dashed border-gray-300 bg-white p-8 text-center">
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
      </div>
    </div>
  );
}

function ClassCard({ account, c, group, live }: { account: Account; c: ClassInfo; group: Group | undefined; live: boolean }) {
  const { t } = useI18n();
  const { data: p } = useClassProgress(account.id, c.id, group?.id ?? null);
  const graded = p.correct + p.incorrect;
  const href = `/dashboard/class?id=${encodeURIComponent(c.id)}`;
  return (
    <article className={`${panelClass} flex h-full flex-col`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-display text-xl font-bold text-gray-900">
            <Link href={href} className="hover:text-brand">
              <bdi dir="auto">{classTitle(c, t)}</bdi>
            </Link>
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            <bdi dir="auto">{c.teacherName}</bdi>
          </p>
          <p className="mt-1 flex items-center gap-1.5 text-xs text-gray-500">
            <UsersIcon className="h-3.5 w-3.5" />
            <bdi dir="auto">{group ? `${groupLabel(group, t)}${group.name ? ` · ${formatSlots(group.slots, t)}` : ""}` : c.schedule || t("Whole class")}</bdi>
          </p>
        </div>
        {live && (
          <span className="animate-live shrink-0 rounded-md bg-red-600 px-2 py-0.5 text-xs font-bold text-white">
            <T>LIVE</T>
          </span>
        )}
      </div>
      <dl className="mt-5 grid flex-1 grid-cols-2 gap-3">
        <div className="rounded-lg bg-gray-50 p-3">
          <dt className="text-xs text-gray-500">
            <T>Attended this month</T>
          </dt>
          <dd className="font-display mt-1 text-2xl font-extrabold text-gray-900">
            <span dir="ltr">
              {p.monthAttended}/{p.monthTotal}
            </span>
          </dd>
        </div>
        <div className="rounded-lg bg-gray-50 p-3">
          <dt className="text-xs text-gray-500">
            <T>Correct answers</T>
          </dt>
          <dd className="font-display mt-1 text-2xl font-extrabold text-gray-900">{graded ? `${Math.round((p.correct / graded) * 100)}%` : "—"}</dd>
        </div>
      </dl>
      <div className="mt-5 flex flex-wrap gap-2">
        <Link href={href} className={`${primaryButton} min-h-11 flex-1 py-2 text-sm`}>
          <T>Open the class page</T>
          <ChevronRightIcon className="h-4 w-4 rtl:rotate-180" />
        </Link>
        {live && (
          <Link href={`/classroom?class=${c.id}`} className="inline-flex min-h-11 items-center gap-2 rounded-md bg-red-600 px-4 text-sm font-semibold text-white">
            <span className="h-2 w-2 animate-pulse rounded-full bg-white" />
            <T>Join live</T>
          </Link>
        )}
      </div>
    </article>
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
