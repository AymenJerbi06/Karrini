"use client";

import { useRef, useState, type DragEvent, type FormEvent } from "react";
import { Localized, T, useI18n } from "@/components/I18n";
import { TeacherShell } from "@/components/workspace/TeacherShell";
import { fieldClass, primaryButton, secondaryButton } from "@/components/SiteUi";
import { DownloadIcon, TrashIcon, UploadIcon } from "@/components/icons";
import { Toast } from "@/components/ui/Motion";
import {
  ACCEPTED,
  addMaterial,
  deleteMaterial,
  openMaterial,
  fileBadge,
  formatSize,
  MAX_FILE_MB,
  useMaterials,
  type Material,
} from "@/lib/materials";
import { cn } from "@/lib/cn";

export const kindLabels: Record<Material["kind"], string> = {
  notes: "Lesson notes",
  exercises: "Exercise sheet",
  homework: "Homework",
  correction: "Correction",
  other: "Other",
};

export function TeacherMaterials() {
  return (
    <TeacherShell
      title="Class materials"
      intro="Upload notes, exercise sheets, homework and corrections. Only students enrolled in your class can open them."
    >
      {({ cls, account }) => <Materials classId={cls.id} accountId={account.id} />}
    </TeacherShell>
  );
}

function Materials({ classId, accountId }: { classId: string; accountId: string }) {
  const { t, locale } = useI18n();
  const { items, loading, error: loadError } = useMaterials([classId]);
  const input = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [kind, setKind] = useState<Material["kind"]>("notes");
  const [note, setNote] = useState("");
  const [drag, setDrag] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  function pick(f: File | undefined) {
    setError("");
    if (!f) return;
    if (f.size > MAX_FILE_MB * 1024 * 1024) {
      setError(t("This file is larger than {n} MB.", { n: MAX_FILE_MB }));
      return;
    }
    setFile(f);
    if (!title) setTitle(f.name.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " "));
  }

  function onDrop(e: DragEvent) {
    e.preventDefault();
    setDrag(false);
    pick(e.dataTransfer.files?.[0]);
  }

  async function upload(e: FormEvent) {
    e.preventDefault();
    if (!file) return setError(t("Choose a file to upload."));
    if (!title.trim()) return setError(t("Give the material a title."));
    setError("");
    // Supabase uploads report no byte progress, so the bar steps through upload → save.
    setProgress(15);
    const tick = setInterval(() => setProgress((p) => (p === null ? p : Math.min(85, p + 7))), 400);
    try {
      await addMaterial({ classId, title: title.trim(), note: note.trim(), kind, file, uploadedBy: accountId });
      clearInterval(tick);
      setProgress(100);
      setTimeout(() => setProgress(null), 600);
      setToast(t("Material shared with your class."));
      setFile(null);
      setTitle("");
      setNote("");
      if (input.current) input.current.value = "";
    } catch {
      clearInterval(tick);
      setProgress(null);
      setError(t("The upload failed. Check your connection and try again."));
    }
  }

  async function openFile(m: Material, download = false) {
    try {
      await openMaterial(m, download);
    } catch {
      setError(t("This file could not be opened. Try again in a moment."));
    }
  }

  return (
    <div className="grid items-start gap-8 lg:grid-cols-[400px_1fr]">
      <form onSubmit={upload} className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm lg:sticky lg:top-6" noValidate>
        <h2 className="font-display text-xl font-bold text-gray-800">
          <T>Upload a material</T>
        </h2>
        <label
          onDragOver={(e) => {
            e.preventDefault();
            setDrag(true);
          }}
          onDragLeave={() => setDrag(false)}
          onDrop={onDrop}
          className={cn(
            "mt-5 flex min-h-40 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-6 text-center transition-all duration-200",
            drag ? "scale-[1.02] border-brand bg-emerald-50" : file ? "border-brand/60 bg-emerald-50/40" : "border-gray-300 hover:border-gray-400 hover:bg-gray-50",
          )}
        >
          <UploadIcon className={cn("h-9 w-9 transition-transform", drag ? "-translate-y-1 text-brand" : "text-gray-400")} />
          {file ? (
            <span className="mt-3 text-sm">
              <span dir="auto" className="block font-semibold break-all text-gray-800">
                {file.name}
              </span>
              <span className="text-gray-500" dir="ltr">
                {formatSize(file.size)}
              </span>
            </span>
          ) : (
            <span className="mt-3 text-sm text-gray-600">
              <span className="font-semibold text-brand">
                <T>Choose a file</T>
              </span>{" "}
              <T>or drag it here</T>
              <span className="mt-1 block text-xs text-gray-400">{t("PDF, Word, PowerPoint, Excel or images · up to {n} MB", { n: MAX_FILE_MB })}</span>
            </span>
          )}
          <input ref={input} type="file" accept={ACCEPTED} className="sr-only" onChange={(e) => pick(e.target.files?.[0])} />
        </label>

        <label className="mt-5 block text-sm font-semibold text-gray-700">
          <T>Title</T>
          <input dir="auto" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={80} className={fieldClass} />
        </label>
        <label className="mt-4 block text-sm font-semibold text-gray-700">
          <T>Type</T>
          <select value={kind} onChange={(e) => setKind(e.target.value as Material["kind"])} className={fieldClass}>
            {(Object.keys(kindLabels) as Material["kind"][]).map((k) => (
              <option key={k} value={k}>
                {t(kindLabels[k])}
              </option>
            ))}
          </select>
        </label>
        <label className="mt-4 block text-sm font-semibold text-gray-700">
          <T>Note for students</T>
          <Localized
            as="textarea"
            rows={2}
            dir="auto"
            value={note}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setNote(e.target.value)}
            placeholder="Optional, e.g. Do exercises 1–4 before Thursday"
            className={fieldClass}
          />
        </label>

        {progress !== null && (
          <div className="mt-5" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}>
            <div className="h-2 overflow-hidden rounded-full bg-gray-100">
              <div className="h-full rounded-full bg-brand transition-all duration-300" style={{ width: `${progress}%` }} />
            </div>
            <p className="mt-1 text-xs text-gray-500" dir="ltr">
              {progress}%
            </p>
          </div>
        )}
        {error && (
          <p role="alert" className="mt-4 text-sm text-red-700">
            {error}
          </p>
        )}
        <button type="submit" disabled={progress !== null} className={`${primaryButton} mt-6 w-full`}>
          <UploadIcon className="h-5 w-5" />
          <T>Share with my class</T>
        </button>
        <p className="mt-3 text-xs leading-5 text-gray-400">
          <T>Files are stored securely and only your enrolled students can open them.</T>
        </p>
      </form>

      <section>
        <div className="flex items-center justify-between">
          <h2 className="font-display text-xl font-bold text-gray-800">{t("Shared materials ({n})", { n: items.length })}</h2>
        </div>
        {loading ? (
          <div className="mt-5 space-y-3">
            {[0, 1].map((i) => (
              <div key={i} className="h-20 animate-pulse rounded-xl bg-gray-100" />
            ))}
          </div>
        ) : loadError ? (
          <p className="mt-5 rounded-lg bg-red-50 p-4 text-sm text-red-800">
            <T>Materials could not be loaded in this browser.</T>
          </p>
        ) : items.length === 0 ? (
          <div className="mt-5 rounded-xl border border-dashed border-gray-300 bg-white p-10 text-center">
            <p className="font-semibold text-gray-700">
              <T>Nothing shared yet.</T>
            </p>
            <p className="mt-2 text-sm text-gray-500">
              <T>Your first upload will appear here and in your students&apos; dashboards.</T>
            </p>
          </div>
        ) : (
          <ul className="mt-5 space-y-3">
            {items.map((m) => (
              <li key={m.id} className="animate-rise flex flex-wrap items-center gap-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-gray-800 text-xs font-bold text-white">
                  {fileBadge(m.mime, m.fileName)}
                </span>
                <div className="min-w-0 flex-1">
                  <p dir="auto" className="font-semibold break-words text-gray-800">
                    {m.title}
                  </p>
                  <p className="mt-0.5 text-xs text-gray-500">
                    <T>{kindLabels[m.kind]}</T> · <span dir="ltr">{formatSize(m.size)}</span> ·{" "}
                    {new Date(m.uploadedAt).toLocaleDateString(locale === "ar" ? "ar-TN" : "fr-TN", { day: "numeric", month: "short" })}
                  </p>
                  {m.note && (
                    <p dir="auto" className="mt-1 text-sm text-gray-600">
                      {m.note}
                    </p>
                  )}
                </div>
                <div className="flex gap-2">
                  <button type="button" onClick={() => openFile(m)} className="min-h-11 rounded-md px-3 text-sm font-semibold text-brand hover:bg-emerald-50">
                    <T>Open</T>
                  </button>
                  <Localized
                    as="button"
                    type="button"
                    aria-label="Download"
                    onClick={() => openFile(m, true)}
                    className="flex h-11 w-11 items-center justify-center rounded-md text-gray-500 hover:bg-gray-100"
                  >
                    <DownloadIcon className="h-5 w-5" />
                  </Localized>
                  {confirmDelete === m.id ? (
                    <span className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={async () => {
                          await deleteMaterial(m);
                          setConfirmDelete(null);
                          setToast(t("Material removed."));
                        }}
                        className="min-h-11 rounded-md bg-red-600 px-3 text-sm font-semibold text-white"
                      >
                        <T>Delete</T>
                      </button>
                      <button type="button" onClick={() => setConfirmDelete(null)} className={`${secondaryButton} min-h-11 px-3 py-0 text-sm`}>
                        <T>Cancel</T>
                      </button>
                    </span>
                  ) : (
                    <Localized
                      as="button"
                      type="button"
                      aria-label="Delete"
                      onClick={() => setConfirmDelete(m.id)}
                      className="flex h-11 w-11 items-center justify-center rounded-md text-gray-400 hover:bg-red-50 hover:text-red-600"
                    >
                      <TrashIcon className="h-5 w-5" />
                    </Localized>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
      <Toast message={toast} onDone={() => setToast("")} />
    </div>
  );
}
