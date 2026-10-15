"use client";

import { useEffect, useRef, type ReactNode } from "react";
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
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (el.srcObject !== stream) el.srcObject = stream ?? null;
    if (stream) void el.play().catch(() => undefined);
  }, [stream]);
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
    </div>
  );
}
