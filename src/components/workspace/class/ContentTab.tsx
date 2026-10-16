"use client";

import { useRef, useState, type FormEvent } from "react";
import { Localized, T, useI18n } from "@/components/I18n";
import { fieldClass, panelClass, primaryButton, secondaryButton } from "@/components/SiteUi";
import { ArrowUpIcon, DownloadIcon, PlusIcon, TrashIcon, UploadIcon } from "@/components/icons";
import { Toast } from "@/components/ui/Motion";
import type { Account } from "@/lib/auth";
import {
  ACCEPTED,
  addMaterial,
  deleteMaterial,
  fileBadge,
  formatSize,
  kindLabels,
  MAX_FILE_MB,
  openMaterial,
  useMaterials,
  type Material,
} from "@/lib/materials";
import { addModule, deleteModule, moveMaterial, renameModule, reorderModules, useModules, type Module } from "@/lib/modules";
import { cn } from "@/lib/cn";

/** The class page as the teacher organises it: modules (chapters) holding documents. */
export function ContentTab({ account, classId }: { account: Account; classId: string }) {
  const { t } = useI18n();
  const { data: modules } = useModules(classId);
  const { items, loading } = useMaterials([classId]);
  const [newTitle, setNewTitle] = useState("");
  const [toast, setToast] = useState("");
  const loose = items.filter((m) => !m.moduleId || !modules.some((x) => x.id === m.moduleId));

  async function add(e: FormEvent) {
    e.preventDefault();
    if (!newTitle.trim()) return;
    try {
      await addModule(classId, newTitle, modules.length);
      setNewTitle("");
    } catch {
      setToast(t("The module could not be saved. Try again."));
    }
  }

  function move(i: number, dir: -1 | 1) {
    const list = [...modules];
    const j = i + dir;
    if (j < 0 || j >= list.length) return;
    [list[i], list[j]] = [list[j], list[i]];
    void reorderModules(list);
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-xl font-bold text-gray-800">
          <T>Course content</T>
        </h2>
        <p className="mt-1 max-w-2xl text-sm leading-6 text-gray-500">
          <T>Organise your class into modules or chapters and put your documents in each one. Students see the same structure on their class page.</T>
        </p>
      </div>

      {loading ? (
        <div className="h-32 animate-pulse rounded-xl bg-gray-100" />
      ) : (
        modules.map((m, i) => (
          <ModuleCard
            key={m.id}
            account={account}
            classId={classId}
            module={m}
            index={i}
            count={modules.length}
            modules={modules}
            items={items.filter((x) => x.moduleId === m.id)}
            onMove={move}
            onToast={setToast}
          />
        ))
      )}

      <form onSubmit={add} className="flex flex-wrap gap-3 rounded-xl border border-dashed border-gray-300 bg-white p-4">
        <input
          dir="auto"
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          maxLength={120}
          aria-label={t("Module title")}
          placeholder={t("New module, e.g. Chapter 1: The market")}
          className={`${fieldClass} mt-0 min-w-0 flex-1`}
        />
        <button type="submit" disabled={!newTitle.trim()} className={primaryButton}>
          <PlusIcon className="h-5 w-5" />
          <T>Add module</T>
        </button>
      </form>

      <ModuleCard
        account={account}
        classId={classId}
        module={null}
        index={0}
        count={0}
        modules={modules}
        items={loose}
        onMove={() => undefined}
        onToast={setToast}
      />
      <Toast message={toast} onDone={() => setToast("")} />
    </div>
  );
}

function ModuleCard({
  account,
  classId,
  module,
  index,
  count,
  modules,
  items,
  onMove,
  onToast,
}: {
  account: Account;
  classId: string;
  module: Module | null;
  index: number;
  count: number;
  modules: Module[];
  items: Material[];
  onMove: (i: number, dir: -1 | 1) => void;
  onToast: (m: string) => void;
}) {
  const { t, locale } = useI18n();
  const [uploading, setUploading] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [title, setTitle] = useState(module?.title ?? "");
  const [confirm, setConfirm] = useState<string | null>(null);

  const open = async (m: Material, download: boolean) => {
    try {
      await openMaterial(m, download);
    } catch {
      onToast(t("This file could not be opened. Try again in a moment."));
    }
  };

  return (
    <section className={panelClass}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        {renaming && module ? (
          <form
            className="flex min-w-0 flex-1 gap-2"
            onSubmit={async (e) => {
              e.preventDefault();
              if (title.trim()) await renameModule(module.id, title);
              setRenaming(false);
            }}
          >
            <input dir="auto" autoFocus value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} className={`${fieldClass} mt-0 flex-1`} />
            <button type="submit" className={`${primaryButton} min-h-11 py-2`}>
              <T>Save</T>
            </button>
          </form>
        ) : (
          <h3 className="font-display min-w-0 text-lg font-bold text-gray-900">
            {module ? <bdi dir="auto">{module.title}</bdi> : <T>Other documents</T>}
            <span className="ms-2 text-sm font-normal text-gray-400">{items.length}</span>
          </h3>
        )}
        {module && !renaming && (
          <div className="flex items-center gap-1">
            <Localized as="button" type="button" aria-label="Move up" disabled={index === 0} onClick={() => onMove(index, -1)} className="flex h-10 w-10 items-center justify-center rounded-md text-gray-500 hover:bg-gray-100 disabled:opacity-30">
              <ArrowUpIcon className="h-4 w-4" />
            </Localized>
            <Localized as="button" type="button" aria-label="Move down" disabled={index === count - 1} onClick={() => onMove(index, 1)} className="flex h-10 w-10 items-center justify-center rounded-md text-gray-500 hover:bg-gray-100 disabled:opacity-30">
              <ArrowUpIcon className="h-4 w-4 rotate-180" />
            </Localized>
            <button type="button" onClick={() => setRenaming(true)} className="min-h-10 rounded-md px-3 text-sm text-gray-600 hover:bg-gray-100">
              <T>Rename</T>
            </button>
            {confirm === "module" ? (
              <button
                type="button"
                onClick={async () => {
                  await deleteModule(module.id);
                  onToast(t("Module deleted. Its documents moved to Other documents."));
                }}
                className="min-h-10 rounded-md bg-red-600 px-3 text-sm font-semibold text-white"
              >
                <T>Delete</T>
              </button>
            ) : (
              <Localized as="button" type="button" aria-label="Delete" onClick={() => setConfirm("module")} className="flex h-10 w-10 items-center justify-center rounded-md text-gray-400 hover:bg-red-50 hover:text-red-600">
                <TrashIcon className="h-4 w-4" />
              </Localized>
            )}
          </div>
        )}
      </div>

      {items.length > 0 && (
        <ul className="mt-4 divide-y divide-gray-100">
          {items.map((m) => (
            <li key={m.id} className="flex flex-wrap items-center gap-3 py-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gray-800 text-[11px] font-bold text-white">{fileBadge(m.mime, m.fileName)}</span>
              <div className="min-w-0 flex-1">
                <p dir="auto" className="font-semibold break-words text-gray-800">
                  {m.title}
                </p>
                <p className="text-xs text-gray-500">
                  <T>{kindLabels[m.kind]}</T> · <span dir="ltr">{formatSize(m.size)}</span> ·{" "}
                  {new Date(m.uploadedAt).toLocaleDateString(locale === "ar" ? "ar-TN" : "fr-TN", { day: "numeric", month: "short" })}
                </p>
              </div>
              <select
                aria-label={t("Module")}
                value={m.moduleId ?? ""}
                onChange={(e) => void moveMaterial(m.id, e.target.value || null)}
                className="min-h-10 max-w-[180px] rounded-md border border-gray-200 bg-white px-2 text-sm text-gray-700"
              >
                <option value="">{t("Other documents")}</option>
                {modules.map((x) => (
                  <option key={x.id} value={x.id}>
                    {x.title}
                  </option>
                ))}
              </select>
              <button type="button" onClick={() => void open(m, false)} className="min-h-10 rounded-md px-3 text-sm font-semibold text-brand hover:bg-emerald-50">
                <T>Open</T>
              </button>
              <Localized as="button" type="button" aria-label="Download" onClick={() => void open(m, true)} className="flex h-10 w-10 items-center justify-center rounded-md text-gray-500 hover:bg-gray-100">
                <DownloadIcon className="h-4 w-4" />
              </Localized>
              {confirm === m.id ? (
                <button
                  type="button"
                  onClick={async () => {
                    await deleteMaterial(m);
                    setConfirm(null);
                    onToast(t("Material removed."));
                  }}
                  className="min-h-10 rounded-md bg-red-600 px-3 text-sm font-semibold text-white"
                >
                  <T>Delete</T>
                </button>
              ) : (
                <Localized as="button" type="button" aria-label="Delete" onClick={() => setConfirm(m.id)} className="flex h-10 w-10 items-center justify-center rounded-md text-gray-400 hover:bg-red-50 hover:text-red-600">
                  <TrashIcon className="h-4 w-4" />
                </Localized>
              )}
            </li>
          ))}
        </ul>
      )}
      {!items.length && !module && (
        <p className="mt-3 text-sm text-gray-500">
          <T>Documents that are not in a module appear here.</T>
        </p>
      )}

      {uploading ? (
        <UploadForm
          classId={classId}
          moduleId={module?.id ?? null}
          accountId={account.id}
          onDone={(msg) => {
            setUploading(false);
            if (msg) onToast(msg);
          }}
        />
      ) : (
        <button type="button" onClick={() => setUploading(true)} className="mt-4 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-brand">
          <UploadIcon className="h-4 w-4" />
          <T>Upload a document here</T>
        </button>
      )}
    </section>
  );
}

function UploadForm({ classId, moduleId, accountId, onDone }: { classId: string; moduleId: string | null; accountId: string; onDone: (message?: string) => void }) {
  const { t } = useI18n();
  const input = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [kind, setKind] = useState<Material["kind"]>("notes");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  function pick(f: File | undefined) {
    setError("");
    if (!f) return;
    if (f.size > MAX_FILE_MB * 1024 * 1024) return setError(t("This file is larger than {n} MB.", { n: MAX_FILE_MB }));
    setFile(f);
    if (!title) setTitle(f.name.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " "));
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!file) return setError(t("Choose a file to upload."));
    if (!title.trim()) return setError(t("Give the material a title."));
    setBusy(true);
    try {
      await addMaterial({ classId, title: title.trim(), note: note.trim(), kind, file, uploadedBy: accountId, moduleId });
      onDone(t("Material shared with your class."));
    } catch {
      setError(t("The upload failed. Check your connection and try again."));
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} noValidate className="animate-rise mt-4 rounded-xl bg-gray-50 p-4">
      <label
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          pick(e.dataTransfer.files?.[0]);
        }}
        className={cn("flex min-h-24 cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-4 text-center text-sm", file ? "border-brand/60 bg-white" : "border-gray-300 bg-white hover:border-gray-400")}
      >
        {file ? (
          <span dir="auto" className="font-semibold break-all text-gray-800">
            {file.name} · <span dir="ltr">{formatSize(file.size)}</span>
          </span>
        ) : (
          <span className="text-gray-600">
            <span className="font-semibold text-brand">
              <T>Choose a file</T>
            </span>{" "}
            <T>or drag it here</T>
            <span className="mt-1 block text-xs text-gray-400">{t("PDF, Word, PowerPoint, Excel or images · up to {n} MB", { n: MAX_FILE_MB })}</span>
          </span>
        )}
        <input ref={input} type="file" accept={ACCEPTED} className="sr-only" onChange={(e) => pick(e.target.files?.[0])} />
      </label>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <label className="block text-sm font-semibold text-gray-700">
          <T>Title</T>
          <input dir="auto" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={80} className={fieldClass} />
        </label>
        <label className="block text-sm font-semibold text-gray-700">
          <T>Type</T>
          <select value={kind} onChange={(e) => setKind(e.target.value as Material["kind"])} className={fieldClass}>
            {(Object.keys(kindLabels) as Material["kind"][]).map((k) => (
              <option key={k} value={k}>
                {t(kindLabels[k])}
              </option>
            ))}
          </select>
        </label>
      </div>
      <label className="mt-3 block text-sm font-semibold text-gray-700">
        <T>Note for students</T>
        <Localized
          as="input"
          dir="auto"
          value={note}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNote(e.target.value)}
          placeholder="Optional, e.g. Do exercises 1–4 before Thursday"
          className={fieldClass}
        />
      </label>
      {error && (
        <p role="alert" className="mt-3 text-sm text-red-700">
          {error}
        </p>
      )}
      <div className="mt-4 flex gap-3">
        <button type="submit" disabled={busy} className={`${primaryButton} min-h-11 py-2`}>
          <UploadIcon className="h-5 w-5" />
          <T>{busy ? "Please wait…" : "Share with my class"}</T>
        </button>
        <button type="button" onClick={() => onDone()} className={`${secondaryButton} min-h-11 py-2`}>
          <T>Cancel</T>
        </button>
      </div>
    </form>
  );
}
