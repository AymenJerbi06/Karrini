"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { T, useI18n } from "@/components/I18n";
import { primaryButton, secondaryButton } from "@/components/SiteUi";
import { CameraIcon, CameraOffIcon, ChatBubbleIcon, CloseIcon, MicIcon, MicOffIcon, PhoneIcon, PlusIcon, ScreenIcon, UsersIcon } from "@/components/icons";
import { Toast } from "@/components/ui/Motion";
import { CallControl, CallFrame, LiveBadge, exitFullscreen } from "@/components/classroom/CallFrame";
import { QuestionEditor, QuestionSummary, typeLabels } from "@/components/classroom/QuestionEditor";
import { statusLabel } from "@/components/classroom/ResultsPanel";
import { VideoTile } from "@/components/classroom/VideoTile";
import { localizeQuestion } from "@/components/classroom/localize";
import { hostPeer, toPublic, type ResultMsg, type SessionState, type StudentAnswerMsg, type StudentHello } from "@/components/classroom/protocol";
import { createTransport, type RealtimeTransport } from "@/lib/realtime";
import { useClassroomCall } from "@/lib/useClassroomCall";
import { notifyLive } from "@/lib/announcements";
import {
  closeSessionQuestion,
  correctAnswerText,
  endSession as endSessionRecord,
  grade,
  markAnswer,
  openSession,
  publishToSession,
  recordAnswer,
  saveBank,
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
import { LessonBoard, type LessonBoardHandle } from "./board/LessonBoard";
import { BoardIcon } from "./board/BoardIcon";

type Peer = { id: string; name: string; lastSeen: number; hand: boolean };
type Panel = "ask" | "write" | "question" | "students" | null;

export const LIVE_KEY = (classId: string) => `qarrini-live-session:${classId}`;

/** An unfinished session saved before a page refresh (up to 4 hours old). */
export function restoreSession(classId: string): SessionRecord | null {
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

export const clock = (ms: number) => {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600);
  const mm = String(Math.floor((s % 3600) / 60)).padStart(2, "0");
  const ss = String(s % 60).padStart(2, "0");
  return h ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
};

/** The teacher's live class, full screen. Starts (or resumes) the session as soon as it mounts. */
export function TeacherRoom({
  account,
  classId,
  groupId,
  title,
  onEnded,
}: {
  account: Account;
  classId: string;
  groupId: string | null;
  title: string;
  onEnded: (record: SessionRecord) => void;
}) {
  const { t, locale } = useI18n();
  const teacherName = displayName(account);
  const selfId = hostPeer(classId);
  const rawBank = useQuestionBank(classId);
  const bank = useMemo(() => rawBank.map((q) => localizeQuestion(q, t)), [rawBank, t]);

  const [transport, setTransport] = useState<RealtimeTransport | null>(null);
  const [session, setSession] = useState<SessionRecord | null>(() => restoreSession(classId));
  const [peers, setPeers] = useState<Record<string, Peer>>({});
  const [panel, setPanel] = useState<Panel>(null);
  const [toast, setToast] = useState("");
  // Stable, so the toast timer is not reset by the per-second clock re-render.
  const clearToast = useCallback(() => setToast(""), []);
  const [hands, setHands] = useState<{ id: string; name: string }[]>([]);
  const timers = useRef<number[]>([]);
  const sessionRef = useRef<SessionRecord | null>(null);
  const peak = useRef(0);
  const started = useRef(false);
  const now = useNow();
  const [boardOpen, setBoardOpen] = useState(false);
  const [ending, setEnding] = useState(false);
  const boardApi = useRef<LessonBoardHandle>(null);

  useEffect(() => {
    sessionRef.current = session;
    if (session) window.localStorage.setItem(LIVE_KEY(classId), JSON.stringify(session));
  }, [session, classId]);

  useEffect(() => {
    const tr = createTransport(classId, selfId);
    const pending = timers.current;
    // Syncing with an external system (the realtime channel); it is opened here and closed in cleanup.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTransport(tr);
    return () => {
      pending.forEach(clearTimeout);
      tr.close();
    };
  }, [classId, selfId]);

  const call = useClassroomCall({ transport, hostId: selfId, role: "teacher", demoLabel: teacherName });

  // Open the session record, email the group and turn the camera on.
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    void call.start();
    openSession(classId, account.id, groupId)
      .then(({ id, startedAt }) => {
        setSession((s) => (s && s.id === id ? s : { id, classId, groupId, teacherId: account.id, startedAt, connected: 0, asked: [] }));
        notifyLive(id, locale)
          .then((r) => r.recipients && setToast(t("Email sent to {n} students: the class has started.", { n: r.sent })))
          .catch(() => undefined);
      })
      .catch(() => setToast(t("The session could not be started. Check your connection and try again.")));
  }, [call, classId, account.id, groupId, locale, t]);

  const current: AskedQuestion | undefined = session?.asked[session.asked.length - 1];
  const realPeers = Object.values(peers).filter((p) => now - p.lastSeen < 15_000);
  const connected = realPeers.length;
  useEffect(() => {
    peak.current = Math.max(peak.current, connected);
  }, [connected]);

  const publicState = useCallback((): SessionState => {
    const s = sessionRef.current;
    const q = s?.asked[s.asked.length - 1];
    return {
      live: !!s && !s.endedAt,
      teacherName,
      startedAt: s?.startedAt,
      question: q ? { ...toPublic(q.question, q.publishedAt), closed: !!q.closedAt } : undefined,
      release: q?.released
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
    };
  }, [teacherName, connected]);

  const broadcast = useCallback(() => transport?.send("session-state", publicState()), [transport, publicState]);

  useEffect(() => {
    if (!session || session.endedAt) return;
    broadcast();
    const beat = setInterval(broadcast, 5000);
    return () => clearInterval(beat);
  }, [session, broadcast]);

  const updateCurrent = useCallback((fn: (a: AskedQuestion) => AskedQuestion) => {
    setSession((s) => (s && s.asked.length ? { ...s, asked: [...s.asked.slice(0, -1), fn(s.asked[s.asked.length - 1])] } : s));
  }, []);

  useEffect(() => {
    if (!transport) return;
    return transport.subscribe((m) => {
      if (m.type === "hello" || m.type === "ping") {
        const { name } = m.payload as StudentHello;
        setPeers((p) => ({ ...p, [m.from]: { id: m.from, name, lastSeen: Date.now(), hand: p[m.from]?.hand ?? false } }));
        if (m.type === "hello") transport.send("session-state", publicState(), m.from);
      }
      if (m.type === "leave") {
        setPeers((p) => Object.fromEntries(Object.entries(p).filter(([id]) => id !== m.from)));
        setHands((h) => h.filter((x) => x.id !== m.from));
      }
      if (m.type === "hand") {
        const { up, name = "" } = m.payload as { up: boolean; name?: string };
        setPeers((p) => (p[m.from] ? { ...p, [m.from]: { ...p[m.from], hand: up } } : p));
        setHands((h) => (up ? (h.some((x) => x.id === m.from) ? h : [...h, { id: m.from, name }]) : h.filter((x) => x.id !== m.from)));
        if (up) setToast(`✋ ${t("{name} has a question", { name })}`);
      }
      if (m.type === "answer") {
        const a = m.payload as StudentAnswerMsg;
        const cur = sessionRef.current?.asked[sessionRef.current.asked.length - 1];
        if (!cur || cur.question.id !== a.questionId || cur.closedAt) return;
        if (cur.answers.some((x) => x.studentId === m.from)) return;
        // Checked against the teacher's answer straight away; the student only learns the result on reveal.
        const answer: StudentAnswer = { studentId: m.from, name: a.name, text: a.text, choice: a.choice, photo: a.photo, status: grade(cur.question, a), at: Date.now() };
        setSession((s) => {
          if (!s) return s;
          const last = s.asked[s.asked.length - 1];
          if (!last || last.question.id !== a.questionId || last.answers.some((x) => x.studentId === m.from)) return s;
          return { ...s, asked: [...s.asked.slice(0, -1), { ...last, answers: [...last.answers, answer] }] };
        });
        if (cur.sessionQuestionId) void recordAnswer(cur.sessionQuestionId, answer).catch(() => undefined);
        transport.send("answer-received", { questionId: a.questionId }, m.from);
      }
    });
  }, [transport, publicState, t]);

  function lowerHand(id: string) {
    setHands((h) => h.filter((x) => x.id !== id));
    setPeers((p) => (p[id] ? { ...p, [id]: { ...p[id], hand: false } } : p));
    transport?.send("hand-lowered", {}, id);
  }

  async function publish(q: Question) {
    if (!session) return;
    if (current && !current.closedAt) closeQuestion();
    let published;
    try {
      published = await publishToSession(session.id, q, session.asked.length);
    } catch {
      setToast(t("The question could not be sent. Check your connection and try again."));
      return;
    }
    const asked: AskedQuestion = { question: published.question, sessionQuestionId: published.sessionQuestionId, publishedAt: published.publishedAt, answers: [] };
    setSession((s) => (s ? { ...s, connected, asked: [...s.asked, asked] } : s));
    setPanel("question");
    if (q.timeLimit) timers.current.push(window.setTimeout(() => closeQuestion(), q.timeLimit * 1000));
  }

  function closeQuestion() {
    const sq = sessionRef.current?.asked[sessionRef.current.asked.length - 1];
    if (sq?.sessionQuestionId && !sq.closedAt) void closeSessionQuestion(sq.sessionQuestionId).catch(() => undefined);
    updateCurrent((a) => (a.closedAt ? a : { ...a, closedAt: Date.now() }));
  }

  /** Reveals the correct answer: every student gets their own result privately. */
  function reveal() {
    const q = sessionRef.current?.asked.at(-1);
    if (!q || !transport) return;
    updateCurrent((a) => ({ ...a, released: true, closedAt: a.closedAt ?? Date.now() }));
    if (q.sessionQuestionId) void closeSessionQuestion(q.sessionQuestionId, true).catch(() => undefined);
    q.answers.forEach((a) => transport.send("result", { questionId: q.question.id, status: a.status, feedback: a.feedback } satisfies ResultMsg, a.studentId));
    setToast(t("Correct answer revealed to the class."));
  }

  /** For answers the computer cannot check (written work, unexpected wording). */
  function mark(a: StudentAnswer, status: AnswerStatus) {
    const q = sessionRef.current?.asked.at(-1);
    if (!q) return;
    updateCurrent((x) => ({ ...x, answers: x.answers.map((y) => (y.studentId === a.studentId ? { ...y, status } : y)) }));
    if (q.sessionQuestionId) void markAnswer(q.sessionQuestionId, a.studentId, status).catch(() => undefined);
    if (q.released) transport?.send("result", { questionId: q.question.id, status } satisfies ResultMsg, a.studentId);
  }

  async function endClass() {
    if (!session || ending) return;
    setEnding(true);
    timers.current.forEach(clearTimeout);
    try { await boardApi.current?.finish(); } catch { /* A local draft remains available in the board review. */ }
    const latest = sessionRef.current ?? session;
    const record = { ...latest, connected: Math.max(peak.current, connected), endedAt: Date.now() };
    void endSessionRecord(session.id, record.connected).catch(() => undefined);
    transport?.send("session-state", { live: false, teacherName } satisfies SessionState);
    window.localStorage.removeItem(LIVE_KEY(classId));
    call.stop();
    exitFullscreen();
    onEnded(record);
  }

  useEffect(() => {
    if (session && !session.endedAt) broadcast();
  }, [current?.question.id, current?.closedAt, current?.released, broadcast, session]);

  const timeLeft = current?.question.timeLimit && !current.closedAt ? current.publishedAt + current.question.timeLimit * 1000 - now : null;
  const s = summarize(current, connected);
  const askedIds = new Set(session?.asked.map((a) => a.question.id) ?? []);
  const nameOf = (id: string) => peers[id]?.name ?? t("Student");

  const panelContent =
    panel === "ask" ? (
      <div className="space-y-3">
        <button type="button" onClick={() => setPanel("write")} className={`${primaryButton} w-full`}>
          <PlusIcon className="h-5 w-5" />
          <T>Write a new question</T>
        </button>
        {bank.length > 0 && (
          <p className="pt-2 text-xs font-semibold tracking-wide text-gray-500 uppercase">
            <T>Prepared questions</T>
          </p>
        )}
        {bank.map((q) => (
          <button
            key={q.id}
            type="button"
            onClick={() => void publish(q)}
            className={cn("block w-full rounded-xl border p-4 text-start transition-colors hover:border-brand hover:bg-emerald-50/40", askedIds.has(q.id) ? "border-gray-200 opacity-60" : "border-gray-200")}
          >
            <QuestionSummary q={q} />
            <span className="mt-2 block text-sm font-semibold text-brand">
              <T>{askedIds.has(q.id) ? "Ask again" : "Ask the class"}</T> →
            </span>
          </button>
        ))}
      </div>
    ) : panel === "write" ? (
      <QuestionEditor
        classId={classId}
        origin="live"
        submitLabel="Ask the class"
        onCancel={() => setPanel("ask")}
        onSubmit={(q) => {
          void publish(q);
          void saveBank(classId, [...rawBank.filter((x) => !x.id.includes("-starter-")), q]);
        }}
      />
    ) : panel === "question" && current ? (
      <div>
        <div className="flex items-start justify-between gap-3">
          <p className="text-xs font-semibold tracking-wide text-brand uppercase">
            <T>{typeLabels[current.question.type]}</T>
          </p>
          {timeLeft !== null && (
            <span className={cn("rounded-md px-2 py-0.5 font-mono text-sm font-bold", timeLeft < 10_000 ? "bg-red-50 text-red-700" : "bg-gray-100 text-gray-700")} dir="ltr">
              {clock(timeLeft)}
            </span>
          )}
        </div>
        <p dir="auto" className="font-display mt-2 text-lg font-bold break-words text-gray-900">
          {current.question.prompt}
        </p>
        {correctAnswerText(current.question) && (
          <p className="mt-2 text-sm text-gray-500">
            <T>Correct answer:</T> <bdi dir="auto" className="font-semibold text-gray-800">{correctAnswerText(current.question)}</bdi>
          </p>
        )}
        <p className="mt-4 text-sm text-gray-600">{t("{a} of {n} answered", { a: s.answered, n: Math.max(connected, s.answered) })}</p>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-gray-100">
          <div className="h-full bg-brand transition-all" style={{ width: `${s.participation}%` }} />
        </div>
        {(["correct", "incorrect", "review"] as const).map((status) => {
          const list = current.answers.filter((a) => a.status === status);
          if (!list.length) return null;
          return (
            <section key={status} className="mt-5">
              <h3 className={cn("text-sm font-bold", status === "correct" ? "text-emerald-700" : status === "incorrect" ? "text-red-700" : "text-amber-700")}>
                {status === "correct" ? "✓ " : status === "incorrect" ? "✗ " : "? "}
                <T>{status === "review" ? "To check" : statusLabel[status]}</T> · {list.length}
              </h3>
              <ul className="mt-2 space-y-2">
                {list.map((a) => (
                  <li key={a.studentId} className="rounded-lg bg-gray-50 p-3 text-sm">
                    <div className="flex items-center justify-between gap-2">
                      <bdi dir="auto" className="font-semibold text-gray-800">
                        {a.name}
                      </bdi>
                      {status !== "correct" && (
                        <span className="flex gap-1">
                          <button type="button" onClick={() => mark(a, "correct")} className="rounded px-2 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-100">
                            ✓ <T>Right</T>
                          </button>
                          {status === "review" && (
                            <button type="button" onClick={() => mark(a, "incorrect")} className="rounded px-2 py-1 text-xs font-semibold text-red-700 hover:bg-red-100">
                              ✗ <T>Wrong</T>
                            </button>
                          )}
                        </span>
                      )}
                    </div>
                    {current.question.type !== "choice" || status !== "correct" ? (
                      <p dir="auto" className="mt-1 break-words text-gray-600">
                        {a.text}
                      </p>
                    ) : null}
                    {a.photo && a.photo !== "attached" && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={a.photo} alt={t("Student's handwritten work")} className="mt-2 max-h-48 rounded-md border border-gray-200" />
                    )}
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
        <div className="sticky bottom-0 mt-6 space-y-2 bg-white pt-2">
          {current.released ? (
            <>
              <p className="rounded-lg bg-emerald-50 p-3 text-center text-sm font-semibold text-emerald-800">
                <T>Answer revealed ✓</T>
              </p>
              <button type="button" onClick={() => setPanel("ask")} className={`${primaryButton} w-full`}>
                <T>Ask another question</T>
              </button>
            </>
          ) : (
            <>
              <button type="button" onClick={reveal} className={`${primaryButton} w-full`}>
                <T>Reveal the correct answer</T>
              </button>
              {!current.closedAt && (
                <button type="button" onClick={closeQuestion} className={`${secondaryButton} w-full`}>
                  <T>Stop answers</T>
                </button>
              )}
            </>
          )}
        </div>
      </div>
    ) : panel === "students" ? (
      <div>
        <p className="text-sm text-gray-500">{t("{n} students in the class", { n: connected })}</p>
        <ul className="mt-3 divide-y divide-gray-100">
          {realPeers.map((p) => {
            const answer = current?.answers.find((a) => a.studentId === p.id);
            return (
              <li key={p.id} className="flex items-center justify-between gap-3 py-3 text-sm">
                <span className="flex min-w-0 items-center gap-2">
                  {p.hand && (
                    <span className="text-xl" role="img" aria-label={t("Raised hand")}>
                      ✋
                    </span>
                  )}
                  <bdi dir="auto" className="truncate font-semibold text-gray-800">
                    {p.name}
                  </bdi>
                </span>
                <span className="flex shrink-0 items-center gap-2 text-xs">
                  {answer ? <T>{answer.status === "review" ? "Answered" : statusLabel[answer.status]}</T> : current && !current.released ? <span className="text-gray-400"><T>Thinking…</T></span> : null}
                  {p.hand && (
                    <button type="button" onClick={() => lowerHand(p.id)} className="font-semibold text-brand underline">
                      <T>Lower hand</T>
                    </button>
                  )}
                </span>
              </li>
            );
          })}
        </ul>
        {!realPeers.length && (
          <p className="mt-3 text-sm leading-6 text-gray-500">
            <T>No student has joined yet. They received an email when you started.</T>
          </p>
        )}
      </div>
    ) : null;

  const panelTitle = panel === "ask" ? "Ask a question" : panel === "write" ? "New question" : panel === "question" ? "Answers" : panel === "students" ? "Students" : "";

  return (
    <>
      <CallFrame
        top={
          <>
            <div className="flex min-w-0 items-center gap-3">
              <LiveBadge />
              <span className="truncate font-semibold">
                <bdi dir="auto">{title}</bdi>
              </span>
              {session && (
                <span className="text-sm text-gray-400 tabular-nums" dir="ltr">
                  {clock(now - session.startedAt)}
                </span>
              )}
            </div>
            <span className="flex items-center gap-1.5 text-sm text-gray-300">
              <UsersIcon className="h-4 w-4" /> {connected}
            </span>
          </>
        }
        stage={
          <div className="flex h-full flex-col gap-3">
            {session && (
              <div className={boardOpen ? "min-h-0 flex-1" : "hidden"}>
                <LessonBoard key={session.id} apiRef={boardApi} context={{ sessionId: session.id, classId, groupId: session.groupId ?? groupId, userId: account.id }} title={title} presenting={boardOpen && !ending} />
              </div>
            )}
            <div className={boardOpen ? "flex h-24 shrink-0 gap-2 overflow-x-auto" : "contents"}>
            <VideoTile
              stream={call.sharing ? call.screenStream : call.localStream}
              muted
              mirror={!call.sharing && !call.usingDemoCamera}
              className={boardOpen ? "aspect-video h-full w-40 shrink-0 rounded-xl" : "min-h-0 flex-1 rounded-2xl"}
              label={call.sharing ? t("You are sharing your screen") : teacherName}
              placeholder={<T>Starting your camera…</T>}
            />
            {call.remotes.length > 0 && (
              <div className={boardOpen ? "contents" : "flex shrink-0 gap-2 overflow-x-auto"}>
                {call.remotes.map((r) => (
                  <VideoTile
                    key={r.id}
                    stream={r.stream}
                    className={boardOpen ? "aspect-video h-full w-40 shrink-0" : "aspect-video w-32 shrink-0 sm:w-40"}
                    label={
                      <>
                        {peers[r.id]?.hand && "✋ "}
                        {nameOf(r.id)}
                      </>
                    }
                  />
                ))}
              </div>
            )}
            </div>
            {call.error && (
              <p role="alert" className="text-center text-sm text-red-300">
                <T>{call.error}</T>
              </p>
            )}
          </div>
        }
        overlay={
          hands.length > 0 && (
            <div className="absolute start-6 top-3 z-20 flex max-w-[60%] flex-col gap-2">
              {hands.map((h) => (
                <div key={h.id} className="animate-rise flex items-center gap-2 rounded-full bg-amber-400 py-1.5 ps-3 pe-1.5 text-sm font-semibold text-gray-900 shadow-lg">
                  <span className="text-lg" aria-hidden>
                    ✋
                  </span>
                  <bdi dir="auto" className="truncate">
                    {t("{name} has a question", { name: h.name })}
                  </bdi>
                  <button type="button" onClick={() => lowerHand(h.id)} className="rounded-full p-1 hover:bg-black/10" aria-label={t("Lower hand")}>
                    <CloseIcon className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )
        }
        panel={panelContent}
        panelTitle={panelTitle}
        onClosePanel={() => setPanel(null)}
        controls={
          <>
            <CallControl label={call.micOn ? "Mute" : "Unmute"} danger={!call.micOn} onClick={call.toggleMic} icon={call.micOn ? <MicIcon className="h-6 w-6" /> : <MicOffIcon className="h-6 w-6" />} />
            <CallControl label={call.camOn ? "Camera" : "Camera off"} danger={!call.camOn} onClick={call.toggleCam} icon={call.camOn ? <CameraIcon className="h-6 w-6" /> : <CameraOffIcon className="h-6 w-6" />} />
            <CallControl label={call.sharing ? "Stop sharing" : "Share screen"} active={call.sharing} onClick={() => { if (!call.sharing) { setBoardOpen(false); boardApi.current?.present(false); } call.toggleScreen(); }} icon={<ScreenIcon className="h-6 w-6" />} />
            <CallControl label="Board" active={boardOpen} onClick={() => { const next = !boardOpen; if (next && call.sharing) call.toggleScreen(); setBoardOpen(next); boardApi.current?.present(next); }} icon={<BoardIcon name="board" className="h-6 w-6" />} />
            <CallControl
              label={current && !current.released ? "Answers" : "Ask a question"}
              active={panel === "ask" || panel === "write" || panel === "question"}
              pulse={!!current && !current.released && panel !== "question"}
              badge={current && !current.released ? s.answered : undefined}
              onClick={() => setPanel(current && !current.released ? (panel === "question" ? null : "question") : panel === "ask" ? null : "ask")}
              icon={<ChatBubbleIcon className="h-6 w-6" />}
            />
            <CallControl label="Students" active={panel === "students"} badge={hands.length} onClick={() => setPanel(panel === "students" ? null : "students")} icon={<UsersIcon className="h-6 w-6" />} />
            <CallControl label={ending ? "Saving…" : "End class"} danger onClick={() => void endClass()} icon={<PhoneIcon className="h-6 w-6 rotate-[135deg]" />} />
          </>
        }
      />
      <Toast message={toast} onDone={clearToast} className="top-16 z-[120] bg-gray-800 ring-1 ring-white/10" />
    </>
  );
}
