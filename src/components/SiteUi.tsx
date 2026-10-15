import { T } from "@/components/I18n";

import Link from "@/components/LocalizedLink";
import type { ReactNode } from "react";
import { ChatSolidIcon } from "@/components/icons";

export const primaryButton =
  "inline-flex min-h-12 items-center justify-center gap-2 rounded-md bg-blue-600 px-6 py-3 font-semibold text-white shadow-sm transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50";
export const secondaryButton =
  "inline-flex min-h-12 items-center justify-center gap-2 rounded-md border border-gray-300 bg-white px-6 py-3 font-semibold text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50";
export const fieldClass =
  "mt-2 block w-full rounded-md border border-gray-300 bg-white px-3 py-3 text-base text-gray-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100";
export const panelClass =
  "rounded-xl border border-gray-200 bg-white p-6 shadow-sm";

export function PageIntro({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="bg-white px-6 pt-12 pb-10 md:pt-16 md:pb-12">
      <div className="mx-auto max-w-6xl">
        <p className="mb-4 text-sm font-medium text-brand">
          <T>{eyebrow}</T>
        </p>
        <h1 className="home-heading font-display max-w-4xl text-3xl leading-tight font-extrabold tracking-tight text-gray-900 md:text-[44px]">
          <T>{title}</T>
        </h1>
        <div className="mt-5 max-w-2xl text-base leading-8 text-gray-500 md:text-lg">
          <T>{children}</T>
        </div>
      </div>
    </section>
  );
}

export function Cta({
  title = "Need a hand finding the right teacher?",
  body = "Explore the classes, or let our team help you find the right fit.",
}: {
  title?: string;
  body?: string;
}) {
  return (
    <section className="bg-gray-50 px-6 py-20 text-center md:py-24">
      <h2 className="home-heading font-display mx-auto max-w-3xl text-3xl font-extrabold tracking-tight text-gray-900 md:text-5xl">
        <T>{title}</T>
      </h2>
      <p className="mx-auto mt-5 max-w-2xl text-lg leading-7 text-gray-500">
        <T>{body}</T>
      </p>
      <div className="mt-10 flex flex-wrap justify-center gap-5">
        <Link href="/find-a-teacher" className={primaryButton}>
          <T>Find a Teacher</T>
        </Link>
        <Link href="/contact" className={secondaryButton}>
          <ChatSolidIcon className="h-5 w-5 text-brand" />
          <T>Talk to our team</T>
        </Link>
      </div>
    </section>
  );
}
