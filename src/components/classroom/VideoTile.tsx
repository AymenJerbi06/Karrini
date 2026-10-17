"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { T } from "@/components/I18n";
import { cn } from "@/lib/cn";

/** Plays a MediaStream; shows `placeholder` when there is no stream. */
export function VideoTile({
  stream,
  muted,
  mirror,
  label,
  placeholder,
  className,
  badge,
}: {
  stream: MediaStream | null | undefined;
  muted?: boolean;
  mirror?: boolean;
  label?: ReactNode;
  placeholder?: ReactNode;
  className?: string;
  badge?: ReactNode;
}) {
  const ref = useRef<HTMLVideoElement>(null);
  // Phones may refuse to start a video with sound on their own; it then plays muted and
  // the viewer taps once to hear it.
  const [blockedSound, setBlockedSound] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (el.srcObject !== stream) el.srcObject = stream ?? null;
    if (!stream) return;
    el.muted = !!muted;
    el.play().catch(() => {
      if (muted) return;
      el.muted = true;
      void el.play().then(() => setBlockedSound(true)).catch(() => undefined);
    });
  }, [stream, muted]);
  function unmute() {
    const el = ref.current;
    if (!el) return;
    el.muted = false;
    void el.play().then(() => setBlockedSound(false)).catch(() => undefined);
  }
  return (
    <div className={cn("relative overflow-hidden rounded-xl bg-gray-900", className)}>
      {stream ? (
        <video
          ref={ref}
          autoPlay
          playsInline
          muted={muted}
          className={cn("h-full w-full object-cover", mirror && "-scale-x-100")}
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center p-4 text-center text-sm text-gray-300">
          {placeholder}
        </div>
      )}
      {label && (
        <span className="absolute start-3 bottom-3 max-w-[80%] truncate rounded-md bg-gray-900/75 px-2.5 py-1 text-xs font-medium text-white">
          {label}
        </span>
      )}
      {badge && <span className="absolute end-3 top-3">{badge}</span>}
      {blockedSound && stream && !muted && (
        <button type="button" onClick={unmute} className="absolute inset-x-0 bottom-0 m-2 rounded-lg bg-white/90 px-3 py-2 text-xs font-semibold text-gray-900 shadow">
          🔊 <T>Tap to hear the sound</T>
        </button>
      )}
    </div>
  );
}
