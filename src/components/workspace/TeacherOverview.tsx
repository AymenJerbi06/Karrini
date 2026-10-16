"use client";

import Link from "@/components/LocalizedLink";
import { T, useI18n } from "@/components/I18n";
import { CountUp, Reveal } from "@/components/ui/Motion";
import { ChatBubbleIcon, ClockIcon, TrendIcon, UploadIcon, UsersIcon } from "@/components/icons";
import { TeacherShell } from "@/components/workspace/TeacherShell";
import { primaryButton, secondaryButton } from "@/components/SiteUi";
import { displayName, formatPhone } from "@/lib/auth";
import { useRoster } from "@/lib/classes";
import { InviteCard } from "@/components/workspace/InviteCard";
import { useMaterials } from "@/lib/materials";
import { summarize, useClassHistory, useQuestionBank } from "@/lib/questions";

export function TeacherOverview() {
  return (
    <TeacherShell
      title="Your teaching, all together."
      intro="Prepare before class, teach live, then follow up with the students who need it."
    >
      {({ cls }) => <Overview classId={cls.id} timetable={cls.timetable} capacity={cls.capacity} baseline={0} />}
    </TeacherShell>
  );
}

function Overview({
  classId,
  timetable,
  capacity,
  baseline,
}: {
  classId: string;
  timetable: { day: string; time: string }[];
  capacity: number;
  baseline: number;
}) {
  const { t } = useI18n();
  const { data: roster } = useRoster(classId);
  const materials = useMaterials([classId]);
  const bank = useQuestionBank(classId);
  const { sessions: history } = useClassHistory(classId);
  const last = history[0];
  const lastStats = last?.asked.length
    ? last.asked.reduce(
        (acc, a) => {
          const s = summarize(a, last.connected);
          return { correct: acc.correct + s.correct, graded: acc.graded + s.graded };
        },
        { correct: 0, graded: 0 },
      )
    : null;

  const cards = [
    { label: "Students enrolled", value: baseline + roster.length, Icon: UsersIcon, href: "#roster" },
    { label: "Materials shared", value: materials.items.length, Icon: UploadIcon, href: "/teach/materials" },
    { label: "Prepared questions", value: bank.length, Icon: ChatBubbleIcon, href: "/teach/questions" },
    {
      label: "Last session correct rate",
      value: lastStats?.graded ? Math.round((lastStats.correct / lastStats.graded) * 100) : 0,
      suffix: "%",
      Icon: TrendIcon,
      href: "/teach/results",
    },
  ];

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {cards.map(({ label, value, suffix, Icon, href }, i) => (
          <Reveal key={label} delay={i * 70}>
            <Link
              href={href}
              className="group block rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
            >
              <Icon className="h-6 w-6 text-brand transition-transform group-hover:scale-110" />
              <p className="font-display mt-4 text-3xl font-extrabold text-gray-900">
                <CountUp value={value} suffix={suffix} />
              </p>
              <p className="mt-1 text-sm text-gray-500">
                <T>{label}</T>
              </p>
            </Link>
          </Reveal>
        ))}
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-[1fr_340px]">
        <Reveal className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="font-display text-xl font-bold text-gray-800">
            <T>Before your next lesson</T>
          </h2>
          <ol className="mt-5 space-y-4">
            {[
              {
                done: materials.items.length > 0,
                title: "Share the lesson materials",
                body: "Upload notes, exercise sheets or a PDF. Enrolled students see them in their dashboard.",
                href: "/teach/materials",
                cta: "Upload materials",
              },
              {
                done: bank.some((q) => !q.id.includes("-starter-")),
                title: "Prepare your questions",
                body: "Write the questions you'll send during the lesson. You can still add new ones live.",
                href: "/teach/questions",
                cta: "Prepare questions",
              },
              {
                done: history.length > 0,
                title: "Teach live and watch the results",
                body: "Start the video lesson, publish a question and see who understood, by name.",
                href: "/classroom",
                cta: "Start live class",
              },
            ].map((step, i) => (
              <li key={step.title} className="flex gap-4">
                <span
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold ${step.done ? "bg-brand text-white" : "bg-gray-100 text-gray-500"}`}
                >
                  {step.done ? "✓" : i + 1}
                </span>
                <div className="flex-1">
                  <p className="font-semibold text-gray-800">
                    <T>{step.title}</T>
                  </p>
                  <p className="mt-1 text-sm leading-6 text-gray-500">
                    <T>{step.body}</T>
                  </p>
                  <Link href={step.href} className="mt-2 inline-flex min-h-11 items-center text-sm font-semibold text-brand hover:underline">
                    <T>{step.cta}</T> →
                  </Link>
                </div>
              </li>
            ))}
          </ol>
        </Reveal>

        <Reveal delay={100} className="space-y-6">
          <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="flex items-center gap-2 font-display text-lg font-bold text-gray-800">
              <ClockIcon className="h-5 w-5 text-brand" />
              <T>Timetable</T>
            </h2>
            {timetable.length ? (
              <ul className="mt-4 space-y-3 text-sm">
                {timetable.map((slot) => (
                  <li key={slot.day + slot.time} className="flex justify-between gap-3">
                    <span className="text-gray-700">
                      <T>{slot.day}</T>
                    </span>
                    <bdi dir="ltr" className="font-semibold text-gray-900">
                      {slot.time}
                    </bdi>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-4 text-sm text-gray-500">
                <T>Your timetable will appear once your class offer is verified.</T>
              </p>
            )}
            <p className="mt-4 text-xs text-gray-400">{t("Capacity: {n} students", { n: capacity })}</p>
          </section>
          {last && lastStats && (
            <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
              <h2 className="font-display text-lg font-bold text-gray-800">
                <T>Last live session</T>
              </h2>
              <p className="mt-2 text-sm text-gray-500">
                {t("{n} questions · {students} students", { n: last.asked.length, students: last.connected })}
              </p>
              <Link href="/teach/results" className={`${secondaryButton} mt-4 w-full`}>
                <T>See who needs help</T>
              </Link>
            </section>
          )}
        </Reveal>
      </div>

      <InviteCard classId={classId} />

      <Reveal as="section" className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div id="roster" className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-xl font-bold text-gray-800">
            <T>Students with an account in your class</T>
          </h2>
          <span className="text-sm text-gray-500">{t("{n} students joined", { n: roster.length })}</span>
        </div>
        {roster.length ? (
          <ul className="mt-5 divide-y divide-gray-100">
            {roster.map((s) => (
              <li key={s.id} className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm">
                <span className="font-semibold text-gray-800">
                  <bdi dir="auto">{displayName(s)}</bdi>
                </span>
                <bdi dir="ltr" className="text-gray-500">
                  {formatPhone(s.phone)}
                </bdi>
              </li>
            ))}
          </ul>
        ) : (
          <div className="mt-5 rounded-lg bg-gray-50 p-5 text-sm leading-6 text-gray-500">
            <T>No students yet. Share your class link below so your students can join.</T>
          </div>
        )}
        {baseline > 0 && (
          <p className="mt-4 text-xs text-gray-400">{t("Plus {n} example students in the illustrative class.", { n: baseline })}</p>
        )}
        <Link href="/classroom" className={`${primaryButton} mt-6`}>
          <T>Start live class</T>
        </Link>
      </Reveal>
    </div>
  );
}
