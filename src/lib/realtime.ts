"use client";

import type { RealtimeChannel } from "@supabase/supabase-js";
import { supabase, supabaseConfigured } from "@/lib/supabase/client";

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
  readonly kind: "local" | "websocket" | "supabase";
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

/**
 * Supabase Realtime broadcast on the private channel "class:<classId>".
 * Database policies on realtime.messages allow only the class teacher and enrolled students
 * to listen or send, so lesson traffic (questions, answers, WebRTC signalling) stays in the class.
 */
class SupabaseTransport implements RealtimeTransport {
  readonly kind = "supabase" as const;
  private channel: RealtimeChannel | null = null;
  private ready = false;
  private closed = false;
  private queue: Envelope[] = [];
  private handlers = new Set<(m: Envelope) => void>();

  constructor(private room: string, private peerId: string) {
    void this.connect();
  }

  private async connect() {
    const sb = supabase();
    await sb.realtime.setAuth(); // use the signed-in user's token for the private channel
    if (this.closed) return;
    const channel = sb.channel(`class:${this.room}`, { config: { private: true, broadcast: { self: false } } });
    channel.on("broadcast", { event: "msg" }, ({ payload }) => {
      const message = payload as Envelope;
      if (!message || message.from === this.peerId) return;
      if (message.to && message.to !== this.peerId) return;
      this.handlers.forEach((h) => h(message));
    });
    channel.subscribe((status) => {
      if (status === "SUBSCRIBED") {
        this.ready = true;
        const pending = this.queue;
        this.queue = [];
        pending.forEach((m) => void channel.send({ type: "broadcast", event: "msg", payload: m }));
      } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
        this.ready = false;
      }
    });
    this.channel = channel;
  }

  send(type: string, payload: unknown, to?: string) {
    const message: Envelope = { room: this.room, from: this.peerId, to, type, payload, at: Date.now() };
    if (this.ready && this.channel) void this.channel.send({ type: "broadcast", event: "msg", payload: message });
    else this.queue.push(message);
  }
  subscribe(handler: (m: Envelope) => void) {
    this.handlers.add(handler);
    return () => this.handlers.delete(handler);
  }
  close() {
    this.closed = true;
    this.handlers.clear();
    if (this.channel) void supabase().removeChannel(this.channel);
  }
}

export function createTransport(room: string, peerId: string, token?: string): RealtimeTransport {
  const url = process.env.NEXT_PUBLIC_REALTIME_URL;
  if (url) return new WebSocketTransport(url, room, peerId, token);
  if (supabaseConfigured) return new SupabaseTransport(room, peerId);
  return new BroadcastChannelTransport(room, peerId);
}
