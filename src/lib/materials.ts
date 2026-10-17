"use client";

// Teacher materials: files in the private Supabase Storage bucket "materials" (path <classId>/<uuid>-<name>)
// plus a row in public.materials. Row Level Security limits upload/delete to the class teacher and
// reading to the teacher and enrolled students. Files are opened through short-lived signed URLs.

import { supabase } from "@/lib/supabase/client";
import { announceChange, useRemote } from "@/lib/remote";

export type Material = {
  id: string;
  classId: string;
  title: string;
  note: string;
  kind: "notes" | "exercises" | "homework" | "correction" | "other";
  /** Course module (chapter) it belongs to; null = "Other documents". */
  moduleId: string | null;
  groupId: string | null;
  fileName: string;
  filePath: string;
  mime: string;
  size: number;
  uploadedAt: number;
};

export const kindLabels: Record<Material["kind"], string> = {
  notes: "Lesson notes",
  exercises: "Exercise sheet",
  homework: "Homework",
  correction: "Correction",
  other: "Other",
};

export const MAX_FILE_MB = 20;
export const ACCEPTED =
  ".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.png,.jpg,.jpeg,.webp,application/pdf,image/*";

type Row = {
  id: string;
  class_id: string;
  title: string;
  note: string;
  kind: Material["kind"];
  module_id: string | null;
  group_id: string | null;
  file_name: string;
  file_path: string;
  mime: string;
  size_bytes: number;
  created_at: string;
};

const toMaterial = (r: Row): Material => ({
  id: r.id,
  classId: r.class_id,
  title: r.title,
  note: r.note,
  kind: r.kind,
  moduleId: r.module_id ?? null,
  groupId: r.group_id ?? null,
  fileName: r.file_name,
  filePath: r.file_path,
  mime: r.mime,
  size: r.size_bytes,
  uploadedAt: new Date(r.created_at).getTime(),
});

export function useMaterials(classIds: string[]) {
  const key = classIds.join(",");
  const { data, loading, error, reload } = useRemote(
    key ? `materials:${key}` : null,
    async () => {
      const { data, error } = await supabase()
        .from("materials")
        .select("*")
        .in("class_id", classIds)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data as Row[]).map(toMaterial);
    },
    [] as Material[],
    "materials",
  );
  return { items: key ? data : [], loading: key ? loading : false, error, reload };
}

const safeName = (name: string) =>
  name
    .normalize("NFKD")
    .replace(/[^\w.\-]+/g, "-")
    .replace(/-+/g, "-")
    .slice(-80) || "file";

export async function addMaterial(input: {
  classId: string;
  title: string;
  note: string;
  kind: Material["kind"];
  file: File;
  uploadedBy: string;
  moduleId?: string | null;
  groupId?: string | null;
}) {
  const sb = supabase();
  const path = `${input.classId}/${crypto.randomUUID()}-${safeName(input.file.name)}`;
  const upload = await sb.storage.from("materials").upload(path, input.file, {
    contentType: input.file.type || "application/octet-stream",
    upsert: false,
  });
  if (upload.error) throw upload.error;
  const { error } = await sb.from("materials").insert({
    class_id: input.classId,
    title: input.title,
    note: input.note,
    kind: input.kind,
    module_id: input.moduleId ?? null,
    ...(input.groupId ? { group_id: input.groupId } : {}),
    file_path: path,
    file_name: input.file.name,
    mime: input.file.type || "application/octet-stream",
    size_bytes: input.file.size,
    uploaded_by: input.uploadedBy,
  });
  if (error) {
    await sb.storage.from("materials").remove([path]); // don't leave an orphan file
    throw error;
  }
  announceChange("materials");
}

export async function deleteMaterial(m: Material) {
  const sb = supabase();
  const { error } = await sb.from("materials").delete().eq("id", m.id);
  if (error) throw error;
  await sb.storage.from("materials").remove([m.filePath]);
  announceChange("materials");
}

/** Opens (or downloads) a material through a signed URL valid for 60 seconds. */
export async function openMaterial(m: Material, download = false) {
  const { data, error } = await supabase()
    .storage.from("materials")
    .createSignedUrl(m.filePath, 60, download ? { download: m.fileName } : undefined);
  if (error || !data) throw error ?? new Error("no-url");
  const a = document.createElement("a");
  a.href = data.signedUrl;
  if (!download) a.target = "_blank";
  a.rel = "noopener";
  a.click();
}

export function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function fileBadge(mime: string, name: string) {
  if (mime === "application/pdf" || name.endsWith(".pdf")) return "PDF";
  if (mime.startsWith("image/")) return "IMG";
  if (/\.(docx?|odt)$/i.test(name)) return "DOC";
  if (/\.(pptx?|odp)$/i.test(name)) return "PPT";
  if (/\.(xlsx?|ods|csv)$/i.test(name)) return "XLS";
  return "FILE";
}
