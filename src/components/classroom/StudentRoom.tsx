"use client";

import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import Link from "@/components/LocalizedLink";
import { Localized, T, useI18n } from "@/components/I18n";
import { fieldClass, primaryButton, secondaryButton } from "@/components/SiteUi";
import { CameraIcon, CameraOffIcon, ChatBubbleIcon, ClockIcon, MicIcon, MicOffIcon, PhoneIcon, VideoIcon } from "@/components/icons";
import { CallControl, CallFrame, LiveBadge, enterFullscreen, exitFullscreen } from "@/components/classroom/CallFrame";
import { VideoTile } from "@/components/classroom/VideoTile";
import { typeLabels } from "@/components/classroom/QuestionEditor";
import { clock } from "@/components/classroom/TeacherRoom";
import { hostPeer, type ResultMsg, type SessionState, type StudentAnswerMsg } from "@/components/classroom/protocol";
import { createTransport, type RealtimeTransport } from "@/lib/realtime";
import { useClassroomCall } from "@/lib/useClassroomCall";
import { recordAttendance } from "@/lib/progress";
import type { LiveSession } from "@/lib/classes";
import { displayName, type Account } from "@/lib/auth";
import { cn } from "@/lib/cn";

/** Shrinks a photo so it can travel through the realtime channel. */
async function resizePhoto(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 900 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", 0.75);
}

/**
 * The student's live class. Students can only enter once their teacher has started the class
 * for their group (they are emailed at that moment); the call then fills the screen.
 */
export function StudentRoom({
  account,
  classId,
  classTitle,
  teacherLabel,
  live,
  nextLesson,
}: {
  account: Account;
  classId: string;
  classTitle: string;
  teacherLabel: string;
  /** The running session for this student's group, if any. */
  live: LiveSession | undefined;
  /** "Tuesday 08:00–10:00", for the closed-door screen. */
  nextLesson: string;
}) {
  const { t } = useI18n();
  const [joined, setJoined] = useState(false);
  const [ended, setEnded] = useState(false);
  // The session closed while the student was in it (adjusting state while rendering, per React docs).
  if (joined && !live) {
    setJoined(false);
    setEnded(true);
  }

  if (joined && live)
    return (
      <StudentCall
        account={account}
        classId={classId}
        sessionId={live.id}
        classTitle={classTitle}
        onLeave={(finished) => {
          exitFullscreen();
          setJoined(false);
          setEnded(finished);
        }}
      />
    );

  return (
    <div className="mx-auto max-w-2xl px-6 py-14 text-center md:py-20">
      {live ? (
        <span className="relative mx-auto flex h-20 w-20 items-center justify-center">
          <span className="absolute inset-0 animate-ping rounded-full bg-red-500/25" />
          <span className="relative flex h-16 w-16 items-center justify-center rounded-full bg-red-600 text-white">
            <VideoIcon className="h-8 w-8" />
          </span>
        </span>
      ) : (
        <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 text-gray-500">
          <ClockIcon className="h-8 w-8" />
        </span>
      )}
      <h1 className="home-heading font-display mt-6 text-3xl font-extrabold text-gray-900">
        <bdi dir="auto">{classTitle}</bdi>
      </h1>
      <p className="mt-2 text-gray-500">
        <bdi dir="auto">{teacherLabel}</bdi>
      </p>
      {live ? (
        <>
          <p className="mt-6 font-semibold text-red-700">
            <T>Your teacher has started the class.</T>
          </p>
          <button
            type="button"
            onClick={() => {
              enterFullscreen();
              setEnded(false);
              setJoined(true);
            }}
            className={`${primaryButton} mt-6 px-10`}
          >
            <T>Join the class</T>
          </button>
          <p className="mx-auto mt-4 max-w-md text-sm leading-6 text-gray-500">
            <T>Your answers stay private. Only your teacher sees your name next to your answer.</T>
          </p>
        </>
      ) : (
        <>
          <p className="mx-auto mt-6 max-w-md rounded-xl bg-gray-50 p-5 leading-7 text-gray-600">
            <T>{ended ? "The class has ended. See you next time!" : "The class has not started yet. You can join as soon as your teacher starts it, and we will email you at that moment."}</T>
          </p>
          {nextLesson && (
            <p className="mt-4 text-sm text-gray-500">
              <T>Next lesson:</T> <bdi dir="auto" className="font-semibold text-gray-800">{nextLesson}</bdi>
            </p>
          )}
          <Link href={`/dashboard/class?id=${encodeURIComponent(classId)}`} className={`${secondaryButton} mt-8`}>
            {t("Back to the class page")}
          </Link>
        </>
      )}
    </div>
  );
}

function StudentCall({
  account,
  classId,
  sessionId,
  classTitle,
  onLeave,
}: {
  account: Account;
  classId: string;
  sessionId: string;
  classTitle: string;
  onLeave: (finished: boolean) => void;
}) {
  const { t } = useI18n();
  const name = displayName(account);
  const hostId = hostPeer(classId);
  const [transport, setTransport] = useState<RealtimeTransport | null>(null);
  const [state, setState] = useState<SessionState | null>(null);
  const [hand, setHand] = useState(false);
  const [panelOpen, setPanelOpen] = useState(true);
  const [choice, setChoice] = useState<number[]>([]);
  const [text, setText] = useState("");
  const [photo, setPhoto] = useState<string>();
  const [photoError, setPhotoError] = useState("");
  const [submitted, setSubmitted] = useState<Record<string, { text: string; received: boolean }>>({});
  const [results, setResults] = useState<Record<string, ResultMsg>>({});
  const [now, setNow] = useState(() => Date.now());
  const wasLive = useRef(false);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    void recordAttendance(sessionId, account.id).catch(() => undefined);
  }, [sessionId, account.id]);

  useEffect(() => () => exitFullscreen(), []);

  useEffect(() => {
    const tr = createTransport(classId, account.id);
    // Syncing with an external system (the realtime channel); it is opened here and closed in cleanup.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTransport(tr);
    const off = tr.subscribe((m) => {
      if (m.from !== hostId) return;
      if (m.type === "session-state") setState(m.payload as SessionState);
      if (m.type === "answer-received") {
        const { questionId } = m.payload as { questionId: string };
        setSubmitted((s) => (s[questionId] ? { ...s, [questionId]: { ...s[questionId], received: true } } : s));
      }
      if (m.type === "result") {
        const r = m.payload as ResultMsg;
        setResults((all) => ({ ...all, [r.questionId]: r }));
      }
      if (m.type === "hand-lowered") setHand(false);
    });
    tr.send("hello", { name }, hostId);
    const ping = setInterval(() => tr.send("ping", { name }, hostId), 5000);
    const leave = () => tr.send("leave", {}, hostId);
    window.addEventListener("pagehide", leave);
    return () => {
      leave();
      clearInterval(ping);
      window.removeEventListener("pagehide", leave);
      off();
      tr.close();
    };
  }, [classId, account.id, hostId, name]);

  const call = useClassroomCall({ transport, hostId, role: "student", demoLabel: name });
  const teacherStream = call.remotes.find((r) => r.id === hostId)?.stream;

  // The teacher ended the class.
  useEffect(() => {
    if (state?.live) wasLive.current = true;
    else if (state && wasLive.current) {
      call.stop();
      onLeave(true);
    }
  }, [state, call, onLeave]);

  const q = state?.live ? state.question : undefined;
  const mine = q ? submitted[q.id] : undefined;
  const myResult = q ? results[q.id] : undefined;
  const release = q && state?.release?.questionId === q.id ? state.release : undefined;
  const timeLeft = q?.timeLimit && !q.closed ? q.publishedAt + q.timeLimit * 1000 - now : null;
  const canAnswer = !!q && !q.closed && !mine && (timeLeft === null || timeLeft > 0);
  const multi = !!q?.multiple;

  // A new question resets the form and opens the panel (adjusting state while rendering, per React docs).
  const qid = q?.id;
  const [formFor, setFormFor] = useState(qid);
  if (formFor !== qid) {
    setFormFor(qid);
    setChoice([]);
    setText("");
    setPhoto(undefined);
    setPhotoError("");
    if (qid) setPanelOpen(true);
  }

  async function onPhoto(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    setPhotoError("");
    if (!file) return;
    if (!file.type.startsWith("image/") || file.size > 10 * 1024 * 1024) return setPhotoError(t("Choose a photo under 10 MB."));
    try {
      setPhoto(await resizePhoto(file));
    } catch {
      setPhotoError(t("This photo could not be read. Try another one."));
    }
  }

  function submit(e: FormEvent) {
    e.preventDefault();
    if (!q || !transport || !canAnswer) return;
    const display = q.type === "choice" ? choice.map((i) => q.options?.[i]).join(" · ") : text.trim() || (photo ? t("Photo of my working") : "");
    if (!display) return;
    const msg: StudentAnswerMsg = { questionId: q.id, name, text: display, choice: q.type === "choice" ? choice : undefined, photo };
    transport.send("answer", msg, hostId);
    setSubmitted((s) => ({ ...s, [q.id]: { text: display, received: false } }));
  }

  function leave() {
    call.stop();
    onLeave(false);
  }

  const panel = q ? (
    <div key={q.id}>
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-semibold tracking-wide text-brand uppercase">
          <T>{typeLabels[q.type]}</T>
        </p>
        {timeLeft !== null && (
          <span className={cn("rounded-md px-2 py-0.5 font-mono text-sm font-bold", timeLeft < 10_000 ? "bg-red-50 text-red-700" : "bg-gray-100 text-gray-700")} dir="ltr">
            {Math.max(0, Math.ceil(timeLeft / 1000))}s
          </span>
        )}
      </div>
      <p dir="auto" className="font-display mt-2 text-xl font-bold break-words text-gray-900">
        {q.prompt}
      </p>

      {mine ? (
        <div className="mt-5 space-y-4" role="status">
          <p dir="auto" className="rounded-lg bg-gray-50 p-4 break-words text-gray-700">
            {mine.text}
          </p>
          {release || myResult ? (
            <div
              className={cn(
                "animate-rise rounded-xl p-4",
                myResult?.status === "correct" ? "bg-emerald-50 text-emerald-900" : myResult?.status === "incorrect" ? "bg-red-50 text-red-900" : "bg-amber-50 text-amber-900",
              )}
            >
              <p className="text-lg font-bold">
                <T>{myResult?.status === "correct" ? "✓ Right!" : myResult?.status === "incorrect" ? "✗ Not quite" : "Your teacher will check your answer."}</T>
              </p>
              {myResult?.feedback && (
                <p dir="auto" className="mt-2">
                  {myResult.feedback}
                </p>
              )}
            </div>
          ) : (
            <p className="flex items-center gap-2 rounded-lg bg-blue-50 p-4 text-sm font-semibold text-blue-800">
              <span className={cn("h-2 w-2 shrink-0 rounded-full", mine.received ? "bg-blue-600" : "animate-pulse bg-gray-400")} />
              <T>{mine.received ? "Answer sent. Wait for your teacher to reveal the correct answer." : "Sending…"}</T>
            </p>
          )}
        </div>
      ) : !canAnswer ? (
        <p className="mt-5 rounded-lg bg-gray-50 p-4 text-sm text-gray-600">
          <T>Answers are closed for this question.</T>
        </p>
      ) : (
        <form onSubmit={submit} className="mt-5 space-y-3">
          {q.type === "choice" && (
            <fieldset className="space-y-2">
              <legend className={multi ? "mb-1 text-sm text-gray-500" : "sr-only"}>
                <T>{multi ? "Tick every correct answer" : "Choose your answer"}</T>
              </legend>
              {q.options?.map((o, i) => (
                <label
                  key={i}
                  className={cn(
                    "flex min-h-13 cursor-pointer items-center gap-3 rounded-xl border p-3.5 transition-all",
                    choice.includes(i) ? "border-brand bg-emerald-50" : "border-gray-200 hover:border-gray-400",
                  )}
                >
                  <input
                    type={multi ? "checkbox" : "radio"}
                    name="answer"
                    checked={choice.includes(i)}
                    onChange={() => setChoice((c) => (multi ? (c.includes(i) ? c.filter((x) => x !== i) : [...c, i]) : [i]))}
                    className="h-5 w-5"
                  />
                  <span dir="auto" className="text-gray-800">
                    {o}
                  </span>
                </label>
              ))}
            </fieldset>
          )}
          {(q.type === "numeric" || q.type === "short") && (
            <Localized
              as="input"
              dir="auto"
              autoFocus
              aria-label="Your answer"
              inputMode={q.type === "numeric" ? "decimal" : "text"}
              value={text}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setText(e.target.value)}
              placeholder={q.type === "numeric" ? "e.g. 2; 5" : "Your answer"}
              className={`${fieldClass} mt-0 text-lg`}
            />
          )}
          {q.type === "written" && (
            <>
              <Localized
                as="textarea"
                dir="auto"
                rows={4}
                aria-label="Your working"
                value={text}
                onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setText(e.target.value)}
                placeholder="Write your steps…"
                className={`${fieldClass} mt-0`}
              />
              <label className="block text-sm font-semibold text-gray-700">
                <T>Or take a photo of your paper</T>
                <input type="file" accept="image/*" capture="environment" onChange={onPhoto} className={`${fieldClass} text-sm`} />
              </label>
              {photo && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={photo} alt={t("Preview of your photo")} className="max-h-40 rounded-lg border border-gray-200" />
              )}
              {photoError && (
                <p role="alert" className="text-sm text-red-700">
                  {photoError}
                </p>
              )}
            </>
          )}
          <button type="submit" disabled={q.type === "choice" ? !choice.length : !text.trim() && !photo} className={`${primaryButton} w-full`}>
            <T>Submit my answer</T>
          </button>
        </form>
      )}

      {release && (
        <section className="animate-rise mt-4 rounded-xl border border-emerald-200 p-4">
          <h3 className="font-bold text-emerald-900">
            <T>The correct answer</T>
          </h3>
          {release.correctText && (
            <p dir="auto" className="mt-1 font-mono text-lg text-emerald-900">
              {release.correctText}
            </p>
          )}
          {release.explanation && (
            <p dir="auto" className="mt-2 text-sm leading-6 text-emerald-800">
              {release.explanation}
            </p>
          )}
          {release.graded > 0 && (
            <p className="mt-2 text-sm text-emerald-800">{t("{pct}% of the class got it right.", { pct: Math.round((release.correct / release.graded) * 100) })}</p>
          )}
        </section>
      )}
    </div>
  ) : null;

  return (
    <CallFrame
      top={
        <>
          <div className="flex min-w-0 items-center gap-3">
            <LiveBadge />
            <span className="truncate font-semibold">
              <bdi dir="auto">{classTitle}</bdi>
            </span>
            {state?.startedAt && (
              <span className="text-sm text-gray-400 tabular-nums" dir="ltr">
                {clock(now - state.startedAt)}
              </span>
            )}
          </div>
          <span className="truncate text-sm text-gray-300">
            <bdi dir="auto">{state?.teacherName}</bdi>
          </span>
        </>
      }
      stage={
        <div className="relative h-full">
          <VideoTile
            stream={teacherStream}
            className="h-full rounded-2xl"
            placeholder={
              <span className="flex flex-col items-center gap-3">
                <span className="h-8 w-8 animate-spin rounded-full border-2 border-gray-500 border-t-white" />
                <T>Connecting to your teacher&apos;s video…</T>
              </span>
            }
          />
          {call.localStream && (
            <VideoTile stream={call.localStream} muted mirror className="absolute end-3 top-3 aspect-video w-28 shadow-lg sm:w-40" label={t("You")} />
          )}
          {hand && (
            <span className="animate-rise absolute start-3 top-3 rounded-full bg-amber-400 px-3 py-1.5 text-sm font-semibold text-gray-900 shadow-lg">
              ✋ <T>Your hand is raised</T>
            </span>
          )}
        </div>
      }
      panel={panelOpen ? panel : null}
      panelTitle="Question from your teacher"
      onClosePanel={() => setPanelOpen(false)}
      controls={
        <>
          {call.live ? (
            <>
              <CallControl label={call.micOn ? "Mute" : "Unmute"} danger={!call.micOn} onClick={call.toggleMic} icon={call.micOn ? <MicIcon className="h-6 w-6" /> : <MicOffIcon className="h-6 w-6" />} />
              <CallControl label={call.camOn ? "Camera" : "Camera off"} danger={!call.camOn} onClick={call.toggleCam} icon={call.camOn ? <CameraIcon className="h-6 w-6" /> : <CameraOffIcon className="h-6 w-6" />} />
            </>
          ) : (
            <CallControl label="Camera & mic" onClick={() => void call.start()} icon={<CameraIcon className="h-6 w-6" />} />
          )}
          <CallControl
            label={hand ? "Lower hand" : "Raise hand"}
            active={hand}
            onClick={() => {
              const next = !hand;
              setHand(next);
              transport?.send("hand", { up: next, name }, hostId);
            }}
            icon={<span className="text-2xl leading-none">✋</span>}
          />
          {q && (
            <CallControl
              label="Question"
              active={panelOpen}
              pulse={!panelOpen && canAnswer}
              onClick={() => setPanelOpen((o) => !o)}
              icon={<ChatBubbleIcon className="h-6 w-6" />}
            />
          )}
          <CallControl label="Leave" danger onClick={leave} icon={<PhoneIcon className="h-6 w-6 rotate-[135deg]" />} />
        </>
      }
    />
  );
}
