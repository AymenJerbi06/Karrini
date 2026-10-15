# Qarrini technical architecture

This document describes how the live classroom works today (browser prototype) and the production
architecture for real video lessons with up to ~40 students per class, on Tunisian home and mobile
connections, with the iOS/Android apps planned later.

---

## 1. What the prototype does today

| Concern | Prototype implementation | File |
| --- | --- | --- |
| Accounts | Stored in `localStorage`; the signed-in session is per tab (`sessionStorage`) so a teacher and a student can be signed in side by side in two windows. Phone numbers are normalised to `+216XXXXXXXX`; codes are generated in the browser and shown as a "demo SMS". Email passwords are SHA-256 hashed in the browser (demo only). | `src/lib/auth.ts` |
| Realtime messages | `RealtimeTransport` interface. Default: `BroadcastChannel` (same browser, any number of windows). If `NEXT_PUBLIC_REALTIME_URL` is set, a `WebSocketTransport` is used instead (see §4). | `src/lib/realtime.ts` |
| Video | WebRTC, one `RTCPeerConnection` per student (mesh). Teacher publishes camera + mic (or screen); students receive and may publish their own camera/mic. "Perfect negotiation" pattern (teacher impolite, students polite). Falls back to a generated demo video if no camera is available or permission is never answered (8 s). | `src/lib/useClassroomCall.ts` |
| Classroom protocol | Teacher tab is authoritative: holds the session, grades answers, sends `session-state` heartbeats every 5 s. Students never receive the correct answer before it is released. | `src/components/classroom/protocol.ts`, `TeacherRoom.tsx`, `StudentRoom.tsx` |
| Grading | Multiple choice (exact set), numbers/equations (order-independent, accepts `0,5`, `1/2`, `−3`), short answers (exact match → correct, otherwise **awaiting review**, never auto-wrong), written/photo → review. | `src/lib/questions.ts` |
| Materials | Real files stored in IndexedDB, visible to enrolled students in other tabs of the same browser. | `src/lib/materials.ts` |
| Results history | Saved to `localStorage` when the teacher ends a session; CSV export. | `src/lib/questions.ts`, `TeacherResults.tsx` |

**Limits of the prototype:** everything stays in one browser profile, so the "second device" is a
second window. Mesh WebRTC is fine for a handful of viewers but not for 40 (see §2).

---

## 2. Why production needs an SFU

In a mesh, the teacher uploads one copy of their video **per student**. At 40 students × ~1 Mbps
that is 40 Mbps of upload, far beyond a typical ADSL/4G uplink in Sfax.

A **Selective Forwarding Unit (SFU)** fixes this: the teacher uploads one stream (in three quality
layers, "simulcast"), and the SFU forwards to each student the layer their connection can handle.

```
                         ┌──────────────────────────── Qarrini cloud (EU region, close to Tunisia) ─┐
 Teacher browser/app     │                                                                         │
 ┌──────────────┐  WSS   │  ┌──────────────┐   ┌────────────┐   ┌──────────────┐                   │
 │ Qarrini UI   │◀──────▶│  │ API (Next.js │──▶│ PostgreSQL │   │ Object store │◀─ signed URLs ─┐  │
 │              │        │  │ route        │   │ accounts,  │   │ materials,   │                │  │
 │ camera/mic/  │        │  │ handlers)    │──▶│ classes,   │   │ photos,      │                │  │
 │ screen       │        │  └──────┬───────┘   │ answers    │   │ recordings   │                │  │
 └──────┬───────┘        │         │ JWT        └────────────┘   └──────▲───────┘                │  │
        │ WebRTC (1 up)  │  ┌──────▼───────┐   ┌────────────┐          │ egress (optional)      │  │
        └───────────────▶│  │ Room server  │◀─▶│ Redis      │   ┌──────┴───────┐                │  │
                         │  │ (questions,  │   │ pub/sub    │   │ SFU          │                │  │
 Student browsers/apps   │  │ answers,     │   └────────────┘   │ (LiveKit)    │                │  │
 ┌──────────────┐  WSS   │  │ hands)       │                    │ simulcast    │                │  │
 │ Qarrini UI   │◀──────▶│  └──────────────┘                    └──────┬───────┘                │  │
 └──────▲───────┘        │                                            │                        │  │
        │ WebRTC (best layer per student)                              │   ┌────────────┐        │  │
        └──────────────────────────────────────────────────────────────┘   │ TURN       │        │  │
                         │                                                 │ (coturn,   │        │  │
                         │   SMS gateway ◀── OTP for phone sign-up         │ TCP/TLS    │        │  │
                         │                                                 │ 443)       │        │  │
                         └─────────────────────────────────────────────────┴────────────┴────────┘
```

### Recommended stack

| Layer | Choice | Why |
| --- | --- | --- |
| SFU | **LiveKit** (open source; self-host or LiveKit Cloud) | Mature simulcast/adaptive streaming, JWT room permissions, recording ("egress"), SDKs for web **and React Native** (matches the planned mobile apps). mediasoup is a lower-level alternative if the team wants full control. |
| TURN | **coturn**, listening on UDP 3478 and **TLS 443** | Some school, café and mobile networks block UDP; TURN over 443 gets through. |
| Room server | Node.js WebSocket service (or Next.js + a small WS service) | Owns the lesson state: questions, answers, grading, raised hands. Keeps correct answers server-side. |
| Database | PostgreSQL | Accounts, classes, enrolments, questions, answers, results. |
| Fan-out | Redis pub/sub | Lets several room-server instances share rooms. |
| Files | S3-compatible object storage + signed, short-lived URLs | Materials, answer photos, optional recordings. |
| Region | EU data centre close to Tunisia (e.g. Paris, Milan, Frankfurt), ~30–50 ms RTT | Low latency for Sfax; confirm data-protection requirements for minors' data with a Tunisian lawyer (INPDP rules) before choosing. |

### Bandwidth plan (per student, downstream)

| Stream | Bitrate | Notes |
| --- | --- | --- |
| Teacher audio (Opus) | 24–40 kbps | **Always prioritised.** If bandwidth collapses, keep audio and pause video. |
| Teacher camera, simulcast layers | ~150 kbps (180p) / ~500 kbps (360p) / ~1.2 Mbps (720p) | SFU picks the layer per student. |
| Screen share / lesson board | 300–800 kbps at 5–15 fps | High resolution, low frame rate: text stays sharp. |
| Student cameras | Off by default | Turned on only for speaking/oral work; the teacher sees thumbnails. |

Per class of 40, SFU egress is roughly 40 × 0.2–1.3 Mbps ≈ 8–50 Mbps. One SFU node comfortably
handles several such classes; add nodes behind LiveKit's built-in load distribution as classes grow.

---

## 3. Joining a lesson securely

1. Student opens the class. The API checks: signed in, **enrolled in this class**, subscription
   active, session is live.
2. The API mints two short-lived tokens (JWT, ~10 min, refreshed in the background):
   - **SFU token** with grants: teacher `canPublish: true, canPublishData: true`;
     students `canPublish: false` until the teacher allows speaking ("raise hand → allow mic").
   - **Room-server token** with `{ classId, sessionId, userId, role }`.
3. The client connects to the SFU (media) and the room server (questions/answers).
4. Minors: parents never enter the live answer workspace; recordings (if enabled) require explicit
   consent and a retention period; anonymised sharing is the default for showing a student's work.

Students' names next to answers are visible **only to the teacher**. The room server never sends
another student's identity or answer to students; anonymous examples are stripped server-side.

---

## 4. Room server protocol

The prototype already speaks this protocol, so the UI does not change when the server arrives.
`WebSocketTransport` connects to:

```
wss://rooms.qarrini.tn/?room=<classId>&peer=<userId>&token=<room JWT>
```

Every frame is JSON:

```json
{ "room": "hichem-trabelsi", "from": "acc-123", "to": "teacher:hichem-trabelsi",
  "type": "answer", "payload": { "questionId": "q-…", "text": "2; 3" }, "at": 1790000000000 }
```

The server: validates the token, forces `from` to the authenticated user, relays to the room (or only
to `to`), and persists durable events. In production the server — not the teacher's tab — grades
answers and keeps the session state, so a teacher refresh or network drop loses nothing.

| Type | Direction | Purpose |
| --- | --- | --- |
| `hello`, `ping`, `leave` | student → teacher | Presence (5 s heartbeat, 15 s timeout) |
| `session-state` | teacher → all / one | Live flag, current public question (no answer), release, shared example |
| `answer` | student → teacher | Answer text, selected options, optional photo (resized ≤ 900 px; production uploads it to object storage and sends a URL) |
| `answer-received` | teacher → student | Delivery receipt |
| `result` | teacher → one student | Private mark and feedback |
| `hand`, `hand-lowered` | both | Raise / lower hand |
| `rtc-join`, `rtc-desc`, `rtc-ice`, `rtc-host-ready`, `rtc-leave`, `rtc-host-ended` | both | WebRTC signalling (prototype mesh only — replaced by the SFU's own signalling) |

---

## 5. Accounts and phone numbers

- **Phone is mandatory** for every account (lesson reminders, schedule changes, family contact).
  Sign-up is possible by phone (code only) or by email + password (phone still verified).
- OTP: 6 digits, 5-minute expiry, max 5 attempts, rate-limited per number and per IP. Send via an
  SMS aggregator that reaches all Tunisian operators (Ooredoo, Orange, Tunisie Telecom), or a global
  verification API — compare delivery rates and price per SMS in Tunisia before choosing.
- Passwords: hashed **server-side** with Argon2id (the browser SHA-256 in the prototype is a stand-in).
- Sessions: HTTP-only, secure cookies; separate roles `student`, `parent`, `teacher`, `admin`.
- Teachers start as `pending` and are reviewed before appearing in public search.

---

## 6. Materials

Upload → API returns a pre-signed PUT URL → browser uploads directly to object storage → API stores
metadata (class, type, size, note). Downloads use short-lived signed GET URLs issued only to enrolled
students and the teacher. Scan files for malware, cap size (20 MB in the prototype), and keep an
audit log of deletions.

---

## 7. Mobile apps

The planned React Native (Expo) apps reuse the same API, room-server protocol and SFU:
`@livekit/react-native` + `@livekit/react-native-webrtc` (requires an Expo development build, not
Expo Go). Push notifications replace the "live now" banner; SMS remains the fallback for families
without the app.

---

## 8. Migration path from the prototype

1. **Backend** – Postgres schema for accounts/classes/enrolments/questions/answers; replace
   `src/lib/auth.ts`, `materials.ts` and the history functions in `questions.ts` with API calls
   (their hooks already isolate the UI from storage).
2. **Room server** – implement §4, set `NEXT_PUBLIC_REALTIME_URL`. The classroom UI then works across
   real devices with no UI changes; move grading into the server.
3. **SFU** – replace the internals of `useClassroomCall` with `livekit-client` (`Room.connect`,
   `publishTrack` with simulcast, `TrackSubscribed` events). The hook's return value
   (`localStream`, `remotes`, `start`, `toggleMic`, `toggleScreen`, …) stays the same.
4. **TURN** – deploy coturn on 443/TLS; pass servers via `NEXT_PUBLIC_ICE_SERVERS` (JSON) during the
   transition.
5. **SMS** – connect the OTP provider; remove the on-screen demo SMS.
6. **Recording (optional)** – LiveKit egress to object storage, behind teacher + parent consent.

Environment variables already read by the prototype:

| Variable | Effect |
| --- | --- |
| `NEXT_PUBLIC_REALTIME_URL` | Switches the classroom from BroadcastChannel to the WebSocket room server |
| `NEXT_PUBLIC_ICE_SERVERS` | JSON array of `RTCIceServer` (STUN/TURN) for WebRTC |
