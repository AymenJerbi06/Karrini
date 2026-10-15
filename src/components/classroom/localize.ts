import type { Question } from "@/lib/questions";

type Translate = (s: string) => string;

/**
 * Built-in example questions are authored in English and translated for display.
 * Questions written by a teacher are shown exactly as typed.
 */
export function localizeQuestion(q: Question, t: Translate): Question {
  if (!q.id.includes("-starter-")) return q;
  return {
    ...q,
    prompt: t(q.prompt),
    options: q.options?.map((o) => t(o)),
    explanation: q.explanation ? t(q.explanation) : undefined,
  };
}
