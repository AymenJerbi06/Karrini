"use client";
import { T, Localized } from "@/components/I18n";

import Link from "@/components/LocalizedLink";
import { useState } from "react";
import { CloseIcon } from "@/components/icons";

export function ChatLauncher() {
  const [open, setOpen] = useState(false);
  return (
    <>
      {open && (
        <Localized
          as="aside"
          id="qarrini-help"
          aria-label="Karrini help"
          className="fixed right-5 bottom-20 z-50 w-[calc(100vw-40px)] max-w-sm overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl"
        >
          <div className="flex items-center justify-between bg-chat px-5 py-4 text-white">
            <h2 className="font-semibold">
              <T>A little help from Karrini</T>
            </h2>
            <Localized
              as="button"
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close help"
            >
              <CloseIcon className="h-5 w-5" />
            </Localized>
          </div>
          <div className="space-y-4 p-5 text-sm text-gray-500">
            <p>
              <T>What would you like to explore?</T>
            </p>
            {[
              ["Find a teacher or class", "/find-a-teacher"],
              ["Understand how Karrini works", "/how-it-works"],
              ["Try the interactive classroom", "/classroom"],
              ["Share feedback on the concept", "/contact"],
            ].map(([label, href]) => (
              <Link
                key={href}
                onClick={() => setOpen(false)}
                className="block rounded-md border border-gray-200 p-3 font-semibold text-gray-700 hover:border-brand hover:bg-emerald-50"
                href={href}
              >
                <T>{label}</T> →
              </Link>
            ))}
            <p className="text-xs leading-5 text-gray-400">
              <T>Demo help menu. Live support is not connected.</T>
            </p>
          </div>
        </Localized>
      )}
      <Localized
        as="button"
        type="button"
        aria-label={open ? "Close help menu" : "Open help menu"}
        aria-expanded={open}
        aria-controls="qarrini-help"
        onClick={() => setOpen(!open)}
        className="fixed right-5 bottom-5 z-50 flex h-12 w-12 items-center justify-center rounded-full bg-chat text-white shadow-lg transition-transform duration-200 hover:scale-110"
      >
        <svg
          viewBox="0 0 28 32"
          className="h-6 w-6"
          fill="currentColor"
          aria-hidden
        >
          <path d="M28 32s-4.71-1.86-8.52-3.39H3.43A3.43 3.43 0 0 1 0 25.18V3.43A3.43 3.43 0 0 1 3.43 0h21.14A3.43 3.43 0 0 1 28 3.43V32Zm-4.4-11.7a.92.92 0 0 0-1.29-.13A13 13 0 0 1 14 23a13 13 0 0 1-8.31-2.83.92.92 0 0 0-1.16 1.42A14.8 14.8 0 0 0 14 24.83a14.8 14.8 0 0 0 9.47-3.24.92.92 0 0 0 .13-1.29Z" />
        </svg>
      </Localized>
    </>
  );
}
