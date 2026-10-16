"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "@/components/LocalizedLink";
import { T, useI18n } from "@/components/I18n";
import { fieldClass, panelClass, primaryButton, secondaryButton } from "@/components/SiteUi";
import { ChevronRightIcon, ClockIcon, DownloadIcon, MailIcon, TrendIcon } from "@/components/icons";
import { CountUp } from "@/components/ui/Motion";
import { RequireRole } from "@/components/workspace/Guard";
import { liveForStudent } from "@/components/workspace/StudentDashboard";
import { refreshAuth, type Account } from "@/lib/auth";
import { useAnnouncements } from "@/lib/announcements";
import { classTitle, useClasses, useLiveSessions } from "@/lib/classes";
import { formatSlots, groupLabel, nextSlot, useGroups } from "@/lib/groups";
import { fileBadge, formatSize, kindLabels, openMaterial, useMaterials, type Material } from "@/lib/materials";
import { useModules } from "@/lib/modules";
import { useClassProgress } from "@/lib/progress";
import { supabase } from "@/lib/supabase/client";
import { cn } from "@/lib/cn";

export function StudentClass() {
  const id = useSearchParams().get("id") ?? "";
  return <RequireRole roles={["student"]}>{(account) => <ClassPage account={account} id={id} />}</RequireRole>;
}

function ClassPage({ account, id }: { account: Account; id: string }) {
  const { t, locale } = useI18n();
  const enrolled = account.student?.enrollments.includes(id) ?? false;
  const { data: classes, loading } = useClasses(enrolled ? [id] : []);
  const { data: groups } = useGroups(enrolled ? [id] : []);
  const live = useLiveSessions(enrolled ? [id] : []);
  const myGroupId = account.student?.groups[id] ?? null;
  const group = groups.find((g) => g.id === myGroupId);
  const { data: p } = useClassProgress(account.id, enrolled ? id : undefined, myGroupId);
  const { data: modules } = useModules(enrolled ? id : undefined);
  const { items } = useMaterials(enrolled ? [id] : []);
  const { data: messages } = useAnnouncements(enrolled ? id : undefined);
  const c = classes[0];
  const liveNow = liveForStudent(account, live, id);
  const next = group ? nextSlot(group.slots) : null;
  const date = (ts: number, opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short" }) =>
    new Date(ts).toLocaleDateString(locale === "ar" ? "ar-TN" : "fr-TN", opts);
  const graded = p.correct + p.incorrect;

  if (!enrolled)
    return (
      <div className="bg-gray-50 px-6 py-16 text-center">
        <p className="font-semibold text-gray-700">
          <T>You are not in this class.</T>
        </p>
        <Link href="/dashboard" className={`${primaryButton} mt-6`}>
          <T>Open my dashboard</T>
        </Link>
      </div>
    );
  if (loading || !c)
    return (
      <div className="mx-auto max-w-6xl px-6 py-14" aria-busy="true">
        <div className="h-40 animate-pulse rounded-2xl bg-gray-100" />
      </div>
    );

  return (
    <div className="bg-gray-50">
      <div className="mx-auto max-w-6xl px-6 py-10 md:py-14">
        <Link href="/dashboard" className="inline-flex min-h-11 items-center gap-2 text-sm text-gray-500 hover:text-brand">
          <ChevronRightIcon className="h-4 w-4 rotate-180 rtl:rotate-0" />
          <T>My classes</T>
        </Link>
        <header className="mt-3 flex flex-wrap items-end justify-between gap-6">
          <div>
            <h1 className="home-heading font-display text-3xl font-extrabold text-gray-900 md:text-4xl">
              <bdi dir="auto">{classTitle(c, t)}</bdi>
            </h1>
            <p className="mt-2 text-gray-500">
              <bdi dir="auto">{c.teacherName}</bdi>
            </p>
          </div>
          {liveNow ? (
            <Link href={`/classroom?class=${encodeURIComponent(id)}`} className="inline-flex min-h-12 items-center gap-2 rounded-md bg-red-600 px-6 font-semibold text-white">
              <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-white" />
              <T>Join the live class</T>
            </Link>
          ) : (
            <div className="rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm">
              <p className="flex items-center gap-2 text-gray-500">
                <ClockIcon className="h-4 w-4" />
                <T>Next lesson</T>
              </p>
              <p className="mt-1 font-semibold text-gray-900">
                {next ? date(next.getTime(), { weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }) : c.schedule || t("Your teacher will announce it.")}
              </p>
            </div>
          )}
        </header>

        {groups.length > 0 && <GroupChoice account={account} classId={id} current={myGroupId} groups={groups.map((g) => ({ id: g.id, label: groupLabel(g, t), slots: g.name ? formatSlots(g.slots, t) : "" }))} />}

        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          <div className={panelClass}>
            <p className="text-sm text-gray-500">
              <T>Lessons attended this month</T>
            </p>
            <p className="font-display mt-2 text-3xl font-extrabold text-gray-900" dir="ltr">
              {p.monthAttended} <span className="text-lg text-gray-400">/ {p.monthTotal}</span>
            </p>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-gray-100">
              <div className="h-full bg-brand" style={{ width: `${p.monthTotal ? Math.round((p.monthAttended / p.monthTotal) * 100) : 0}%` }} />
            </div>
          </div>
          <div className={panelClass}>
            <p className="text-sm text-gray-500">
              <T>Correct answers in this class</T>
            </p>
            <p className="font-display mt-2 text-3xl font-extrabold text-gray-900">{graded ? <CountUp value={Math.round((p.correct / graded) * 100)} suffix="%" /> : "—"}</p>
            <p className="mt-1 text-xs text-gray-500">{t("{c} right · {w} to review", { c: p.correct, w: p.incorrect })}</p>
          </div>
          <div className={panelClass}>
            <p className="text-sm text-gray-500">
              <T>Lessons so far</T>
            </p>
            <p className="font-display mt-2 text-3xl font-extrabold text-gray-900">{p.lessons.length}</p>
            <p className="mt-1 text-xs text-gray-500">{t("{n} attended in total", { n: p.lessons.filter((l) => l.attended).length })}</p>
          </div>
        </div>

        <div className="mt-8 grid items-start gap-7 lg:grid-cols-[1fr_340px]">
          <div className="space-y-7">
            <section className={panelClass}>
              <h2 className="font-display text-xl font-bold text-gray-800">
                <T>Course content</T>
              </h2>
              {items.length ? (
                <div className="mt-4 space-y-6">
                  {modules.map((m) => {
                    const docs = items.filter((x) => x.moduleId === m.id);
                    return docs.length ? (
                      <div key={m.id}>
                        <h3 className="font-semibold text-gray-900">
                          <bdi dir="auto">{m.title}</bdi>
                        </h3>
                        <DocList items={docs} date={date} />
                      </div>
                    ) : null;
                  })}
                  {(() => {
                    const loose = items.filter((x) => !x.moduleId || !modules.some((m) => m.id === x.moduleId));
                    return loose.length ? (
                      <div>
                        {modules.length > 0 && (
                          <h3 className="font-semibold text-gray-900">
                            <T>Other documents</T>
                          </h3>
                        )}
                        <DocList items={loose} date={date} />
                      </div>
                    ) : null;
                  })()}
                </div>
              ) : (
                <p className="mt-3 rounded-lg bg-gray-50 p-5 text-sm leading-6 text-gray-500">
                  <T>When your teacher uploads notes, exercises or corrections, they appear here.</T>
                </p>
              )}
            </section>

            <section className={panelClass}>
              <h2 className="flex items-center gap-2 font-display text-xl font-bold text-gray-800">
                <TrendIcon className="h-5 w-5 text-brand" />
                <T>My progress, lesson by lesson</T>
              </h2>
              {p.lessons.length ? (
                <ul className="mt-4 divide-y divide-gray-100">
                  {p.lessons.map((l) => {
                    const total = l.correct + l.incorrect;
                    return (
                      <li key={l.sessionId} className="flex flex-wrap items-center gap-3 py-3 text-sm">
                        <span className="w-28 shrink-0 font-semibold text-gray-800">{date(l.startedAt, { weekday: "short", day: "numeric", month: "short" })}</span>
                        <span className={cn("rounded px-2 py-0.5 text-xs font-semibold", l.attended ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 text-gray-500")}>
                          <T>{l.attended ? "Present" : "Absent"}</T>
                        </span>
                        <span className="flex min-w-[140px] flex-1 items-center gap-2">
                          {total > 0 ? (
                            <>
                              <span className="h-2 flex-1 overflow-hidden rounded-full bg-red-100">
                                <span className="block h-full bg-emerald-500" style={{ width: `${Math.round((l.correct / total) * 100)}%` }} />
                              </span>
                              <span className="text-xs text-gray-600" dir="ltr">
                                ✓ {l.correct} · ✗ {l.incorrect}
                              </span>
                            </>
                          ) : (
                            <span className="text-xs text-gray-400">{l.attended ? t("No graded questions") : ""}</span>
                          )}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="mt-3 rounded-lg bg-gray-50 p-5 text-sm leading-6 text-gray-500">
                  <T>Your results appear here after your first live lesson.</T>
                </p>
              )}
            </section>

            {p.answers.some((a) => a.released) && (
              <section className={panelClass}>
                <h2 className="font-display text-xl font-bold text-gray-800">
                  <T>My answers</T>
                </h2>
                <ul className="mt-3 divide-y divide-gray-100">
                  {p.answers
                    .filter((a) => a.released)
                    .slice(0, 20)
                    .map((a, i) => (
                      <li key={i} className="py-3 text-sm">
                        <div className="flex items-start justify-between gap-3">
                          <p dir="auto" className="min-w-0 font-semibold break-words text-gray-800">
                            {a.prompt}
                          </p>
                          <span className={cn("shrink-0 rounded px-2 py-0.5 text-xs font-semibold", a.status === "correct" ? "bg-emerald-50 text-emerald-700" : a.status === "incorrect" ? "bg-red-50 text-red-700" : "bg-amber-50 text-amber-800")}>
                            <T>{a.status === "correct" ? "Right" : a.status === "incorrect" ? "To review" : "Checked by your teacher"}</T>
                          </span>
                        </div>
                        <p dir="auto" className="mt-1 text-gray-600">
                          <T>My answer:</T> <span className="font-mono">{a.text}</span>
                        </p>
                        {a.feedback && (
                          <p dir="auto" className="mt-2 rounded-lg bg-emerald-50 p-3 text-emerald-900">
                            <span className="font-semibold">
                              <T>Your teacher:</T>
                            </span>{" "}
                            {a.feedback}
                          </p>
                        )}
                      </li>
                    ))}
                </ul>
              </section>
            )}
          </div>

          <aside className="space-y-6">
            <section className={panelClass}>
              <h2 className="flex items-center gap-2 font-display text-lg font-bold text-gray-800">
                <MailIcon className="h-5 w-5 text-brand" />
                <T>Messages from your teacher</T>
              </h2>
              {messages.length ? (
                <ul className="mt-3 space-y-3">
                  {messages.map((m) => (
                    <li key={m.id} className={cn("rounded-lg p-3 text-sm", m.kind === "schedule" ? "bg-amber-50" : "bg-gray-50")}>
                      <p className="text-xs text-gray-500">{date(m.createdAt)}</p>
                      <p dir="auto" className="mt-1 font-semibold text-gray-900">
                        {m.subject}
                      </p>
                      {m.body && (
                        <p dir="auto" className="mt-1 whitespace-pre-wrap text-gray-700">
                          {m.body}
                        </p>
                      )}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-3 text-sm text-gray-500">
                  <T>No messages yet.</T>
                </p>
              )}
            </section>
          </aside>
        </div>
      </div>
    </div>
  );
}

function DocList({ items, date }: { items: Material[]; date: (ts: number) => string }) {
  const { t } = useI18n();
  const [error, setError] = useState("");
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
        <p role="alert" className="mt-2 text-sm text-red-700">
          {error}
        </p>
      )}
      <ul className="mt-2 space-y-2">
        {items.map((m) => (
          <li key={m.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-gray-200 p-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gray-800 text-[11px] font-bold text-white">{fileBadge(m.mime, m.fileName)}</span>
            <div className="min-w-0 flex-1">
              <p dir="auto" className="font-semibold break-words text-gray-800">
                {m.title}
              </p>
              <p className="text-xs text-gray-500">
                <T>{kindLabels[m.kind]}</T> · <span dir="ltr">{formatSize(m.size)}</span> · {date(m.uploadedAt)}
              </p>
              {m.note && (
                <p dir="auto" className="mt-1 text-sm text-gray-600">
                  {m.note}
                </p>
              )}
            </div>
            <button type="button" onClick={() => void open(m, false)} className="min-h-10 rounded-md px-3 text-sm font-semibold text-brand hover:bg-emerald-50">
              <T>Open</T>
            </button>
            <button type="button" onClick={() => void open(m, true)} className={`${secondaryButton} min-h-10 px-3 py-0 text-sm`}>
              <DownloadIcon className="h-4 w-4" />
              <T>Download</T>
            </button>
          </li>
        ))}
      </ul>
    </>
  );
}

/** Students pick the group (timetable) they attend; their teacher can also move them. */
function GroupChoice({ account, classId, current, groups }: { account: Account; classId: string; current: string | null; groups: { id: string; label: string; slots: string }[] }) {
  const { t } = useI18n();
  const [value, setValue] = useState(current ?? "");
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  return (
    <section className={cn("mt-6 rounded-xl border p-4", current ? "border-gray-200 bg-white" : "border-amber-300 bg-amber-50")}>
      <form
        className="flex flex-wrap items-end gap-3"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setSaved(false);
          const { error } = await supabase().from("enrollments").update({ group_id: value || null }).eq("class_id", classId).eq("student_id", account.id);
          if (!error) {
            await refreshAuth();
            setSaved(true);
          }
          setBusy(false);
        }}
      >
        <label className="min-w-[220px] flex-1 text-sm font-semibold text-gray-700">
          <T>{current ? "My group" : "Choose your group"}</T>
          <select value={value} onChange={(e) => setValue(e.target.value)} className={fieldClass}>
            <option value="">—</option>
            {groups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.label}
                {g.slots ? ` · ${g.slots}` : ""}
              </option>
            ))}
          </select>
        </label>
        <button type="submit" disabled={busy || value === (current ?? "")} className={`${secondaryButton} min-h-12`}>
          <T>{busy ? "Please wait…" : "Save"}</T>
        </button>
        {saved && <span className="pb-3 text-sm text-emerald-700">{t("Saved.")}</span>}
      </form>
    </section>
  );
}
