"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import Link from "@/components/LocalizedLink";
import { T, useI18n } from "@/components/I18n";
import { primaryButton, secondaryButton } from "@/components/SiteUi";
import { enroll, homeFor, useAuth } from "@/lib/auth";
import { classTitle, fetchClass } from "@/lib/classes";
import { formatSlots, groupLabel, useGroups } from "@/lib/groups";
import { cn } from "@/lib/cn";
import { useRemote } from "@/lib/remote";

/** Landing page of a teacher's invitation link: shows the class and lets a student join it. */
export function JoinClass() {
  const classId = useSearchParams().get("class") ?? "";
  const { t, locale } = useI18n();
  const router = useRouter();
  const { ready, account } = useAuth();
  const { data: cls, loading } = useRemote(classId ? `class:${classId}` : null, () => fetchClass(classId), null);
  const { data: groups } = useGroups(classId ? [classId] : []);
  const [groupId, setGroupId] = useState<string | null>(null);
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
          <h1 className="home-heading font-display text-2xl font-extrabold text-gray-900"><bdi dir="auto">{classTitle(cls, t)}</bdi></h1>
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
          {groups.length > 0 && (
            <fieldset className="mt-5">
              <legend className="text-sm font-semibold text-gray-700">
                <T>Choose your group</T>
              </legend>
              <div className="mt-2 space-y-2">
                {groups.map((g) => (
                  <label
                    key={g.id}
                    className={cn(
                      "flex min-h-12 cursor-pointer items-center gap-3 rounded-lg border px-4 py-2 text-sm",
                      groupId === g.id ? "border-brand bg-emerald-50 text-gray-900" : "border-gray-200 text-gray-600",
                    )}
                  >
                    <input type="radio" name="group" checked={groupId === g.id} onChange={() => setGroupId(g.id)} className="h-4 w-4" />
                    <span>
                      <bdi dir="auto" className="block font-semibold">
                        {groupLabel(g, t)}
                      </bdi>
                      {g.name && g.slots.length > 0 && <span className="block text-xs text-gray-500">{formatSlots(g.slots, t)}</span>}
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>
          )}
          <button
            type="button"
            disabled={busy || (groups.length > 0 && !groupId)}
            onClick={async () => {
              setBusy(true);
              setError("");
              const ok = await enroll(cls.id, groupId);
              setBusy(false);
              if (!ok) return setError(t("We could not add the class. Please try again."));
              router.push(`/${locale}/dashboard/class?id=${encodeURIComponent(cls.id)}`);
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
