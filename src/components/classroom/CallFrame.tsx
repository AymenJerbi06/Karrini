"use client";

import { useEffect, type ReactNode } from "react";
import { Localized, T } from "@/components/I18n";
import { CloseIcon } from "@/components/icons";
import { cn } from "@/lib/cn";

/** Puts the page in browser full screen (must run inside a click handler). */
export function enterFullscreen() {
  const el = document.documentElement;
  if (!document.fullscreenElement && el.requestFullscreen) void el.requestFullscreen().catch(() => undefined);
}

export function exitFullscreen() {
  if (document.fullscreenElement && document.exitFullscreen) void document.exitFullscreen().catch(() => undefined);
}

/**
 * Full-screen call layout: a slim top bar, the video stage, an optional side panel (bottom sheet
 * on phones) and a short row of large controls. It covers the site header and footer.
 */
export function CallFrame({
  top,
  stage,
  panel,
  panelTitle,
  onClosePanel,
  controls,
  overlay,
}: {
  top: ReactNode;
  stage: ReactNode;
  panel?: ReactNode;
  panelTitle?: string;
  onClosePanel?: () => void;
  controls: ReactNode;
  overlay?: ReactNode;
}) {
  // Freeze the page behind the call.
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-gray-950 text-white" role="dialog" aria-modal="true">
      <div className="flex min-h-14 shrink-0 items-center justify-between gap-3 px-4 md:px-6">{top}</div>
      <div className="relative flex min-h-0 flex-1 gap-3 px-3 md:px-4">
        <div className="relative min-w-0 flex-1">{stage}</div>
        {panel && (
          <aside
            className={cn(
              "animate-rise flex flex-col overflow-hidden rounded-2xl bg-white text-gray-900 shadow-2xl",
              // Bottom sheet on phones, side panel from lg.
              "absolute inset-x-2 bottom-2 z-10 max-h-[72%] lg:static lg:inset-auto lg:max-h-none lg:w-[400px] lg:shrink-0",
            )}
          >
            <div className="flex min-h-12 shrink-0 items-center justify-between border-b border-gray-100 px-5">
              <h2 className="font-display text-base font-bold">
                <T>{panelTitle ?? ""}</T>
              </h2>
              {onClosePanel && (
                <Localized as="button" type="button" aria-label="Close" onClick={onClosePanel} className="-me-2 rounded-full p-2 text-gray-500 hover:bg-gray-100">
                  <CloseIcon className="h-5 w-5" />
                </Localized>
              )}
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto p-5">{panel}</div>
          </aside>
        )}
        {overlay}
      </div>
      <div className="flex shrink-0 items-center justify-center gap-2 px-3 py-4 sm:gap-4">{controls}</div>
    </div>
  );
}

/** Large round call button with a short label. */
export function CallControl({
  label,
  icon,
  onClick,
  active,
  danger,
  badge,
  pulse,
}: {
  label: string;
  icon: ReactNode;
  onClick: () => void;
  /** Highlighted (e.g. hand raised, panel open). */
  active?: boolean;
  /** Red: end the call, or a muted microphone/camera. */
  danger?: boolean;
  badge?: number;
  pulse?: boolean;
}) {
  return (
    <button type="button" onClick={onClick} className="group flex w-16 flex-col items-center gap-1.5 sm:w-20">
      <span
        className={cn(
          "relative flex h-12 w-12 items-center justify-center rounded-full transition-colors sm:h-14 sm:w-14",
          danger ? "bg-red-600 hover:bg-red-700" : active ? "bg-white text-gray-900" : "bg-white/12 hover:bg-white/20",
          pulse && "animate-pulse",
        )}
      >
        {icon}
        {!!badge && (
          <span className="absolute -end-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-400 px-1 text-[11px] font-bold text-gray-900">
            {badge}
          </span>
        )}
      </span>
      <span className="text-center text-[11px] leading-tight text-gray-300 group-hover:text-white sm:text-xs">
        <T>{label}</T>
      </span>
    </button>
  );
}

export function LiveBadge() {
  return (
    <span className="animate-live flex items-center gap-1.5 rounded-md bg-red-600 px-2 py-0.5 text-[11px] font-bold">
      <span className="h-1.5 w-1.5 rounded-full bg-white" /> <T>LIVE</T>
    </span>
  );
}
