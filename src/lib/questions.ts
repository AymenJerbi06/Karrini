"use client";

// Question bank, grading rules and session history for the live classroom.

import { useMemo, useSyncExternalStore } from "react";

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
  publishedAt: number;
  closedAt?: number;
  released?: boolean;
  answers: StudentAnswer[];
};

export type SessionRecord = {
  id: string;
  classId: string;
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
    return accepted.every((v, i) => Math.abs(v - given[i]) < 1e-6 + Math.abs(v) * 1e-4)
      ? "correct"
      : "incorrect";
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

/* ---------------- Question bank storage ---------------- */

const BANK = "qarrini-question-bank";
const HISTORY = "qarrini-session-history";
const EVENT = "qarrini-questions-changed";

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

function readJSON<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function subscribe(cb: () => void) {
  window.addEventListener("storage", cb);
  window.addEventListener(EVENT, cb);
  return () => {
    window.removeEventListener("storage", cb);
    window.removeEventListener(EVENT, cb);
  };
}

const notify = () => window.dispatchEvent(new Event(EVENT));

export function readBank(classId: string): Question[] {
  const all = readJSON<Record<string, Question[]>>(BANK, {});
  return all[classId] ?? starterQuestions(classId);
}

export function saveBank(classId: string, list: Question[]) {
  const all = readJSON<Record<string, Question[]>>(BANK, {});
  all[classId] = list;
  window.localStorage.setItem(BANK, JSON.stringify(all));
  notify();
}

export function useQuestionBank(classId: string | undefined) {
  const raw = useSyncExternalStore(
    subscribe,
    () => {
      try {
        return window.localStorage.getItem(BANK) ?? "";
      } catch {
        return "";
      }
    },
    () => null,
  );
  return useMemo(() => (raw === null || !classId ? [] : readBank(classId)), [raw, classId]);
}

export function newQuestionId() {
  return `q-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

/* ---------------- Session history ---------------- */

export function readHistory(): SessionRecord[] {
  return readJSON<SessionRecord[]>(HISTORY, []);
}

export function saveSession(record: SessionRecord) {
  const list = readHistory().filter((s) => s.id !== record.id);
  // Photos are large; keep history light.
  const light: SessionRecord = {
    ...record,
    asked: record.asked.map((a) => ({
      ...a,
      answers: a.answers.map(({ photo, ...rest }) => ({ ...rest, ...(photo ? { photo: "attached" } : {}) })),
    })),
  };
  window.localStorage.setItem(HISTORY, JSON.stringify([light, ...list].slice(0, 30)));
  notify();
}

export function useHistory() {
  const raw = useSyncExternalStore(
    subscribe,
    () => {
      try {
        return window.localStorage.getItem(HISTORY) ?? "";
      } catch {
        return "";
      }
    },
    () => null,
  );
  return useMemo(() => (raw === null ? [] : readHistory()), [raw]);
}

/* ---------------- Example classmates (clearly labelled simulation) ---------------- */

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
