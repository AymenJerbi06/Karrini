"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { boardChannel } from "./channel";
import { localKey, readDraft, saveDraft } from "./local";
import {
  frameOf,
  MAX_DOCUMENT_BYTES,
  newBoard,
  nextRevision,
  validBoard,
  type BoardDocument,
  type BoardFrame,
} from "./model";
import {
  createAssetStore,
  loadCloudBoard,
  saveCloudBoard,
  type BoardContext,
} from "./repository";

export function useLessonBoard(
  context: BoardContext,
  title: string,
  teacher: boolean,
  localOnly = false,
) {
  const { sessionId, userId, classId, groupId } = context;
  const stableContext = useMemo(
    () => ({ sessionId, userId, classId, groupId }),
    [sessionId, userId, classId, groupId],
  );
  const assets = useMemo(
    () => createAssetStore(stableContext, localOnly),
    [stableContext, localOnly],
  );
  const [document, setDocument] = useState<BoardDocument | null>(null);
  const [frame, setFrame] = useState<BoardFrame | null>(null);
  const [ready, setReady] = useState(false);
  const [connected, setConnected] = useState(false);
  const [saveState, setSaveState] = useState<"saving" | "saved" | "local">(
    "saving",
  );
  const [error, setError] = useState("");
  const saving = useRef(true);
  useEffect(() => {
    saving.current = saveState === "saving";
  }, [saveState]);
  const current = useRef<BoardDocument | null>(null);
  const lastRevision = useRef(-1);
  const channel = useRef<ReturnType<typeof boardChannel> | null>(null);
  const pendingCloud = useRef<BoardDocument | null>(null);
  const cloudJob = useRef<Promise<void> | null>(null);
  const titleRef = useRef(title);
  useEffect(() => {
    titleRef.current = title;
  }, [title]);
  const shareTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savedRevision = useRef(-1);
  const persist = useCallback(async () => {
    const d = current.current;
    if (!d || !teacher) return;
    if (savedRevision.current === d.revision) return; // nothing new to save
    setSaveState("saving");
    let localSaved = false;
    try {
      await saveDraft(localKey(userId, sessionId), d)
        .then(() => {
          localSaved = true;
        })
        .catch(() => undefined);
      if (!localOnly) {
        pendingCloud.current = d;
        if (!cloudJob.current)
          cloudJob.current = (async () => {
            // Keep only the newest pending save while a slow request is in flight.
            while (pendingCloud.current) {
              const next = pendingCloud.current;
              pendingCloud.current = null;
              await saveCloudBoard(stableContext, next);
            }
          })().finally(() => {
            cloudJob.current = null;
          });
        await cloudJob.current;
      } else if (!localSaved)
        throw new Error("Local board storage unavailable.");
      if (!localOnly || localSaved) savedRevision.current = Math.max(savedRevision.current, d.revision);
      if (current.current?.revision === d.revision)
        setSaveState(localOnly ? "local" : "saved");
      setError((e) =>
        /Cloud saving will retry|board could not be saved|saved board could not be loaded/.test(
          e,
        )
          ? ""
          : e,
      );
    } catch {
      setSaveState(localSaved ? "local" : "saving");
      setError(
        localSaved
          ? "Your board is kept on this device. Cloud saving will retry when the connection returns."
          : "The board could not be saved. Keep this tab open and download a copy.",
      );
      throw new Error("Board cloud save unavailable.");
    }
  }, [sessionId, userId, stableContext, teacher, localOnly]);

  useEffect(() => {
    let active = true;
    const key = localKey(userId, sessionId);
    void (async () => {
      const results = await Promise.allSettled([
        teacher ? readDraft(key) : Promise.resolve(undefined),
        localOnly ? Promise.resolve(undefined) : loadCloudBoard(sessionId),
      ]);
      if (!active) return;
      const local =
        results[0].status === "fulfilled" && validBoard(results[0].value)
          ? results[0].value
          : undefined;
      const cloud =
        results[1].status === "fulfilled" ? results[1].value : undefined;
      const chosen =
        local && (!cloud || local.revision > cloud.revision) ? local : cloud;
      const d = chosen ?? (teacher ? newBoard(titleRef.current) : null);
      if (teacher) {
        current.current = d;
        setDocument(d);
        setSaveState(
          localOnly ||
            results[1].status === "rejected" ||
            (local && chosen === local)
            ? "local"
            : "saved",
        );
      }
      if (d && d.revision >= lastRevision.current) {
        lastRevision.current = d.revision;
        setFrame(frameOf(d));
      }
      if (results[1].status === "rejected")
        setError(
          "The saved board could not be loaded. Check your connection and retry.",
        );
      setReady(true);
    })();
    return () => {
      active = false;
    };
  }, [sessionId, userId, teacher, localOnly]);

  useEffect(() => {
    const ch = boardChannel(
      sessionId,
      teacher,
      (f) => {
        if (f.revision >= lastRevision.current) {
          lastRevision.current = f.revision;
          setFrame(f);
        }
      },
      (online) => {
        setConnected(online);
        if (online && teacher && current.current)
          void ch
            .publish(frameOf(current.current))
            .catch(() => setConnected(false));
        if (online && !teacher && !localOnly)
          void loadCloudBoard(sessionId)
            .then((d) => {
              if (d && d.revision >= lastRevision.current) {
                lastRevision.current = d.revision;
                setFrame(frameOf(d));
              }
            })
            .catch(() => undefined);
      },
      localOnly,
    );
    channel.current = ch;
    // Safety net for lost frames while presenting, and for saves that failed earlier.
    // An unchanged, hidden board sends nothing.
    const beat = setInterval(() => {
      if (teacher && current.current) {
        if (current.current.presenting)
          void ch
            .publish(frameOf(current.current))
            .catch(() => setConnected(false));
        void persist().catch(() => undefined);
      }
    }, 5000);
    return () => {
      clearInterval(beat);
      if (shareTimer.current) clearTimeout(shareTimer.current);
      ch.close();
      channel.current = null;
    };
  }, [sessionId, teacher, localOnly, persist]);

  useEffect(() => {
    if (!document || !ready || !teacher) return;
    const save = setTimeout(() => void persist().catch(() => undefined), 800);
    if (!shareTimer.current)
      shareTimer.current = setTimeout(() => {
        shareTimer.current = null;
        if (current.current)
          void channel.current
            ?.publish(frameOf(current.current))
            .catch(() => setConnected(false));
      }, 70);
    return () => {
      clearTimeout(save);
    };
  }, [document, ready, teacher, persist]);
  useEffect(() => {
    if (!teacher) return;
    const flush = () => {
      if (current.current) void persist().catch(() => undefined);
    };
    const warning = (e: BeforeUnloadEvent) => {
      if (saving.current) {
        e.preventDefault();
      }
      flush();
    };
    window.addEventListener("beforeunload", warning);
    window.addEventListener("offline", flush);
    window.addEventListener("online", flush);
    return () => {
      window.removeEventListener("beforeunload", warning);
      window.removeEventListener("offline", flush);
      window.removeEventListener("online", flush);
      flush();
    };
  }, [persist, teacher]);

  const update = useCallback(
    (fn: (d: BoardDocument) => BoardDocument) => {
      if (!teacher || !current.current) return;
      const next = {
        ...fn(current.current),
        revision: nextRevision(current.current.revision),
      };
      if (
        !validBoard(next) ||
        new Blob([JSON.stringify(next)]).size > MAX_DOCUMENT_BYTES
      ) {
        setError("The board is full. Export it before adding more pages.");
        return;
      }
      current.current = next;
      setDocument(next);
      setSaveState("saving");
    },
    [teacher],
  );
  return {
    document,
    frame,
    ready,
    connected,
    saveState,
    error,
    setError,
    update,
    persist,
    assets,
  };
}
