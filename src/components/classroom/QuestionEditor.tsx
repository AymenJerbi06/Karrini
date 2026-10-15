"use client";

import { useState, type FormEvent } from "react";
import { Localized, T, useI18n } from "@/components/I18n";
import { fieldClass, primaryButton, secondaryButton } from "@/components/SiteUi";
import { PlusIcon, TrashIcon } from "@/components/icons";
import { newQuestionId, type Question, type QuestionType } from "@/lib/questions";
import { cn } from "@/lib/cn";

export const typeLabels: Record<QuestionType, string> = {
  choice: "Multiple choice",
  numeric: "Number or equation",
  short: "Short answer",
  written: "Written working / photo",
};

const typeHints: Record<QuestionType, string> = {
  choice: "Checked automatically. Mark one or more correct options.",
  numeric: "Checked automatically. Separate several values with “;”, e.g. 2; 3.",
  short: "Exact matches are marked correct; other answers wait for your review.",
  written: "Students type or photograph their working. You review each answer.",
};

/** Create or edit a question, before the lesson or live during it. */
export function QuestionEditor({
  classId,
  initial,
  origin,
  submitLabel = "Save question",
  onSubmit,
  onCancel,
}: {
  classId: string;
  initial?: Question;
  origin: Question["origin"];
  submitLabel?: string;
  onSubmit: (q: Question) => void;
  onCancel?: () => void;
}) {
  const { t } = useI18n();
  const [type, setType] = useState<QuestionType>(initial?.type ?? "choice");
  const [prompt, setPrompt] = useState(initial?.prompt ?? "");
  const [options, setOptions] = useState<string[]>(initial?.options ?? ["", "", ""]);
  const [correct, setCorrect] = useState<number[]>(initial?.correct ?? [0]);
  const [accepted, setAccepted] = useState((initial?.accepted ?? []).join(" | "));
  const [explanation, setExplanation] = useState(initial?.explanation ?? "");
  const [timeLimit, setTimeLimit] = useState(String(initial?.timeLimit ?? ""));
  const [error, setError] = useState("");

  function submit(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (!prompt.trim()) return setError("Write the question first.");
    const cleanOptions = options.map((o) => o.trim());
    if (type === "choice") {
      if (cleanOptions.filter(Boolean).length < 2) return setError("Add at least two options.");
      if (!correct.some((i) => cleanOptions[i])) return setError("Mark at least one correct option.");
    }
    if (type === "numeric" && !accepted.trim()) return setError("Enter the expected value(s).");
    const kept = cleanOptions.map((o, i) => ({ o, i })).filter((x) => x.o);
    onSubmit({
      id: initial?.id ?? newQuestionId(),
      classId,
      type,
      prompt: prompt.trim(),
      options: type === "choice" ? kept.map((x) => x.o) : undefined,
      correct:
        type === "choice"
          ? kept.map((x, newIndex) => (correct.includes(x.i) ? newIndex : -1)).filter((i) => i >= 0)
          : undefined,
      accepted:
        type === "numeric" || type === "short"
          ? accepted
              .split("|")
              .map((a) => a.trim())
              .filter(Boolean)
          : undefined,
      explanation: explanation.trim() || undefined,
      timeLimit: Number(timeLimit) > 0 ? Number(timeLimit) : undefined,
      createdAt: initial?.createdAt ?? Date.now(),
      origin: initial?.origin ?? origin,
    });
  }

  return (
    <form onSubmit={submit} className="animate-rise space-y-5" noValidate>
      <fieldset>
        <legend className="text-sm font-semibold text-gray-700">
          <T>Answer format</T>
        </legend>
        <div className="mt-2 grid grid-cols-2 gap-2 lg:grid-cols-4">
          {(Object.keys(typeLabels) as QuestionType[]).map((k) => (
            <button
              key={k}
              type="button"
              aria-pressed={type === k}
              onClick={() => setType(k)}
              className={cn(
                "min-h-12 rounded-lg border px-3 text-sm font-semibold transition-colors",
                type === k ? "border-brand bg-emerald-50 text-brand" : "border-gray-200 text-gray-600 hover:bg-gray-50",
              )}
            >
              <T>{typeLabels[k]}</T>
            </button>
          ))}
        </div>
        <p className="mt-2 text-xs text-gray-500">
          <T>{typeHints[type]}</T>
        </p>
      </fieldset>

      <label className="block text-sm font-semibold text-gray-700">
        <T>Question</T>
        <Localized
          as="textarea"
          rows={2}
          dir="auto"
          value={prompt}
          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setPrompt(e.target.value)}
          placeholder="e.g. Solve x² − 5x + 6 = 0"
          className={fieldClass}
        />
      </label>

      {type === "choice" && (
        <fieldset>
          <legend className="text-sm font-semibold text-gray-700">
            <T>Options · tick the correct ones</T>
          </legend>
          <div className="mt-2 space-y-2">
            {options.map((o, i) => (
              <div key={i} className="flex items-center gap-2">
                <Localized
                  as="input"
                  type="checkbox"
                  aria-label={`Option ${i + 1} is correct`}
                  checked={correct.includes(i)}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setCorrect((c) => (e.target.checked ? [...c, i] : c.filter((x) => x !== i)))
                  }
                  className="h-5 w-5 shrink-0"
                />
                <Localized
                  as="input"
                  dir="auto"
                  value={o}
                  aria-label={`Option ${i + 1}`}
                  placeholder={`Option ${i + 1}`}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setOptions((list) => list.map((x, k) => (k === i ? e.target.value : x)))
                  }
                  className={cn(fieldClass, "mt-0 py-2.5", correct.includes(i) && "border-brand bg-emerald-50/40")}
                />
                {options.length > 2 && (
                  <Localized
                    as="button"
                    type="button"
                    aria-label="Remove option"
                    onClick={() => {
                      setOptions((list) => list.filter((_, k) => k !== i));
                      setCorrect((c) => c.filter((x) => x !== i).map((x) => (x > i ? x - 1 : x)));
                    }}
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md text-gray-400 hover:bg-gray-100 hover:text-red-600"
                  >
                    <TrashIcon className="h-5 w-5" />
                  </Localized>
                )}
              </div>
            ))}
          </div>
          {options.length < 6 && (
            <button
              type="button"
              onClick={() => setOptions((list) => [...list, ""])}
              className="mt-2 inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-brand"
            >
              <PlusIcon className="h-4 w-4" /> <T>Add option</T>
            </button>
          )}
        </fieldset>
      )}

      {(type === "numeric" || type === "short") && (
        <label className="block text-sm font-semibold text-gray-700">
          <T>{type === "numeric" ? "Expected value(s)" : "Accepted answers"}</T>
          <Localized
            as="input"
            dir="auto"
            value={accepted}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAccepted(e.target.value)}
            placeholder={type === "numeric" ? "2; 3" : "photosynthesis | photosynthèse"}
            className={fieldClass}
          />
          <span className="mt-1 block text-xs font-normal text-gray-400">
            <T>{type === "numeric" ? "Fractions and decimals with a comma are accepted (1/2, 0,5)." : "Separate alternatives with |."}</T>
          </span>
        </label>
      )}

      <div className="grid gap-4 sm:grid-cols-[1fr_160px]">
        <label className="block text-sm font-semibold text-gray-700">
          <T>Explanation shown when you release the answer</T>
          <Localized
            as="textarea"
            rows={2}
            dir="auto"
            value={explanation}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setExplanation(e.target.value)}
            placeholder="Optional"
            className={fieldClass}
          />
        </label>
        <label className="block text-sm font-semibold text-gray-700">
          <T>Time limit</T>
          <select value={timeLimit} onChange={(e) => setTimeLimit(e.target.value)} className={fieldClass}>
            <option value="">{t("No limit")}</option>
            {[30, 60, 120, 300].map((s) => (
              <option key={s} value={s}>
                {s < 60 ? t("{n} seconds", { n: s }) : t("{n} min", { n: s / 60 })}
              </option>
            ))}
          </select>
        </label>
      </div>

      {error && (
        <p role="alert" className="text-sm text-red-700">
          <T>{error}</T>
        </p>
      )}
      <div className="flex flex-wrap gap-3">
        <button type="submit" className={primaryButton}>
          <T>{submitLabel}</T>
        </button>
        {onCancel && (
          <button type="button" onClick={onCancel} className={secondaryButton}>
            <T>Cancel</T>
          </button>
        )}
      </div>
    </form>
  );
}

/** Compact read-only description of a question. */
export function QuestionSummary({ q, showAnswer = true }: { q: Question; showAnswer?: boolean }) {
  return (
    <div className="min-w-0">
      <p className="text-xs font-semibold tracking-wide text-gray-400 uppercase">
        <T>{typeLabels[q.type]}</T>
        {q.origin === "live" && (
          <>
            {" · "}
            <T>Added live</T>
          </>
        )}
      </p>
      <p dir="auto" className="mt-1 font-semibold break-words text-gray-800">
        {q.prompt}
      </p>
      {q.type === "choice" && (
        <ul className="mt-2 flex flex-wrap gap-1.5">
          {q.options?.map((o, i) => (
            <li
              key={i}
              dir="auto"
              className={cn(
                "rounded px-2 py-0.5 text-xs",
                showAnswer && q.correct?.includes(i) ? "bg-emerald-100 text-emerald-800" : "bg-gray-100 text-gray-600",
              )}
            >
              {o}
            </li>
          ))}
        </ul>
      )}
      {showAnswer && (q.type === "numeric" || q.type === "short") && q.accepted?.length ? (
        <p dir="auto" className="mt-2 text-xs text-emerald-700">
          ✓ {q.accepted.join(" · ")}
        </p>
      ) : null}
    </div>
  );
}
