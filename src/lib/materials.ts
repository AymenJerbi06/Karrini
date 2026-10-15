"use client";

// Teacher materials stored in IndexedDB so real files (PDF, images, documents) survive reloads
// and can be opened by enrolled students in another tab. Production: object storage + signed URLs.

import { useEffect, useState } from "react";

export type Material = {
  id: string;
  classId: string;
  title: string;
  note: string;
  kind: "notes" | "exercises" | "homework" | "correction" | "other";
  fileName: string;
  mime: string;
  size: number;
  uploadedAt: number;
  blob: Blob;
};

const DB = "qarrini";
const STORE = "materials";
const CHANNEL = "qarrini-materials";
export const MAX_FILE_MB = 20;
export const ACCEPTED =
  ".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.png,.jpg,.jpeg,.webp,application/pdf,image/*";

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, { keyPath: "id" });
        store.createIndex("classId", "classId");
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function run<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>) {
  const db = await open();
  return new Promise<T>((resolve, reject) => {
    const tx = db.transaction(STORE, mode);
    const req = fn(tx.objectStore(STORE));
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  }).finally(() => db.close());
}

function announce() {
  try {
    const c = new BroadcastChannel(CHANNEL);
    c.postMessage("changed");
    c.close();
  } catch {
    /* Older browsers: the current tab still refreshes below. */
  }
  window.dispatchEvent(new Event(CHANNEL));
}

export async function addMaterial(m: Omit<Material, "id" | "uploadedAt">) {
  const record: Material = {
    ...m,
    id: `mat-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    uploadedAt: Date.now(),
  };
  await run("readwrite", (s) => s.put(record));
  announce();
  return record;
}

export async function deleteMaterial(id: string) {
  await run("readwrite", (s) => s.delete(id));
  announce();
}

export async function listMaterials(classIds: string[]): Promise<Material[]> {
  const all = await run<Material[]>("readonly", (s) => s.getAll());
  return all
    .filter((m) => classIds.includes(m.classId))
    .sort((a, b) => b.uploadedAt - a.uploadedAt);
}

/** Live list of materials for the given classes; refreshes when any tab uploads or deletes. */
export function useMaterials(classIds: string[]) {
  const key = classIds.join(",");
  const [state, setState] = useState<{ key: string; items: Material[]; loading: boolean; error: boolean }>({
    key,
    items: [],
    loading: true,
    error: false,
  });
  useEffect(() => {
    let alive = true;
    const ids = key ? key.split(",") : [];
    const load = () =>
      listMaterials(ids)
        .then((items) => alive && setState({ key, items, loading: false, error: false }))
        .catch(() => alive && setState({ key, items: [], loading: false, error: true }));
    load();
    let channel: BroadcastChannel | null = null;
    try {
      channel = new BroadcastChannel(CHANNEL);
      channel.onmessage = load;
    } catch {
      channel = null;
    }
    window.addEventListener(CHANNEL, load);
    return () => {
      alive = false;
      channel?.close();
      window.removeEventListener(CHANNEL, load);
    };
  }, [key]);
  return state.key === key ? state : { key, items: [], loading: true, error: false };
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
