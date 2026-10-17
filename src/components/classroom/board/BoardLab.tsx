"use client";
// Development-only fixture. No auth session, camera, emails or Supabase writes.
import { useState } from "react";
import { LessonBoard, StudentBoard } from "./LessonBoard";
const context = {
  sessionId: "00000000-0000-4000-8000-000000000001",
  userId: "board-lab",
  classId: "board-lab",
  groupId: null,
};
export function BoardLab() {
  const [viewer, setViewer] = useState(false);
  const [presenting, setPresenting] = useState(false);
  const [narrow, setNarrow] = useState(false);
  return (
    <main className="flex h-dvh flex-col bg-gray-950 p-3">
      <div className="flex min-h-12 flex-wrap items-center gap-4 text-sm text-white">
        <b>Board QA · local data only</b>
        <button
          type="button"
          className="rounded-lg bg-white/15 px-4 py-2"
          onClick={() => setViewer((v) => !v)}
        >
          {viewer ? "Switch to teacher" : "Switch to student"}
        </button>
        {viewer && <span>{presenting ? "Presenting" : "Camera view"}</span>}
        <button
          type="button"
          onClick={() => setNarrow((v) => !v)}
          className="rounded-lg bg-white/15 px-3 py-2"
        >
          {narrow ? "Full width" : "Phone width"}
        </button>
      </div>
      <div
        className={`min-h-0 w-full flex-1 ${narrow ? "mx-auto max-w-[393px]" : ""}`}
      >
        {viewer ? (
          <StudentBoard
            context={context}
            title="Board QA"
            localOnly
            onPresenting={setPresenting}
          />
        ) : (
          <LessonBoard context={context} title="Board QA" localOnly />
        )}
      </div>
    </main>
  );
}
