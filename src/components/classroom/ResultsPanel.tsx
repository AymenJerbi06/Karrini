"use client";

import { T, useI18n } from "@/components/I18n";
import { CountUp } from "@/components/ui/Motion";
import { correctAnswerText, summarize, type AnswerStatus, type AskedQuestion, type StudentAnswer } from "@/lib/questions";
import { cn } from "@/lib/cn";

export const statusLabel: Record<AnswerStatus, string> = {
  correct: "Correct",
  incorrect: "Incorrect",
  review: "Awaiting review",
};
export const statusTone: Record<AnswerStatus, string> = {
  correct: "bg-emerald-50 text-emerald-700",
  incorrect: "bg-red-50 text-red-700",
  review: "bg-amber-50 text-amber-800",
};

function Stat({ label, value, suffix, tone }: { label: string; value: number; suffix?: string; tone: string }) {
  return (
    <div className="rounded-xl bg-gray-50 p-4">
      <p className={cn("font-display text-3xl font-extrabold", tone)}>
        <CountUp value={value} suffix={suffix} />
      </p>
      <p className="mt-1 text-xs text-gray-500">
        <T>{label}</T>
      </p>
    </div>
  );
}

/**
 * Results of one question: right/wrong counts, percentages, option breakdown,
 * and the names and answers of every student who got it wrong.
 */
export function ResultsPanel({
  asked,
  connected,
  onOpen,
  compact,
}: {
  asked: AskedQuestion;
  connected: number;
  onOpen?: (a: StudentAnswer) => void;
  compact?: boolean;
}) {
  const { t } = useI18n();
  const s = summarize(asked, connected);
  const wrong = asked.answers.filter((a) => a.status === "incorrect");
  const pending = asked.answers.filter((a) => a.status === "review");
  const q = asked.question;

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Got it right" value={s.correct} tone="text-emerald-700" />
        <Stat label="Got it wrong" value={s.incorrect} tone="text-red-700" />
        <Stat label="Correct rate (graded)" value={s.correctPct} suffix="%" tone="text-gray-900" />
        <Stat label="Awaiting review" value={s.review} tone="text-amber-700" />
      </div>

      <div>
        <div className="flex h-3 overflow-hidden rounded-full bg-gray-100" aria-hidden>
          <div className="bg-emerald-500 transition-all duration-700" style={{ width: `${(s.correct / Math.max(1, s.connected)) * 100}%` }} />
          <div className="bg-red-500 transition-all duration-700" style={{ width: `${(s.incorrect / Math.max(1, s.connected)) * 100}%` }} />
          <div className="bg-amber-400 transition-all duration-700" style={{ width: `${(s.review / Math.max(1, s.connected)) * 100}%` }} />
        </div>
        <p className="mt-2 text-sm text-gray-500">
          {t("{answered} of {connected} students answered ({participation}%) · {waiting} still working", {
            answered: s.answered,
            connected: s.connected,
            participation: s.participation,
            waiting: s.waiting,
          })}
          {s.graded > 0 && (
            <>
              {" · "}
              {t("{correct}% right, {incorrect}% wrong of {graded} graded", {
                correct: s.correctPct,
                incorrect: s.incorrectPct,
                graded: s.graded,
              })}
            </>
          )}
        </p>
      </div>

      {q.type === "choice" && (
        <div className="space-y-2">
          <p className="text-sm font-semibold text-gray-700">
            <T>Answers by option</T>
          </p>
          {q.options?.map((o, i) => {
            const pickers = asked.answers.filter((a) => a.choice?.includes(i));
            const pct = asked.answers.length ? Math.round((pickers.length / asked.answers.length) * 100) : 0;
            const right = q.correct?.includes(i);
            return (
              <div key={i}>
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span dir="auto" className={cn("min-w-0 truncate", right ? "font-semibold text-emerald-800" : "text-gray-700")}>
                    {right && "✓ "}
                    {o}
                  </span>
                  <span className="shrink-0 text-gray-500" dir="ltr">
                    {pickers.length} · {pct}%
                  </span>
                </div>
                <div className="mt-1 h-2 overflow-hidden rounded-full bg-gray-100">
                  <div
                    className={cn("h-full rounded-full transition-all duration-700", right ? "bg-emerald-500" : "bg-red-400")}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}

      <section className="rounded-xl border border-red-100">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-red-100 bg-red-50/60 px-4 py-3">
          <h4 className="font-semibold text-red-900">{t("Students who got it wrong ({n})", { n: wrong.length })}</h4>
          {correctAnswerText(q) && (
            <p dir="auto" className="text-xs text-red-900/80">
              <T>Expected:</T> {correctAnswerText(q)}
            </p>
          )}
        </div>
        {wrong.length ? (
          <ul className={cn("divide-y divide-gray-100 overflow-y-auto", compact ? "max-h-56" : "max-h-80")}>
            {wrong.map((a) => (
              <li key={a.studentId} className="animate-rise flex items-start gap-3 px-4 py-3 text-sm">
                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-red-100 text-xs font-bold text-red-800">
                  {a.name.slice(0, 1)}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-gray-800">
                    <bdi dir="auto">{a.name}</bdi>
                    {a.simulated && (
                      <span className="ms-2 rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium text-gray-500">
                        <T>example</T>
                      </span>
                    )}
                  </p>
                  <p dir="auto" className="mt-0.5 break-words text-gray-600">
                    <T>Answered:</T> <span className="font-mono text-red-700">{a.text || "—"}</span>
                  </p>
                </div>
                {onOpen && (
                  <button type="button" onClick={() => onOpen(a)} className="min-h-11 shrink-0 px-2 font-semibold text-blue-600 hover:underline">
                    <T>Give feedback</T>
                  </button>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p className="px-4 py-5 text-sm text-gray-500">
            <T>No wrong answers so far.</T>
          </p>
        )}
      </section>

      {pending.length > 0 && (
        <section className="rounded-xl border border-amber-100">
          <h4 className="border-b border-amber-100 bg-amber-50/60 px-4 py-3 font-semibold text-amber-900">
            {t("Waiting for your review ({n})", { n: pending.length })}
          </h4>
          <ul className="max-h-60 divide-y divide-gray-100 overflow-y-auto">
            {pending.map((a) => (
              <li key={a.studentId} className="flex items-start gap-3 px-4 py-3 text-sm">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-gray-800">
                    <bdi dir="auto">{a.name}</bdi>
                  </p>
                  <p dir="auto" className="mt-0.5 line-clamp-2 break-words text-gray-600">
                    {a.text}
                  </p>
                  {a.photo && a.photo !== "attached" && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={a.photo} alt="" className="mt-2 max-h-32 rounded border border-gray-200" />
                  )}
                </div>
                {onOpen && (
                  <button type="button" onClick={() => onOpen(a)} className="min-h-11 shrink-0 px-2 font-semibold text-blue-600 hover:underline">
                    <T>Review</T>
                  </button>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

/** Builds a CSV of a whole session (one row per answer) for download. */
export function sessionCsv(asked: AskedQuestion[], t: (s: string) => string) {
  const rows = [[t("Question"), t("Student"), t("Answer"), t("Result"), t("Feedback")]];
  asked.forEach((a, i) =>
    a.answers.forEach((ans) =>
      rows.push([`${i + 1}. ${a.question.prompt}`, ans.name, ans.text, t(statusLabel[ans.status]), ans.feedback ?? ""]),
    ),
  );
  return "﻿" + rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
}

export function downloadText(name: string, text: string, type = "text/csv;charset=utf-8") {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
