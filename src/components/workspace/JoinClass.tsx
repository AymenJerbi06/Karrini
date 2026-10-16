"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import Link from "@/components/LocalizedLink";
import { T, useI18n } from "@/components/I18n";
import { primaryButton, secondaryButton } from "@/components/SiteUi";
import { enroll, homeFor, useAuth } from "@/lib/auth";
import { fetchClass } from "@/lib/classes";
import { useRemote } from "@/lib/remote";
import { labelFor, subjects } from "@/data/catalog";

/** Landing page of a teacher's invitation link: shows the class and lets a student join it. */
export function JoinClass() {
  const classId = useSearchParams().get("class") ?? "";
  const { t, locale } = useI18n();
  const router = useRouter();
  const { ready, account } = useAuth();
  const { data: cls, loading } = useRemote(classId ? `class:${classId}` : null, () => fetchClass(classId), null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const here = `/join?class=${encodeURIComponent(classId)}`;

  const card = (body: React.ReactNode) => (
    <div className="bg-gray-50 px-6 py-16 md:py-24">
      <div className="animate-rise mx-auto max-w-xl rounded-2xl border border-gray-200 bg-white p-8 shadow-sm md:p-10">{body}</div>
    </div>
  );

  if ((classId && loading) || !ready)
    return card(
      <div aria-busy="true">
        <div className="h-8 w-48 animate-pulse rounded bg-gray-100" />
        <div className="mt-4 h-24 animate-pulse rounded-xl bg-gray-100" />
      </div>,
    );

  if (!cls)
    return card(
      <>
        <h1 className="home-heading font-display text-2xl font-extrabold text-gray-900">
          <T>This class link is not valid.</T>
        </h1>
        <p className="mt-3 leading-7 text-gray-500">
          <T>Ask your teacher to send the link again.</T>
        </p>
        <Link href="/find-a-teacher" className={`${secondaryButton} mt-6`}>
          <T>Find a Teacher</T>
        </Link>
      </>,
    );

  const enrolled = account?.role === "student" && account.student?.enrollments.includes(cls.id);

  return card(
    <>
      <p className="text-sm font-medium text-brand">
        <T>You are invited to a class</T>
      </p>
      <div className="mt-5 flex items-center gap-4">
        <span className={`${cls.color} h-14 w-14 shrink-0 rounded-full`} aria-hidden />
        <div>
          <h1 className="home-heading font-display text-2xl font-extrabold text-gray-900">{t(labelFor(subjects, cls.subject))}</h1>
          <p className="mt-1 text-gray-500">
            <bdi dir="auto">{cls.teacherName}</bdi>
          </p>
        </div>
      </div>

      {!account ? (
        <>
          <p className="mt-6 leading-7 text-gray-500">
            <T>Create your student account to join. You will confirm your email, then come back here automatically.</T>
          </p>
          <div className="mt-7 flex flex-col gap-3">
            <Link href={`/register?role=student&next=${encodeURIComponent(here)}`} className={primaryButton}>
              <T>Create my student account</T>
            </Link>
            <Link href={`/login?role=student&next=${encodeURIComponent(here)}`} className={secondaryButton}>
              <T>I already have an account</T>
            </Link>
          </div>
        </>
      ) : account.role !== "student" ? (
        <>
          <p className="mt-6 leading-7 text-gray-500">
            <T>{account.role === "teacher" ? "This link is for your students. Share it with them so they can join." : "Class links are for student accounts. Linking parents to their child will come soon."}</T>
          </p>
          <Link href={homeFor(account.role)} className={`${secondaryButton} mt-6`}>
            <T>{account.role === "teacher" ? "Go to my teacher workspace" : "Go to my dashboard"}</T>
          </Link>
        </>
      ) : enrolled ? (
        <>
          <p className="mt-6 leading-7 text-gray-500">
            <T>You&apos;re already in this class.</T>
          </p>
          <Link href="/dashboard" className={`${primaryButton} mt-6 w-full`}>
            <T>Open my dashboard</T>
          </Link>
        </>
      ) : (
        <>
          <p className="mt-6 leading-7 text-gray-500">{t("Signed in as {name}", { name: account.firstName })}</p>
          <button
            type="button"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              setError("");
              const ok = await enroll(cls.id);
              setBusy(false);
              if (!ok) return setError(t("We could not add the class. Please try again."));
              router.push(`/${locale}/dashboard`);
            }}
            className={`${primaryButton} mt-6 w-full`}
          >
            <T>{busy ? "Please wait…" : "Join this class"}</T>
          </button>
          {error && (
            <p role="alert" className="mt-4 text-sm text-red-700">
              {error}
            </p>
          )}
        </>
      )}
    </>,
  );
}
