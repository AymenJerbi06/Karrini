"use client";
import { T, Localized } from "@/components/I18n";

import { useRef, useState, type FormEvent } from "react";
import { useI18n } from "@/components/I18n";
import {
  fieldClass,
  primaryButton,
  secondaryButton,
} from "@/components/SiteUi";

export function FeedbackForm() {
  const { locale, t } = useI18n();
  const [role, setRole] = useState("Teacher");
  const [message, setMessage] = useState("");
  const [draft, setDraft] = useState("");
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");
  const result = useRef<HTMLElement>(null);
  function prepare(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!message.trim()) {
      setError("Write a few words before preparing your note.");
      return;
    }
    setError("");
    setDraft(
      `${locale === "ar" ? "ملاحظات على فكرة قرّيني" : "Avis sur le concept Qarrini"}\n${locale === "ar" ? "الصفة" : "Profil"} : ${t(role)}\n\n${message.trim()}\n`,
    );
    setCopied(false);
    requestAnimationFrame(() => result.current?.focus());
  }
  function download() {
    const url = URL.createObjectURL(
      new Blob([draft], { type: "text/plain;charset=utf-8" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = "qarrini-feedback.txt";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  async function copy() {
    try {
      await navigator.clipboard.writeText(draft);
      setCopied(true);
    } catch {
      setCopied(false);
      setError("Copying is unavailable. Download the note instead.");
    }
  }
  return (
    <>
      <form onSubmit={prepare} className="space-y-5">
        <label className="block text-sm font-semibold text-gray-700">
          <T>I am giving feedback as a</T>
          <select
            value={role}
            onChange={(e) => {
              setRole(e.target.value);
              setDraft("");
              setError("");
            }}
            className={fieldClass}
          >
            {["Teacher", "Student", "Parent", "Other"].map((r) => (
              <option value={r} key={r}>
                <T>{r}</T>
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm font-semibold text-gray-700">
          <T>Your feedback</T>
          <Localized
            as="textarea"
            className={fieldClass}
            rows={6}
            required
            maxLength={5000}
            value={message}
            onChange={(e) => {
              setMessage(e.target.value);
              setDraft("");
              setError("");
            }}
            aria-invalid={error && !draft ? true : undefined}
            aria-describedby={error && !draft ? "feedback-status" : undefined}
            placeholder="What would make Qarrini useful to you? Which parts would you change?"
          />
        </label>
        <button type="submit" className={`${primaryButton} w-full sm:w-auto`}>
          <T>Prepare feedback note</T>
        </button>
      </form>
      {draft && (
        <section
          ref={result}
          tabIndex={-1}
          aria-live="polite"
          className="mt-7 rounded-lg border border-emerald-200 bg-emerald-50 p-5 focus:outline-none"
        >
          <h2 className="font-semibold text-emerald-800">
            <T>Your note is ready to share</T>
          </h2>
          <p className="mt-4 whitespace-pre-wrap break-words text-sm leading-6 text-gray-600">
            {draft}
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={download}
              className={secondaryButton}
            >
              <T>Download note</T>
            </button>
            <button type="button" onClick={copy} className={secondaryButton}>
              <T>{copied ? "Copied ✓" : "Copy note"}</T>
            </button>
          </div>
        </section>
      )}
      <p
        id="feedback-status"
        role="status"
        aria-live="polite"
        className="mt-4 text-sm leading-7 text-gray-600"
      >
        <T>{error || (copied ? "Copied ✓" : "")}</T>
      </p>
    </>
  );
}
