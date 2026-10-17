"use client";
import { supabase, supabaseConfigured } from "@/lib/supabase/client";
import { readAsset, saveAsset } from "./local";
import { isUuid, validBoard, type BoardDocument } from "./model";

export type BoardContext = {
  sessionId: string;
  classId: string;
  groupId: string | null;
  userId: string;
};
export async function loadBoardAudience(
  context: Pick<BoardContext, "sessionId" | "classId" | "userId">,
): Promise<{ groupId: string | null }> {
  const { data, error } = await supabase()
    .from("lesson_boards")
    .select("class_id, teacher_id, group_id")
    .eq("session_id", context.sessionId)
    .abortSignal(AbortSignal.timeout(15000))
    .single();
  if (
    error ||
    !data ||
    data.teacher_id !== context.userId ||
    data.class_id !== context.classId ||
    (data.group_id !== null && !isUuid(data.group_id))
  )
    throw new Error("Group sharing unavailable");
  return { groupId: data.group_id };
}
export async function loadCloudBoard(
  sessionId: string,
): Promise<BoardDocument | undefined> {
  if (!supabaseConfigured) return undefined;
  const { data, error } = await supabase()
    .from("lesson_boards")
    .select("document")
    .eq("session_id", sessionId)
    .abortSignal(AbortSignal.timeout(15000))
    .maybeSingle();
  if (error) throw error;
  if (data && !validBoard(data.document))
    throw new Error("This saved board could not be read.");
  return data?.document;
}
export async function saveCloudBoard(
  context: BoardContext,
  document: BoardDocument,
) {
  if (!supabaseConfigured)
    throw new Error("Board cloud storage is not configured.");
  const { data, error } = await supabase()
    .rpc("save_lesson_board", {
      sid: context.sessionId,
      board_document: document,
    })
    .abortSignal(AbortSignal.timeout(15000));
  if (error || !data) throw error ?? new Error("The board could not be saved.");
}
export function createAssetStore(
  context: Pick<BoardContext, "sessionId" | "userId">,
  localOnly = false,
) {
  const scope = `${context.userId}:${context.sessionId}`;
  const cache = new Map<string, Promise<Blob>>();
  return {
    async put(id: string, blob: Blob) {
      if (!isUuid(id) || blob.size > 20 * 1024 * 1024)
        throw new Error("This page is too large to save.");
      await saveAsset(scope, id, blob);
      cache.set(id, Promise.resolve(blob));
      if (supabaseConfigured && !localOnly) {
        const { error } = await supabase()
          .storage.from("board-assets")
          .upload(`${context.sessionId}/${id}.png`, blob, {
            contentType: blob.type,
            upsert: false,
          });
        if (error && !/already exists|duplicate/i.test(error.message))
          throw error;
      }
    },
    get(id: string): Promise<Blob> {
      if (!isUuid(id)) return Promise.reject(new Error("Invalid board asset."));
      let pending = cache.get(id);
      if (!pending) {
        pending = (async () => {
          const local = await readAsset(scope, id).catch(() => undefined);
          if (local) return local;
          if (!supabaseConfigured || localOnly)
            throw new Error("This board page is not available on this device.");
          const { data, error } = await supabase()
            .storage.from("board-assets")
            .createSignedUrl(`${context.sessionId}/${id}.png`, 120);
          if (error || !data) throw error ?? new Error("Page unavailable.");
          const response = await fetch(data.signedUrl);
          if (!response.ok)
            throw new Error("The page could not be loaded. Try again.");
          const blob = await response.blob();
          if (!blob.type.startsWith("image/") || blob.size > 20 * 1024 * 1024)
            throw new Error("Invalid board page image.");
          await saveAsset(scope, id, blob).catch(() => undefined);
          return blob;
        })();
        cache.set(id, pending);
        pending.catch(() => cache.delete(id));
      }
      return pending;
    },
  };
}
export type BoardAssets = ReturnType<typeof createAssetStore>;
