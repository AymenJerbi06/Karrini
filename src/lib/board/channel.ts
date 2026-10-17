"use client";
import { supabase, supabaseConfigured } from "@/lib/supabase/client";
import { validFrame, type BoardFrame } from "./model";

const CHUNK = 16000;
const LIMIT = 8 * 1024 * 1024;
type Packet = { id: string; index: number; count: number; text: string };
// Only teachers can INSERT on this private channel (enforced by the migration).
// Frames are chunked so large pages do not exceed realtime message limits.
export function boardChannel(
  sessionId: string,
  teacher: boolean,
  receive: (frame: BoardFrame) => void,
  status: (connected: boolean) => void,
  localOnly = false,
) {
  const assemblies = new Map<
    string,
    { at: number; chunks: string[]; count: number; bytes: number }
  >();
  const accept = (p: Packet) => {
    if (
      teacher ||
      !p ||
      typeof p.id !== "string" ||
      p.id.length > 100 ||
      !Number.isInteger(p.count) ||
      p.count < 1 ||
      p.count > Math.ceil(LIMIT / CHUNK) ||
      !Number.isInteger(p.index) ||
      p.index < 0 ||
      p.index >= p.count ||
      typeof p.text !== "string" ||
      p.text.length > CHUNK
    )
      return;
    for (const [id, a] of assemblies)
      if (Date.now() - a.at > 15000) assemblies.delete(id);
    if (!assemblies.has(p.id)) {
      if (assemblies.size >= 3)
        assemblies.delete(assemblies.keys().next().value!);
      assemblies.set(p.id, {
        at: Date.now(),
        chunks: [],
        count: p.count,
        bytes: 0,
      });
    }
    const a = assemblies.get(p.id)!;
    if (a.count !== p.count || a.chunks[p.index] !== undefined) return;
    a.chunks[p.index] = p.text;
    a.bytes += p.text.length;
    if (a.bytes > LIMIT) {
      assemblies.delete(p.id);
      return;
    }
    if (a.chunks.filter((x) => x !== undefined).length === a.count) {
      assemblies.delete(p.id);
      try {
        const frame: unknown = JSON.parse(a.chunks.join(""));
        if (validFrame(frame)) receive(frame);
      } catch {
        /* Ignore incomplete or invalid network data. */
      }
    }
  };
  let send: (p: Packet) => Promise<unknown>;
  let close: () => void;
  if (localOnly) {
    const channel = new BroadcastChannel(`karrini-board-test:${sessionId}`);
    channel.onmessage = (e) => accept(e.data);
    send = async (p) => channel.postMessage(p);
    close = () => channel.close();
    queueMicrotask(() => status(true));
  } else if (supabaseConfigured) {
    const sb = supabase();
    const channel = sb.channel(`board:${sessionId}`, {
      config: { private: true, broadcast: { self: false, ack: true } },
    });
    channel.on("broadcast", { event: "frame" }, ({ payload }) =>
      accept(payload as Packet),
    );
    channel.subscribe((s) => status(s === "SUBSCRIBED"));
    send = async (p) => {
      const result = await channel.send({
        type: "broadcast",
        event: "frame",
        payload: p,
      });
      if (result !== "ok") throw new Error("Board connection interrupted.");
    };
    close = () => {
      void sb.removeChannel(channel);
    };
  } else {
    send = async () => {
      throw new Error("Board connection unavailable.");
    };
    close = () => undefined;
  }
  // Serialize frames, but coalesce unsent pointer updates to the newest page.
  let latest: BoardFrame | undefined;
  let sending = false;
  let closed = false;
  const publish = async (frame: BoardFrame) => {
    if (!teacher || closed) return;
    latest = frame;
    if (sending) return;
    sending = true;
    try {
      while (latest && !closed) {
        const f = latest;
        latest = undefined;
        const data = JSON.stringify(f);
        if (data.length > LIMIT)
          throw new Error("This board page is too large to share live.");
        const id = `${f.revision}:${crypto.randomUUID()}`;
        const count = Math.ceil(data.length / CHUNK);
        for (let i = 0; i < count && !closed; i++)
          await send({
            id,
            index: i,
            count,
            text: data.slice(i * CHUNK, (i + 1) * CHUNK),
          });
      }
    } finally {
      sending = false;
    }
  };
  return {
    publish,
    close: () => {
      closed = true;
      assemblies.clear();
      close();
    },
  };
}
