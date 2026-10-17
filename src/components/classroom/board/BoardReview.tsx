"use client";
import { useRef, useState } from "react";
import { T, useI18n } from "@/components/I18n";
import { secondaryButton } from "@/components/SiteUi";
import { useAuth } from "@/lib/auth";
import type { SessionRecord } from "@/lib/questions";
import { LessonBoard, type LessonBoardHandle } from "./LessonBoard";
import { BoardIcon } from "./BoardIcon";
export function BoardReview({ session }: { session: SessionRecord }) {
  const { account } = useAuth();
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [closing, setClosing] = useState(false);
  const api = useRef<LessonBoardHandle>(null);
  if (!account || account.role !== "teacher") return null;
  async function close() {
    setClosing(true);
    try {
      await api.current?.finish();
    } catch {
      /* The editable local draft remains recoverable. */
    } finally {
      setClosing(false);
      setOpen(false);
    }
  }
  return (
    <>
      <button
        type="button"
        className={`${secondaryButton} my-3`}
        onClick={() => setOpen(true)}
      >
        <BoardIcon name="board" className="h-5 w-5" />
        <T>Review lesson board</T>
      </button>
      {open && (
        <div
          className="fixed inset-0 z-[140] flex flex-col bg-gray-950 p-3"
          role="dialog"
          aria-modal="true"
          aria-label={t("Review lesson board")}
        >
          <div className="flex min-h-12 items-center justify-between gap-4 px-2 text-white">
            <h2 className="font-bold">
              <T>Review lesson board</T>
            </h2>
            <button
              type="button"
              disabled={closing}
              onClick={() => void close()}
              className="flex min-h-11 items-center gap-2 rounded-lg px-4 hover:bg-white/15 disabled:opacity-40"
            >
              <T>{closing ? "Saving…" : "Close"}</T>
              <BoardIcon name="close" className="h-5 w-5" />
            </button>
          </div>
          <div className="min-h-0 flex-1">
            <LessonBoard
              key={session.id}
              apiRef={api}
              context={{
                sessionId: session.id,
                classId: session.classId,
                groupId: session.groupId ?? null,
                userId: account.id,
              }}
              title={t("Lesson notes")}
              review
            />
          </div>
        </div>
      )}
    </>
  );
}
