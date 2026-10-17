import type { BoardDocument } from "./model";
const DB = "karrini-lesson-boards";
let db: Promise<IDBDatabase> | undefined;
function database() {
  return (db ??= new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DB, 1);
    request.onupgradeneeded = () => {
      request.result.createObjectStore("documents");
      request.result.createObjectStore("assets");
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => {
      db = undefined;
      reject(request.error);
    };
    request.onblocked = () => {
      db = undefined;
      reject(new Error("Board storage is blocked by another tab."));
    };
  }));
}
async function read<T>(store: string, key: string): Promise<T | undefined> {
  const connection = await database();
  return new Promise((resolve, reject) => {
    const tx = connection.transaction(store, "readonly");
    const request = tx.objectStore(store).get(key);
    request.onsuccess = () => resolve(request.result as T | undefined);
    request.onerror = () => reject(request.error);
  });
}
async function write(store: string, key: string, value: unknown) {
  const connection = await database();
  return new Promise<void>((resolve, reject) => {
    const tx = connection.transaction(store, "readwrite");
    tx.objectStore(store).put(value, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}
export const localKey = (user: string, session: string) => `${user}:${session}`;
export const readDraft = (key: string) => read<BoardDocument>("documents", key);
export async function saveDraft(key: string, document: BoardDocument) {
  const connection = await database();
  return new Promise<void>((resolve, reject) => {
    const tx = connection.transaction("documents", "readwrite");
    const store = tx.objectStore("documents");
    const existing = store.get(key);
    existing.onsuccess = () => {
      // A background tab's autosave must never replace a newer recovered draft.
      if (!existing.result || existing.result.revision <= document.revision)
        store.put(document, key);
    };
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}
export const readAsset = (session: string, id: string) =>
  read<Blob>("assets", `${session}:${id}`);
export const saveAsset = (session: string, id: string, blob: Blob) =>
  write("assets", `${session}:${id}`, blob);
