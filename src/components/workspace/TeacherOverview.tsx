"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "@/components/LocalizedLink";
import { T, useI18n } from "@/components/I18n";
import { CountUp, Reveal } from "@/components/ui/Motion";
import { PlusIcon, UsersIcon } from "@/components/icons";
import { TeacherShell } from "@/components/workspace/TeacherShell";
import { fieldClass, panelClass, primaryButton, secondaryButton } from "@/components/SiteUi";
import { refreshAuth, type Account } from "@/lib/auth";
import { classEarnings, classTitle, createClass, nextPayoutDate, useClasses, useEnrollmentCounts, useLiveSessions, type ClassInfo } from "@/lib/classes";
import { formatSlots, groupLabel, useGroups, type Group } from "@/lib/groups";
import { usePayoutDetails } from "@/lib/payouts";
import { COMMISSION_PCT, labelFor, levels, subjects } from "@/data/catalog";
import { cn } from "@/lib/cn";

export function TeacherOverview() {
  return (
    <TeacherShell title="My classes" intro="Your classes, your students and what you earn. Open a class to manage its groups, documents and questions.">
      {(account) => <Home account={account} />}
    </TeacherShell>
  );
}

export const money = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(2));

function Home({ account }: { account: Account }) {
  const { t, locale } = useI18n();
  const ids = account.teacher?.classIds ?? [];
  const { data: classes, loading } = useClasses(ids);
  const { data: groups } = useGroups(ids);
  const { data: counts } = useEnrollmentCounts(ids);
  const live = useLiveSessions(ids);
  const { data: payout } = usePayoutDetails(account.id);
  const [creating, setCreating] = useState(false);

  const totals = classes.reduce(
    (acc, c) => {
      const e = classEarnings(c.price, counts.byClass[c.id] ?? 0);
      return { students: acc.students + (counts.byClass[c.id] ?? 0), gross: acc.gross + e.gross, net: acc.net + e.net };
    },
    { students: 0, gross: 0, net: 0 },
  );
  const payoutDate = nextPayoutDate().toLocaleDateString(locale === "ar" ? "ar-TN" : "fr-TN", { day: "numeric", month: "long" });

  return (
    <div className="space-y-8">
      <div className="grid gap-4 sm:grid-cols-3">
        <Reveal className={panelClass}>
          <p className="text-sm text-gray-500">
            <T>Students right now</T>
          </p>
          <p className="font-display mt-2 text-3xl font-extrabold text-gray-900">
            <CountUp value={totals.students} />
          </p>
        </Reveal>
        <Reveal delay={70} className={panelClass}>
          <p className="text-sm text-gray-500">
            <T>You earn per month</T>
          </p>
          <p className="font-display mt-2 text-3xl font-extrabold text-gray-900">
            <span dir="ltr">{money(totals.net)}</span>{" "}
            <span className="text-lg">
              <T>DT</T>
            </span>
          </p>
          <p className="mt-1 text-xs text-gray-500">{t("Students pay {gross} DT · Karrini keeps {pct}%", { gross: money(totals.gross), pct: COMMISSION_PCT })}</p>
        </Reveal>
        <Reveal delay={140} className={panelClass}>
          <p className="text-sm text-gray-500">
            <T>Next payout</T>
          </p>
          <p className="font-display mt-2 text-2xl font-extrabold text-gray-900">{payoutDate}</p>
          <p className="mt-1 text-xs leading-5 text-gray-500">
            {payout?.rib ? (
              t("Transferred to your bank account ending in {last}.", { last: payout.rib.slice(-4) })
            ) : (
              <Link href="/account#payouts" className="font-semibold text-brand underline">
                <T>Add your bank account (RIB) to get paid</T>
              </Link>
            )}
          </p>
        </Reveal>
      </div>
      <p className="-mt-4 text-xs leading-5 text-gray-400">
        <T>Amounts are estimates from the monthly price and the students enrolled today. Payouts are made on the 5th of each month for the previous month. Online payment is not active yet.</T>
      </p>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-xl font-bold text-gray-800">{t("{n} classes", { n: classes.length })}</h2>
        <button type="button" onClick={() => setCreating((c) => !c)} className={secondaryButton}>
          <PlusIcon className="h-5 w-5" />
          <T>New class</T>
        </button>
      </div>
      {creating && <NewClass account={account} onDone={() => setCreating(false)} />}

      {loading && ids.length ? (
        <div className="h-48 animate-pulse rounded-xl bg-gray-100" aria-busy="true" />
      ) : (
        <div className="grid gap-5 lg:grid-cols-2">
          {classes.map((c, i) => (
            <Reveal key={c.id} delay={i * 60}>
              <ClassCard c={c} groups={groups.filter((g) => g.classId === c.id)} students={counts.byClass[c.id] ?? 0} byGroup={counts.byGroup} live={!!live[c.id]} />
            </Reveal>
          ))}
        </div>
      )}
    </div>
  );
}

function ClassCard({ c, groups, students, byGroup, live }: { c: ClassInfo; groups: Group[]; students: number; byGroup: Record<string, number>; live: boolean }) {
  const { t } = useI18n();
  const e = classEarnings(c.price, students);
  const href = `/teach/class?id=${encodeURIComponent(c.id)}`;
  return (
    <article className="flex h-full flex-col rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm text-brand">
            <T>{labelFor(subjects, c.subject)}</T>
            {c.levels.length > 0 && <> · {c.levels.map((l) => t(labelFor(levels, l))).join(" · ")}</>}
          </p>
          <h3 className="font-display mt-1 text-xl font-bold text-gray-900">
            <Link href={href} className="hover:text-brand">
              <bdi dir="auto">{classTitle(c, t)}</bdi>
            </Link>
          </h3>
        </div>
        {live && (
          <span className="animate-live shrink-0 rounded-md bg-red-600 px-2 py-0.5 text-xs font-bold text-white">
            <T>LIVE</T>
          </span>
        )}
      </div>

      <dl className="mt-5 grid grid-cols-3 gap-3 rounded-lg bg-gray-50 p-4 text-center">
        <div>
          <dd className="font-display text-xl font-extrabold text-gray-900">{students}</dd>
          <dt className="text-xs text-gray-500">
            <T>Students</T>
          </dt>
        </div>
        <div>
          <dd className="font-display text-xl font-extrabold text-gray-900" dir="ltr">
            {c.price ?? "—"}
          </dd>
          <dt className="text-xs text-gray-500">
            <T>DT / student</T>
          </dt>
        </div>
        <div>
          <dd className="font-display text-xl font-extrabold text-emerald-700" dir="ltr">
            {money(e.net)}
          </dd>
          <dt className="text-xs text-gray-500">
            <T>DT for you / month</T>
          </dt>
        </div>
      </dl>

      <ul className="mt-4 flex-1 space-y-2 text-sm">
        {groups.length ? (
          groups.map((g) => (
            <li key={g.id} className="flex items-center justify-between gap-3">
              <span className="min-w-0 text-gray-700">
                <bdi dir="auto" className="font-semibold">
                  {groupLabel(g, t)}
                </bdi>
                {g.name && g.slots.length > 0 && <span className="block text-xs text-gray-500">{formatSlots(g.slots, t)}</span>}
              </span>
              <span className="flex shrink-0 items-center gap-1 text-gray-500">
                <UsersIcon className="h-4 w-4" /> {byGroup[g.id] ?? 0}
              </span>
            </li>
          ))
        ) : (
          <li className="text-gray-500">
            <T>No groups yet. Add your timetable so students can choose a group.</T>
          </li>
        )}
      </ul>

      <div className="mt-5 flex flex-wrap gap-2">
        <Link href={href} className={cn(primaryButton, "min-h-11 flex-1 py-2 text-sm")}>
          <T>Manage class</T>
        </Link>
        <Link href={`/classroom?class=${encodeURIComponent(c.id)}`} className={cn(secondaryButton, "min-h-11 flex-1 py-2 text-sm")}>
          <span className="h-2 w-2 rounded-full bg-red-500" aria-hidden />
          <T>Go live</T>
        </Link>
      </div>
    </article>
  );
}

function NewClass({ account, onDone }: { account: Account; onDone: () => void }) {
  const { t, locale } = useI18n();
  const router = useRouter();
  const [name, setName] = useState("");
  const [subject, setSubject] = useState(account.teacher?.subject ?? "economics");
  const [lvls, setLvls] = useState<string[]>([]);
  const [price, setPrice] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) return setError(t("Give the class a name."));
    if (!lvls.length) return setError(t("Choose at least one school year you teach."));
    setBusy(true);
    setError("");
    try {
      const id = await createClass({ subject, levels: lvls, name, price: price === "" ? null : Math.max(0, Math.round(Number(price))) });
      await refreshAuth();
      onDone();
      router.push(`/${locale}/teach/class?id=${encodeURIComponent(id)}&tab=schedule`);
    } catch {
      setError(t("The class could not be created. Try again."));
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className={`${panelClass} animate-rise`} noValidate>
      <h3 className="font-display text-lg font-bold text-gray-800">
        <T>New class</T>
      </h3>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <label className="block text-sm font-semibold text-gray-700">
          <T>Class name</T>
          <input dir="auto" value={name} onChange={(e) => setName(e.target.value)} maxLength={120} placeholder={t("e.g. 1st Secondary Economics")} className={fieldClass} />
        </label>
        <label className="block text-sm font-semibold text-gray-700">
          <T>Subject</T>
          <select value={subject} onChange={(e) => setSubject(e.target.value)} className={fieldClass}>
            {subjects.slice(1).map((s) => (
              <option key={s.slug} value={s.slug}>
                {t(s.label)}
              </option>
            ))}
          </select>
        </label>
      </div>
      <LevelPicker value={lvls} onChange={setLvls} />
      <label className="mt-4 block max-w-xs text-sm font-semibold text-gray-700">
        <T>Monthly price per student (DT)</T>
        <input type="number" min={0} max={5000} value={price} onChange={(e) => setPrice(e.target.value)} className={fieldClass} />
      </label>
      {error && (
        <p role="alert" className="mt-3 text-sm text-red-700">
          {error}
        </p>
      )}
      <div className="mt-5 flex gap-3">
        <button type="submit" disabled={busy} className={primaryButton}>
          <T>{busy ? "Please wait…" : "Create the class"}</T>
        </button>
        <button type="button" onClick={onDone} className={secondaryButton}>
          <T>Cancel</T>
        </button>
      </div>
    </form>
  );
}

export function LevelPicker({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  return (
    <fieldset className="mt-4">
      <legend className="text-sm font-semibold text-gray-700">
        <T>School years</T>
      </legend>
      <div className="mt-2 flex flex-wrap gap-2">
        {levels.slice(1).map((l) => (
          <label key={l.slug} className={cn("flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border px-3 text-sm", value.includes(l.slug) ? "border-brand bg-emerald-50" : "border-gray-200")}>
            <input type="checkbox" checked={value.includes(l.slug)} onChange={(e) => onChange(e.target.checked ? [...value, l.slug] : value.filter((x) => x !== l.slug))} className="h-4 w-4" />
            <T>{l.label}</T>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
