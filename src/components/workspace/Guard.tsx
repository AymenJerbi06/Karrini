"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import Link from "@/components/LocalizedLink";
import { T } from "@/components/I18n";
import { primaryButton, secondaryButton } from "@/components/SiteUi";
import { homeFor, useAuth, type Account, type Role } from "@/lib/auth";

/** Renders children only for the allowed roles; otherwise explains how to get in. */
export function RequireRole({
  roles,
  children,
}: {
  roles: Role[];
  children: (account: Account) => ReactNode;
}) {
  const { ready, account } = useAuth();
  const pathname = usePathname();
  const next = pathname.replace(/^\/(ar|fr)/, "") || "/";
  const wantsTeacher = roles.length === 1 && roles[0] === "teacher";

  if (!ready)
    return (
      <div className="mx-auto max-w-6xl px-6 py-16" aria-busy="true">
        <div className="h-8 w-64 animate-pulse rounded bg-gray-100" />
        <div className="mt-6 h-40 animate-pulse rounded-xl bg-gray-100" />
      </div>
    );

  if (!account)
    return (
      <Panel
        title={wantsTeacher ? "This is the teacher workspace." : "Sign in to see your classes."}
        body={
          wantsTeacher
            ? "Sign in with your teacher account to manage classes, materials and live lessons."
            : "Sign in with your phone number or email to open your dashboard."
        }
      >
        <Link href={`/login?role=${wantsTeacher ? "teacher" : "student"}&next=${encodeURIComponent(next)}`} className={primaryButton}>
          <T>{wantsTeacher ? "Teacher sign-in" : "Sign in"}</T>
        </Link>
        <Link href={`/register?role=${wantsTeacher ? "teacher" : "student"}`} className={secondaryButton}>
          <T>Create an account</T>
        </Link>
      </Panel>
    );

  if (!roles.includes(account.role))
    return (
      <Panel
        title={account.role === "teacher" ? "This page is for students and parents." : "This area is for teachers."}
        body="You are signed in with a different type of account."
      >
        <Link href={homeFor(account.role)} className={primaryButton}>
          <T>{account.role === "teacher" ? "Go to my teacher workspace" : "Go to my dashboard"}</T>
        </Link>
      </Panel>
    );

  return <>{children(account)}</>;
}

function Panel({ title, body, children }: { title: string; body: string; children: ReactNode }) {
  return (
    <div className="bg-gray-50 px-6 py-16 md:py-24">
      <div className="animate-rise mx-auto max-w-xl rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-sm md:p-10">
        <h1 className="home-heading font-display text-2xl font-extrabold text-gray-900 md:text-3xl">
          <T>{title}</T>
        </h1>
        <p className="mt-4 leading-7 text-gray-500">
          <T>{body}</T>
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">{children}</div>
      </div>
    </div>
  );
}

