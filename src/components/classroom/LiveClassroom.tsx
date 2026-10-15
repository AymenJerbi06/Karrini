"use client";

import { useSearchParams } from "next/navigation";
import Link from "@/components/LocalizedLink";
import { T, useI18n } from "@/components/I18n";
import { primaryButton, secondaryButton } from "@/components/SiteUi";
import { ChatBubbleIcon, HandIcon, TrendIcon, VideoIcon } from "@/components/icons";
import { Reveal } from "@/components/ui/Motion";
import { teacherClass } from "@/components/workspace/Guard";
import { TeacherRoom, TwoWindowTip } from "@/components/classroom/TeacherRoom";
import { StudentRoom } from "@/components/classroom/StudentRoom";
import { LiveClassMockup } from "@/components/mockups/LiveClassMockup";
import { useAuth, type Account } from "@/lib/auth";
import { useClasses } from "@/lib/classes";
import { labelFor, subjects } from "@/data/catalog";
import { cn } from "@/lib/cn";

export function LiveClassroom() {
  const { ready, account } = useAuth();
  const params = useSearchParams();

  if (!ready)
    return (
      <div className="mx-auto max-w-6xl px-6 py-16" aria-busy="true">
        <div className="aspect-video animate-pulse rounded-2xl bg-gray-100" />
      </div>
    );

  if (!account) return <Landing />;

  if (account.role === "teacher") {
    const cls = teacherClass(account);
    if (!cls.id)
      return (
        <Message
          title="Your class is being set up."
          body="Refresh this page in a moment. If it keeps happening, sign out and sign in again."
          href="/teach"
          cta="Go to my teacher workspace"
        />
      );
    return (
      <div className="min-h-[70vh] bg-gray-50">
        <TeacherRoom account={account} classId={cls.id} subjectLabel={cls.subjectLabel} />
      </div>
    );
  }

  if (account.role === "parent")
    return (
      <Message
        title="Parents follow progress from the dashboard."
        body="To keep the classroom a safe space for students, parents see schedules, subscriptions and progress summaries rather than the live answer workspace."
        href="/dashboard"
        cta="Open my dashboard"
      />
    );

  return <StudentEntry account={account} classParam={params.get("class")} />;
}

function StudentEntry({ account, classParam }: { account: Account; classParam: string | null }) {
  const { t } = useI18n();
  const ids = account.student?.enrollments ?? [];
  const { data: enrolled, loading } = useClasses(ids);
  if (loading && ids.length)
    return (
      <div className="mx-auto max-w-6xl px-6 py-16" aria-busy="true">
        <div className="aspect-video animate-pulse rounded-2xl bg-gray-100" />
      </div>
    );
  if (!enrolled.length)
    return (
      <Message
        title="Join a class to attend live lessons."
        body="Open the class link your teacher sent you, or choose a teacher and add their class. Their live lessons then open here."
        href="/find-a-teacher"
        cta="Find a Teacher"
      />
    );

  const chosen = enrolled.find((x) => x.id === classParam) ?? enrolled[0];
  return (
    <div className="min-h-[70vh] bg-gray-50">
      {enrolled.length > 1 && (
        <div className="mx-auto max-w-7xl px-4 pt-6 md:px-6">
          <div className="flex flex-wrap gap-2" role="group" aria-label={t("My classes")}>
            {enrolled.map((c) => (
              <Link
                key={c.id}
                href={`/classroom?class=${c.id}`}
                aria-current={c.id === chosen.id ? "page" : undefined}
                className={cn(
                  "inline-flex min-h-11 items-center gap-2 rounded-full border px-4 text-sm font-semibold transition-colors",
                  c.id === chosen.id ? "border-brand bg-emerald-50 text-brand" : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50",
                )}
              >
                <span className={`${c.color} h-2.5 w-2.5 rounded-full`} aria-hidden />
                <T>{labelFor(subjects, c.subject)}</T>
              </Link>
            ))}
          </div>
        </div>
      )}
      <StudentRoom
        key={chosen.id}
        account={account}
        classId={chosen.id}
        classTitle={t(labelFor(subjects, chosen.subject))}
        teacherLabel={chosen.profile ? t(chosen.teacherName) : chosen.teacherName}
      />
    </div>
  );
}

function Message({ title, body, href, cta }: { title: string; body: string; href: string; cta: string }) {
  return (
    <div className="bg-gray-50 px-6 py-16 md:py-24">
      <div className="animate-rise mx-auto max-w-xl rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-sm md:p-10">
        <h1 className="home-heading font-display text-2xl font-extrabold text-gray-900 md:text-3xl">
          <T>{title}</T>
        </h1>
        <p className="mt-4 leading-7 text-gray-500">
          <T>{body}</T>
        </p>
        <Link href={href} className={`${primaryButton} mt-8`}>
          <T>{cta}</T>
        </Link>
      </div>
    </div>
  );
}

function Landing() {
  return (
    <>
      <section className="bg-white px-6 pt-12 pb-14 md:pt-16">
        <div className="mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-[1.1fr_1fr]">
          <div>
            <p className="text-sm font-medium text-brand">
              <T>The Qarrini classroom</T>
            </p>
            <h1 className="home-heading font-display mt-4 text-3xl leading-tight font-extrabold tracking-tight text-gray-900 md:text-[44px]">
              <T>One question. Every student heard.</T>
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-8 text-gray-500">
              <T>Live video, questions prepared before class or written on the spot, and results that show exactly who needs help.</T>
            </p>
            <div className="mt-8 grid gap-3 sm:grid-cols-2">
              <Link href="/login?next=/classroom" className={primaryButton}>
                <T>Sign in</T>
              </Link>
              <Link href="/register" className={secondaryButton}>
                <T>Create an account</T>
              </Link>
            </div>
            <p className="mt-4 text-sm text-gray-500">
              <T>Teachers open the classroom from their workspace. Students join with the link their teacher shares.</T>
            </p>
          </div>
          <Reveal className="p-2">
            <LiveClassMockup />
          </Reveal>
        </div>
      </section>
      <section className="bg-gray-50 px-6 py-16">
        <div className="mx-auto grid max-w-6xl gap-6 md:grid-cols-4">
          {[
            { Icon: VideoIcon, title: "Teach on video", body: "Camera, microphone and screen sharing, built into the lesson." },
            { Icon: ChatBubbleIcon, title: "Ask anytime", body: "Send a prepared question in one click, or write a new one live." },
            { Icon: TrendIcon, title: "See results live", body: "Right, wrong, percentages, and the names and answers of students who made a mistake." },
            { Icon: HandIcon, title: "Every voice counts", body: "Private answers and raised hands give quieter students a way in." },
          ].map(({ Icon, title, body }, i) => (
            <Reveal key={title} delay={i * 90} className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
              <Icon className="h-7 w-7 text-brand" />
              <h2 className="font-display mt-4 text-lg font-bold text-gray-900">
                <T>{title}</T>
              </h2>
              <p className="mt-2 text-sm leading-6 text-gray-500">
                <T>{body}</T>
              </p>
            </Reveal>
          ))}
        </div>
        <div className="mx-auto mt-10 max-w-3xl">
          <TwoWindowTip />
        </div>
      </section>
    </>
  );
}
