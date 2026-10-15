// Messages exchanged in a live Karrini classroom (on top of the RealtimeTransport).

import type { AnswerStatus, Question, QuestionType } from "@/lib/questions";

export const hostPeer = (classId: string) => `teacher:${classId}`;

/** What students receive: never the correct answer or explanation before release. */
export type PublicQuestion = {
  id: string;
  type: QuestionType;
  prompt: string;
  options?: string[];
  /** True when several options must be ticked (the count is not revealed). */
  multiple?: boolean;
  timeLimit?: number;
  publishedAt: number;
};

export const toPublic = (q: Question, publishedAt: number): PublicQuestion => ({
  id: q.id,
  type: q.type,
  prompt: q.prompt,
  options: q.options,
  multiple: (q.correct?.length ?? 0) > 1,
  timeLimit: q.timeLimit,
  publishedAt,
});

export type SessionState = {
  live: boolean;
  teacherName: string;
  startedAt?: number;
  question?: PublicQuestion & { closed?: boolean };
  release?: Release;
  shared?: Shared;
};

export type Release = {
  questionId: string;
  correctText: string;
  explanation?: string;
  correct: number;
  incorrect: number;
  graded: number;
};

export type Shared = { questionId: string; text: string; feedback: string; at: number };

export type StudentHello = { name: string };
export type StudentAnswerMsg = { questionId: string; name: string; text: string; choice?: number[]; photo?: string };
export type ResultMsg = { questionId: string; status: AnswerStatus; feedback?: string };
