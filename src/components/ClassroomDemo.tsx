"use client";
import { T, Localized } from "@/components/I18n";

import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";
import { TeacherAvatar } from "@/components/mockups/LiveClassMockup";
import { useI18n } from "@/components/I18n";
import {
  fieldClass,
  panelClass,
  primaryButton,
  secondaryButton,
} from "@/components/SiteUi";

type Status = "correct" | "incorrect" | "review";
type Response = {
  id: string;
  name: string;
  answer: string;
  status: Status;
  photo?: string;
  feedback?: string;
};
const labels: Record<Status, string> = {
  correct: "Correct",
  incorrect: "Incorrect",
  review: "Awaiting review",
};
const statusColors: Record<Status, string> = {
  correct: "bg-emerald-50 text-emerald-700",
  incorrect: "bg-red-50 text-red-700",
  review: "bg-amber-50 text-amber-800",
};
const choices = ["x = 2 and x = 3", "x = −2 and x = −3", "x = 1 and x = 6"];

function sampleResponses(): Response[] {
  return Array.from({ length: 32 }, (_, i) => ({
    id: `sample-${i}`,
    name: `Example learner ${String(i + 1).padStart(2, "0")}`,
    answer:
      i < 21
        ? "(x − 2)(x − 3) = 0, so x = 2 or x = 3."
        : i < 29
          ? "x = −2 and x = −3"
          : "I factorised the equation as (x − 2)(x − 3) = 0. Please check my next step.",
    status: i < 21 ? "correct" : i < 29 ? "incorrect" : "review",
  }));
}

export function ClassroomDemo() {
  const { t } = useI18n();
  const [view, setView] = useState<"teacher" | "student">("teacher");
  const [mode, setMode] = useState<"choice" | "written">("choice");
  const [activeMode, setActiveMode] = useState(mode);
  const [published, setPublished] = useState(false);
  const [responses, setResponses] = useState<Response[]>([]);
  const [choice, setChoice] = useState("");
  const [written, setWritten] = useState("");
  const [photo, setPhoto] = useState<string>();
  const photoRef = useRef<string | undefined>(undefined);
  const [fileError, setFileError] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [filter, setFilter] = useState("all");
  const [comment, setComment] = useState("");
  const [released, setReleased] = useState(false);
  const [shared, setShared] = useState<{
    answer: string;
    feedback: string;
  } | null>(null);
  const [notice, setNotice] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);
  const reviewPanel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (selected) reviewPanel.current?.focus();
  }, [selected, view]);
  useEffect(
    () => () => {
      if (photoRef.current) URL.revokeObjectURL(photoRef.current);
    },
    [],
  );

  const mine = responses.find((r) => r.id === "you");
  const opened = responses.find((r) => r.id === selected);
  const correct = responses.filter((r) => r.status === "correct").length;
  const incorrect = responses.filter((r) => r.status === "incorrect").length;
  const pending = responses.filter((r) => r.status === "review").length;
  const graded = correct + incorrect;
  const participation = Math.round((responses.length / 40) * 100);

  function clearInput() {
    setChoice("");
    setWritten("");
    setPhoto(undefined);
    setFileError("");
    if (photoRef.current) {
      URL.revokeObjectURL(photoRef.current);
      photoRef.current = undefined;
    }
    if (fileInput.current) fileInput.current.value = "";
  }
  function publish() {
    clearInput();
    setActiveMode(mode);
    setPublished(true);
    setResponses(
      sampleResponses().map((response) => ({
        ...response,
        name: t(response.name),
        answer: t(response.answer),
      })),
    );
    setSelected(null);
    setReleased(false);
    setShared(null);
    setFilter("all");
    setComment("");
    setNotice(
      "Question published in this demo. 32 illustrative responses are loaded. Switch to Student view to add your answer.",
    );
  }
  function reset() {
    clearInput();
    setPublished(false);
    setResponses([]);
    setSelected(null);
    setShared(null);
    setReleased(false);
    setView("teacher");
    setNotice("Demo reset. Publish a question to begin again.");
  }
  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (
      !published ||
      mine ||
      (activeMode === "choice" ? !choice : !written.trim() && !photo)
    )
      return;
    const response: Response = {
      id: "you",
      name: t("Your demo learner"),
      answer:
        activeMode === "choice"
          ? t(choice)
          : written.trim() || t("Handwritten solution (photo)"),
      status:
        activeMode === "choice"
          ? choice === choices[0]
            ? "correct"
            : "incorrect"
          : "review",
      photo: activeMode === "written" ? photo : undefined,
    };
    setResponses((r) => [...r, response]);
    setNotice(
      activeMode === "written"
        ? "Your work was submitted and is awaiting teacher review."
        : "Your answer was submitted. The teacher controls when the solution is released.",
    );
  }
  function upload(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (
      !["image/jpeg", "image/png", "image/webp"].includes(file.type) ||
      file.size > 5 * 1024 * 1024
    ) {
      setFileError("Choose a JPG, PNG or WebP image under 5 MB.");
      e.target.value = "";
      return;
    }
    if (photoRef.current) URL.revokeObjectURL(photoRef.current);
    photoRef.current = URL.createObjectURL(file);
    setPhoto(photoRef.current);
    setFileError("");
  }
  function mark(status: Status) {
    if (!opened) return;
    setResponses((rs) =>
      rs.map((r) =>
        r.id === opened.id
          ? {
              ...r,
              status,
              feedback:
                comment.trim() ||
                t(
                  status === "correct"
                    ? "Your reasoning is correct. Well done."
                    : "Check the signs: x − 2 = 0 gives x = 2. Try substituting the roots.",
                ),
            }
          : r,
      ),
    );
    setNotice(
      `Response marked ${labels[status].toLowerCase()}. The totals now reflect this review.`,
    );
  }
  return (
    <div className="bg-gray-50 px-6 py-10 md:py-14">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div>
            <p className="text-sm font-semibold tracking-wide text-brand uppercase">
              <T>The Qarrini classroom · Interactive demo</T>
            </p>
            <h1 className="home-heading font-display mt-3 text-3xl font-extrabold text-gray-900 md:text-4xl">
              <T>One question. Every student heard.</T>
            </h1>
            <p className="mt-3 text-gray-500">
              <T>Bac Mathematics · Factorising quadratic equations</T>
            </p>
          </div>
          <button type="button" onClick={reset} className={secondaryButton}>
            <T>Reset lesson demo</T>
          </button>
        </div>
        <p className="mt-5 text-sm leading-7 text-gray-500">
          <T>
            Publish a question, try a student answer, then review it. This is a
            local demo with example learners.
          </T>
        </p>
        <Localized
          as="div"
          className="mt-7 flex gap-2"
          role="group"
          aria-label="Classroom role"
        >
          {(["teacher", "student"] as const).map((role) => (
            <button
              type="button"
              key={role}
              id={`role-${role}`}
              aria-controls="classroom-role-panel"
              aria-pressed={view === role}
              onClick={() => {
                setView(role);
                setNotice("");
              }}
              className={`rounded-t-lg px-6 py-3 text-sm font-semibold ${view === role ? "bg-gray-800 text-white" : "border border-gray-200 bg-white text-gray-600 hover:bg-gray-100"}`}
            >
              <T>{role === "teacher" ? "Teacher view" : "Student view"}</T>
            </button>
          ))}
        </Localized>
        <div className="overflow-hidden rounded-b-xl rounded-tr-xl border border-gray-200 bg-white">
          <div className="flex flex-wrap items-center justify-between gap-3 bg-gray-800 px-6 py-4">
            <p className="font-semibold text-white">
              <T>
                {view === "teacher"
                  ? "Your teaching workspace"
                  : "Your private learning workspace"}
              </T>
            </p>
            <span className="rounded bg-gray-700 px-3 py-1 text-xs text-gray-300">
              <T>{published ? "Question active" : "Lesson preparation"}</T>{" "}
              <T>· Demo</T>
            </span>
          </div>
          <div className="grid items-start gap-8 p-5 lg:grid-cols-[240px_1fr] lg:p-8">
            <aside className="space-y-5">
              <details className="overflow-hidden rounded-lg bg-gray-800">
                <summary className="min-h-12 cursor-pointer px-4 py-3 text-sm font-medium text-white">
                  <T>Teacher & lesson context</T>
                </summary>
                <div className="relative aspect-[4/3]">
                  <TeacherAvatar />
                  <span className="absolute right-3 bottom-3 rounded bg-gray-900/80 px-2 py-1 text-xs text-white">
                    <T>Video placeholder</T>
                  </span>
                </div>
                <div className="p-4">
                  <p className="font-semibold text-white">
                    <T>Mr. Hichem Trabelsi</T>
                  </p>
                  <p className="mt-1 text-xs text-gray-400">
                    <T>Example Bac mathematics teacher</T>
                  </p>
                </div>
              </details>
              <div className="rounded-lg border border-gray-200 p-5">
                <p className="text-xs font-semibold tracking-wide text-gray-500 uppercase">
                  <T>Lesson board</T>
                </p>
                <p className="font-display mt-4 text-2xl font-bold text-gray-800">
                  x² − 5x + 6 = 0
                </p>
                <p className="mt-4 text-sm leading-6 text-gray-500">
                  <T>
                    Find two numbers with a product of 6 and a sum of −5. Use
                    them to factorise the expression.
                  </T>
                </p>
              </div>
              <p className="text-xs leading-5 text-gray-400">
                <T>
                  Student answers stay private from classmates. Shared examples
                  below contain no student name.
                </T>
              </p>
            </aside>
            <div
              id="classroom-role-panel"
              role="region"
              aria-labelledby={`role-${view}`}
              className="min-w-0 space-y-6"
            >
              {view === "teacher" ? (
                <>
                  <section className="rounded-lg border border-gray-200 p-5">
                    <div className="flex flex-wrap items-center justify-between gap-4">
                      <div>
                        <p className="text-xs font-semibold tracking-wide text-brand uppercase">
                          <T>01 · Ask the class</T>
                        </p>
                        <h2 className="font-display mt-2 text-xl font-bold text-gray-800">
                          <T>Solve x² − 5x + 6 = 0</T>
                        </h2>
                      </div>
                      <label className="text-sm font-semibold text-gray-600">
                        <T>Response format</T>
                        <select
                          value={mode}
                          onChange={(e) =>
                            setMode(e.target.value as "choice" | "written")
                          }
                          className={`${fieldClass} text-sm`}
                        >
                          <option value="choice">
                            <T>Multiple choice</T>
                          </option>
                          <option value="written">
                            <T>Written working / photo</T>
                          </option>
                        </select>
                      </label>
                    </div>
                    <div className="mt-5 flex flex-wrap items-center gap-4">
                      <button
                        type="button"
                        onClick={publish}
                        className={published ? secondaryButton : primaryButton}
                      >
                        <T>
                          {published
                            ? "Publish a fresh question"
                            : "Publish question"}
                        </T>
                      </button>
                      {published && (
                        <button
                          type="button"
                          onClick={() => {
                            setView("student");
                            setNotice("");
                          }}
                          className={primaryButton}
                        >
                          <T>Switch to student view →</T>
                        </button>
                      )}
                    </div>
                    {published && (
                      <p className="mt-3 text-xs text-gray-500">
                        <T>
                          A fresh question resets responses and feedback. Active
                          format:
                        </T>{" "}
                        <T>
                          {activeMode === "choice"
                            ? "multiple choice"
                            : "written working / photo"}
                        </T>
                        .
                      </p>
                    )}
                  </section>
                  {published && (
                    <section>
                      <div className="flex flex-wrap justify-between gap-3">
                        <h2 className="font-display text-xl font-bold text-gray-800">
                          <T>Teacher live overview</T>
                        </h2>
                        <p className="text-xs text-gray-400">
                          <T>Illustrative class · 40 learners</T>
                        </p>
                      </div>
                      <div className="mt-4 grid grid-cols-2 gap-3 xl:grid-cols-4">
                        {[
                          [
                            "Submitted",
                            `${responses.length} / 40`,
                            "text-gray-800",
                          ],
                          ["Correct", correct, "text-emerald-700"],
                          ["Incorrect", incorrect, "text-red-700"],
                          ["Awaiting review", pending, "text-amber-700"],
                        ].map(([label, n, color]) => (
                          <div
                            key={label}
                            className="rounded-lg bg-gray-50 p-4"
                          >
                            <p
                              className={`font-display text-2xl font-extrabold ${color}`}
                            >
                              <T>{n}</T>
                            </p>
                            <p className="mt-1 text-xs text-gray-500">
                              <T>{label}</T>
                            </p>
                          </div>
                        ))}
                      </div>
                      <div className="mt-4 h-2 overflow-hidden rounded-full bg-gray-100">
                        <div
                          className="h-full bg-brand transition-all"
                          style={{ width: `${participation}%` }}
                        />
                      </div>
                      <p className="mt-3 text-sm leading-6 text-gray-500">
                        <T>Participation: </T>
                        <T>{participation}</T>
                        <T>% · Still working:</T> <T>{40 - responses.length}</T>
                        <br />
                        <T>Correct-answer rate:</T>{" "}
                        <T>
                          {graded
                            ? `${Math.round((correct / graded) * 100)}% of ${graded} graded answers`
                            : "No graded answers yet"}
                        </T>
                        <T>. Pending work is excluded.</T>
                      </p>
                    </section>
                  )}
                  {published && (
                    <section>
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <h2 className="font-display text-xl font-bold text-gray-800">
                          <T>02 · Review student work</T>
                        </h2>
                        <label className="text-xs text-gray-500">
                          <T>Show responses</T>
                          <select
                            className={`${fieldClass} mt-1 py-2 text-sm`}
                            value={filter}
                            onChange={(e) => setFilter(e.target.value)}
                          >
                            <option value="all">
                              <T>All submissions</T>
                            </option>
                            <option value="review">
                              <T>Awaiting review</T>
                            </option>
                            <option value="incorrect">
                              <T>Incorrect</T>
                            </option>
                            <option value="you">
                              <T>Your demo learner</T>
                            </option>
                          </select>
                        </label>
                      </div>
                      <div className="mt-4 max-h-72 overflow-y-auto rounded-lg border border-gray-200">
                        <table className="w-full text-start text-sm">
                          <thead className="sticky top-0 bg-gray-100 text-xs text-gray-500">
                            <tr>
                              <th className="px-4 py-3">
                                <T>Learner</T>
                              </th>
                              <th className="px-4 py-3">
                                <T>Status</T>
                              </th>
                              <th className="px-4 py-3">
                                <span className="sr-only">
                                  <T>Review</T>
                                </span>
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {responses
                              .filter(
                                (r) =>
                                  filter === "all" ||
                                  (filter === "you"
                                    ? r.id === "you"
                                    : r.status === filter),
                              )
                              .map((r) => (
                                <tr
                                  key={r.id}
                                  className={
                                    r.id === "you"
                                      ? "bg-blue-50/70"
                                      : "bg-white"
                                  }
                                >
                                  <td className="px-4 py-3 text-gray-700">
                                    <T>{r.name}</T>
                                  </td>
                                  <td className="px-4 py-3">
                                    <span
                                      className={`inline-block rounded px-2 py-1 text-xs font-semibold ${statusColors[r.status]}`}
                                    >
                                      <T>{labels[r.status]}</T>
                                    </span>
                                  </td>
                                  <td className="px-4 py-3">
                                    <Localized
                                      as="button"
                                      type="button"
                                      aria-label={`Review ${r.name}`}
                                      onClick={() => {
                                        setSelected(r.id);
                                        setComment(r.feedback ?? "");
                                      }}
                                      className="min-h-11 min-w-16 px-2 font-semibold text-blue-600 hover:underline"
                                    >
                                      <T>Review</T>
                                    </Localized>
                                  </td>
                                </tr>
                              ))}
                          </tbody>
                        </table>
                        {!responses.some(
                          (r) =>
                            filter === "all" ||
                            (filter === "you"
                              ? r.id === "you"
                              : r.status === filter),
                        ) && (
                          <p className="p-5 text-sm text-gray-500">
                            <T>No submissions in this view yet.</T>
                          </p>
                        )}
                      </div>
                      {opened && (
                        <div
                          ref={reviewPanel}
                          tabIndex={-1}
                          className="mt-5 rounded-lg border border-blue-200 bg-blue-50/40 p-5 focus:outline-none"
                        >
                          <h3 className="font-semibold text-gray-800">
                            <T>Reviewing: </T>
                            <T>{opened.name}</T>
                          </h3>
                          <p className="mt-3 whitespace-pre-wrap break-words rounded bg-white p-4 font-mono text-sm text-gray-700">
                            {opened.answer}
                          </p>
                          {opened.photo && (
                            <a
                              href={opened.photo}
                              target="_blank"
                              rel="noreferrer"
                              className="mt-3 inline-block text-sm font-semibold text-blue-600 underline"
                            >
                              <T>Open submitted photo</T>
                            </a>
                          )}
                          <label className="mt-4 block text-sm font-semibold text-gray-700">
                            <T>Teacher explanation</T>
                            <Localized
                              as="textarea"
                              className={fieldClass}
                              rows={3}
                              value={comment}
                              onChange={(e) => setComment(e.target.value)}
                              placeholder="Explain the reasoning or give a correction…"
                            />
                          </label>
                          <div className="mt-4 flex flex-wrap gap-3">
                            <button
                              type="button"
                              onClick={() => mark("correct")}
                              className="rounded-md bg-brand px-4 py-3 text-sm font-semibold text-white hover:bg-brand-dark"
                            >
                              <T>Mark correct</T>
                            </button>
                            <button
                              type="button"
                              onClick={() => mark("incorrect")}
                              className={secondaryButton}
                            >
                              <T>Mark incorrect</T>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setShared({
                                  answer: opened.answer,
                                  feedback:
                                    comment.trim() ||
                                    opened.feedback ||
                                    t(
                                      "Check the signs when finding the roots. Substituting your answer is a useful way to check your work.",
                                    ),
                                });
                                setNotice(
                                  "An anonymous example and explanation are now visible in Student view.",
                                );
                              }}
                              className={secondaryButton}
                            >
                              <T>Share anonymously</T>
                            </button>
                          </div>
                          <p className="mt-3 text-xs leading-5 text-gray-500">
                            <T>
                              Marks and comments are sent to this learner only.
                              Anonymous sharing includes the written answer and
                              explanation, with no learner name or photo.
                            </T>
                          </p>
                        </div>
                      )}
                    </section>
                  )}
                  {published && (
                    <section className="border-t border-gray-200 pt-5">
                      <h2 className="font-display text-xl font-bold text-gray-800">
                        <T>03 · Explain and follow up</T>
                      </h2>
                      <p className="mt-3 text-sm leading-6 text-gray-500">
                        <T>
                          Release the official solution when you are ready for
                          students to compare their reasoning.
                        </T>
                      </p>
                      <button
                        type="button"
                        disabled={released}
                        onClick={() => {
                          setReleased(true);
                          setNotice(
                            "The official solution is now visible in Student view.",
                          );
                        }}
                        className={`${secondaryButton} mt-4`}
                      >
                        <T>
                          {released
                            ? "Solution released ✓"
                            : "Release solution to students"}
                        </T>
                      </button>
                    </section>
                  )}
                </>
              ) : (
                <>
                  {!published ? (
                    <div className="rounded-lg border border-dashed border-gray-300 px-6 py-16 text-center">
                      <h2 className="font-display text-2xl font-bold text-gray-800">
                        <T>Ready when your teacher is.</T>
                      </h2>
                      <p className="mt-4 leading-7 text-gray-500">
                        <T>
                          The question will appear here after it is published.
                        </T>
                      </p>
                      <button
                        type="button"
                        onClick={() => setView("teacher")}
                        className={`${primaryButton} mt-6`}
                      >
                        <T>Go to teacher view to publish</T>
                      </button>
                    </div>
                  ) : (
                    <section className={panelClass}>
                      <p className="text-xs font-semibold tracking-wide text-brand uppercase">
                        <T>Your answer · Private</T>
                      </p>
                      <h2 className="font-display mt-3 text-2xl font-bold text-gray-800">
                        <T>Solve: x² − 5x + 6 = 0</T>
                      </h2>
                      <p className="mt-3 text-sm text-gray-500">
                        <T>
                          {activeMode === "choice"
                            ? "Choose one answer. The teacher will release the explanation when ready."
                            : "Show your steps in writing, or attach a photo of your working. Your teacher will review it."}
                        </T>
                      </p>
                      {mine ? (
                        <div className="mt-6" role="status">
                          <p className="rounded-lg bg-gray-50 p-4 text-gray-700">
                            {mine.answer}
                          </p>
                          <p
                            className={`mt-4 inline-block rounded px-3 py-1.5 text-sm font-semibold ${mine.status === "review" ? statusColors.review : "bg-blue-50 text-blue-700"}`}
                          >
                            <T>
                              {mine.status === "review"
                                ? "Submitted · Awaiting teacher review"
                                : mine.feedback || released
                                  ? `Reviewed · ${labels[mine.status]}`
                                  : "Submitted · Waiting for teacher feedback"}
                            </T>
                          </p>
                          {mine.feedback && (
                            <div className="mt-4 rounded-lg border border-emerald-100 bg-emerald-50 p-4">
                              <p className="font-semibold text-emerald-800">
                                <T>Your teacher&apos;s feedback</T>
                              </p>
                              <p className="mt-2 leading-7 text-emerald-800">
                                {mine.feedback}
                              </p>
                            </div>
                          )}
                          <button
                            type="button"
                            onClick={() => {
                              setView("teacher");
                              setSelected("you");
                              setComment(mine.feedback ?? "");
                              setFilter("you");
                            }}
                            className="mt-5 block text-sm font-semibold text-blue-600 hover:underline"
                          >
                            <T>Review this answer as the teacher →</T>
                          </button>
                        </div>
                      ) : (
                        <form className="mt-6" onSubmit={submit}>
                          {activeMode === "choice" ? (
                            <fieldset>
                              <legend className="sr-only">
                                <T>Choose the roots</T>
                              </legend>
                              <div className="space-y-3">
                                {choices.map((c) => (
                                  <label
                                    key={c}
                                    className={`flex cursor-pointer items-center gap-3 rounded-lg border p-4 ${choice === c ? "border-brand bg-emerald-50" : "border-gray-200"}`}
                                  >
                                    <input
                                      type="radio"
                                      name="answer"
                                      value={c}
                                      checked={choice === c}
                                      onChange={(e) =>
                                        setChoice(e.target.value)
                                      }
                                    />
                                    <span className="text-gray-700">
                                      <T>{c}</T>
                                    </span>
                                  </label>
                                ))}
                              </div>
                            </fieldset>
                          ) : (
                            <>
                              <label className="block text-sm font-semibold text-gray-700">
                                <T>My working</T>
                                <Localized
                                  as="textarea"
                                  className={fieldClass}
                                  rows={5}
                                  value={written}
                                  onChange={(e) => setWritten(e.target.value)}
                                  placeholder="Write the steps you used to solve the equation…"
                                />
                              </label>
                              <label className="mt-5 block text-sm font-semibold text-gray-700">
                                <T>Or attach a photo of your working</T>
                                <input
                                  ref={fileInput}
                                  className={`${fieldClass} text-sm`}
                                  type="file"
                                  accept="image/jpeg,image/png,image/webp"
                                  onChange={upload}
                                />
                              </label>
                              <p className="mt-2 text-xs text-gray-400">
                                <T>
                                  JPG, PNG or WebP · Up to 5 MB · Stays in this
                                  page
                                </T>
                              </p>
                              {photo && (
                                <p className="mt-3 text-sm text-emerald-700">
                                  <T>Photo attached ✓</T>
                                </p>
                              )}
                              {fileError && (
                                <p
                                  role="alert"
                                  className="mt-3 text-sm text-red-700"
                                >
                                  <T>{fileError}</T>
                                </p>
                              )}
                            </>
                          )}
                          <button
                            className={`${primaryButton} mt-6`}
                            type="submit"
                            disabled={
                              activeMode === "choice"
                                ? !choice
                                : !written.trim() && !photo
                            }
                          >
                            <T>Submit my answer</T>
                          </button>
                        </form>
                      )}
                    </section>
                  )}
                  {shared && (
                    <section className="rounded-lg border border-blue-200 bg-blue-50 p-5">
                      <p className="text-xs font-semibold tracking-wide text-blue-700 uppercase">
                        <T>Shared by the teacher · Anonymous</T>
                      </p>
                      <h2 className="font-display mt-3 text-xl font-bold text-gray-800">
                        <T>Let&apos;s learn from this example</T>
                      </h2>
                      <p className="mt-4 whitespace-pre-wrap break-words rounded bg-white p-4 font-mono text-sm text-gray-700">
                        {shared.answer}
                      </p>
                      <p className="mt-4 leading-7 text-blue-900">
                        {shared.feedback}
                      </p>
                    </section>
                  )}
                  {released && (
                    <section className="rounded-lg border border-emerald-200 bg-emerald-50 p-5">
                      <h2 className="font-display text-xl font-bold text-emerald-900">
                        <T>The teacher&apos;s solution</T>
                      </h2>
                      <p className="mt-4 font-mono text-lg text-emerald-900">
                        (x − 2)(x − 3) = 0<br />
                        <T>x = 2 or x = 3</T>
                      </p>
                      <p className="mt-4 leading-7 text-emerald-800">
                        <T>
                          A product is zero when one of its factors is zero.
                          Notice the signs: x − 2 = 0 gives x = 2. Check by
                          substituting each root into the original equation.
                        </T>
                      </p>
                    </section>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
        <p
          role="status"
          aria-live="polite"
          className="mt-4 min-h-6 text-sm font-semibold text-blue-800"
        >
          <T>{notice}</T>
        </p>
      </div>
    </div>
  );
}
