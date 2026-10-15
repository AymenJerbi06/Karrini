import { common } from "@/data/i18n/common";
import { marketing } from "@/data/i18n/marketing";
import { catalog } from "@/data/i18n/catalog";
import { workspace } from "@/data/i18n/workspace";
import { classroom } from "@/data/i18n/classroom";
import { notices } from "@/data/i18n/notices";
import { home } from "@/data/i18n/home";
import { experience } from "@/data/i18n/experience";
import type { Locale } from "@/lib/i18n";

export const messages: Record<string, [string, string]> = {
  ...common,
  ...marketing,
  ...catalog,
  ...workspace,
  ...classroom,
  ...notices,
  ...home,
  ...experience,
};
const lowerKeys = new Map(
  Object.keys(messages).map((key) => [key.toLowerCase(), key]),
);
const escapeRegex = (value: string) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const fragments = Object.keys(messages)
  .filter((k) => k.length >= 2)
  .sort((a, b) => b.length - a.length);
const fragmentPattern = new RegExp(
  fragments
    .map(
      (key) =>
        `${/^[A-Za-z]/.test(key) ? "\\b" : ""}${escapeRegex(key)}${/[A-Za-z]$/.test(key) ? "\\b" : ""}`,
    )
    .join("|"),
  "gi",
);
export function translate(source: string, locale: Locale): string {
  const normalized = source.replace(/\s+/g, " ").trim();
  const index = locale === "ar" ? 0 : 1;
  const exact =
    messages[normalized] ??
    messages[lowerKeys.get(normalized.toLowerCase()) ?? ""];
  if (exact) return source.replace(source.trim(), exact[index]);
  return source.replace(
    fragmentPattern,
    (match) => messages[lowerKeys.get(match.toLowerCase())!][index],
  );
}
