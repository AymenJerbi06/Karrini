"use client";

import { useRouter, useSearchParams } from "next/navigation";
import Link from "@/components/LocalizedLink";
import { T, useI18n } from "@/components/I18n";
import { BookIcon, ChatBubbleIcon, ChevronRightIcon, ClockIcon, TrendIcon, UsersIcon } from "@/components/icons";
import { TeacherShell } from "@/components/workspace/TeacherShell";
import { QuestionBank } from "@/components/workspace/TeacherQuestions";
import { ClassResults } from "@/components/workspace/TeacherResults";
import { GroupsTab } from "@/components/workspace/class/GroupsTab";
import { ContentTab } from "@/components/workspace/class/ContentTab";
import { StudentsTab } from "@/components/workspace/class/StudentsTab";
import { primaryButton } from "@/components/SiteUi";
import type { Account } from "@/lib/auth";
import { classTitle, useClasses } from "@/lib/classes";
import { labelFor, subjects } from "@/data/catalog";
import { cn } from "@/lib/cn";

const tabs = [
  { key: "schedule", label: "Schedule & groups", Icon: ClockIcon },
  { key: "content", label: "Course content", Icon: BookIcon },
  { key: "questions", label: "Questions", Icon: ChatBubbleIcon },
  { key: "students", label: "Students & messages", Icon: UsersIcon },
  { key: "results", label: "Results", Icon: TrendIcon },
] as const;
type Tab = (typeof tabs)[number]["key"];

/** One class: its groups and timetable, modules and documents, questions, students and results. */
export function TeacherClass() {
  const params = useSearchParams();
  const id = params.get("id") ?? "";
  const tabParam = params.get("tab");
  const tab: Tab = tabs.some((x) => x.key === tabParam) ? (tabParam as Tab) : "schedule";
  return (
    <TeacherShell
      title={<ClassHeading id={id} />}
      back={
        <Link href="/teach" className="mb-4 inline-flex min-h-11 items-center gap-2 text-sm text-gray-500 hover:text-brand">
          <ChevronRightIcon className="h-4 w-4 rotate-180 rtl:rotate-0" />
          <T>My classes</T>
        </Link>
      }
    >
      {(account) => <ClassBody account={account} id={id} tab={tab} />}
    </TeacherShell>
  );
}

function ClassHeading({ id }: { id: string }) {
  const { t } = useI18n();
  const { data } = useClasses(id ? [id] : []);
  const c = data[0];
  return c ? <bdi dir="auto">{classTitle(c, t)}</bdi> : <span className="inline-block h-9 w-64 animate-pulse rounded bg-gray-100 align-middle" />;
}

function ClassBody({ account, id, tab }: { account: Account; id: string; tab: Tab }) {
  const { t, locale } = useI18n();
  const router = useRouter();
  const owns = account.teacher?.classIds.includes(id);
  const { data } = useClasses(owns ? [id] : []);
  const cls = data[0];

  if (!owns)
    return (
      <div className="rounded-xl border border-dashed border-gray-300 bg-white p-10 text-center">
        <p className="font-semibold text-gray-700">
          <T>This class is not one of yours.</T>
        </p>
        <Link href="/teach" className={`${primaryButton} mt-6`}>
          <T>My classes</T>
        </Link>
      </div>
    );

  return (
    <div>
      {cls && (
        <p className="-mt-5 mb-6 text-sm text-gray-500">
          <T>{labelFor(subjects, cls.subject)}</T>
        </p>
      )}
      <div className="flex gap-1 overflow-x-auto border-b border-gray-200 [scrollbar-width:none]" role="tablist">
        {tabs.map(({ key, label, Icon }) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={tab === key}
            onClick={() => router.replace(`/${locale}/teach/class?id=${encodeURIComponent(id)}&tab=${key}`, { scroll: false })}
            className={cn(
              "inline-flex min-h-12 shrink-0 items-center gap-2 border-b-2 px-4 text-sm font-semibold transition-colors",
              tab === key ? "border-brand text-brand" : "border-transparent text-gray-500 hover:text-gray-800",
            )}
          >
            <Icon className="h-4 w-4" />
            {t(label)}
          </button>
        ))}
      </div>
      <div key={tab} className="animate-rise pt-8">
        {tab === "schedule" && <GroupsTab account={account} classId={id} cls={cls} />}
        {tab === "content" && <ContentTab account={account} classId={id} />}
        {tab === "questions" && <QuestionBank classId={id} />}
        {tab === "students" && <StudentsTab account={account} classId={id} />}
        {tab === "results" && <ClassResults classId={id} />}
      </div>
    </div>
  );
}
