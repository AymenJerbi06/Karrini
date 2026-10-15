"use client";

import NextLink from "next/link";
import type { ComponentProps } from "react";
import { useI18n } from "@/components/I18n";
import { localizedHref } from "@/lib/i18n";

export default function LocalizedLink({
  href,
  ...props
}: ComponentProps<typeof NextLink>) {
  const { locale, t } = useI18n();
  return (
    <NextLink
      {...props}
      aria-label={props["aria-label"] ? t(props["aria-label"]) : undefined}
      href={
        typeof href === "string"
          ? localizedHref(href, locale)
          : { ...href, pathname: localizedHref(href.pathname ?? "/", locale) }
      }
    />
  );
}
