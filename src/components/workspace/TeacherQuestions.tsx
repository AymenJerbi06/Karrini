"use client";

import { useState } from "react";
import Link from "@/components/LocalizedLink";
import { Localized, T, useI18n } from "@/components/I18n";
import { TeacherShell } from "@/components/workspace/TeacherShell";
import { QuestionEditor, QuestionSummary } from "@/components/classroom/QuestionEditor";
import { primaryButton } from "@/components/SiteUi";
import { ChevronDownIcon, PlusIcon, TrashIcon } from "@/components/icons";
import { Toast } from "@/components/ui/Motion";
import { saveBank, useQuestionBank, type Question } from "@/lib/questions";
import { localizeQuestion } from "@/components/classroom/localize";

export function TeacherQuestions() {
  return (
    <TeacherShell
      title="Prepare your questions"
      intro="Write questions before the lesson and send them with one click during class. You can also add new questions live."
    >
      {({ cls }) => <Bank classId={cls.id} />}
    </TeacherShell>
  );
}

function Bank({ classId }: { classId: string }) {
  const { t } = useI18n();
  const raw = useQuestionBank(classId);
  const bank = raw.map((q) => localizeQuestion(q, t));
  const [editing, setEditing] = useState<string | "new" | null>(null);
  const [toast, setToast] = useState("");

  const save = (list: Question[]) => saveBank(classId, list);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <p className="text-sm text-gray-500">{t("{n} questions ready for your next lesson", { n: bank.length })}</p>
        <div className="flex flex-wrap gap-3">
          <Link href="/classroom" className="inline-flex min-h-12 items-center rounded-md px-4 text-sm font-semibold text-brand hover:bg-emerald-50">
            <T>Use them in a live class</T> →
          </Link>
          {editing !== "new" && (
            <button type="button" onClick={() => setEditing("new")} className={primaryButton}>
              <PlusIcon className="h-5 w-5" />
              <T>New question</T>
            </button>
          )}
        </div>
      </div>

      {editing === "new" && (
        <div className="rounded-xl border-2 border-brand/30 bg-white p-6 shadow-sm">
          <h2 className="mb-5 font-display text-lg font-bold text-gray-800">
            <T>New question</T>
          </h2>
          <QuestionEditor
            classId={classId}
            origin="prepared"
            onCancel={() => setEditing(null)}
            onSubmit={(q) => {
              save([...bank, q]);
              setEditing(null);
              setToast(t("Question saved for your next lesson."));
            }}
          />
        </div>
      )}

      {bank.length === 0 && editing !== "new" ? (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white p-10 text-center text-gray-500">
          <T>No questions yet. Create your first one.</T>
        </div>
      ) : (
        <ol className="space-y-3">
          {bank.map((q, i) => (
            <li key={q.id} className="animate-rise rounded-xl border border-gray-200 bg-white shadow-sm">
              {editing === q.id ? (
                <div className="p-6">
                  <QuestionEditor
                    classId={classId}
                    initial={q}
                    origin="prepared"
                    onCancel={() => setEditing(null)}
                    onSubmit={(updated) => {
                      save(bank.map((x) => (x.id === q.id ? updated : x)));
                      setEditing(null);
                      setToast(t("Question updated."));
                    }}
                  />
                </div>
              ) : (
                <div className="flex items-start gap-4 p-5">
                  <span className="font-display mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-100 text-sm font-bold text-gray-600" dir="ltr">
                    {i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <QuestionSummary q={q} />
                    {q.explanation && (
                      <p dir="auto" className="mt-2 text-sm text-gray-500">
                        {q.explanation}
                      </p>
                    )}
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1 sm:flex-row sm:items-center">
                    <Localized
                      as="button"
                      type="button"
                      aria-label="Move up"
                      disabled={i === 0}
                      onClick={() => {
                        const next = bank.slice();
                        [next[i - 1], next[i]] = [next[i], next[i - 1]];
                        save(next);
                      }}
                      className="flex h-10 w-10 items-center justify-center rounded-md text-gray-400 hover:bg-gray-100 disabled:opacity-30"
                    >
                      <ChevronDownIcon className="h-5 w-5 rotate-180" />
                    </Localized>
                    <Localized
                      as="button"
                      type="button"
                      aria-label="Move down"
                      disabled={i === bank.length - 1}
                      onClick={() => {
                        const next = bank.slice();
                        [next[i + 1], next[i]] = [next[i], next[i + 1]];
                        save(next);
                      }}
                      className="flex h-10 w-10 items-center justify-center rounded-md text-gray-400 hover:bg-gray-100 disabled:opacity-30"
                    >
                      <ChevronDownIcon className="h-5 w-5" />
                    </Localized>
                    <button type="button" onClick={() => setEditing(q.id)} className="min-h-10 rounded-md px-3 text-sm font-semibold text-brand hover:bg-emerald-50">
                      <T>Edit</T>
                    </button>
                    <Localized
                      as="button"
                      type="button"
                      aria-label="Delete"
                      onClick={() => {
                        save(bank.filter((x) => x.id !== q.id));
                        setToast(t("Question deleted."));
                      }}
                      className="flex h-10 w-10 items-center justify-center rounded-md text-gray-400 hover:bg-red-50 hover:text-red-600"
                    >
                      <TrashIcon className="h-5 w-5" />
                    </Localized>
                  </div>
                </div>
              )}
            </li>
          ))}
        </ol>
      )}
      <Toast message={toast} onDone={() => setToast("")} />
    </div>
  );
}
