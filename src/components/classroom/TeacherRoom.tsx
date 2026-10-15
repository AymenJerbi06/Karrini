"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "@/components/LocalizedLink";
import { Localized, T, useI18n } from "@/components/I18n";
import { fieldClass, primaryButton, secondaryButton } from "@/components/SiteUi";
import {
  CameraIcon,
  CameraOffIcon,
  HandIcon,
  MicIcon,
  MicOffIcon,
  PlusIcon,
  ScreenIcon,
  UsersIcon,
  VideoIcon,
} from "@/components/icons";
import { CountUp, Toast } from "@/components/ui/Motion";
import { QuestionEditor, QuestionSummary } from "@/components/classroom/QuestionEditor";
import { ResultsPanel, statusLabel, statusTone, downloadText, sessionCsv } from "@/components/classroom/ResultsPanel";
import { VideoTile } from "@/components/classroom/VideoTile";
import { localizeQuestion } from "@/components/classroom/localize";
import {
  hostPeer,
  toPublic,
  type ResultMsg,
  type SessionState,
  type StudentAnswerMsg,
  type StudentHello,
} from "@/components/classroom/protocol";
import { createTransport, type RealtimeTransport } from "@/lib/realtime";
import { useClassroomCall } from "@/lib/useClassroomCall";
import {
  correctAnswerText,
  exampleClassmates,
  grade,
  saveBank,
  closeSessionQuestion,
  endSession as endSessionRecord,
  markAnswer,
  openSession,
  publishToSession,
  recordAnswer,
  simulateAnswer,
  summarize,
  useQuestionBank,
  type AnswerStatus,
  type AskedQuestion,
  type Question,
  type SessionRecord,
  type StudentAnswer,
} from "@/lib/questions";
import { displayName, type Account } from "@/lib/auth";
import { cn } from "@/lib/cn";

type Peer = { id: string; name: string; lastSeen: number; hand: boolean };

const LIVE_KEY = (classId: string) => `qarrini-live-session:${classId}`;

/** Restores an unfinished session after a page refresh (up to 4 hours old). */
function restoreSession(classId: string): SessionRecord | null {
  try {
    const saved = window.localStorage.getItem(LIVE_KEY(classId));
    if (!saved) return null;
    const s = JSON.parse(saved) as SessionRecord;
    return !s.endedAt && Date.now() - s.startedAt < 4 * 3600_000 ? s : null;
  } catch {
    return null;
  }
}

function useNow(ms = 1000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(t);
  }, [ms]);
  return now;
}

const clock = (ms: number) => {
  const s = Math.max(0, Math.floor(ms / 1000));
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
};

export function TeacherRoom({ account, classId, subjectLabel }: { account: Account; classId: string; subjectLabel: string }) {
  const { t } = useI18n();
  const teacherName = displayName(account);
  const selfId = hostPeer(classId);
  const rawBank = useQuestionBank(classId);
  const bank = useMemo(() => rawBank.map((q) => localizeQuestion(q, t)), [rawBank, t]);

  const [transport, setTransport] = useState<RealtimeTransport | null>(null);
  // This room only renders in the browser (after sign-in is known), so storage is available here.
  const [session, setSession] = useState<SessionRecord | null>(() => restoreSession(classId));
  const [peers, setPeers] = useState<Record<string, Peer>>({});
  // Real classes default to real students only; example classmates are an opt-in demo.
  const [examples, setExamples] = useState(false);
  const [publishedBankIds, setPublishedBankIds] = useState<string[]>([]);
  const peak = useRef(0);
  const [panel, setPanel] = useState<"prepared" | "new" | "students">("prepared");
  const [selected, setSelected] = useState<StudentAnswer | null>(null);
  const [comment, setComment] = useState("");
  const [shared, setShared] = useState<SessionState["shared"]>();
  const [toast, setToast] = useState("");
  const [ended, setEnded] = useState<SessionRecord | null>(null);
  const timers = useRef<number[]>([]);
  const sessionRef = useRef<SessionRecord | null>(null);
  const now = useNow();

  useEffect(() => {
    sessionRef.current = session;
    if (session) window.localStorage.setItem(LIVE_KEY(classId), JSON.stringify(session));
  }, [session, classId]);

  // One transport per room for the lifetime of the page.
  useEffect(() => {
    const tr = createTransport(classId, selfId);
    // Syncing with an external system (the realtime channel); it is opened here and closed in cleanup.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTransport(tr);
    return () => {
      timers.current.forEach(clearTimeout);
      tr.close();
    };
  }, [classId, selfId]);

  const call = useClassroomCall({ transport, hostId: selfId, role: "teacher", demoLabel: teacherName });

  const current: AskedQuestion | undefined = session?.asked[session.asked.length - 1];
  const realPeers = Object.values(peers).filter((p) => now - p.lastSeen < 15_000);
  useEffect(() => {
    peak.current = Math.max(peak.current, realPeers.length);
  }, [realPeers.length]);
  const connected = realPeers.length + (examples ? exampleClassmates.length : 0);

  const publicState = useCallback((): SessionState => {
    const s = sessionRef.current;
    const q = s?.asked[s.asked.length - 1];
    return {
      live: !!s && !s.endedAt,
      teacherName,
      startedAt: s?.startedAt,
      question: q ? { ...toPublic(q.question, q.publishedAt), closed: !!q.closedAt } : undefined,
      release:
        q?.released
          ? (() => {
              const x = summarize(q, connected);
              return {
                questionId: q.question.id,
                correctText: correctAnswerText(q.question),
                explanation: q.question.explanation,
                correct: x.correct,
                incorrect: x.incorrect,
                graded: x.graded,
              };
            })()
          : undefined,
      shared,
    };
  }, [teacherName, connected, shared]);

  const broadcast = useCallback(() => transport?.send("session-state", publicState()), [transport, publicState]);

  // Keep students in sync and the "live" badge fresh.
  useEffect(() => {
    if (!session || session.endedAt) return;
    broadcast();
    const beat = setInterval(broadcast, 5000);
    return () => clearInterval(beat);
  }, [session, broadcast]);

  const updateCurrent = useCallback((fn: (a: AskedQuestion) => AskedQuestion) => {
    setSession((s) => (s && s.asked.length ? { ...s, asked: [...s.asked.slice(0, -1), fn(s.asked[s.asked.length - 1])] } : s));
  }, []);

  const addAnswer = useCallback(
    (answer: StudentAnswer, questionId: string) => {
      setSession((s) => {
        if (!s) return s;
        const last = s.asked[s.asked.length - 1];
        if (!last || last.question.id !== questionId || last.closedAt) return s;
        if (last.answers.some((a) => a.studentId === answer.studentId)) return s;
        return { ...s, asked: [...s.asked.slice(0, -1), { ...last, answers: [...last.answers, answer] }] };
      });
    },
    [],
  );

  // Incoming student messages.
  useEffect(() => {
    if (!transport) return;
    return transport.subscribe((m) => {
      if (m.type === "hello" || m.type === "ping") {
        const { name } = m.payload as StudentHello;
        setPeers((p) => ({ ...p, [m.from]: { id: m.from, name, lastSeen: Date.now(), hand: p[m.from]?.hand ?? false } }));
        if (m.type === "hello") transport.send("session-state", publicState(), m.from);
      }
      if (m.type === "leave") setPeers((p) => Object.fromEntries(Object.entries(p).filter(([id]) => id !== m.from)));
      if (m.type === "hand") {
        const up = (m.payload as { up: boolean }).up;
        setPeers((p) => (p[m.from] ? { ...p, [m.from]: { ...p[m.from], hand: up } } : p));
        if (up) setToast(t("{name} raised a hand", { name: (m.payload as { name?: string }).name ?? "" }));
      }
      if (m.type === "answer") {
        const a = m.payload as StudentAnswerMsg;
        const q = sessionRef.current?.asked[sessionRef.current.asked.length - 1]?.question;
        const current = sessionRef.current?.asked[sessionRef.current.asked.length - 1];
        if (!q || !current || q.id !== a.questionId || current.closedAt) return;
        if (current.answers.some((x) => x.studentId === m.from)) return;
        const answer: StudentAnswer = { studentId: m.from, name: a.name, text: a.text, choice: a.choice, photo: a.photo, status: grade(q, a), at: Date.now() };
        addAnswer(answer, a.questionId);
        if (current.sessionQuestionId) void recordAnswer(current.sessionQuestionId, answer).catch(() => undefined);
        transport.send("answer-received", { questionId: a.questionId }, m.from);
      }
    });
  }, [transport, publicState, addAnswer, t]);

  async function startSession() {
    try {
      const { id, startedAt } = await openSession(classId, account.id);
      setSession({ id, classId, teacherId: account.id, startedAt, connected, asked: [] });
      setEnded(null);
      void call.start();
    } catch {
      setToast(t("The session could not be started. Check your connection and try again."));
    }
  }

  function scheduleExamples(q: Question) {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    if (!examples) return;
    exampleClassmates.forEach((name, i) => {
      if ((i * 53) % 100 < 12) return; // a few never answer
      const delay = 1500 + ((i * 977) % 14000);
      timers.current.push(
        window.setTimeout(() => {
          const sim = simulateAnswer(q, i);
          const text = q.type === "written" || q.type === "short" ? t(sim.text) : sim.text;
          addAnswer(
            { studentId: `example-${i}`, name, text, choice: sim.choice, status: grade(q, { ...sim, text: sim.text }), at: Date.now(), simulated: true },
            q.id,
          );
        }, delay),
      );
    });
  }

  async function publish(q: Question) {
    if (!session) return;
    if (current && !current.closedAt) closeQuestion(true);
    let published;
    try {
      published = await publishToSession(session.id, q, session.asked.length);
    } catch {
      setToast(t("The question could not be sent. Check your connection and try again."));
      return;
    }
    const asked: AskedQuestion = { question: published.question, sessionQuestionId: published.sessionQuestionId, publishedAt: published.publishedAt, answers: [] };
    setSession((s) => (s ? { ...s, connected, asked: [...s.asked, asked] } : s));
    setPublishedBankIds((ids) => (ids.includes(q.id) ? ids : [...ids, q.id]));
    setShared(undefined);
    setSelected(null);
    scheduleExamples(published.question);
    if (q.timeLimit) timers.current.push(window.setTimeout(() => closeQuestion(), q.timeLimit * 1000));
    setToast(t("Question sent to {n} students.", { n: connected }));
  }

  function closeQuestion(silent = false) {
    const sq = sessionRef.current?.asked[sessionRef.current.asked.length - 1];
    if (sq?.sessionQuestionId && !sq.closedAt) void closeSessionQuestion(sq.sessionQuestionId).catch(() => undefined);
    updateCurrent((a) => (a.closedAt ? a : { ...a, closedAt: Date.now() }));
    if (!silent) setToast(t("Answers are closed."));
  }

  function release() {
    const s = sessionRef.current;
    const q = s?.asked[s.asked.length - 1];
    if (!q || !transport) return;
    updateCurrent((a) => ({ ...a, released: true, closedAt: a.closedAt ?? Date.now() }));
    if (q.sessionQuestionId) void closeSessionQuestion(q.sessionQuestionId, true).catch(() => undefined);
    q.answers
      .filter((a) => !a.simulated)
      .forEach((a) => transport.send("result", { questionId: q.question.id, status: a.status, feedback: a.feedback } satisfies ResultMsg, a.studentId));
    setToast(t("Correct answer released to the class."));
  }

  function markSelected(status: AnswerStatus) {
    if (!selected || !current) return;
    const feedback = comment.trim() || undefined;
    updateCurrent((a) => ({
      ...a,
      answers: a.answers.map((x) => (x.studentId === selected.studentId ? { ...x, status, feedback } : x)),
    }));
    if (!selected.simulated) {
      transport?.send("result", { questionId: current.question.id, status, feedback } satisfies ResultMsg, selected.studentId);
      if (current.sessionQuestionId) void markAnswer(current.sessionQuestionId, selected.studentId, status, feedback).catch(() => undefined);
    }
    setToast(t("Feedback sent privately to {name}.", { name: selected.name }));
    setSelected(null);
    setComment("");
  }

  function shareSelected() {
    if (!selected || !current) return;
    setShared({
      questionId: current.question.id,
      text: selected.text,
      feedback: comment.trim() || current.question.explanation || "",
      at: Date.now(),
    });
    setToast(t("Shared with the class without the student's name."));
  }

  function endSession() {
    if (!session) return;
    timers.current.forEach(clearTimeout);
    const record = { ...session, connected, endedAt: Date.now() };
    void endSessionRecord(session.id, Math.max(peak.current, realPeers.length)).catch(() => undefined);
    transport?.send("session-state", { live: false, teacherName } satisfies SessionState);
    window.localStorage.removeItem(LIVE_KEY(classId));
    call.stop();
    setSession(null);
    setEnded(record);
  }

  // Broadcast immediately whenever the visible state changes.
  useEffect(() => {
    if (session && !session.endedAt) broadcast();
  }, [current?.question.id, current?.closedAt, current?.released, shared, broadcast, session]);

  const askedIds = new Set([...publishedBankIds, ...(session?.asked.map((a) => a.question.id) ?? [])]);
  const timeLeft = current?.question.timeLimit && !current.closedAt ? current.publishedAt + current.question.timeLimit * 1000 - now : null;
  const studentStreams = call.remotes;

  /* ---------------- Before the session ---------------- */
  if (!session) {
    return (
      <div className="mx-auto max-w-6xl px-6 py-10">
        {ended && <SessionSummary record={ended} />}
        <div className="grid items-start gap-8 lg:grid-cols-[1.2fr_1fr]">
          <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm md:p-8">
            <p className="text-sm font-semibold tracking-wide text-brand uppercase">
              <T>Live class</T> · {t(subjectLabel)}
            </p>
            <h1 className="home-heading font-display mt-3 text-3xl font-extrabold text-gray-900">
              <T>Ready to teach?</T>
            </h1>
            <p className="mt-3 leading-7 text-gray-500">
              <T>Start the session to turn on your camera and open the classroom to your enrolled students.</T>
            </p>
            <VideoTile
              stream={call.localStream}
              muted
              mirror
              className="mt-6 aspect-video"
              placeholder={
                <span className="flex flex-col items-center gap-3">
                  <VideoIcon className="h-10 w-10 text-gray-500" />
                  <T>Your camera turns on when the session starts.</T>
                </span>
              }
            />
            <label className="mt-6 flex items-start gap-3 rounded-xl border border-gray-200 p-4 text-sm">
              <input type="checkbox" checked={examples} onChange={(e) => setExamples(e.target.checked)} className="mt-0.5 h-5 w-5" />
              <span>
                <span className="block font-semibold text-gray-800">{t("Fill the class with {n} example students", { n: exampleClassmates.length })}</span>
                <span className="mt-1 block text-gray-500">
                  <T>Simulated classmates answer each question so you can see realistic results. They are labelled “example”.</T>
                </span>
              </span>
            </label>
            <button type="button" onClick={startSession} className={`${primaryButton} mt-6 w-full`}>
              <span className="h-2.5 w-2.5 rounded-full bg-red-400" aria-hidden />
              <T>Start live session</T>
            </button>
          </section>
          <aside className="space-y-6">
            <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <h2 className="font-display text-lg font-bold text-gray-800">{t("Prepared questions ({n})", { n: bank.length })}</h2>
                <Link href="/teach/questions" className="text-sm font-semibold text-brand hover:underline">
                  <T>Edit</T>
                </Link>
              </div>
              <ol className="mt-4 space-y-3">
                {bank.slice(0, 5).map((q) => (
                  <li key={q.id} className="rounded-lg bg-gray-50 p-3">
                    <QuestionSummary q={q} />
                  </li>
                ))}
              </ol>
            </section>
            <TwoWindowTip />
          </aside>
        </div>
      </div>
    );
  }

  /* ---------------- During the session ---------------- */
  const s = summarize(current, connected);
  return (
    <div className="mx-auto max-w-7xl px-4 py-6 md:px-6">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-gray-800 px-5 py-3 text-white">
        <div className="flex items-center gap-3">
          <span className="animate-live flex items-center gap-2 rounded-md bg-red-600 px-2.5 py-1 text-xs font-bold">
            <span className="h-2 w-2 rounded-full bg-white" /> <T>LIVE</T>
          </span>
          <span className="font-semibold">{t(subjectLabel)}</span>
          <span className="text-sm text-gray-300 tabular-nums" dir="ltr">
            {clock(now - session.startedAt)}
          </span>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <span className="flex items-center gap-1.5 text-gray-200">
            <UsersIcon className="h-4 w-4" /> {t("{n} connected", { n: connected })}
          </span>
          <button type="button" onClick={endSession} className="min-h-10 rounded-md bg-white/10 px-4 font-semibold hover:bg-red-600">
            <T>End session</T>
          </button>
        </div>
      </div>

      <div className="mt-5 grid items-start gap-5 lg:grid-cols-[1fr_360px]">
        <div className="min-w-0 space-y-5">
          <div className="grid gap-3 sm:grid-cols-[1fr_180px]">
            <VideoTile
              stream={call.sharing ? call.screenStream : call.localStream}
              muted
              mirror={!call.sharing}
              className="aspect-video"
              label={call.sharing ? t("You are sharing your screen") : teacherName}
              badge={
                call.usingDemoCamera ? (
                  <span className="rounded bg-amber-400 px-2 py-0.5 text-[11px] font-bold text-gray-900">
                    <T>Demo camera</T>
                  </span>
                ) : null
              }
              placeholder={<T>Starting your camera…</T>}
            />
            <div className="flex gap-3 overflow-x-auto sm:flex-col">
              {studentStreams.length ? (
                studentStreams.map((r) => (
                  <VideoTile key={r.id} stream={r.stream} className="aspect-video w-40 shrink-0 sm:w-full" label={peers[r.id]?.name ?? t("Student")} />
                ))
              ) : (
                <p className="rounded-xl border border-dashed border-gray-300 p-4 text-xs leading-5 text-gray-500">
                  <T>Student cameras appear here when they turn them on.</T>
                </p>
              )}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <CallButton on={call.micOn} onClick={call.toggleMic} OnIcon={MicIcon} OffIcon={MicOffIcon} label={call.micOn ? "Mute" : "Unmute"} />
            <CallButton on={call.camOn} onClick={call.toggleCam} OnIcon={CameraIcon} OffIcon={CameraOffIcon} label={call.camOn ? "Stop camera" : "Start camera"} />
            <CallButton on={!call.sharing} onClick={call.toggleScreen} OnIcon={ScreenIcon} OffIcon={ScreenIcon} label={call.sharing ? "Stop sharing" : "Share screen"} />
            <span className="ms-auto text-xs text-gray-500">{t("Video: {n} students connected", { n: call.viewers })}</span>
          </div>
          {call.error && (
            <p role="alert" className="text-sm text-red-700">
              <T>{call.error}</T>
            </p>
          )}

          <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm md:p-6">
            {current ? (
              <>
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <QuestionSummary q={current.question} />
                  <div className="flex items-center gap-2">
                    {timeLeft !== null && (
                      <span className={cn("rounded-md px-2.5 py-1 font-mono text-sm font-bold", timeLeft < 10_000 ? "bg-red-50 text-red-700" : "bg-gray-100 text-gray-700")} dir="ltr">
                        {clock(timeLeft)}
                      </span>
                    )}
                    <span className={cn("rounded-md px-2.5 py-1 text-xs font-semibold", current.closedAt ? "bg-gray-100 text-gray-600" : "bg-emerald-50 text-emerald-700")}>
                      <T>{current.released ? "Answer released" : current.closedAt ? "Answers closed" : "Accepting answers"}</T>
                    </span>
                  </div>
                </div>
                <p className="mt-4 text-sm text-gray-500">
                  <CountUp value={s.answered} className="font-display text-2xl font-extrabold text-gray-900" />{" "}
                  {t("of {n} answered", { n: connected })}
                </p>
                <div className="mt-5">
                  <ResultsPanel
                    asked={current}
                    connected={connected}
                    compact
                    onOpen={(a) => {
                      setSelected(a);
                      setComment(a.feedback ?? "");
                    }}
                  />
                </div>
                {selected && (
                  <div className="animate-rise mt-5 rounded-xl border border-blue-200 bg-blue-50/50 p-5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h3 className="font-semibold text-gray-800">
                        <bdi dir="auto">{selected.name}</bdi>
                      </h3>
                      <span className={cn("rounded px-2 py-1 text-xs font-semibold", statusTone[selected.status])}>
                        <T>{statusLabel[selected.status]}</T>
                      </span>
                    </div>
                    <p dir="auto" className="mt-3 rounded-lg bg-white p-3 font-mono text-sm break-words whitespace-pre-wrap text-gray-700">
                      {selected.text}
                    </p>
                    {selected.photo && selected.photo !== "attached" && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={selected.photo} alt={t("Student's handwritten work")} className="mt-3 max-h-72 rounded-lg border border-gray-200" />
                    )}
                    <label className="mt-4 block text-sm font-semibold text-gray-700">
                      <T>Private feedback</T>
                      <Localized
                        as="textarea"
                        rows={2}
                        dir="auto"
                        value={comment}
                        onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setComment(e.target.value)}
                        placeholder="Explain the mistake or encourage the student…"
                        className={fieldClass}
                      />
                    </label>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <button type="button" onClick={() => markSelected("correct")} className="min-h-11 rounded-md bg-brand px-4 text-sm font-semibold text-white hover:bg-brand-dark">
                        <T>Mark correct</T>
                      </button>
                      <button type="button" onClick={() => markSelected("incorrect")} className="min-h-11 rounded-md bg-red-600 px-4 text-sm font-semibold text-white hover:bg-red-700">
                        <T>Mark incorrect</T>
                      </button>
                      <button type="button" onClick={shareSelected} className={`${secondaryButton} min-h-11 py-0 text-sm`}>
                        <T>Share anonymously</T>
                      </button>
                      <button type="button" onClick={() => setSelected(null)} className="min-h-11 px-3 text-sm text-gray-500 underline">
                        <T>Close</T>
                      </button>
                    </div>
                  </div>
                )}
                <div className="mt-6 flex flex-wrap gap-3 border-t border-gray-100 pt-5">
                  {!current.closedAt && (
                    <button type="button" onClick={() => closeQuestion()} className={secondaryButton}>
                      <T>Close answers</T>
                    </button>
                  )}
                  <button type="button" disabled={current.released} onClick={release} className={primaryButton}>
                    <T>{current.released ? "Answer released ✓" : "Release the correct answer"}</T>
                  </button>
                </div>
              </>
            ) : (
              <div className="py-8 text-center">
                <h2 className="font-display text-xl font-bold text-gray-800">
                  <T>Send your first question</T>
                </h2>
                <p className="mt-2 text-sm text-gray-500">
                  <T>Pick a prepared question on the right, or write a new one now.</T>
                </p>
              </div>
            )}
          </section>

          {session.asked.length > 1 && (
            <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <h2 className="font-display text-lg font-bold text-gray-800">
                <T>Earlier in this lesson</T>
              </h2>
              <ul className="mt-3 divide-y divide-gray-100">
                {session.asked.slice(0, -1).map((a, i) => {
                  const x = summarize(a, session.connected);
                  return (
                    <li key={a.question.id + i} className="flex items-center justify-between gap-4 py-3 text-sm">
                      <span dir="auto" className="min-w-0 truncate text-gray-700">
                        {i + 1}. {a.question.prompt}
                      </span>
                      <span className="shrink-0 text-gray-500" dir="ltr">
                        ✓ {x.correct} · ✗ {x.incorrect} · {x.correctPct}%
                      </span>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}
        </div>

        <aside className="space-y-4 lg:sticky lg:top-4">
          <Localized as="div" role="group" aria-label="Classroom panels" className="grid grid-cols-3 gap-1 rounded-xl bg-gray-100 p-1">
            {(
              [
                ["prepared", "Prepared"],
                ["new", "New question"],
                ["students", "Students"],
              ] as const
            ).map(([k, label]) => (
              <button
                key={k}
                type="button"
                aria-pressed={panel === k}
                onClick={() => setPanel(k)}
                className={cn("relative min-h-11 rounded-lg px-2 text-xs font-semibold sm:text-sm", panel === k ? "bg-white text-gray-900 shadow" : "text-gray-500")}
              >
                <T>{label}</T>
                {k === "students" && realPeers.some((p) => p.hand) && (
                  <span className="absolute end-1.5 top-1.5 h-2 w-2 rounded-full bg-amber-500" aria-hidden />
                )}
              </button>
            ))}
          </Localized>

          {panel === "prepared" && (
            <div className="animate-rise space-y-3">
              {bank.map((q) => (
                <div key={q.id} className={cn("rounded-xl border bg-white p-4 shadow-sm", askedIds.has(q.id) ? "border-gray-200 opacity-70" : "border-gray-200")}>
                  <QuestionSummary q={q} />
                  <button
                    type="button"
                    onClick={() => publish(q)}
                    className={cn("mt-3 w-full", askedIds.has(q.id) ? secondaryButton : primaryButton, "min-h-11 py-2 text-sm")}
                  >
                    <T>{askedIds.has(q.id) ? "Send again" : "Send to class"}</T>
                  </button>
                </div>
              ))}
              <Link href="/teach/questions" className="block text-center text-sm font-semibold text-brand hover:underline">
                <T>Manage prepared questions</T>
              </Link>
            </div>
          )}

          {panel === "new" && (
            <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
              <p className="mb-4 flex items-center gap-2 text-sm font-semibold text-gray-700">
                <PlusIcon className="h-4 w-4 text-brand" />
                <T>Write a question now</T>
              </p>
              <QuestionEditor
                classId={classId}
                origin="live"
                submitLabel="Send to class"
                onSubmit={(q) => {
                  publish(q);
                  saveBank(classId, [...rawBank, q]);
                  setPanel("prepared");
                }}
              />
            </div>
          )}

          {panel === "students" && (
            <div className="animate-rise rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
              <p className="text-sm font-semibold text-gray-700">{t("{n} students with an account are here", { n: realPeers.length })}</p>
              {realPeers.length ? (
                <ul className="mt-3 divide-y divide-gray-100">
                  {realPeers.map((p) => {
                    const answer = current?.answers.find((a) => a.studentId === p.id);
                    return (
                      <li key={p.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                        <span className="flex min-w-0 items-center gap-2">
                          {p.hand && <HandIcon className="h-5 w-5 shrink-0 animate-bounce text-amber-500" />}
                          <bdi dir="auto" className="truncate font-semibold text-gray-800">
                            {p.name}
                          </bdi>
                        </span>
                        <span className="flex shrink-0 items-center gap-2">
                          {answer ? (
                            <span className={cn("rounded px-2 py-0.5 text-xs font-semibold", statusTone[answer.status])}>
                              <T>{statusLabel[answer.status]}</T>
                            </span>
                          ) : current ? (
                            <span className="text-xs text-gray-400">
                              <T>Working…</T>
                            </span>
                          ) : null}
                          {p.hand && (
                            <button
                              type="button"
                              onClick={() => {
                                setPeers((all) => ({ ...all, [p.id]: { ...p, hand: false } }));
                                transport?.send("hand-lowered", {}, p.id);
                              }}
                              className="text-xs font-semibold text-brand underline"
                            >
                              <T>Lower hand</T>
                            </button>
                          )}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="mt-3 text-sm leading-6 text-gray-500">
                  <T>Nobody has joined from another window yet.</T>
                </p>
              )}
              {examples && (
                <p className="mt-4 rounded-lg bg-gray-50 p-3 text-xs text-gray-500">{t("+ {n} example students (simulated)", { n: exampleClassmates.length })}</p>
              )}
              <div className="mt-4">
                <TwoWindowTip compact />
              </div>
            </div>
          )}
        </aside>
      </div>
      <Toast message={toast} onDone={() => setToast("")} />
    </div>
  );
}

function CallButton({
  on,
  onClick,
  OnIcon,
  OffIcon,
  label,
}: {
  on: boolean;
  onClick: () => void;
  OnIcon: typeof MicIcon;
  OffIcon: typeof MicIcon;
  label: string;
}) {
  const Icon = on ? OnIcon : OffIcon;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={!on}
      className={cn(
        "inline-flex min-h-11 items-center gap-2 rounded-full px-4 text-sm font-semibold transition-colors",
        on ? "bg-gray-100 text-gray-800 hover:bg-gray-200" : "bg-red-600 text-white hover:bg-red-700",
      )}
    >
      <Icon className="h-5 w-5" />
      <T>{label}</T>
    </button>
  );
}

export function TwoWindowTip({ compact }: { compact?: boolean }) {
  return (
    <div className={cn("rounded-2xl bg-gray-800 text-white", compact ? "p-4" : "p-6")}>
      <p className={cn("font-display font-bold", compact ? "text-sm" : "text-lg")}>
        <T>See it from the student side</T>
      </p>
      <ol className={cn("mt-3 list-decimal space-y-1.5 ps-5 text-gray-300", compact ? "text-xs" : "text-sm")}>
        <li>
          <T>Share your class link (Overview → Invite your students).</T>
        </li>
        <li>
          <T>Students sign in on their own phone or computer and open the live class.</T>
        </li>
        <li>
          <T>Testing alone? Use a private window with a second account (a different email).</T>
        </li>
      </ol>
    </div>
  );
}

function SessionSummary({ record }: { record: SessionRecord }) {
  const { t } = useI18n();
  const totals = record.asked.reduce(
    (acc, a) => {
      const x = summarize(a, record.connected);
      return { correct: acc.correct + x.correct, incorrect: acc.incorrect + x.incorrect, graded: acc.graded + x.graded };
    },
    { correct: 0, incorrect: 0, graded: 0 },
  );
  return (
    <section className="animate-rise mb-8 rounded-2xl border border-emerald-200 bg-emerald-50 p-6">
      <h2 className="font-display text-xl font-bold text-emerald-900">
        <T>Session saved</T>
      </h2>
      <p className="mt-2 text-emerald-900">
        {t("{n} questions · {correct} right · {incorrect} wrong · {pct}% correct", {
          n: record.asked.length,
          correct: totals.correct,
          incorrect: totals.incorrect,
          pct: totals.graded ? Math.round((totals.correct / totals.graded) * 100) : 0,
        })}
      </p>
      <div className="mt-4 flex flex-wrap gap-3">
        <Link href="/teach/results" className={primaryButton}>
          <T>See full results</T>
        </Link>
        <button
          type="button"
          onClick={() => downloadText(`karrini-results-${new Date(record.startedAt).toISOString().slice(0, 10)}.csv`, sessionCsv(record.asked, t))}
          className={secondaryButton}
        >
          <T>Download results (CSV)</T>
        </button>
      </div>
    </section>
  );
}
