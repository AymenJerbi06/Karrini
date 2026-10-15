"use client";

import { cn } from "@/lib/cn";
import { useI18n } from "@/components/I18n";

export function Logo({ className }: { className?: string }) {
  const { locale } = useI18n();
  return (
    <span
      className={cn(
        "qarrini-logo inline-flex items-center gap-[0.28em] font-display font-extrabold text-brand select-none",
        className,
      )}
    >
      <svg
        viewBox="0 0 64 64"
        className="h-[1.5em] w-[1.5em] shrink-0"
        aria-hidden="true"
      >
        <path
          d="M19 4h26c9 0 15 6 15 15v21c0 8-5 14-13 15l-3 7-12-7H19C10 55 4 49 4 40V19C4 10 10 4 19 4Z"
          fill="currentColor"
        />
        <path
          d="M15 23c7-2 11-1 17 3 6-4 10-5 17-3v18c-7-2-11-1-17 3-6-4-10-5-17-3V23Z"
          fill="none"
          stroke="#fbf8f0"
          strokeWidth="3"
          strokeLinejoin="round"
        />
        <path
          d="M32 26v18M21 30l5 1.5M21 35l5 1.5M38 31.5l5-1.5M38 36.5l5-1.5"
          stroke="#fbf8f0"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        <path
          d="m32 11 1.7 4.3L38 17l-4.3 1.7L32 23l-1.7-4.3L26 17l4.3-1.7L32 11Z"
          fill="#e9b665"
        />
      </svg>
      <span className="flex flex-col gap-[0.15em] leading-none">
        <span
          lang={locale}
          className={
            locale === "ar" ? "tracking-normal" : "tracking-[-0.055em]"
          }
        >
          {locale === "ar" ? "قرّيني" : "Karrini"}
          <span className="text-[#d9a34f]">.</span>
        </span>
        <span
          lang={locale === "ar" ? "fr" : "ar"}
          className="text-[0.28em] font-semibold tracking-[0.16em] opacity-70"
        >
          {locale === "ar" ? "KARRINI" : "قرّيني · معاك حتى تفهم"}
        </span>
      </span>
    </span>
  );
}
