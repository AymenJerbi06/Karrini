"use client";
import { useEffect, useState } from "react";
import { T, useI18n } from "@/components/I18n";
import {
  fieldClass,
  primaryButton,
  secondaryButton,
} from "@/components/SiteUi";
import { addMaterial, MAX_FILE_MB } from "@/lib/materials";
import { useGroups } from "@/lib/groups";
import { useModules } from "@/lib/modules";
import type { BoardDocument } from "@/lib/board/model";
import {
  loadBoardAudience,
  type BoardAssets,
  type BoardContext,
} from "@/lib/board/repository";
import { BoardIcon } from "./BoardIcon";
import type { ExportFormat } from "@/lib/board/export";
import { BoardDialog } from "./BoardDialog";
import { board as boardMessages } from "@/data/i18n/board";

export function BoardExport({
  board,
  assets,
  context,
  onClose,
  prepareShare,
  localOnly = false,
}: {
  board: BoardDocument;
  assets: BoardAssets;
  context: BoardContext;
  onClose: () => void;
  prepareShare: () => Promise<void>;
  localOnly?: boolean;
}) {
  const { t } = useI18n();
  const { data: groups } = useGroups(localOnly ? [] : [context.classId]);
  const { data: modules } = useModules(localOnly ? "" : context.classId);
  const [format, setFormat] = useState<ExportFormat>("pdf");
  const [destination, setDestination] = useState<"download" | "group">(
    "download",
  );
  const [moduleId, setModuleId] = useState("");
  const [title, setTitle] = useState(board.title);
  const [progress, setProgress] = useState<[number, number] | null>(null);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [audience, setAudience] = useState<{ groupId: string | null } | null>(
    null,
  );
  const [shareError, setShareError] = useState(false);
  const { sessionId, classId, userId } = context;
  useEffect(() => {
    if (localOnly) return;
    let active = true;
    void prepareShare()
      .then(() => loadBoardAudience({ sessionId, classId, userId }))
      .then((a) => {
        if (active) setAudience(a);
      })
      .catch(() => {
        if (active) setShareError(true);
      });
    return () => {
      active = false;
    };
  }, [prepareShare, sessionId, classId, userId, localOnly]);
  const groupName = !audience
    ? t(shareError ? "Group sharing unavailable" : "Checking class group…")
    : audience.groupId
      ? (groups.find((g) => g.id === audience.groupId)?.name ??
        t("This lesson's group"))
      : t("All students in this class");
  async function save() {
    setProgress([0, board.pages.length]);
    setError("");
    try {
      const { exportBoard, downloadBoard } = await import("@/lib/board/export");
      const file = await exportBoard(
        { ...board, title: title.trim() || board.title },
        assets,
        format,
        (n, total) => setProgress([n, total]),
      );
      if (destination === "download") downloadBoard(file);
      else {
        if (!audience) throw new Error("Group sharing unavailable");
        if (file.size > MAX_FILE_MB * 1024 * 1024)
          throw new Error(
            "This export exceeds 20 MB. Download it or export fewer pages.",
          );
        await addMaterial({
          classId: context.classId,
          groupId: audience.groupId,
          title: title.trim() || board.title,
          note: "",
          kind: "notes",
          file,
          uploadedBy: context.userId,
          moduleId: moduleId || null,
        });
      }
      setDone(true);
    } catch (e) {
      setError(
        e instanceof Error && e.message in boardMessages
          ? e.message
          : "The board could not be exported. Please try again.",
      );
    } finally {
      setProgress(null);
    }
  }
  return (
    <BoardDialog
      label={t("Save lesson board")}
      onClose={onClose}
      busy={!!progress}
    >
      <div className="my-auto w-full max-w-md rounded-2xl bg-white p-6 text-gray-900 shadow-xl">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-xl font-bold">
            <T>{done ? "Your lesson is ready" : "Save lesson board"}</T>
          </h2>
          <button
            type="button"
            disabled={!!progress}
            onClick={onClose}
            aria-label={t("Close")}
            className="grid h-11 w-11 place-items-center rounded-lg hover:bg-gray-100 disabled:opacity-40"
          >
            <BoardIcon name="close" className="h-5 w-5" />
          </button>
        </div>
        {done ? (
          <>
            <p role="status" className="my-5 text-sm leading-7 text-gray-600">
              <T>
                {destination === "group"
                  ? "The lesson notes are now available in this group's class materials."
                  : "Your download is ready. The editable board stays saved in Karrini."}
              </T>
            </p>
            <button
              type="button"
              onClick={onClose}
              className={`${primaryButton} w-full`}
            >
              <T>Done</T>
            </button>
          </>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void save();
            }}
            className="mt-4 space-y-4"
          >
            <label className="block text-sm font-semibold">
              <T>Document title</T>
              <input
                autoFocus
                value={title}
                maxLength={120}
                required
                onChange={(e) => setTitle(e.target.value)}
                className={`${fieldClass} mt-2 w-full`}
              />
            </label>
            <fieldset disabled={!!progress}>
              <legend className="mb-2 text-sm font-semibold">
                <T>File format</T>
              </legend>
              <div className="grid grid-cols-3 gap-2">
                {(["pdf", "pptx", "docx"] as const).map((f) => (
                  <label
                    key={f}
                    className={`flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-lg border text-sm font-semibold ${f === format ? "border-brand bg-emerald-50 text-brand" : "border-gray-200"}`}
                  >
                    <input
                      type="radio"
                      name="board-format"
                      value={f}
                      checked={f === format}
                      onChange={() => setFormat(f)}
                    />
                    {f === "pdf" ? "PDF" : f === "pptx" ? "PowerPoint" : "Word"}
                  </label>
                ))}
              </div>
            </fieldset>
            <p className="text-xs leading-6 text-gray-500">
              <T>
                Each board page is saved as an image in your document, including
                all annotations.
              </T>
            </p>
            <label className="block text-sm font-semibold">
              <T>Save to</T>
              <select
                value={destination}
                disabled={!!progress}
                onChange={(e) =>
                  setDestination(e.target.value as typeof destination)
                }
                className={`${fieldClass} mt-2 w-full`}
              >
                <option value="download">{t("My device")}</option>
                {!localOnly && (
                  <option value="group" disabled={!audience}>
                    {groupName}
                  </option>
                )}
              </select>
            </label>
            {destination === "group" && (
              <label className="block text-sm font-semibold">
                <T>Course module</T>
                <select
                  value={moduleId}
                  disabled={!!progress}
                  onChange={(e) => setModuleId(e.target.value)}
                  className={`${fieldClass} mt-2 w-full`}
                >
                  <option value="">{t("Other documents")}</option>
                  {modules.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.title}
                    </option>
                  ))}
                </select>
              </label>
            )}
            {error && (
              <p role="alert" className="text-sm leading-6 text-red-700">
                {t(error)}
              </p>
            )}
            {progress && (
              <div role="status" className="text-sm text-brand">
                <progress
                  max={progress[1]}
                  value={progress[0]}
                  className="w-full"
                />
                {t("Preparing page {n} of {total}…", {
                  n: Math.min(progress[0] + 1, progress[1]),
                  total: progress[1],
                })}
              </div>
            )}
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                disabled={!!progress}
                onClick={onClose}
                className={`${secondaryButton} flex-1 disabled:opacity-40`}
              >
                <T>Cancel</T>
              </button>
              <button
                disabled={!!progress}
                type="submit"
                className={`${primaryButton} flex-1 disabled:opacity-40`}
              >
                <T>{destination === "group" ? "Share notes" : "Download"}</T>
              </button>
            </div>
          </form>
        )}
      </div>
    </BoardDialog>
  );
}
