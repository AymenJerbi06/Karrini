"use client";

// WebRTC video for the live classroom.
//
// Prototype topology: the teacher (host) opens one RTCPeerConnection per student (mesh).
// Students receive the teacher's camera/screen and can optionally send their own camera/mic.
// Signalling (SDP + ICE) travels over the RealtimeTransport. Each pair uses the
// "perfect negotiation" pattern: the teacher is impolite, students are polite.
//
// Production replaces the mesh with an SFU (LiveKit / mediasoup) — see docs/ARCHITECTURE.md.
// The UI only uses the values returned by this hook, so that swap stays local to this file.

import { useCallback, useEffect, useRef, useState } from "react";
import type { Envelope, RealtimeTransport } from "@/lib/realtime";

type Peer = {
  pc: RTCPeerConnection;
  polite: boolean;
  makingOffer: boolean;
  ignoreOffer: boolean;
};

export type RemoteStream = { id: string; stream: MediaStream };

// STUN finds a direct route; TURN relays the video when networks block direct routes
// (mobile data, school or office Wi-Fi). Configure TURN with NEXT_PUBLIC_TURN_URL /
// NEXT_PUBLIC_TURN_USERNAME / NEXT_PUBLIC_TURN_CREDENTIAL, or a full NEXT_PUBLIC_ICE_SERVERS JSON list.
function iceServers(): RTCIceServer[] {
  try {
    const custom = process.env.NEXT_PUBLIC_ICE_SERVERS;
    if (custom) return JSON.parse(custom) as RTCIceServer[];
  } catch {
    /* fall through */
  }
  const servers: RTCIceServer[] = [
    { urls: ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302"] },
    { urls: "stun:stun.cloudflare.com:3478" },
  ];
  const turn = process.env.NEXT_PUBLIC_TURN_URL;
  if (turn)
    servers.push({
      urls: turn.split(",").map((u) => u.trim()),
      username: process.env.NEXT_PUBLIC_TURN_USERNAME,
      credential: process.env.NEXT_PUBLIC_TURN_CREDENTIAL,
    });
  return servers;
}

/** A student asks the teacher for a fresh video connection this often until one works. */
const RETRY_MS = 8000;

/** Animated canvas used when no camera is available, so the call can still be demonstrated. */
function demoCameraStream(label: string): MediaStream {
  const canvas = document.createElement("canvas");
  canvas.width = 640;
  canvas.height = 360;
  const ctx = canvas.getContext("2d")!;
  let frame = 0;
  const draw = () => {
    frame += 1;
    const g = ctx.createLinearGradient(0, 0, 640, 360);
    g.addColorStop(0, "#133e34");
    g.addColorStop(1, "#176b58");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 640, 360);
    // Simple teaching board with a moving pointer.
    ctx.fillStyle = "#fbf9f2";
    ctx.fillRect(250, 60, 340, 220);
    ctx.fillStyle = "#102f29";
    ctx.font = "bold 30px sans-serif";
    ctx.fillText("x² − 5x + 6 = 0", 285, 140);
    ctx.font = "22px sans-serif";
    ctx.fillText("(x − 2)(x − 3) = 0", 290, 200);
    const px = 300 + 230 * (0.5 + 0.5 * Math.sin(frame / 40));
    ctx.fillStyle = "#e9b665";
    ctx.beginPath();
    ctx.arc(px, 240, 9, 0, Math.PI * 2);
    ctx.fill();
    // Presenter silhouette.
    ctx.fillStyle = "#c98e66";
    ctx.beginPath();
    ctx.arc(130, 150, 46, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#0e4b40";
    ctx.beginPath();
    ctx.ellipse(130, 310, 90, 80, 0, Math.PI, 0);
    ctx.fill();
    ctx.fillStyle = "#fbf9f2";
    ctx.font = "16px sans-serif";
    ctx.fillText(label, 24, 340);
  };
  const timer = window.setInterval(draw, 1000 / 24);
  draw();
  const stream = canvas.captureStream(24);
  stream.getVideoTracks()[0].addEventListener("ended", () => window.clearInterval(timer));
  return stream;
}

export function useClassroomCall({
  transport,
  hostId,
  role,
  demoLabel,
}: {
  transport: RealtimeTransport | null;
  hostId: string;
  role: "teacher" | "student";
  demoLabel: string;
}) {
  const peers = useRef(new Map<string, Peer>());
  const local = useRef<MediaStream | null>(null);
  const screen = useRef<MediaStream | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remotes, setRemotes] = useState<RemoteStream[]>([]);
  const [live, setLive] = useState(false);
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [sharing, setSharing] = useState(false);
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null);
  const [connectedPeers, setConnectedPeers] = useState<string[]>([]);
  const [usingDemoCamera, setUsingDemoCamera] = useState(false);
  const [error, setError] = useState("");
  /** Student: consecutive join attempts that did not produce a working video connection. */
  const [failedAttempts, setFailedAttempts] = useState(0);
  const isHost = role === "teacher";

  const send = useCallback(
    (type: string, payload: unknown, to?: string) => transport?.send(type, payload, to),
    [transport],
  );

  const dropPeer = useCallback((id: string) => {
    peers.current.get(id)?.pc.close();
    peers.current.delete(id);
    setRemotes((r) => r.filter((x) => x.id !== id));
    setConnectedPeers((c) => c.filter((x) => x !== id));
  }, []);

  const createPeer = useCallback(
    (remoteId: string) => {
      dropPeer(remoteId);
      const pc = new RTCPeerConnection({ iceServers: iceServers() });
      const peer: Peer = { pc, polite: !isHost, makingOffer: false, ignoreOffer: false };
      peers.current.set(remoteId, peer);
      local.current?.getTracks().forEach((t) => pc.addTrack(t, local.current!));
      pc.onicecandidate = ({ candidate }) => {
        if (candidate) send("rtc-ice", { candidate: candidate.toJSON() }, remoteId);
      };
      pc.onnegotiationneeded = async () => {
        try {
          peer.makingOffer = true;
          await pc.setLocalDescription();
          send("rtc-desc", { description: pc.localDescription?.toJSON() }, remoteId);
        } catch {
          /* Negotiation retries on the next change. */
        } finally {
          peer.makingOffer = false;
        }
      };
      pc.ontrack = ({ streams }) => {
        const stream = streams[0];
        if (!stream) return;
        setRemotes((r) => [...r.filter((x) => x.id !== remoteId), { id: remoteId, stream }]);
      };
      pc.onconnectionstatechange = () => {
        if (peers.current.get(remoteId)?.pc !== pc) return; // replaced by a newer connection
        if (pc.connectionState === "connected") {
          setConnectedPeers((c) => (c.includes(remoteId) ? c : [...c, remoteId]));
          setFailedAttempts(0);
          setError("");
        }
        if (pc.connectionState === "disconnected")
          setConnectedPeers((c) => c.filter((x) => x !== remoteId));
        if (["failed", "closed"].includes(pc.connectionState)) dropPeer(remoteId);
      };
      return peer;
    },
    [dropPeer, isHost, send],
  );

  const handle = useCallback(
    async (m: Envelope) => {
      if (m.type === "rtc-join" && isHost) {
        if (local.current) createPeer(m.from);
        return;
      }
      if (m.type === "rtc-host-ready" && !isHost) {
        send("rtc-join", {}, hostId);
        return;
      }
      if (m.type === "rtc-leave") {
        dropPeer(m.from);
        return;
      }
      if (m.type === "rtc-host-ended" && !isHost) {
        dropPeer(m.from);
        return;
      }
      if (m.type === "rtc-desc") {
        const { description } = m.payload as { description: RTCSessionDescriptionInit };
        const peer = peers.current.get(m.from) ?? createPeer(m.from);
        const { pc } = peer;
        const collision =
          description.type === "offer" && (peer.makingOffer || pc.signalingState !== "stable");
        peer.ignoreOffer = !peer.polite && collision;
        if (peer.ignoreOffer) return;
        try {
          await pc.setRemoteDescription(description);
          if (description.type === "offer") {
            await pc.setLocalDescription();
            send("rtc-desc", { description: pc.localDescription?.toJSON() }, m.from);
          }
        } catch {
          setError("The video connection could not be negotiated. Try rejoining.");
        }
        return;
      }
      if (m.type === "rtc-ice") {
        const peer = peers.current.get(m.from);
        if (!peer) return;
        try {
          await peer.pc.addIceCandidate((m.payload as { candidate: RTCIceCandidateInit }).candidate);
        } catch {
          if (!peer.ignoreOffer) setError("A network route for the video could not be added.");
        }
      }
    },
    [createPeer, dropPeer, hostId, isHost, send],
  );

  useEffect(() => {
    if (!transport) return;
    const off = transport.subscribe((m) => {
      if (m.type.startsWith("rtc-")) void handle(m);
    });
    // Students announce themselves; if the teacher is already live they get an offer back.
    // Until the video actually connects, they ask again with a fresh connection, so a lost
    // message, a teacher refresh or a failed network route does not leave a black screen.
    let lastJoin = Date.now();
    let retry: ReturnType<typeof setInterval> | undefined;
    if (!isHost) {
      transport.send("rtc-join", {}, hostId);
      retry = setInterval(() => {
        const state = peers.current.get(hostId)?.pc.connectionState;
        if (state === "connected" || Date.now() - lastJoin < RETRY_MS) return;
        lastJoin = Date.now();
        if (peers.current.has(hostId)) {
          dropPeer(hostId);
          setFailedAttempts((n) => n + 1);
        }
        transport.send("rtc-join", {}, hostId);
      }, 2000);
    }
    const leave = () => transport.send(isHost ? "rtc-host-ended" : "rtc-leave", {});
    window.addEventListener("pagehide", leave);
    return () => {
      off();
      if (retry) clearInterval(retry);
      window.removeEventListener("pagehide", leave);
    };
  }, [transport, handle, hostId, isHost, dropPeer]);

  const getCamera = useCallback(
    async (video: boolean, audio: boolean) => {
      try {
        if (!navigator.mediaDevices?.getUserMedia) throw new Error("unsupported");
        const request = navigator.mediaDevices.getUserMedia({
          video: video ? { width: { ideal: 1280 }, height: { ideal: 720 } } : false,
          audio: audio ? { echoCancellation: true, noiseSuppression: true } : false,
        });
        // A permission prompt that is never answered would otherwise wait forever.
        const timeout = new Promise<never>((_, reject) => setTimeout(() => reject(new Error("timeout")), 8000));
        const stream = await Promise.race([request, timeout]).catch((err) => {
          // Release a camera that answers after we gave up.
          request.then((late) => late.getTracks().forEach((t) => t.stop())).catch(() => undefined);
          throw err;
        });
        setUsingDemoCamera(false);
        return stream;
      } catch {
        if (!video) throw new Error("no-mic");
        setUsingDemoCamera(true);
        return demoCameraStream(demoLabel);
      }
    },
    [demoLabel],
  );

  /** Teacher: go live. Student: share own camera/mic with the teacher. */
  const start = useCallback(async () => {
    setError("");
    try {
      const stream = await getCamera(true, true);
      local.current = stream;
      setLocalStream(stream);
      setMicOn(stream.getAudioTracks().length > 0);
      setCamOn(true);
      setLive(true);
      if (isHost) {
        send("rtc-host-ready", {});
      } else {
        const peer = peers.current.get(hostId) ?? createPeer(hostId);
        const sent = new Set(peer.pc.getSenders().map((s) => s.track));
        stream.getTracks().forEach((t) => {
          if (!sent.has(t)) peer.pc.addTrack(t, stream);
        });
      }
    } catch {
      setError("Camera and microphone are blocked. Allow them in your browser settings.");
    }
  }, [createPeer, getCamera, hostId, isHost, send]);

  const stop = useCallback(() => {
    local.current?.getTracks().forEach((t) => t.stop());
    screen.current?.getTracks().forEach((t) => t.stop());
    local.current = null;
    screen.current = null;
    setLocalStream(null);
    setScreenStream(null);
    setSharing(false);
    setLive(false);
    if (isHost) {
      send("rtc-host-ended", {});
      [...peers.current.keys()].forEach(dropPeer);
    } else {
      const peer = peers.current.get(hostId);
      peer?.pc.getSenders().forEach((s) => {
        try {
          peer.pc.removeTrack(s);
        } catch {
          /* already removed */
        }
      });
    }
  }, [dropPeer, hostId, isHost, send]);

  const toggleMic = useCallback(() => {
    const tracks = local.current?.getAudioTracks() ?? [];
    const next = !micOn;
    tracks.forEach((t) => (t.enabled = next));
    setMicOn(next);
  }, [micOn]);

  const toggleCam = useCallback(() => {
    const tracks = local.current?.getVideoTracks() ?? [];
    const next = !camOn;
    tracks.forEach((t) => (t.enabled = next));
    setCamOn(next);
  }, [camOn]);

  /** Teacher only: replace the outgoing camera with the screen (and back). */
  const toggleScreen = useCallback(async () => {
    const cameraTrack = local.current?.getVideoTracks()[0];
    const swap = (track: MediaStreamTrack | undefined) =>
      peers.current.forEach(({ pc }) =>
        pc.getSenders().forEach((s) => {
          if (s.track?.kind === "video" || (!s.track && track)) void s.replaceTrack(track ?? null);
        }),
      );
    if (sharing) {
      screen.current?.getTracks().forEach((t) => t.stop());
      screen.current = null;
      setScreenStream(null);
      swap(cameraTrack);
      setSharing(false);
      return;
    }
    try {
      const display = await navigator.mediaDevices.getDisplayMedia({ video: true });
      screen.current = display;
      setScreenStream(display);
      const track = display.getVideoTracks()[0];
      track.addEventListener("ended", () => {
        swap(local.current?.getVideoTracks()[0]);
        setScreenStream(null);
        setSharing(false);
      });
      swap(track);
      setSharing(true);
    } catch {
      setError("Screen sharing was cancelled or is not supported in this browser.");
    }
  }, [sharing]);

  useEffect(
    () => () => {
      local.current?.getTracks().forEach((t) => t.stop());
      screen.current?.getTracks().forEach((t) => t.stop());
      peers.current.forEach(({ pc }) => pc.close());
      peers.current.clear();
    },
    [],
  );

  return {
    localStream,
    screenStream: sharing ? screenStream : null,
    remotes,
    live,
    micOn,
    camOn,
    sharing,
    usingDemoCamera,
    error,
    /** Number of live video connections (students watching, for the teacher). */
    viewers: connectedPeers.length,
    /** Student: the video has failed to connect several times in a row (likely a blocked network). */
    struggling: failedAttempts >= 2,
    start,
    stop,
    toggleMic,
    toggleCam,
    toggleScreen,
  };
}
