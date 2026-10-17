"use client";
import { useEffect, useRef, type ReactNode } from "react";

export function BoardDialog({
  label,
  onClose,
  busy = false,
  alert = false,
  children,
}: {
  label: string;
  onClose: () => void;
  busy?: boolean;
  alert?: boolean;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const el = ref.current;
    (
      el?.querySelector(
        "textarea,input:not([type=radio])",
      ) as HTMLElement | null
    )?.focus();
    if (!el?.contains(document.activeElement))
      (el?.querySelector("button") as HTMLElement | null)?.focus();
    return () => {
      if (previous?.isConnected) previous.focus({ preventScroll: true });
    };
  }, []);
  return (
    <div
      ref={ref}
      className="absolute inset-0 z-30 flex items-center justify-center overflow-auto bg-gray-950/50 p-4"
      role={alert ? "alertdialog" : "dialog"}
      aria-modal="true"
      aria-label={label}
      onKeyDown={(e) => {
        e.stopPropagation();
        if (e.key === "Escape") {
          e.preventDefault();
          if (!busy) onClose();
        }
        if (e.key !== "Tab") return;
        const elements = [
          ...ref.current!.querySelectorAll<HTMLElement>(
            'button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled),[tabindex="0"]',
          ),
        ].filter((el) => el.getClientRects().length > 0);
        const first = elements[0];
        const last = elements.at(-1);
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }}
    >
      {children}
    </div>
  );
}
