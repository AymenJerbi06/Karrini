"use client";

import { useState } from "react";
import Link from "@/components/LocalizedLink";
import { T, useI18n } from "@/components/I18n";
import { TeacherShell } from "@/components/workspace/TeacherShell";
import { ResultsPanel, downloadText, sessionCsv } from "@/components/classroom/ResultsPanel";
import { QuestionSummary } from "@/components/classroom/QuestionEditor";
import { primaryButton, secondaryButton } from "@/components/SiteUi";
import { DownloadIcon } from "@/components/icons";
import { Reveal } from "@/components/ui/Motion";
import { summarize, useClassHistory, type SessionRecord } from "@/lib/questions";
import { cn } from "@/lib/cn";

export function TeacherResults() {
  return (
    <TeacherShell
      title="Results"
      intro="Every live session is saved here: how many students got each question right or wrong, and exactly who needs help."
    >
      {({ cls }) => <Results classId={cls.id} />}
    </TeacherShell>
  );
}

function Results({ classId }: { classId: string }) {
  const { t, locale } = useI18n();
  const { sessions, loading } = useClassHistory(classId);
  // undefined = nothing chosen yet (show the latest session); null = all collapsed.
  const [open, setOpen] = useState<string | null | undefined>(undefined);
  const [questionIndex, setQuestionIndex] = useState(0);

  if (loading)
    return (
      <div className="space-y-4" aria-busy="true">
        {[0, 1].map((i) => (
          <div key={i} className="h-24 animate-pulse rounded-xl bg-gray-100" />
        ))}
      </div>
    );

  if (!sessions.length)
    return (
      <div className="rounded-xl border border-dashed border-gray-300 bg-white p-10 text-center">
        <p className="font-semibold text-gray-700">
          <T>No live sessions yet.</T>
        </p>
        <p className="mt-2 text-sm text-gray-500">
          <T>Start a live class and publish a question. The results appear here when you end the session.</T>
        </p>
        <Link href="/classroom" className={`${primaryButton} mt-6`}>
          <T>Start live class</T>
        </Link>
      </div>
    );

  // Students who were wrong most often across all saved sessions.
  const tally = new Map<string, { name: string; wrong: number; answered: number }>();
  sessions.forEach((s) =>
    s.asked.forEach((a) =>
      a.answers.forEach((ans) => {
        const row = tally.get(ans.name) ?? { name: ans.name, wrong: 0, answered: 0 };
        row.answered += 1;
        if (ans.status === "incorrect") row.wrong += 1;
        tally.set(ans.name, row);
      }),
    ),
  );
  const struggling = [...tally.values()].filter((r) => r.wrong > 0).sort((a, b) => b.wrong - a.wrong).slice(0, 8);
  const fmt = (ts: number) =>
    new Date(ts).toLocaleString(locale === "ar" ? "ar-TN" : "fr-TN", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

  return (
    <div className="grid items-start gap-8 lg:grid-cols-[1fr_320px]">
      <div className="space-y-4">
        {sessions.map((s: SessionRecord) => {
          const isOpen = (open === undefined ? sessions[0]?.id : open) === s.id;
          const totals = s.asked.reduce(
            (acc, a) => {
              const x = summarize(a, s.connected);
              return { correct: acc.correct + x.correct, incorrect: acc.incorrect + x.incorrect, graded: acc.graded + x.graded };
            },
            { correct: 0, incorrect: 0, graded: 0 },
          );
          const asked = s.asked[Math.min(questionIndex, s.asked.length - 1)];
          return (
            <section key={s.id} className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
              <button
                type="button"
                aria-expanded={isOpen}
                onClick={() => {
                  setOpen(isOpen ? null : s.id);
                  setQuestionIndex(0);
                }}
                className="flex w-full flex-wrap items-center justify-between gap-3 p-5 text-start hover:bg-gray-50"
              >
                <span>
                  <span className="block font-semibold text-gray-800">{fmt(s.startedAt)}</span>
                  <span className="mt-1 block text-sm text-gray-500">
                    {t("{n} questions · {students} students", { n: s.asked.length, students: s.connected })}
                  </span>
                </span>
                <span className="flex items-center gap-4 text-sm">
                  <span className="font-semibold text-emerald-700" dir="ltr">✓ {totals.correct}</span>
                  <span className="font-semibold text-red-700" dir="ltr">✗ {totals.incorrect}</span>
                  <span className="font-display text-lg font-extrabold text-gray-900" dir="ltr">
                    {totals.graded ? Math.round((totals.correct / totals.graded) * 100) : 0}%
                  </span>
                </span>
              </button>
              {isOpen && (
                <div className="animate-rise border-t border-gray-100 p-5">
                  {s.asked.length === 0 ? (
                    <p className="text-sm text-gray-500">
                      <T>No question was published in this session.</T>
                    </p>
                  ) : (
                    <>
                      <div className="flex gap-2 overflow-x-auto pb-2" role="group" aria-label={t("Questions in this session")}>
                        {s.asked.map((a, i) => {
                          const x = summarize(a, s.connected);
                          return (
                            <button
                              key={a.question.id + i}
                              type="button"
                              aria-pressed={i === questionIndex}
                              onClick={() => setQuestionIndex(i)}
                              className={cn(
                                "min-h-11 shrink-0 rounded-lg border px-3 text-sm font-semibold",
                                i === questionIndex ? "border-brand bg-emerald-50 text-brand" : "border-gray-200 text-gray-600",
                              )}
                            >
                              <span dir="ltr">
                                Q{i + 1} · {x.correctPct}%
                              </span>
                            </button>
                          );
                        })}
                      </div>
                      {asked && (
                        <div className="mt-4 space-y-5">
                          <QuestionSummary q={asked.question} />
                          <ResultsPanel asked={asked} connected={s.connected} />
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={() => downloadText(`qarrini-results-${new Date(s.startedAt).toISOString().slice(0, 10)}.csv`, sessionCsv(s.asked, t))}
                        className={`${secondaryButton} mt-6`}
                      >
                        <DownloadIcon className="h-5 w-5" />
                        <T>Download results (CSV)</T>
                      </button>
                    </>
                  )}
                </div>
              )}
            </section>
          );
        })}
      </div>

      <Reveal as="section" className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm lg:sticky lg:top-6">
        <h2 className="font-display text-lg font-bold text-gray-800">
          <T>Students to follow up</T>
        </h2>
        <p className="mt-1 text-sm text-gray-500">
          <T>Most wrong answers across saved sessions.</T>
        </p>
        {struggling.length ? (
          <ul className="mt-5 space-y-3">
            {struggling.map((r) => (
              <li key={r.name} className="text-sm">
                <div className="flex justify-between gap-3">
                  <bdi dir="auto" className="font-semibold text-gray-800">
                    {r.name}
                  </bdi>
                  <span className="text-gray-500" dir="ltr">
                    {r.wrong}/{r.answered}
                  </span>
                </div>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-gray-100">
                  <div className="h-full rounded-full bg-red-400" style={{ width: `${(r.wrong / r.answered) * 100}%` }} />
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-5 text-sm text-gray-500">
            <T>Everyone answered correctly so far.</T>
          </p>
        )}
      </Reveal>
    </div>
  );
}
