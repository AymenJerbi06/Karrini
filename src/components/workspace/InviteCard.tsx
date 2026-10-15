"use client";

import { useEffect, useState } from "react";
import { T, useI18n } from "@/components/I18n";
import { secondaryButton } from "@/components/SiteUi";
import { CheckCircleIcon, UsersIcon } from "@/components/icons";
import { Reveal } from "@/components/ui/Motion";

/** Join link the teacher shares with their students (copy or WhatsApp). */
export function InviteCard({ classId }: { classId: string }) {
  const { t, locale } = useI18n();
  const [origin, setOrigin] = useState("");
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    // Reading the page origin requires the browser.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOrigin(window.location.origin);
  }, []);
  const link = origin ? `${origin}/${locale}/join?class=${encodeURIComponent(classId)}` : "";
  const message = t("Join my class on Qarrini: {link}", { link });

  return (
    <Reveal as="section" className="rounded-xl border-2 border-brand/30 bg-white p-6 shadow-sm">
      <div className="flex items-start gap-4">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-brand">
          <UsersIcon className="h-6 w-6" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="font-display text-xl font-bold text-gray-800">
            <T>Invite your students</T>
          </h2>
          <p className="mt-1 text-sm leading-6 text-gray-500">
            <T>Send this link to your students. They create an account, confirm their email and join your class.</T>
          </p>
          <div className="mt-4 flex flex-col gap-3 sm:flex-row">
            <input
              readOnly
              dir="ltr"
              value={link}
              aria-label={t("Class link")}
              onFocus={(e) => e.currentTarget.select()}
              className="min-h-12 min-w-0 flex-1 rounded-md border border-gray-300 bg-gray-50 px-3 font-mono text-sm text-gray-700"
            />
            <button
              type="button"
              disabled={!link}
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(link);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2500);
                } catch {
                  /* The field stays selectable for manual copy. */
                }
              }}
              className={secondaryButton}
            >
              {copied ? <CheckCircleIcon className="h-5 w-5 text-brand" /> : null}
              <T>{copied ? "Copied" : "Copy link"}</T>
            </button>
            <a
              href={link ? `https://wa.me/?text=${encodeURIComponent(message)}` : undefined}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-md bg-[#25D366] px-5 font-semibold text-white transition-opacity hover:opacity-90"
            >
              <T>Share on WhatsApp</T>
            </a>
          </div>
        </div>
      </div>
    </Reveal>
  );
}
