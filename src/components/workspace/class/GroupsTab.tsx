"use client";

import { useState, type FormEvent } from "react";
import { Localized, T, useI18n } from "@/components/I18n";
import { fieldClass, panelClass, primaryButton, secondaryButton } from "@/components/SiteUi";
import { PlusIcon, TrashIcon, UsersIcon } from "@/components/icons";
import { Toast } from "@/components/ui/Motion";
import { InviteCard } from "@/components/workspace/InviteCard";
import { LevelPicker } from "@/components/workspace/TeacherOverview";
import type { Account } from "@/lib/auth";
import { postAnnouncement } from "@/lib/announcements";
import { updateClass, useEnrollmentCounts, type ClassInfo } from "@/lib/classes";
import { deleteGroup, formatSlots, groupLabel, saveGroup, useGroups, weekdays, type Group, type Slot } from "@/lib/groups";

const emailResult = (t: (s: string, v?: Record<string, string | number>) => string, r: { sent: number; recipients: number } | null) =>
  r ? t("Saved. Email sent to {sent} of {n} students.", { sent: r.sent, n: r.recipients }) : t("Saved.");

export function GroupsTab({ account, classId, cls }: { account: Account; classId: string; cls: ClassInfo | undefined }) {
  const { data: groups, loading } = useGroups([classId]);
  const { data: counts } = useEnrollmentCounts([classId]);
  const [adding, setAdding] = useState(false);
  const [toast, setToast] = useState("");

  return (
    <div className="grid items-start gap-8 lg:grid-cols-[1fr_340px]">
      <div className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-xl font-bold text-gray-800">
              <T>Groups and timetable</T>
            </h2>
            <p className="mt-1 max-w-xl text-sm leading-6 text-gray-500">
              <T>Teach the same class at different times? Create one group per timetable. Each group has its own students and its own live sessions.</T>
            </p>
          </div>
          <button type="button" onClick={() => setAdding(true)} className={secondaryButton}>
            <PlusIcon className="h-5 w-5" />
            <T>Add a group</T>
          </button>
        </div>
        {adding && (
          <GroupEditor
            account={account}
            classId={classId}
            position={groups.length}
            onDone={(msg) => {
              setAdding(false);
              if (msg) setToast(msg);
            }}
          />
        )}
        {loading ? (
          <div className="h-32 animate-pulse rounded-xl bg-gray-100" />
        ) : groups.length ? (
          groups.map((g) => <GroupCard key={g.id} account={account} group={g} students={counts.byGroup[g.id] ?? 0} onToast={setToast} />)
        ) : (
          !adding && (
            <div className="rounded-xl border border-dashed border-gray-300 bg-white p-8 text-center text-sm leading-6 text-gray-500">
              <T>No groups yet. Without groups, every student of the class joins every live session.</T>
            </div>
          )
        )}
        <SessionChange account={account} classId={classId} groups={groups} onToast={setToast} />
      </div>
      <aside className="space-y-6">
        <InviteCard classId={classId} />
        {cls && <ClassSettings cls={cls} onToast={setToast} />}
      </aside>
      <Toast message={toast} onDone={() => setToast("")} />
    </div>
  );
}

function GroupCard({ account, group, students, onToast }: { account: Account; group: Group; students: number; onToast: (m: string) => void }) {
  const { t } = useI18n();
  const [editing, setEditing] = useState(false);
  const [confirm, setConfirm] = useState(false);
  if (editing)
    return (
      <GroupEditor
        account={account}
        classId={group.classId}
        group={group}
        position={group.position}
        onDone={(msg) => {
          setEditing(false);
          if (msg) onToast(msg);
        }}
      />
    );
  return (
    <article className={panelClass}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-display text-lg font-bold text-gray-900">
            <bdi dir="auto">{groupLabel(group, t)}</bdi>
          </h3>
          <ul className="mt-2 space-y-1 text-sm text-gray-600">
            {group.slots.map((s, i) => (
              <li key={i}>
                <T>{weekdays[s.day]}</T> <span dir="ltr">{s.start}–{s.end}</span>
              </li>
            ))}
          </ul>
        </div>
        <span className="flex items-center gap-1.5 rounded-full bg-gray-100 px-3 py-1 text-sm text-gray-700">
          <UsersIcon className="h-4 w-4" /> {t("{n} students", { n: students })}
        </span>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <button type="button" onClick={() => setEditing(true)} className={`${secondaryButton} min-h-11 py-2 text-sm`}>
          <T>Change timetable</T>
        </button>
        {confirm ? (
          <>
            <button
              type="button"
              onClick={async () => {
                await deleteGroup(group.id);
                onToast(t("Group deleted. Its students are now in the whole class."));
              }}
              className="min-h-11 rounded-md bg-red-600 px-4 text-sm font-semibold text-white"
            >
              <T>Delete the group</T>
            </button>
            <button type="button" onClick={() => setConfirm(false)} className="min-h-11 px-3 text-sm text-gray-500 underline">
              <T>Cancel</T>
            </button>
          </>
        ) : (
          <Localized as="button" type="button" aria-label="Delete" onClick={() => setConfirm(true)} className="flex h-11 w-11 items-center justify-center rounded-md text-gray-400 hover:bg-red-50 hover:text-red-600">
            <TrashIcon className="h-5 w-5" />
          </Localized>
        )}
      </div>
    </article>
  );
}

function GroupEditor({
  account,
  classId,
  group,
  position,
  onDone,
}: {
  account: Account;
  classId: string;
  group?: Group;
  position: number;
  onDone: (message?: string) => void;
}) {
  const { t, locale } = useI18n();
  const [name, setName] = useState(group?.name ?? "");
  const [slots, setSlots] = useState<Slot[]>(group?.slots.length ? group.slots : [{ day: 1, start: "08:00", end: "10:00" }]);
  const [email, setEmail] = useState(!!group);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const setSlot = (i: number, patch: Partial<Slot>) => setSlots((all) => all.map((s, j) => (j === i ? { ...s, ...patch } : s)));

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!slots.length) return setError(t("Add at least one weekly session."));
    if (slots.some((s) => !s.start || !s.end || s.end <= s.start)) return setError(t("Each session must end after it starts."));
    setBusy(true);
    setError("");
    try {
      await saveGroup({ id: group?.id, classId, name, slots, position });
      let result = null;
      if (group && email) {
        const label = name || formatSlots(slots, t);
        result = await postAnnouncement({
          classId,
          groupId: group.id,
          kind: "schedule",
          subject: t("New timetable: {group}", { group: label }),
          body: [formatSlots(slots, t), note.trim()].filter(Boolean).join("\n\n"),
          createdBy: account.id,
          email: true,
          locale,
        }).catch(() => null);
      }
      onDone(emailResult(t, result));
    } catch {
      setError(t("The group could not be saved. Try again."));
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className={`${panelClass} animate-rise border-brand/40`} noValidate>
      <h3 className="font-display text-lg font-bold text-gray-800">
        <T>{group ? "Change timetable" : "New group"}</T>
      </h3>
      <label className="mt-4 block text-sm font-semibold text-gray-700">
        <T>Group name (optional)</T>
        <input dir="auto" value={name} onChange={(e) => setName(e.target.value)} maxLength={80} placeholder={t("e.g. Tuesday morning group")} className={fieldClass} />
      </label>
      <p className="mt-5 text-sm font-semibold text-gray-700">
        <T>Weekly sessions</T>
      </p>
      <ul className="mt-2 space-y-2">
        {slots.map((s, i) => (
          <li key={i} className="flex flex-wrap items-center gap-2">
            <select aria-label={t("Day")} value={s.day} onChange={(e) => setSlot(i, { day: Number(e.target.value) })} className={`${fieldClass} mt-0 w-auto flex-1`}>
              {weekdays.map((d, j) => (
                <option key={d} value={j}>
                  {t(d)}
                </option>
              ))}
            </select>
            <input type="time" aria-label={t("Starts")} value={s.start} onChange={(e) => setSlot(i, { start: e.target.value })} className={`${fieldClass} mt-0 w-32`} dir="ltr" />
            <span aria-hidden>–</span>
            <input type="time" aria-label={t("Ends")} value={s.end} onChange={(e) => setSlot(i, { end: e.target.value })} className={`${fieldClass} mt-0 w-32`} dir="ltr" />
            {slots.length > 1 && (
              <Localized as="button" type="button" aria-label="Remove" onClick={() => setSlots(slots.filter((_, j) => j !== i))} className="flex h-11 w-11 items-center justify-center rounded-md text-gray-400 hover:bg-red-50 hover:text-red-600">
                <TrashIcon className="h-5 w-5" />
              </Localized>
            )}
          </li>
        ))}
      </ul>
      <button type="button" onClick={() => setSlots([...slots, { day: slots.at(-1)?.day ?? 1, start: "18:00", end: "19:30" }])} className="mt-3 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-brand">
        <PlusIcon className="h-4 w-4" />
        <T>Add another weekly session</T>
      </button>
      {group && (
        <div className="mt-5 rounded-lg bg-gray-50 p-4">
          <label className="flex items-start gap-3 text-sm text-gray-700">
            <input type="checkbox" checked={email} onChange={(e) => setEmail(e.target.checked)} className="mt-0.5 h-5 w-5" />
            <T>Email the students of this group about the change</T>
          </label>
          {email && (
            <Localized
              as="textarea"
              dir="auto"
              rows={2}
              value={note}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setNote(e.target.value)}
              placeholder="Optional message, e.g. The new timetable starts next week."
              className={fieldClass}
            />
          )}
        </div>
      )}
      {error && (
        <p role="alert" className="mt-3 text-sm text-red-700">
          {error}
        </p>
      )}
      <div className="mt-5 flex gap-3">
        <button type="submit" disabled={busy} className={primaryButton}>
          <T>{busy ? "Please wait…" : "Save"}</T>
        </button>
        <button type="button" onClick={() => onDone()} className={secondaryButton}>
          <T>Cancel</T>
        </button>
      </div>
    </form>
  );
}

/** Moves or cancels one session: posted on the class page and emailed to the group. */
function SessionChange({ account, classId, groups, onToast }: { account: Account; classId: string; groups: Group[]; onToast: (m: string) => void }) {
  const { t, locale } = useI18n();
  const [open, setOpen] = useState(false);
  const [groupId, setGroupId] = useState<string>("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!message.trim()) return;
    setBusy(true);
    try {
      const g = groups.find((x) => x.id === groupId);
      const r = await postAnnouncement({
        classId,
        groupId: groupId || null,
        kind: "schedule",
        subject: g ? t("Session change: {group}", { group: groupLabel(g, t) }) : t("Session change"),
        body: message,
        createdBy: account.id,
        email: true,
        locale,
      });
      onToast(emailResult(t, r));
      setMessage("");
      setOpen(false);
    } catch {
      onToast(t("The message could not be sent. Try again."));
    } finally {
      setBusy(false);
    }
  }

  if (!open)
    return (
      <button type="button" onClick={() => setOpen(true)} className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-brand hover:underline">
        <T>Move or cancel one session</T> →
      </button>
    );
  return (
    <form onSubmit={submit} className={`${panelClass} animate-rise`}>
      <h3 className="font-display text-lg font-bold text-gray-800">
        <T>Move or cancel one session</T>
      </h3>
      {groups.length > 0 && (
        <label className="mt-4 block text-sm font-semibold text-gray-700">
          <T>Who is concerned?</T>
          <select value={groupId} onChange={(e) => setGroupId(e.target.value)} className={fieldClass}>
            <option value="">{t("The whole class")}</option>
            {groups.map((g) => (
              <option key={g.id} value={g.id}>
                {groupLabel(g, t)}
              </option>
            ))}
          </select>
        </label>
      )}
      <label className="mt-4 block text-sm font-semibold text-gray-700">
        <T>What changes?</T>
        <Localized
          as="textarea"
          dir="auto"
          rows={3}
          value={message}
          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setMessage(e.target.value)}
          placeholder="e.g. Tuesday's session moves to Thursday 18:00."
          className={fieldClass}
        />
      </label>
      <p className="mt-2 text-xs text-gray-500">
        <T>Students see it on their class page and receive it by email.</T>
      </p>
      <div className="mt-4 flex gap-3">
        <button type="submit" disabled={busy || !message.trim()} className={primaryButton}>
          <T>{busy ? "Please wait…" : "Send to students"}</T>
        </button>
        <button type="button" onClick={() => setOpen(false)} className={secondaryButton}>
          <T>Cancel</T>
        </button>
      </div>
    </form>
  );
}

function ClassSettings({ cls, onToast }: { cls: ClassInfo; onToast: (m: string) => void }) {
  const { t } = useI18n();
  const [name, setName] = useState(cls.name);
  const [lvls, setLvls] = useState(cls.levels);
  const [price, setPrice] = useState(cls.price != null ? String(cls.price) : "");
  const [busy, setBusy] = useState(false);
  return (
    <form
      className={panelClass}
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        try {
          await updateClass(cls.id, { name, levels: lvls, price: price === "" ? null : Math.max(0, Math.round(Number(price))) });
          onToast(t("Saved."));
        } catch {
          onToast(t("The class could not be saved. Try again."));
        } finally {
          setBusy(false);
        }
      }}
    >
      <h3 className="font-display text-lg font-bold text-gray-800">
        <T>Class details</T>
      </h3>
      <label className="mt-4 block text-sm font-semibold text-gray-700">
        <T>Class name</T>
        <input dir="auto" value={name} onChange={(e) => setName(e.target.value)} maxLength={120} placeholder={t("e.g. 1st Secondary Economics")} className={fieldClass} />
      </label>
      <LevelPicker value={lvls} onChange={setLvls} />
      <label className="mt-4 block text-sm font-semibold text-gray-700">
        <T>Monthly price per student (DT)</T>
        <input type="number" min={0} max={5000} value={price} onChange={(e) => setPrice(e.target.value)} className={fieldClass} />
      </label>
      <button type="submit" disabled={busy} className={`${primaryButton} mt-5 w-full`}>
        <T>{busy ? "Please wait…" : "Save"}</T>
      </button>
    </form>
  );
}
