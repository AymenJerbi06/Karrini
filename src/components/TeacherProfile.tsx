"use client";

import { useSearchParams } from "next/navigation";
import Link from "@/components/LocalizedLink";
import { T, useI18n } from "@/components/I18n";
import { CheckIcon, ChevronRightIcon } from "@/components/icons";
import { Portrait } from "@/components/mockups/HomeVisuals";
import { primaryButton } from "@/components/SiteUi";
import { formatLabel, labelFor, levels, subjects } from "@/data/catalog";
import { classTitle, fetchClass } from "@/lib/classes";
import { formatSlots, groupLabel, useGroups } from "@/lib/groups";
import { useRemote } from "@/lib/remote";

/** Public page of an approved teacher's class (id from ?id=…). */
export function TeacherProfile() {
  const id = useSearchParams().get("id") ?? "";
  const { t } = useI18n();
  const { data: c, loading } = useRemote(id ? `class:${id}` : null, () => fetchClass(id), null);
  const { data: groups } = useGroups(id ? [id] : []);

  const back = (
    <Link href="/find-a-teacher" className="inline-flex min-h-11 items-center gap-2 text-sm text-gray-500 hover:text-brand">
      <ChevronRightIcon className="h-4 w-4 rotate-180 rtl:rotate-0" />
      <T>All teachers</T>
    </Link>
  );

  if (id && loading)
    return (
      <div className="mx-auto max-w-6xl px-6 py-10 md:px-8 md:py-14" aria-busy="true">
        <div className="h-28 w-full animate-pulse rounded-xl bg-gray-100" />
      </div>
    );

  if (!c || !c.published)
    return (
      <div className="mx-auto max-w-3xl px-6 py-16 text-center md:py-24">
        <h1 className="home-heading font-display text-2xl font-extrabold text-gray-900">
          <T>This teacher is not available.</T>
        </h1>
        <p className="mt-3 text-gray-500">
          <T>The class may not be published yet. Browse the teachers who are available now.</T>
        </p>
        <div className="mt-6">{back}</div>
      </div>
    );

  return (
    <div className="mx-auto max-w-6xl px-6 py-10 md:px-8 md:py-14">
      {back}
      <header className="mt-5 flex flex-col gap-6 border-b border-gray-200 pb-9 sm:flex-row sm:items-center">
        <div className="h-28 w-28 shrink-0 overflow-hidden rounded-xl">
          <Portrait variant={c.portrait} />
        </div>
        <div>
          <p className="text-sm font-medium text-brand">
            {c.name ? <bdi dir="auto">{classTitle(c, t)}</bdi> : <T>{labelFor(subjects, c.subject)}</T>}
            {c.location && (
              <>
                {" · "}
                <bdi dir="auto">{c.location}</bdi>
              </>
            )}
          </p>
          <h1 className="home-heading font-display mt-2 text-3xl font-extrabold text-gray-900 md:text-4xl">
            <bdi dir="auto">{c.teacherName}</bdi>
          </h1>
          {c.years > 0 && <p className="mt-3 text-sm text-gray-500">{t("{n} years teaching", { n: c.years })}</p>}
        </div>
      </header>
      <div className="mt-9 grid items-start gap-12 lg:grid-cols-[1fr_340px]">
        <div className="order-2 min-w-0 space-y-10 lg:order-1">
          <section>
            {c.headline && (
              <h2 dir="auto" className="font-display text-2xl leading-9 font-bold text-gray-900">
                {c.headline}
              </h2>
            )}
            <dl className="mt-6 grid gap-x-8 gap-y-5 sm:grid-cols-2">
              {[
                ["School years", c.levels.map((l) => t(labelFor(levels, l))).join(" · ")],
                ["Class format", c.methods.map((m) => t(formatLabel(m))).join(" · ")],
              ].map(([label, value]) => (
                <div key={label}>
                  <dt className="text-sm text-gray-500">
                    <T>{label}</T>
                  </dt>
                  <dd className="mt-2 font-medium text-gray-800">{value || "—"}</dd>
                </div>
              ))}
            </dl>
          </section>
          {groups.length > 0 ? (
            <section className="border-t border-gray-200 pt-9">
              <h2 className="font-display text-xl font-bold text-gray-900">
                <T>Groups and timetable</T>
              </h2>
              <p className="mt-2 text-sm text-gray-500">
                <T>All times are local to Sfax, Tunisia.</T>
              </p>
              <ul className="mt-5 space-y-2">
                {groups.map((g) => (
                  <li key={g.id} className="rounded-lg bg-gray-50 p-4 text-gray-700">
                    <bdi dir="auto" className="font-semibold">
                      {groupLabel(g, t)}
                    </bdi>
                    {g.name && g.slots.length > 0 && <span className="mt-1 block text-sm">{formatSlots(g.slots, t)}</span>}
                  </li>
                ))}
              </ul>
            </section>
          ) : (c.schedule || c.sessionsPerWeek) && (
            <section className="border-t border-gray-200 pt-9">
              <h2 className="font-display text-xl font-bold text-gray-900">
                <T>Weekly timetable</T>
              </h2>
              <p className="mt-2 text-sm text-gray-500">
                <T>All times are local to Sfax, Tunisia.</T>
              </p>
              <div className="mt-5 space-y-2 rounded-lg bg-gray-50 p-5 text-gray-700">
                {c.sessionsPerWeek && c.sessionMinutes && (
                  <p className="font-semibold">{t("{n} sessions a week · {m} min", { n: c.sessionsPerWeek, m: c.sessionMinutes })}</p>
                )}
                {c.schedule && <p dir="auto">{c.schedule}</p>}
              </div>
            </section>
          )}
          {c.bio && (
            <section className="border-y border-gray-200 py-6">
              <h2 className="font-display text-xl font-bold text-gray-900">
                <T>About the teacher</T>
              </h2>
              <p dir="auto" className="mt-4 leading-8 whitespace-pre-wrap text-gray-500">
                {c.bio}
              </p>
            </section>
          )}
        </div>
        <aside className="order-1 rounded-xl border border-gray-200 bg-white p-6 shadow-sm lg:sticky lg:top-6 lg:order-2 lg:p-7">
          <h2 className="text-sm font-medium text-gray-500">
            <T>Monthly class offer</T>
          </h2>
          {c.price != null ? (
            <p className="font-display mt-3 text-4xl font-extrabold text-gray-900">
              <span dir="ltr">{c.price}</span> <T>DT</T>
              <span className="text-base font-normal text-gray-500">
                {" "}
                <T>/ month</T>
              </span>
            </p>
          ) : (
            <p className="mt-3 text-gray-600">
              <T>Ask the teacher for the price.</T>
            </p>
          )}
          <ul className="my-7 space-y-4">
            {c.methods.map((m) => (
              <li key={m} className="flex gap-3 text-sm leading-6 text-gray-600">
                <CheckIcon className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
                <T>{formatLabel(m)}</T>
              </li>
            ))}
          </ul>
          <Link href={`/join?class=${encodeURIComponent(c.id)}`} className={`${primaryButton} w-full`}>
            <T>Join this class</T>
          </Link>
          <p className="mt-4 text-center text-xs leading-6 text-gray-500">
            <T>No payment is taken on Karrini yet.</T>
          </p>
        </aside>
      </div>
    </div>
  );
}
