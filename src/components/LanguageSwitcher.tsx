"use client";

import { usePathname, useRouter } from "next/navigation";
import { useI18n } from "@/components/I18n";
import type { Locale } from "@/lib/i18n";

export function LanguageSwitcher() {
  const { locale } = useI18n();
  const pathname = usePathname();
  const router = useRouter();
  function switchTo(next: Locale) {
    if (next === locale) return;
    document.cookie = `qarrini-locale=${next}; Path=/; Max-Age=31536000; SameSite=Lax`;
    const path = pathname.replace(/^\/(ar|fr)(?=\/|$)/, "");
    router.push(
      `/${next}${path}${window.location.search}${window.location.hash}`,
    );
  }
  return (
    <div
      className="language-switcher inline-flex shrink-0 items-center gap-1 rounded-full border border-gray-200 bg-gray-50 p-1"
      dir="ltr"
      role="group"
      aria-label={locale === "ar" ? "لغة الموقع" : "Langue du site"}
    >
      {(
        [
          ["fr", "FR", "Français"],
          ["ar", "عربي", "العربية"],
        ] as const
      ).map(([code, label, title]) => (
        <button
          key={code}
          type="button"
          lang={code}
          aria-label={title}
          aria-pressed={locale === code}
          onClick={() => switchTo(code)}
          className={`min-h-8 min-w-10 rounded-full px-2.5 text-xs font-bold transition-colors ${locale === code ? "bg-brand text-white shadow-sm" : "text-gray-500 hover:text-brand"}`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
