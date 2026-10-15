"use client";

import {
  createContext,
  createElement,
  useContext,
  type ReactNode,
  type JSX,
} from "react";
import { translate } from "@/lib/translations";
import { type Locale } from "@/lib/i18n";

const LocaleContext = createContext<Locale>("ar");
export function I18nProvider({
  locale,
  children,
}: {
  locale: Locale;
  children: ReactNode;
}) {
  return (
    <LocaleContext.Provider value={locale}>{children}</LocaleContext.Provider>
  );
}
export function useI18n() {
  const locale = useContext(LocaleContext);
  return {
    locale,
    t: (source: string, values?: Record<string, string | number>) =>
      translate(source, locale).replace(/\{(\w+)\}/g, (match, key: string) =>
        values?.[key] === undefined ? match : String(values[key]),
      ),
  };
}
// A text leaf preserves the server-rendered component tree and translates only authored UI copy.
export function T({ children }: { children?: ReactNode }) {
  const { t } = useI18n();
  if (typeof children !== "string") return children;
  const value = t(children);
  return /^(?:x\s*[²=−-]|\(x)/.test(children.trim())
    ? `\u2066${value}\u2069`
    : value;
}
export function Localized<K extends keyof JSX.IntrinsicElements>({
  as,
  ...props
}: { as: K } & JSX.IntrinsicElements[K]) {
  const { t } = useI18n();
  const localized = { ...props } as Record<string, unknown>;
  for (const key of ["aria-label", "placeholder", "title", "alt"]) {
    if (typeof localized[key] === "string") localized[key] = t(localized[key]);
  }
  return createElement(as, localized);
}
