"use client";

import { useState, type FormEvent } from "react";
import { Localized, T, useI18n } from "@/components/I18n";
import { fieldClass, panelClass, primaryButton } from "@/components/SiteUi";
import { MailIcon, TrashIcon } from "@/components/icons";
import { Toast } from "@/components/ui/Motion";
import { displayName, formatPhone, type Account } from "@/lib/auth";
import { postAnnouncement, useAnnouncements } from "@/lib/announcements";
import { moveStudent, useRoster } from "@/lib/classes";
import { groupLabel, useGroups } from "@/lib/groups";
import { supabase } from "@/lib/supabase/client";
import { announceChange } from "@/lib/remote";
import { cn } from "@/lib/cn";

export function StudentsTab({ account, classId }: { account: Account; classId: string }) {
  const { t, locale } = useI18n();
  const { data: roster, loading } = useRoster(classId);
  const { data: groups } = useGroups([classId]);
  const { data: messages } = useAnnouncements(classId);
  const [filter, setFilter] = useState<string>("all");
  const [toast, setToast] = useState("");
  const shown = roster.filter((s) => filter === "all" || (filter === "none" ? !s.groupId : s.groupId === filter));
  const date = (ts: number) => new Date(ts).toLocaleDateString(locale === "ar" ? "ar-TN" : "fr-TN", { day: "numeric", month: "short" });

  return (
    <div className="grid items-start gap-8 lg:grid-cols-[1fr_380px]">
      <section className={panelClass}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-xl font-bold text-gray-800">{t("{n} students", { n: roster.length })}</h2>
          {groups.length > 0 && (
            <select aria-label={t("Group")} value={filter} onChange={(e) => setFilter(e.target.value)} className="min-h-11 rounded-md border border-gray-200 bg-white px-3 text-sm">
              <option value="all">{t("All groups")}</option>
              {groups.map((g) => (
                <option key={g.id} value={g.id}>
                  {groupLabel(g, t)}
                </option>
              ))}
              <option value="none">{t("No group yet")}</option>
            </select>
          )}
        </div>
        {loading ? (
          <div className="mt-5 h-24 animate-pulse rounded-lg bg-gray-100" />
        ) : shown.length ? (
          <ul className="mt-4 divide-y divide-gray-100">
            {shown.map((s) => (
              <li key={s.id} className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm">
                <span className="min-w-0">
                  <bdi dir="auto" className="block font-semibold text-gray-800">
                    {displayName(s)}
                  </bdi>
                  {s.phone && (
                    <bdi dir="ltr" className="text-xs text-gray-500">
                      {formatPhone(s.phone)}
                    </bdi>
                  )}
                </span>
                {groups.length > 0 && (
                  <select
                    aria-label={t("Group")}
                    value={s.groupId ?? ""}
                    onChange={async (e) => {
                      try {
                        await moveStudent(classId, s.id, e.target.value || null);
                        setToast(t("Student moved."));
                      } catch {
                        setToast(t("The student could not be moved. Try again."));
                      }
                    }}
                    className={cn("min-h-10 max-w-[200px] rounded-md border bg-white px-2 text-sm", s.groupId ? "border-gray-200" : "border-amber-300")}
                  >
                    <option value="">{t("No group yet")}</option>
                    {groups.map((g) => (
                      <option key={g.id} value={g.id}>
                        {groupLabel(g, t)}
                      </option>
                    ))}
                  </select>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-4 rounded-lg bg-gray-50 p-5 text-sm leading-6 text-gray-500">
            <T>No students yet. Share your class link so your students can join.</T>
          </p>
        )}
      </section>

      <aside className="space-y-6">
        <EmailForm account={account} classId={classId} groups={groups.map((g) => ({ id: g.id, label: groupLabel(g, t) }))} onToast={setToast} />
        {messages.length > 0 && (
          <section className={panelClass}>
            <h3 className="font-display text-lg font-bold text-gray-800">
              <T>Sent messages</T>
            </h3>
            <ul className="mt-3 divide-y divide-gray-100">
              {messages.map((m) => (
                <li key={m.id} className="flex items-start justify-between gap-3 py-3 text-sm">
                  <span className="min-w-0">
                    <bdi dir="auto" className="block font-semibold text-gray-800">
                      {m.subject}
                    </bdi>
                    <span className="text-xs text-gray-500">
                      {date(m.createdAt)} · {groupLabel(groups.find((g) => g.id === m.groupId), t)}
                      {m.emailed > 0 && <> · {t("emailed to {n}", { n: m.emailed })}</>}
                    </span>
                  </span>
                  <Localized
                    as="button"
                    type="button"
                    aria-label="Delete"
                    onClick={async () => {
                      await supabase().from("announcements").delete().eq("id", m.id);
                      announceChange("announcements");
                    }}
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-gray-400 hover:bg-red-50 hover:text-red-600"
                  >
                    <TrashIcon className="h-4 w-4" />
                  </Localized>
                </li>
              ))}
            </ul>
          </section>
        )}
      </aside>
      <Toast message={toast} onDone={() => setToast("")} />
    </div>
  );
}

function EmailForm({ account, classId, groups, onToast }: { account: Account; classId: string; groups: { id: string; label: string }[]; onToast: (m: string) => void }) {
  const { t, locale } = useI18n();
  const [groupId, setGroupId] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!subject.trim()) return;
    setBusy(true);
    try {
      const r = await postAnnouncement({ classId, groupId: groupId || null, kind: "message", subject, body, createdBy: account.id, email: true, locale });
      onToast(r ? t("Message sent. Email delivered to {sent} of {n} students.", { sent: r.sent, n: r.recipients }) : t("Message posted."));
      setSubject("");
      setBody("");
    } catch {
      onToast(t("The message could not be sent. Try again."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className={panelClass}>
      <h3 className="flex items-center gap-2 font-display text-lg font-bold text-gray-800">
        <MailIcon className="h-5 w-5 text-brand" />
        <T>Email your students</T>
      </h3>
      {groups.length > 0 && (
        <label className="mt-4 block text-sm font-semibold text-gray-700">
          <T>To</T>
          <select value={groupId} onChange={(e) => setGroupId(e.target.value)} className={fieldClass}>
            <option value="">{t("The whole class")}</option>
            {groups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.label}
              </option>
            ))}
          </select>
        </label>
      )}
      <label className="mt-4 block text-sm font-semibold text-gray-700">
        <T>Subject</T>
        <input dir="auto" value={subject} onChange={(e) => setSubject(e.target.value)} maxLength={160} className={fieldClass} />
      </label>
      <label className="mt-4 block text-sm font-semibold text-gray-700">
        <T>Message</T>
        <Localized
          as="textarea"
          dir="auto"
          rows={5}
          value={body}
          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setBody(e.target.value)}
          placeholder="e.g. Please finish exercises 3 and 4 before Tuesday."
          className={fieldClass}
        />
      </label>
      <button type="submit" disabled={busy || !subject.trim()} className={`${primaryButton} mt-5 w-full`}>
        <T>{busy ? "Please wait…" : "Send"}</T>
      </button>
      <p className="mt-3 text-xs leading-5 text-gray-500">
        <T>The message also appears on the class page of your students.</T>
      </p>
    </form>
  );
}
