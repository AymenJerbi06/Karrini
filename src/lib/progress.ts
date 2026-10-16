"use client";

// A student's progress in one class: lessons attended this month and results per lesson.
// Results only count once the teacher has revealed the answer (or written feedback).

import { supabase } from "@/lib/supabase/client";
import { useRemote } from "@/lib/remote";
import type { AnswerStatus } from "@/lib/questions";

export type LessonResult = { sessionId: string; startedAt: number; attended: boolean; correct: number; incorrect: number; pending: number };
export type ClassAnswer = { prompt: string; text: string; status: AnswerStatus; feedback?: string; released: boolean; at: number };

export type ClassProgress = {
  monthTotal: number;
  monthAttended: number;
  lessons: LessonResult[];
  correct: number;
  incorrect: number;
  answers: ClassAnswer[];
};

const empty: ClassProgress = { monthTotal: 0, monthAttended: 0, lessons: [], correct: 0, incorrect: 0, answers: [] };

export function useClassProgress(studentId: string | undefined, classId: string | undefined, groupId: string | null) {
  return useRemote(
    studentId && classId ? `progress:${studentId}:${classId}:${groupId ?? ""}` : null,
    async (): Promise<ClassProgress> => {
      const sb = supabase();
      const monthStart = new Date();
      monthStart.setDate(1);
      monthStart.setHours(0, 0, 0, 0);
      let sessionsQuery = sb
        .from("sessions")
        .select("id, started_at, group_id")
        .eq("class_id", classId!)
        .order("started_at", { ascending: false })
        .limit(60);
      if (groupId) sessionsQuery = sessionsQuery.or(`group_id.is.null,group_id.eq.${groupId}`);
      const [sessions, attendance, answers] = await Promise.all([
        sessionsQuery,
        sb.from("attendance").select("session_id").eq("student_id", studentId!),
        sb
          .from("answers")
          .select("answer_text, status, feedback, created_at, session_questions!inner(released_at, session_id, questions(prompt), sessions!inner(class_id))")
          .eq("student_id", studentId!)
          .eq("session_questions.sessions.class_id", classId!)
          .order("created_at", { ascending: false })
          .limit(200),
      ]);
      if (sessions.error) throw sessions.error;
      const attended = new Set((attendance.data ?? []).map((a) => a.session_id as string));
      type A = {
        answer_text: string;
        status: AnswerStatus;
        feedback: string | null;
        created_at: string;
        session_questions: { released_at: string | null; session_id: string; questions: { prompt: string } | null };
      };
      const list = ((answers.data ?? []) as unknown as A[]).map((a) => ({
        sessionId: a.session_questions.session_id,
        prompt: a.session_questions.questions?.prompt ?? "",
        text: a.answer_text,
        status: a.status,
        feedback: a.feedback ?? undefined,
        released: !!a.session_questions.released_at || !!a.feedback,
        at: new Date(a.created_at).getTime(),
      }));
      const lessons = (sessions.data as { id: string; started_at: string }[]).map((s) => {
        const mine = list.filter((a) => a.sessionId === s.id);
        const shown = mine.filter((a) => a.released);
        return {
          sessionId: s.id,
          startedAt: new Date(s.started_at).getTime(),
          attended: attended.has(s.id) || mine.length > 0,
          correct: shown.filter((a) => a.status === "correct").length,
          incorrect: shown.filter((a) => a.status === "incorrect").length,
          pending: mine.length - shown.filter((a) => a.status !== "review").length,
        };
      });
      const thisMonth = lessons.filter((l) => l.startedAt >= monthStart.getTime());
      const released = list.filter((a) => a.released);
      return {
        monthTotal: thisMonth.length,
        monthAttended: thisMonth.filter((l) => l.attended).length,
        lessons,
        correct: released.filter((a) => a.status === "correct").length,
        incorrect: released.filter((a) => a.status === "incorrect").length,
        answers: list,
      };
    },
    empty,
    "sessions",
  );
}

/** Records that the signed-in student joined a running session (ignored if already recorded). */
export async function recordAttendance(sessionId: string, studentId: string) {
  await supabase().from("attendance").upsert({ session_id: sessionId, student_id: studentId }, { onConflict: "session_id,student_id", ignoreDuplicates: true });
}
