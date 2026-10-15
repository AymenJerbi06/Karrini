"use client";

import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import Link from "@/components/LocalizedLink";
import { Localized, T, useI18n } from "@/components/I18n";
import { fieldClass, primaryButton, secondaryButton } from "@/components/SiteUi";
import { CameraIcon, CameraOffIcon, HandIcon, MicIcon, MicOffIcon, VideoIcon } from "@/components/icons";
import { VideoTile } from "@/components/classroom/VideoTile";
import { statusLabel, statusTone } from "@/components/classroom/ResultsPanel";
import { typeLabels } from "@/components/classroom/QuestionEditor";
import { hostPeer, type ResultMsg, type SessionState, type StudentAnswerMsg } from "@/components/classroom/protocol";
import { createTransport, type RealtimeTransport } from "@/lib/realtime";
import { useClassroomCall } from "@/lib/useClassroomCall";
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

export function StudentRoom({
  account,
  classId,
  classTitle,
  teacherLabel,
}: {
  account: Account;
  classId: string;
  classTitle: string;
  teacherLabel: string;
}) {
  const { t } = useI18n();
  const name = displayName(account);
  const hostId = hostPeer(classId);
  const [joined, setJoined] = useState(false);
  const [transport, setTransport] = useState<RealtimeTransport | null>(null);
  const [state, setState] = useState<SessionState | null>(null);
  const [hand, setHand] = useState(false);
  const [choice, setChoice] = useState<number[]>([]);
  const [text, setText] = useState("");
  const [photo, setPhoto] = useState<string>();
  const [photoError, setPhotoError] = useState("");
  const [submitted, setSubmitted] = useState<Record<string, { text: string; received: boolean }>>({});
  const [results, setResults] = useState<Record<string, ResultMsg>>({});
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  // Connect only after the student clicks "Join" (a user gesture lets audio autoplay).
  useEffect(() => {
    if (!joined) return;
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
      setTransport(null);
    };
  }, [joined, classId, account.id, hostId, name]);

  const call = useClassroomCall({ transport, hostId, role: "student", demoLabel: name });
  const teacherStream = call.remotes.find((r) => r.id === hostId)?.stream;

  const q = state?.live ? state.question : undefined;
  const mine = q ? submitted[q.id] : undefined;
  const myResult = q ? results[q.id] : undefined;
  const release = q && state?.release?.questionId === q.id ? state.release : undefined;
  const shared = q && state?.shared?.questionId === q.id ? state.shared : undefined;
  const timeLeft = q?.timeLimit && !q.closed ? q.publishedAt + q.timeLimit * 1000 - now : null;
  const canAnswer = !!q && !q.closed && !mine && (timeLeft === null || timeLeft > 0);

  // Reset the answer form for each new question (adjusting state while rendering, per React docs).
  const qid = q?.id;
  const [formFor, setFormFor] = useState(qid);
  if (formFor !== qid) {
    setFormFor(qid);
    setChoice([]);
    setText("");
    setPhoto(undefined);
    setPhotoError("");
  }

  const multi = !!q?.multiple;

  async function onPhoto(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    setPhotoError("");
    if (!file) return;
    if (!file.type.startsWith("image/") || file.size > 10 * 1024 * 1024) {
      setPhotoError(t("Choose a photo under 10 MB."));
      return;
    }
    try {
      setPhoto(await resizePhoto(file));
    } catch {
      setPhotoError(t("This photo could not be read. Try another one."));
    }
  }

  function submit(e: FormEvent) {
    e.preventDefault();
    if (!q || !transport || !canAnswer) return;
    const display =
      q.type === "choice" ? choice.map((i) => q.options?.[i]).join(" · ") : text.trim() || (photo ? t("Photo of my working") : "");
    if (!display) return;
    const msg: StudentAnswerMsg = { questionId: q.id, name, text: display, choice: q.type === "choice" ? choice : undefined, photo };
    transport.send("answer", msg, hostId);
    setSubmitted((s) => ({ ...s, [q.id]: { text: display, received: false } }));
  }

  /* ---------------- Not joined yet ---------------- */
  if (!joined) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-14 text-center">
        <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 text-brand">
          <VideoIcon className="h-8 w-8" />
        </span>
        <h1 className="home-heading font-display mt-6 text-3xl font-extrabold text-gray-900">{classTitle}</h1>
        <p className="mt-2 text-gray-500">{teacherLabel}</p>
        <p className="mx-auto mt-6 max-w-lg leading-7 text-gray-500">
          <T>Your answers stay private. Only your teacher sees your name next to your answer.</T>
        </p>
        <button type="button" onClick={() => setJoined(true)} className={`${primaryButton} mt-8 px-10`}>
          <T>Join the live class</T>
        </button>
      </div>
    );
  }

  /* ---------------- Waiting for the teacher ---------------- */
  if (!state?.live) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-16 text-center">
        <span className="relative mx-auto flex h-20 w-20 items-center justify-center">
          <span className="absolute inset-0 animate-ping rounded-full bg-brand/20" />
          <span className="relative flex h-16 w-16 items-center justify-center rounded-full bg-brand text-white">
            <VideoIcon className="h-8 w-8" />
          </span>
        </span>
        <h1 className="home-heading font-display mt-8 text-3xl font-extrabold text-gray-900">
          <T>Waiting for your teacher…</T>
        </h1>
        <p className="mx-auto mt-4 max-w-md leading-7 text-gray-500">
          <T>The lesson starts automatically when your teacher goes live. Keep this window open.</T>
        </p>
        <p className="mx-auto mt-8 max-w-md rounded-xl bg-gray-50 p-4 text-sm text-gray-500">
          <T>Testing on one computer? Open the teacher demo in another window and start a live session.</T>
        </p>
        <Link href="/dashboard" className="mt-6 inline-flex min-h-11 items-center text-sm text-gray-500 underline">
          <T>Back to my dashboard</T>
        </Link>
      </div>
    );
  }

  /* ---------------- In the lesson ---------------- */
  return (
    <div className="mx-auto max-w-7xl px-4 py-6 md:px-6">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-gray-800 px-5 py-3 text-white">
        <div className="flex items-center gap-3">
          <span className="animate-live flex items-center gap-2 rounded-md bg-red-600 px-2.5 py-1 text-xs font-bold">
            <span className="h-2 w-2 rounded-full bg-white" /> <T>LIVE</T>
          </span>
          <span className="font-semibold">{classTitle}</span>
        </div>
        <span className="text-sm text-gray-300">
          <bdi dir="auto">{state.teacherName}</bdi>
        </span>
      </div>

      <div className="mt-5 grid items-start gap-5 lg:grid-cols-[1fr_420px]">
        <div className="space-y-3">
          <VideoTile
            stream={teacherStream}
            className="aspect-video"
            label={state.teacherName}
            placeholder={
              <span className="flex flex-col items-center gap-3">
                <span className="h-8 w-8 animate-spin rounded-full border-2 border-gray-500 border-t-white" />
                <T>Connecting to your teacher&apos;s video…</T>
              </span>
            }
          />
          <div className="flex flex-wrap items-center gap-2">
            {call.live ? (
              <>
                <button
                  type="button"
                  onClick={call.toggleMic}
                  className={cn("inline-flex min-h-11 items-center gap-2 rounded-full px-4 text-sm font-semibold", call.micOn ? "bg-gray-100 text-gray-800" : "bg-red-600 text-white")}
                >
                  {call.micOn ? <MicIcon className="h-5 w-5" /> : <MicOffIcon className="h-5 w-5" />}
                  <T>{call.micOn ? "Mute" : "Unmute"}</T>
                </button>
                <button type="button" onClick={call.stop} className="inline-flex min-h-11 items-center gap-2 rounded-full bg-gray-100 px-4 text-sm font-semibold text-gray-800">
                  <CameraOffIcon className="h-5 w-5" />
                  <T>Stop my camera</T>
                </button>
              </>
            ) : (
              <button type="button" onClick={() => void call.start()} className="inline-flex min-h-11 items-center gap-2 rounded-full bg-gray-100 px-4 text-sm font-semibold text-gray-800 hover:bg-gray-200">
                <CameraIcon className="h-5 w-5" />
                <T>Turn on camera & mic</T>
              </button>
            )}
            <button
              type="button"
              aria-pressed={hand}
              onClick={() => {
                const next = !hand;
                setHand(next);
                transport?.send("hand", { up: next, name }, hostId);
              }}
              className={cn(
                "inline-flex min-h-11 items-center gap-2 rounded-full px-4 text-sm font-semibold transition-colors",
                hand ? "bg-amber-400 text-gray-900" : "bg-gray-100 text-gray-800 hover:bg-gray-200",
              )}
            >
              <HandIcon className={cn("h-5 w-5", hand && "animate-bounce")} />
              <T>{hand ? "Lower my hand" : "Raise my hand"}</T>
            </button>
            {call.localStream && (
              <VideoTile stream={call.localStream} muted mirror className="ms-auto aspect-video w-36" label={t("You")} />
            )}
          </div>
          {call.error && (
            <p role="alert" className="text-sm text-red-700">
              <T>{call.error}</T>
            </p>
          )}
        </div>

        <div className="space-y-4">
          {!q ? (
            <section className="rounded-2xl border border-dashed border-gray-300 bg-white p-8 text-center">
              <h2 className="font-display text-xl font-bold text-gray-800">
                <T>Listen to your teacher</T>
              </h2>
              <p className="mt-2 text-sm text-gray-500">
                <T>Questions appear here as soon as your teacher sends them.</T>
              </p>
            </section>
          ) : (
            <section key={q.id} className="animate-rise rounded-2xl border-2 border-brand/30 bg-white p-5 shadow-sm md:p-6">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-semibold tracking-wide text-brand uppercase">
                  <T>Question from your teacher</T> · <T>{typeLabels[q.type]}</T>
                </p>
                {timeLeft !== null && (
                  <span className={cn("rounded-md px-2.5 py-1 font-mono text-sm font-bold", timeLeft < 10_000 ? "bg-red-50 text-red-700" : "bg-gray-100 text-gray-700")} dir="ltr">
                    {Math.max(0, Math.ceil(timeLeft / 1000))}s
                  </span>
                )}
              </div>
              <h2 dir="auto" className="font-display mt-3 text-xl font-bold break-words text-gray-900 md:text-2xl">
                {q.prompt}
              </h2>

              {mine ? (
                <div className="mt-5 space-y-4" role="status">
                  <p dir="auto" className="rounded-lg bg-gray-50 p-4 break-words text-gray-700">
                    {mine.text}
                  </p>
                  {myResult ? (
                    <div className={cn("animate-rise rounded-xl p-4", statusTone[myResult.status])}>
                      <p className="font-semibold">
                        <T>{myResult.status === "correct" ? "Well done, that's right!" : myResult.status === "incorrect" ? "Not quite this time." : statusLabel.review}</T>
                      </p>
                      {myResult.feedback && (
                        <p dir="auto" className="mt-2 leading-7">
                          <span className="font-semibold">
                            <T>Your teacher:</T>
                          </span>{" "}
                          {myResult.feedback}
                        </p>
                      )}
                    </div>
                  ) : (
                    <p className="flex items-center gap-2 text-sm font-semibold text-blue-700">
                      <span className={cn("h-2 w-2 rounded-full", mine.received ? "bg-emerald-500" : "animate-pulse bg-gray-400")} />
                      <T>{mine.received ? "Received by your teacher · waiting for feedback" : "Sending…"}</T>
                    </p>
                  )}
                </div>
              ) : !canAnswer ? (
                <p className="mt-5 rounded-lg bg-gray-50 p-4 text-sm text-gray-600">
                  <T>Answers are closed for this question.</T>
                </p>
              ) : (
                <form key={q.id} onSubmit={submit} className="mt-5 space-y-4">
                  {q.type === "choice" && (
                    <fieldset className="space-y-2">
                      <legend className={multi ? "mb-1 text-sm text-gray-500" : "sr-only"}>
                        <T>{multi ? "Tick every correct answer" : "Choose your answer"}</T>
                      </legend>
                      {q.options?.map((o, i) => (
                        <label
                          key={i}
                          className={cn(
                            "flex min-h-14 cursor-pointer items-center gap-3 rounded-xl border p-4 transition-all",
                            choice.includes(i) ? "scale-[1.01] border-brand bg-emerald-50 shadow-sm" : "border-gray-200 hover:border-gray-400",
                          )}
                        >
                          <input
                            type={multi ? "checkbox" : "radio"}
                            name="answer"
                            checked={choice.includes(i)}
                            onChange={() =>
                              setChoice((c) => (multi ? (c.includes(i) ? c.filter((x) => x !== i) : [...c, i]) : [i]))
                            }
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
                    <label className="block text-sm font-semibold text-gray-700">
                      <T>{q.type === "numeric" ? "Your answer (numbers or equation)" : "Your answer"}</T>
                      <Localized
                        as="input"
                        dir="auto"
                        autoFocus
                        inputMode={q.type === "numeric" ? "decimal" : "text"}
                        value={text}
                        onChange={(e: ChangeEvent<HTMLInputElement>) => setText(e.target.value)}
                        placeholder={q.type === "numeric" ? "e.g. 2; 5" : ""}
                        className={`${fieldClass} text-lg`}
                      />
                    </label>
                  )}
                  {q.type === "written" && (
                    <>
                      <label className="block text-sm font-semibold text-gray-700">
                        <T>Your working</T>
                        <Localized
                          as="textarea"
                          dir="auto"
                          rows={4}
                          value={text}
                          onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setText(e.target.value)}
                          placeholder="Write your steps…"
                          className={fieldClass}
                        />
                      </label>
                      <label className="block text-sm font-semibold text-gray-700">
                        <T>Or take a photo of your paper</T>
                        <input type="file" accept="image/*" capture="environment" onChange={onPhoto} className={`${fieldClass} text-sm`} />
                      </label>
                      {photo && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={photo} alt={t("Preview of your photo")} className="max-h-48 rounded-lg border border-gray-200" />
                      )}
                      {photoError && (
                        <p role="alert" className="text-sm text-red-700">
                          {photoError}
                        </p>
                      )}
                    </>
                  )}
                  <button
                    type="submit"
                    disabled={q.type === "choice" ? !choice.length : !text.trim() && !photo}
                    className={`${primaryButton} w-full`}
                  >
                    <T>Send my answer</T>
                  </button>
                  <p className="text-center text-xs text-gray-400">
                    <T>Only your teacher sees your answer.</T>
                  </p>
                </form>
              )}
            </section>
          )}

          {shared && (
            <section className="animate-rise rounded-2xl border border-blue-200 bg-blue-50 p-5">
              <p className="text-xs font-semibold tracking-wide text-blue-700 uppercase">
                <T>Shared by the teacher · Anonymous</T>
              </p>
              <p dir="auto" className="mt-3 rounded-lg bg-white p-3 font-mono text-sm break-words text-gray-700">
                {shared.text}
              </p>
              {shared.feedback && (
                <p dir="auto" className="mt-3 leading-7 text-blue-900">
                  {shared.feedback}
                </p>
              )}
            </section>
          )}

          {release && (
            <section className="animate-rise rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
              <h3 className="font-display text-lg font-bold text-emerald-900">
                <T>The correct answer</T>
              </h3>
              {release.correctText && (
                <p dir="auto" className="mt-2 font-mono text-lg text-emerald-900">
                  {release.correctText}
                </p>
              )}
              {release.explanation && (
                <p dir="auto" className="mt-2 leading-7 text-emerald-800">
                  {release.explanation}
                </p>
              )}
              {release.graded > 0 && (
                <p className="mt-3 text-sm text-emerald-800">
                  {t("{pct}% of the class got it right.", { pct: Math.round((release.correct / release.graded) * 100) })}
                </p>
              )}
            </section>
          )}
          <button type="button" onClick={() => setJoined(false)} className={`${secondaryButton} w-full`}>
            <T>Leave the class</T>
          </button>
        </div>
      </div>
    </div>
  );
}
