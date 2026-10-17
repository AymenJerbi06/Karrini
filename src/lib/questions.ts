"use client";

// Question bank, grading rules and live-session records, stored in Supabase.
// Correct answers and explanations live in `question_keys`, which only the class teacher can read.

import { supabase } from "@/lib/supabase/client";
import { announceChange, useRemote } from "@/lib/remote";

export type QuestionType = "choice" | "numeric" | "short" | "written";

export type Question = {
  id: string;
  classId: string;
  type: QuestionType;
  prompt: string;
  /** Multiple choice options. */
  options?: string[];
  /** Indices of correct options (choice). */
  correct?: number[];
  /** Accepted answers: numbers for numeric ("2; 3"), phrases for short answers. */
  accepted?: string[];
  explanation?: string;
  timeLimit?: number;
  createdAt: number;
  /** "prepared" before the lesson, or "live" when written during the session. */
  origin: "prepared" | "live";
};

export type AnswerStatus = "correct" | "incorrect" | "review";

export type StudentAnswer = {
  studentId: string;
  name: string;
  /** Display text of the answer (option text, number, sentence…). */
  text: string;
  choice?: number[];
  photo?: string;
  status: AnswerStatus;
  feedback?: string;
  at: number;
  simulated?: boolean;
};

export type AskedQuestion = {
  question: Question;
  /** Row id in public.session_questions (absent for unsaved/simulated runs). */
  sessionQuestionId?: string;
  publishedAt: number;
  closedAt?: number;
  released?: boolean;
  answers: StudentAnswer[];
};

export type SessionRecord = {
  id: string;
  classId: string;
  groupId?: string | null;
  teacherId: string;
  startedAt: number;
  endedAt?: number;
  connected: number;
  asked: AskedQuestion[];
};

/* ---------------- Grading ---------------- */

const strip = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ًͯ-ْ]/g, "")
    .replace(/[^\p{L}\p{N}\s.,/-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();

/** Extracts numbers, accepting "0,5", "1/2", "−3" and text around them ("x = 2 et x = 3"). */
export function extractNumbers(input: string): number[] {
  const text = input.replace(/[−–]/g, "-");
  const out: number[] = [];
  const re = /-?\d+(?:[.,]\d+)?(?:\s*\/\s*-?\d+(?:[.,]\d+)?)?/g;
  for (const match of text.match(re) ?? []) {
    const [a, b] = match.split("/").map((p) => Number(p.replace(",", ".").trim()));
    const value = b !== undefined ? a / b : a;
    if (Number.isFinite(value)) out.push(value);
  }
  return out;
}

export function grade(q: Question, answer: { text: string; choice?: number[] }): AnswerStatus {
  if (q.type === "choice") {
    const want = [...(q.correct ?? [])].sort().join(",");
    const got = [...(answer.choice ?? [])].sort().join(",");
    return want && want === got ? "correct" : "incorrect";
  }
  if (q.type === "numeric") {
    const accepted = (q.accepted ?? []).flatMap(extractNumbers).sort((a, b) => a - b);
    const given = extractNumbers(answer.text).sort((a, b) => a - b);
    if (!accepted.length) return "review";
    if (given.length !== accepted.length) return "incorrect";
    return accepted.every((v, i) => Math.abs(v - given[i]) < 1e-6 + Math.abs(v) * 1e-4) ? "correct" : "incorrect";
  }
  if (q.type === "short") {
    const given = strip(answer.text);
    const ok = (q.accepted ?? []).some((a) => strip(a) && strip(a) === given);
    // A non-matching sentence may still be right: the teacher decides.
    return ok ? "correct" : "review";
  }
  return "review";
}

export function correctAnswerText(q: Question) {
  if (q.type === "choice") return (q.correct ?? []).map((i) => q.options?.[i]).filter(Boolean).join(" · ");
  return (q.accepted ?? []).join(" · ");
}

export function summarize(asked: AskedQuestion | undefined, connected: number) {
  const answers = asked?.answers ?? [];
  const correct = answers.filter((a) => a.status === "correct").length;
  const incorrect = answers.filter((a) => a.status === "incorrect").length;
  const review = answers.filter((a) => a.status === "review").length;
  const graded = correct + incorrect;
  const total = Math.max(connected, answers.length);
  return {
    answered: answers.length,
    connected: total,
    waiting: Math.max(0, total - answers.length),
    correct,
    incorrect,
    review,
    graded,
    correctPct: graded ? Math.round((correct / graded) * 100) : 0,
    incorrectPct: graded ? Math.round((incorrect / graded) * 100) : 0,
    participation: total ? Math.round((answers.length / total) * 100) : 0,
  };
}

/* ---------------- Starter questions (suggested while the bank is empty) ---------------- */

export function starterQuestions(classId: string): Question[] {
  return [
    {
      id: `${classId}-starter-1`,
      classId,
      type: "choice",
      prompt: "Solve x² − 5x + 6 = 0",
      options: ["x = 2 and x = 3", "x = −2 and x = −3", "x = 1 and x = 6"],
      correct: [0],
      explanation: "(x − 2)(x − 3) = 0, so x = 2 or x = 3. Check by substituting each root.",
      createdAt: 1,
      origin: "prepared",
    },
    {
      id: `${classId}-starter-2`,
      classId,
      type: "numeric",
      prompt: "Give both solutions of x² − 7x + 10 = 0",
      accepted: ["2; 5"],
      explanation: "(x − 2)(x − 5) = 0, so x = 2 or x = 5.",
      createdAt: 2,
      origin: "prepared",
    },
    {
      id: `${classId}-starter-3`,
      classId,
      type: "written",
      prompt: "Factorise x² − 9x + 20 and show your working",
      explanation: "Product 20, sum −9: −4 and −5. So x² − 9x + 20 = (x − 4)(x − 5).",
      createdAt: 3,
      origin: "prepared",
    },
  ];
}

const isUuid = (id: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

export const newQuestionId = () => crypto.randomUUID();

/* ---------------- Question bank storage ---------------- */

type QuestionRow = {
  id: string;
  class_id: string;
  type: QuestionType;
  prompt: string;
  options: string[] | null;
  time_limit: number | null;
  position: number;
  origin: Question["origin"];
  created_at: string;
  question_keys: { correct: number[] | null; accepted: string[] | null; explanation: string | null } | null;
};

const fromRow = (r: QuestionRow): Question => ({
  id: r.id,
  classId: r.class_id,
  type: r.type,
  prompt: r.prompt,
  options: r.options ?? undefined,
  correct: r.question_keys?.correct ?? undefined,
  accepted: r.question_keys?.accepted ?? undefined,
  explanation: r.question_keys?.explanation ?? undefined,
  timeLimit: r.time_limit ?? undefined,
  createdAt: new Date(r.created_at).getTime(),
  origin: r.origin,
});

export async function fetchBank(classId: string): Promise<{ questions: Question[]; isStarter: boolean }> {
  const { data, error } = await supabase()
    .from("questions")
    .select("*, question_keys(correct, accepted, explanation)")
    .eq("class_id", classId)
    .lt("position", 100000) // removed-but-used questions stay for results, hidden from the bank
    .order("position")
    .order("created_at");
  if (error) throw error;
  const rows = (data as QuestionRow[]).map(fromRow);
  return rows.length ? { questions: rows, isStarter: false } : { questions: starterQuestions(classId), isStarter: true };
}

/** The teacher's question bank (starter suggestions while it is still empty). */
export function useQuestionBank(classId: string | undefined) {
  const { data } = useRemote(
    classId ? `bank:${classId}` : null,
    () => fetchBank(classId!),
    { questions: [] as Question[], isStarter: false },
    "bank",
  );
  return data.questions;
}

/** Saves one question (and its answer key). Returns the stored question (with a real id). */
export async function persistQuestion(q: Question, position: number): Promise<Question> {
  const sb = supabase();
  const id = isUuid(q.id) ? q.id : newQuestionId();
  const { error } = await sb.from("questions").upsert({
    id,
    class_id: q.classId,
    type: q.type,
    prompt: q.prompt,
    options: q.type === "choice" ? (q.options ?? []) : null,
    multiple: (q.correct?.length ?? 0) > 1,
    time_limit: q.timeLimit ?? null,
    position,
    origin: q.origin,
  });
  if (error) throw error;
  const key = await sb.from("question_keys").upsert({
    question_id: id,
    correct: q.type === "choice" ? (q.correct ?? []) : null,
    accepted: q.type === "numeric" || q.type === "short" ? (q.accepted ?? []) : null,
    explanation: q.explanation ?? null,
  });
  if (key.error) throw key.error;
  return { ...q, id };
}

/** Replaces the whole bank: saves order and edits, deletes removed questions. */
export async function saveBank(classId: string, list: Question[]) {
  const sb = supabase();
  const saved: Question[] = [];
  for (const [i, q] of list.entries()) saved.push(await persistQuestion({ ...q, classId }, i));
  const keep = saved.map((q) => q.id);
  const existing = await sb.from("questions").select("id").eq("class_id", classId);
  const remove = (existing.data ?? []).map((r) => r.id).filter((id) => !keep.includes(id));
  if (remove.length) {
    // Questions already used in a session stay (their results reference them); others are deleted.
    const used = await sb.from("session_questions").select("question_id").in("question_id", remove);
    const usedIds = new Set((used.data ?? []).map((r) => r.question_id));
    const deletable = remove.filter((id) => !usedIds.has(id));
    if (deletable.length) await sb.from("questions").delete().in("id", deletable);
    // Used questions are hidden from the bank by moving them out of the ordered list.
    if (usedIds.size) await sb.from("questions").update({ position: 100000 }).in("id", [...usedIds]);
  }
  announceChange("bank");
  return saved;
}

/* ---------------- Live session records ---------------- */

/** Starts (or resumes) the running session for a class. */
export async function openSession(classId: string, teacherId: string, groupId: string | null = null): Promise<{ id: string; startedAt: number }> {
  const sb = supabase();
  const existing = await sb.from("sessions").select("id, started_at, group_id").eq("class_id", classId).is("ended_at", null).maybeSingle();
  if (existing.data) {
    if ((existing.data.group_id ?? null) === groupId) return { id: existing.data.id, startedAt: new Date(existing.data.started_at).getTime() };
    // A session left open for another group: close it before starting this one.
    await sb.from("sessions").update({ ended_at: new Date().toISOString() }).eq("id", existing.data.id);
  }
  const { data, error } = await sb
    .from("sessions")
    .insert({ class_id: classId, teacher_id: teacherId, group_id: groupId })
    .select("id, started_at")
    .single();
  if (error) throw error;
  announceChange("sessions");
  return { id: data.id, startedAt: new Date(data.started_at).getTime() };
}

export async function endSession(sessionId: string, peakConnected: number) {
  await supabase().from("sessions").update({ ended_at: new Date().toISOString(), peak_connected: peakConnected }).eq("id", sessionId);
  announceChange("sessions");
}

export async function publishToSession(sessionId: string, q: Question, position: number) {
  const stored = await persistQuestion(q, position);
  const { data, error } = await supabase()
    .from("session_questions")
    .insert({ session_id: sessionId, question_id: stored.id })
    .select("id, published_at")
    .single();
  if (error) throw error;
  return { question: stored, sessionQuestionId: data.id as string, publishedAt: new Date(data.published_at).getTime() };
}

export async function closeSessionQuestion(sessionQuestionId: string, release = false) {
  const now = new Date().toISOString();
  await supabase()
    .from("session_questions")
    .update(release ? { closed_at: now, released_at: now } : { closed_at: now })
    .eq("id", sessionQuestionId);
}

export async function recordAnswer(sessionQuestionId: string, a: StudentAnswer) {
  if (a.simulated) return;
  await supabase().from("answers").upsert(
    {
      session_question_id: sessionQuestionId,
      student_id: a.studentId,
      answer_text: a.text.slice(0, 4000),
      choice: a.choice ?? null,
      status: a.status,
      feedback: a.feedback ?? null,
    },
    { onConflict: "session_question_id,student_id" },
  );
}

export async function markAnswer(sessionQuestionId: string, studentId: string, status: AnswerStatus, feedback?: string) {
  await supabase()
    .from("answers")
    .update({ status, feedback: feedback ?? null })
    .eq("session_question_id", sessionQuestionId)
    .eq("student_id", studentId);
}

/* ---------------- History ---------------- */

/** Finished sessions of a class with every question, answer and student name (teacher only). */
export function useClassHistory(classId: string | undefined) {
  const { data, loading } = useRemote(
    classId ? `history:${classId}` : null,
    async (): Promise<SessionRecord[]> => {
      const sb = supabase();
      const { data: sessions, error } = await sb
        .from("sessions")
        .select(
          "id, class_id, group_id, teacher_id, started_at, ended_at, peak_connected, session_questions(id, published_at, closed_at, released_at, questions(*, question_keys(correct, accepted, explanation)), answers(student_id, answer_text, choice, status, feedback, created_at, profiles(first_name, last_name)))",
        )
        .eq("class_id", classId!)
        .not("ended_at", "is", null)
        .order("started_at", { ascending: false })
        .limit(30);
      if (error) throw error;
      type A = { student_id: string; answer_text: string; choice: number[] | null; status: AnswerStatus; feedback: string | null; created_at: string; profiles: { first_name: string; last_name: string } | null };
      type SQ = { id: string; published_at: string; closed_at: string | null; released_at: string | null; questions: QuestionRow | null; answers: A[] };
      type S = { id: string; class_id: string; group_id: string | null; teacher_id: string; started_at: string; ended_at: string | null; peak_connected: number; session_questions: SQ[] };
      return (sessions as unknown as S[]).map((s) => {
        const asked = [...s.session_questions]
          .sort((a, b) => a.published_at.localeCompare(b.published_at))
          .filter((sq) => sq.questions)
          .map((sq) => ({
            question: fromRow(sq.questions!),
            sessionQuestionId: sq.id,
            publishedAt: new Date(sq.published_at).getTime(),
            closedAt: sq.closed_at ? new Date(sq.closed_at).getTime() : undefined,
            released: !!sq.released_at,
            answers: sq.answers.map((a) => ({
              studentId: a.student_id,
              name: `${a.profiles?.first_name ?? ""} ${a.profiles?.last_name ?? ""}`.trim() || "—",
              text: a.answer_text,
              choice: a.choice ?? undefined,
              status: a.status,
              feedback: a.feedback ?? undefined,
              at: new Date(a.created_at).getTime(),
            })),
          }));
        const answerers = new Set(asked.flatMap((a) => a.answers.map((x) => x.studentId)));
        return {
          id: s.id,
          classId: s.class_id,
          groupId: s.group_id,
          teacherId: s.teacher_id,
          startedAt: new Date(s.started_at).getTime(),
          endedAt: s.ended_at ? new Date(s.ended_at).getTime() : undefined,
          connected: Math.max(s.peak_connected, answerers.size),
          asked,
        };
      });
    },
    [] as SessionRecord[],
    "sessions",
  );
  return { sessions: data, loading };
}

export type MyAnswer = StudentAnswer & { prompt: string; classId: string; released: boolean };

/** A student's own answers with feedback (status shown only once the teacher released the answer). */
export function useMyAnswers(studentId: string | undefined) {
  const { data, loading } = useRemote(
    studentId ? `mine:${studentId}` : null,
    async (): Promise<MyAnswer[]> => {
      const { data, error } = await supabase()
        .from("answers")
        .select("answer_text, choice, status, feedback, created_at, session_questions(released_at, questions(prompt, class_id))")
        .eq("student_id", studentId!)
        .order("created_at", { ascending: false })
        .limit(40);
      if (error) throw error;
      type R = { answer_text: string; choice: number[] | null; status: AnswerStatus; feedback: string | null; created_at: string; session_questions: { released_at: string | null; questions: { prompt: string; class_id: string } | null } | null };
      return (data as unknown as R[]).map((r) => ({
        studentId: studentId!,
        name: "",
        text: r.answer_text,
        choice: r.choice ?? undefined,
        status: r.status,
        feedback: r.feedback ?? undefined,
        at: new Date(r.created_at).getTime(),
        prompt: r.session_questions?.questions?.prompt ?? "",
        classId: r.session_questions?.questions?.class_id ?? "",
        released: !!r.session_questions?.released_at || !!r.feedback,
      }));
    },
    [] as MyAnswer[],
    "sessions",
  );
  return { answers: data, loading };
}

/* ---------------- Example classmates (clearly labelled simulation, never saved) ---------------- */

export const exampleClassmates = [
  "Amine K.", "Sarra M.", "Youssef B.", "Mariem T.", "Omar F.", "Ines H.", "Aziz D.", "Nour C.",
  "Rayen S.", "Eya L.", "Mehdi G.", "Chaima A.", "Firas J.", "Rania Z.", "Skander E.", "Lina R.",
  "Hamza N.", "Yasmine O.", "Malek W.", "Asma Y.", "Bilel Q.", "Salma V.", "Karim P.", "Fatma I.",
];

/** Produces a plausible answer for a simulated classmate. */
export function simulateAnswer(q: Question, index: number): { text: string; choice?: number[] } {
  const skill = ((index * 37) % 100) / 100; // deterministic spread of abilities
  if (q.type === "choice") {
    const opts = q.options ?? [];
    const right = q.correct?.[0] ?? 0;
    const pick = skill > 0.3 ? right : (right + 1 + (index % Math.max(1, opts.length - 1))) % opts.length;
    return { text: opts[pick] ?? "", choice: [pick] };
  }
  if (q.type === "numeric") {
    const nums = (q.accepted ?? []).flatMap(extractNumbers);
    if (skill > 0.32) return { text: nums.join("; ") };
    if (skill > 0.12) return { text: nums.map((n) => -n).join("; ") };
    return { text: nums.slice(0, 1).join("; ") };
  }
  if (q.type === "short") {
    const accepted = q.accepted ?? [];
    if (skill > 0.35 && accepted[0]) return { text: accepted[0] };
    return { text: skill > 0.15 ? "I am not sure" : "…" };
  }
  const samples = [
    "I looked for two numbers with the right product and sum, then wrote the factors.",
    "(x − 4)(x − 5) because −4 × −5 = 20 and −4 + −5 = −9",
    "I tried (x + 4)(x + 5) but the signs do not work.",
  ];
  return { text: samples[index % samples.length] };
}
