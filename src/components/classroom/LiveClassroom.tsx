"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "@/components/LocalizedLink";
import { T, useI18n } from "@/components/I18n";
import { fieldClass, primaryButton, secondaryButton } from "@/components/SiteUi";
import { ChatBubbleIcon, HandIcon, TrendIcon, VideoIcon } from "@/components/icons";
import { Reveal } from "@/components/ui/Motion";
import { TeacherOnboarding } from "@/components/workspace/TeacherOnboarding";
import { TeacherRoom, restoreSession } from "@/components/classroom/TeacherRoom";
import { StudentRoom } from "@/components/classroom/StudentRoom";
import { enterFullscreen } from "@/components/classroom/CallFrame";
import { LiveClassMockup } from "@/components/mockups/LiveClassMockup";
import { useAuth, type Account } from "@/lib/auth";
import { classTitle, useClasses, useLiveSessions } from "@/lib/classes";
import { formatSlots, groupLabel, useGroups } from "@/lib/groups";
import { summarize, useQuestionBank, type SessionRecord } from "@/lib/questions";
import { cn } from "@/lib/cn";

export function LiveClassroom() {
  const { ready, account } = useAuth();
  const params = useSearchParams();

  if (!ready)
    return (
      <div className="mx-auto max-w-6xl px-6 py-16" aria-busy="true">
        <div className="aspect-video animate-pulse rounded-2xl bg-gray-100" />
      </div>
    );

  if (!account) return <Landing />;

  if (account.role === "teacher") {
    if (account.teacher?.status !== "verified") return <TeacherOnboarding account={account} />;
    return <TeacherLobby account={account} classParam={params.get("class")} groupParam={params.get("group")} />;
  }

  if (account.role === "parent")
    return (
      <Message
        title="Parents follow progress from the dashboard."
        body="To keep the classroom a safe space for students, parents see schedules, subscriptions and progress summaries rather than the live answer workspace."
        href="/dashboard"
        cta="Open my dashboard"
      />
    );

  return <StudentEntry account={account} classParam={params.get("class")} />;
}

/** Choose the class and group, then start. The call itself is full screen. */
function TeacherLobby({ account, classParam, groupParam }: { account: Account; classParam: string | null; groupParam: string | null }) {
  const { t } = useI18n();
  const ids = account.teacher?.classIds ?? [];
  const { data: classes } = useClasses(ids);
  const { data: groups } = useGroups(ids);
  const [classId, setClassId] = useState(classParam && ids.includes(classParam) ? classParam : (ids[0] ?? ""));
  const [groupId, setGroupId] = useState<string | null>(groupParam);
  const [running, setRunning] = useState<{ classId: string; groupId: string | null } | null>(() => {
    // Resume a class that was live before a refresh.
    for (const id of ids) {
      const s = restoreSession(id);
      if (s) return { classId: id, groupId: s.groupId ?? null };
    }
    return null;
  });
  const [ended, setEnded] = useState<SessionRecord | null>(null);
  const bank = useQuestionBank(classId || undefined);

  const cls = classes.find((c) => c.id === classId);
  const classGroups = groups.filter((g) => g.classId === classId);
  const validGroup = groupId && classGroups.some((g) => g.id === groupId) ? groupId : (classGroups[0]?.id ?? null);

  if (!ids.length)
    return (
      <Message
        title="Your class is being set up."
        body="Refresh this page in a moment. If it keeps happening, sign out and sign in again."
        href="/teach"
        cta="Go to my teacher workspace"
      />
    );

  if (running) {
    const runningClass = classes.find((c) => c.id === running.classId);
    const g = groups.find((x) => x.id === running.groupId);
    const title = [runningClass ? classTitle(runningClass, t) : "", g ? groupLabel(g, t) : ""].filter(Boolean).join(" · ");
    return (
      <TeacherRoom
        key={running.classId}
        account={account}
        classId={running.classId}
        groupId={running.groupId}
        title={title}
        onEnded={(record) => {
          setRunning(null);
          setEnded(record);
        }}
      />
    );
  }

  return (
    <div className="min-h-[70vh] bg-gray-50 px-6 py-10 md:py-14">
      <div className="mx-auto max-w-xl">
        {ended && <SessionSummary record={ended} />}
        <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm md:p-8">
          <p className="text-sm font-semibold tracking-wide text-brand uppercase">
            <T>Live class</T>
          </p>
          <h1 className="home-heading font-display mt-3 text-3xl font-extrabold text-gray-900">
            <T>Ready to teach?</T>
          </h1>
          <p className="mt-3 leading-7 text-gray-500">
            <T>When you start, the students of this group get an email and can join. Before that, nobody can enter.</T>
          </p>
          {classes.length > 1 && (
            <label className="mt-6 block text-sm font-semibold text-gray-700">
              <T>Class</T>
              <select value={classId} onChange={(e) => setClassId(e.target.value)} className={fieldClass}>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {classTitle(c, t)}
                  </option>
                ))}
              </select>
            </label>
          )}
          {classGroups.length > 0 && (
            <fieldset className="mt-6">
              <legend className="text-sm font-semibold text-gray-700">
                <T>Group</T>
              </legend>
              <div className="mt-2 space-y-2">
                {classGroups.map((g) => (
                  <label
                    key={g.id}
                    className={cn(
                      "flex min-h-12 cursor-pointer items-center gap-3 rounded-lg border px-4 py-2 text-sm",
                      validGroup === g.id ? "border-brand bg-emerald-50 text-gray-900" : "border-gray-200 text-gray-600",
                    )}
                  >
                    <input type="radio" name="group" checked={validGroup === g.id} onChange={() => setGroupId(g.id)} className="h-4 w-4" />
                    <span className="min-w-0">
                      <span className="block font-semibold">
                        <bdi dir="auto">{groupLabel(g, t)}</bdi>
                      </span>
                      {g.name && g.slots.length > 0 && <span className="block text-xs text-gray-500">{formatSlots(g.slots, t)}</span>}
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>
          )}
          <p className="mt-6 text-sm text-gray-500">
            {t("{n} prepared questions ready", { n: bank.length })} ·{" "}
            <Link href={`/teach/class?id=${encodeURIComponent(classId)}&tab=questions`} className="font-semibold text-brand hover:underline">
              <T>Edit</T>
            </Link>
          </p>
          <button
            type="button"
            disabled={!cls}
            onClick={() => {
              enterFullscreen();
              setEnded(null);
              setRunning({ classId, groupId: validGroup });
            }}
            className={`${primaryButton} mt-6 w-full`}
          >
            <span className="h-2.5 w-2.5 rounded-full bg-red-400" aria-hidden />
            <T>Start the class</T>
          </button>
        </section>
      </div>
    </div>
  );
}

function SessionSummary({ record }: { record: SessionRecord }) {
  const { t } = useI18n();
  const totals = record.asked.reduce(
    (acc, a) => {
      const x = summarize(a, record.connected);
      return { correct: acc.correct + x.correct, graded: acc.graded + x.graded };
    },
    { correct: 0, graded: 0 },
  );
  return (
    <section className="animate-rise mb-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-6">
      <h2 className="font-display text-xl font-bold text-emerald-900">
        <T>Class ended and saved</T>
      </h2>
      <p className="mt-2 text-emerald-900">
        {t("{n} questions · {students} students · {pct}% correct", {
          n: record.asked.length,
          students: record.connected,
          pct: totals.graded ? Math.round((totals.correct / totals.graded) * 100) : 0,
        })}
      </p>
      <Link href={`/teach/class?id=${encodeURIComponent(record.classId)}&tab=results`} className={`${secondaryButton} mt-4`}>
        <T>See full results</T>
      </Link>
    </section>
  );
}

function StudentEntry({ account, classParam }: { account: Account; classParam: string | null }) {
  const { t } = useI18n();
  const ids = account.student?.enrollments ?? [];
  const { data: enrolled, loading } = useClasses(ids);
  const { data: groups } = useGroups(ids);
  const live = useLiveSessions(ids);
  if (loading && ids.length)
    return (
      <div className="mx-auto max-w-3xl px-6 py-16" aria-busy="true">
        <div className="h-64 animate-pulse rounded-2xl bg-gray-100" />
      </div>
    );
  if (!enrolled.length)
    return (
      <Message
        title="Join a class to attend live lessons."
        body="Open the class link your teacher sent you, or choose a teacher and add their class. Their live lessons then open here."
        href="/find-a-teacher"
        cta="Find a Teacher"
      />
    );

  // Prefer the requested class, then one that is live for the student's group.
  const myGroup = (classId: string) => account.student?.groups[classId] ?? null;
  const liveFor = (classId: string) => {
    const s = live[classId];
    return s && (s.groupId === null || s.groupId === myGroup(classId)) ? s : undefined;
  };
  const chosen = enrolled.find((x) => x.id === classParam) ?? enrolled.find((x) => liveFor(x.id)) ?? enrolled[0];
  const group = groups.find((g) => g.id === myGroup(chosen.id));
  return (
    <div className="min-h-[70vh] bg-gray-50">
      <StudentRoom
        key={chosen.id}
        account={account}
        classId={chosen.id}
        classTitle={classTitle(chosen, t)}
        teacherLabel={chosen.teacherName}
        live={liveFor(chosen.id)}
        nextLesson={group ? formatSlots(group.slots, t) : chosen.schedule}
      />
    </div>
  );
}

function Message({ title, body, href, cta }: { title: string; body: string; href: string; cta: string }) {
  return (
    <div className="bg-gray-50 px-6 py-16 md:py-24">
      <div className="animate-rise mx-auto max-w-xl rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-sm md:p-10">
        <h1 className="home-heading font-display text-2xl font-extrabold text-gray-900 md:text-3xl">
          <T>{title}</T>
        </h1>
        <p className="mt-4 leading-7 text-gray-500">
          <T>{body}</T>
        </p>
        <Link href={href} className={`${primaryButton} mt-8`}>
          <T>{cta}</T>
        </Link>
      </div>
    </div>
  );
}

function Landing() {
  return (
    <>
      <section className="bg-white px-6 pt-12 pb-14 md:pt-16">
        <div className="mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-[1.1fr_1fr]">
          <div>
            <p className="text-sm font-medium text-brand">
              <T>The Karrini classroom</T>
            </p>
            <h1 className="home-heading font-display mt-4 text-3xl leading-tight font-extrabold tracking-tight text-gray-900 md:text-[44px]">
              <T>One question. Every student heard.</T>
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-8 text-gray-500">
              <T>Live video, questions prepared before class or written on the spot, and results that show exactly who needs help.</T>
            </p>
            <div className="mt-8 grid gap-3 sm:grid-cols-2">
              <Link href="/login?next=/classroom" className={primaryButton}>
                <T>Sign in</T>
              </Link>
              <Link href="/register" className={secondaryButton}>
                <T>Create an account</T>
              </Link>
            </div>
            <p className="mt-4 text-sm text-gray-500">
              <T>Teachers open the classroom from their workspace. Students join with the link their teacher shares.</T>
            </p>
          </div>
          <Reveal className="p-2">
            <LiveClassMockup />
          </Reveal>
        </div>
      </section>
      <section className="bg-gray-50 px-6 py-16">
        <div className="mx-auto grid max-w-6xl gap-6 md:grid-cols-4">
          {[
            { Icon: VideoIcon, title: "Teach on video", body: "Camera, microphone and screen sharing, built into the lesson." },
            { Icon: ChatBubbleIcon, title: "Ask anytime", body: "Send a prepared question in one click, or write a new one live." },
            { Icon: TrendIcon, title: "See results live", body: "Right, wrong, percentages, and the names and answers of students who made a mistake." },
            { Icon: HandIcon, title: "Every voice counts", body: "Private answers and raised hands give quieter students a way in." },
          ].map(({ Icon, title, body }, i) => (
            <Reveal key={title} delay={i * 90} className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
              <Icon className="h-7 w-7 text-brand" />
              <h2 className="font-display mt-4 text-lg font-bold text-gray-900">
                <T>{title}</T>
              </h2>
              <p className="mt-2 text-sm leading-6 text-gray-500">
                <T>{body}</T>
              </p>
            </Reveal>
          ))}
        </div>
      </section>
    </>
  );
}
