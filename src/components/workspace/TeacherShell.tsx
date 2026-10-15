"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import Link from "@/components/LocalizedLink";
import { T, useI18n } from "@/components/I18n";
import { BookIcon, ChatBubbleIcon, TrendIcon, UploadIcon, VideoIcon } from "@/components/icons";
import { RequireRole, teacherClass } from "@/components/workspace/Guard";
import { displayName, type Account } from "@/lib/auth";
import { cn } from "@/lib/cn";

const tabs = [
  { href: "/teach", label: "Overview", Icon: BookIcon },
  { href: "/teach/materials", label: "Materials", Icon: UploadIcon },
  { href: "/teach/questions", label: "Questions", Icon: ChatBubbleIcon },
  { href: "/teach/results", label: "Results", Icon: TrendIcon },
  { href: "/classroom", label: "Live class", Icon: VideoIcon },
];

export function TeacherShell({
  title,
  intro,
  children,
}: {
  title: string;
  intro: string;
  children: (ctx: { account: Account; cls: ReturnType<typeof teacherClass> }) => ReactNode;
}) {
  const pathname = usePathname().replace(/^\/(ar|fr)/, "");
  const { t } = useI18n();
  return (
    <RequireRole roles={["teacher"]}>
      {(account) => {
        const cls = teacherClass(account);
        return (
          <div className="min-h-[70vh] bg-gray-50">
            <div className="bg-gray-800 text-white">
              <div className="mx-auto max-w-6xl px-6 pt-8">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium text-brand">
                      <T>Teacher workspace</T> · {t(cls.subjectLabel)}
                    </p>
                    <p className="mt-1 text-sm text-gray-300">
                      <bdi dir="auto">{displayName(account)}</bdi>
                      {!cls.verified && (
                        <span className="ms-2 rounded bg-amber-400/20 px-2 py-0.5 text-xs font-semibold text-amber-200">
                          <T>Verification pending</T>
                        </span>
                      )}
                    </p>
                  </div>
                  <Link
                    href="/classroom"
                    className="inline-flex min-h-11 items-center gap-2 rounded-md bg-white px-4 text-sm font-semibold text-gray-900 transition-transform hover:scale-[1.03]"
                  >
                    <span className="h-2.5 w-2.5 rounded-full bg-red-500" aria-hidden />
                    <T>Start live class</T>
                  </Link>
                </div>
                <nav aria-label={t("Teacher workspace")} className="mt-6 flex gap-1 overflow-x-auto [scrollbar-width:none]">
                  {tabs.map(({ href, label, Icon }) => {
                    const active = href === "/teach" ? pathname === "/teach" : pathname.startsWith(href);
                    return (
                      <Link
                        key={href}
                        href={href}
                        aria-current={active ? "page" : undefined}
                        className={cn(
                          "inline-flex min-h-12 shrink-0 items-center gap-2 rounded-t-lg px-4 text-sm font-semibold transition-colors",
                          active ? "bg-gray-50 text-gray-900" : "text-gray-300 hover:bg-white/10 hover:text-white",
                        )}
                      >
                        <Icon className="h-4 w-4" />
                        <T>{label}</T>
                      </Link>
                    );
                  })}
                </nav>
              </div>
            </div>
            <div className="mx-auto max-w-6xl px-6 py-10">
              <h1 className="home-heading font-display text-3xl font-extrabold text-gray-900 md:text-4xl">
                <T>{title}</T>
              </h1>
              <p className="mt-3 max-w-2xl leading-7 text-gray-500">
                <T>{intro}</T>
              </p>
              <div className="mt-8">{children({ account, cls })}</div>
            </div>
          </div>
        );
      }}
    </RequireRole>
  );
}
