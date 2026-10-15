export const locales = ["ar", "fr"] as const;
export type Locale = (typeof locales)[number];
export const isLocale = (value: string): value is Locale =>
  locales.includes(value as Locale);
export function localizedHref(href: string, locale: Locale) {
  if (
    !href.startsWith("/") ||
    href.startsWith("//") ||
    /^\/(ar|fr)(\/|$)/.test(href)
  )
    return href;
  return `/${locale}${href === "/" ? "" : href}`;
}
