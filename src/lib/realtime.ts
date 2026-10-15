"use client";

// Realtime transport used by the live classroom for questions, answers and WebRTC signalling.
//
// The classroom only depends on the `RealtimeTransport` interface:
//  - BroadcastChannelTransport (default): works between windows/tabs of the same browser,
//    which is enough to demonstrate the full teacher ⇄ student cycle on one computer.
//  - WebSocketTransport: used automatically when NEXT_PUBLIC_REALTIME_URL is set. It talks
//    to the room server described in docs/ARCHITECTURE.md, so the same UI works across devices.

export type Envelope<T = unknown> = {
  room: string;
  from: string;
  /** Optional recipient. Messages without `to` go to everyone in the room. */
  to?: string;
  type: string;
  payload: T;
  at: number;
};

export interface RealtimeTransport {
  readonly kind: "local" | "websocket";
  send(type: string, payload: unknown, to?: string): void;
  subscribe(handler: (message: Envelope) => void): () => void;
  close(): void;
}

class BroadcastChannelTransport implements RealtimeTransport {
  readonly kind = "local" as const;
  private channel: BroadcastChannel;
  private handlers = new Set<(m: Envelope) => void>();

  constructor(private room: string, private peerId: string) {
    this.channel = new BroadcastChannel(`qarrini-room:${room}`);
    this.channel.onmessage = (event: MessageEvent<Envelope>) => {
      const message = event.data;
      if (!message || message.from === this.peerId) return;
      if (message.to && message.to !== this.peerId) return;
      this.handlers.forEach((h) => h(message));
    };
  }
  send(type: string, payload: unknown, to?: string) {
    const message: Envelope = { room: this.room, from: this.peerId, to, type, payload, at: Date.now() };
    this.channel.postMessage(message);
  }
  subscribe(handler: (m: Envelope) => void) {
    this.handlers.add(handler);
    return () => this.handlers.delete(handler);
  }
  close() {
    this.handlers.clear();
    this.channel.close();
  }
}

class WebSocketTransport implements RealtimeTransport {
  readonly kind = "websocket" as const;
  private socket: WebSocket;
  private queue: string[] = [];
  private handlers = new Set<(m: Envelope) => void>();

  constructor(url: string, private room: string, private peerId: string, token?: string) {
    const target = new URL(url);
    target.searchParams.set("room", room);
    target.searchParams.set("peer", peerId);
    if (token) target.searchParams.set("token", token);
    this.socket = new WebSocket(target);
    this.socket.onopen = () => {
      this.queue.forEach((m) => this.socket.send(m));
      this.queue = [];
    };
    this.socket.onmessage = (event) => {
      try {
        const message = JSON.parse(String(event.data)) as Envelope;
        if (message.from === this.peerId) return;
        if (message.to && message.to !== this.peerId) return;
        this.handlers.forEach((h) => h(message));
      } catch {
        /* Ignore malformed frames. */
      }
    };
  }
  send(type: string, payload: unknown, to?: string) {
    const frame = JSON.stringify({ room: this.room, from: this.peerId, to, type, payload, at: Date.now() });
    if (this.socket.readyState === WebSocket.OPEN) this.socket.send(frame);
    else this.queue.push(frame);
  }
  subscribe(handler: (m: Envelope) => void) {
    this.handlers.add(handler);
    return () => this.handlers.delete(handler);
  }
  close() {
    this.handlers.clear();
    this.socket.close();
  }
}

export function createTransport(room: string, peerId: string, token?: string): RealtimeTransport {
  const url = process.env.NEXT_PUBLIC_REALTIME_URL;
  if (url) return new WebSocketTransport(url, room, peerId, token);
  return new BroadcastChannelTransport(room, peerId);
}

/* ------------- Cross-tab "who is live" index (prototype only) ------------- */

const LIVE = "qarrini-live-index";
export type LiveEntry = { classId: string; teacher: string; startedAt: number; heartbeat: number };

export function readLive(): Record<string, LiveEntry> {
  try {
    const value = JSON.parse(window.localStorage.getItem(LIVE) ?? "{}");
    const now = Date.now();
    return Object.fromEntries(
      Object.entries(value as Record<string, LiveEntry>).filter(([, e]) => now - e.heartbeat < 15_000),
    );
  } catch {
    return {};
  }
}

export function markLive(entry: LiveEntry | null, classId: string) {
  const all = readLive();
  if (entry) all[classId] = entry;
  else delete all[classId];
  window.localStorage.setItem(LIVE, JSON.stringify(all));
  window.dispatchEvent(new Event("qarrini-live-changed"));
}
