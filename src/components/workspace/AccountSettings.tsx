"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import { T, useI18n } from "@/components/I18n";
import { fieldClass, panelClass, primaryButton, secondaryButton } from "@/components/SiteUi";
import { RequireRole } from "@/components/workspace/Guard";
import { TeacherShell } from "@/components/workspace/TeacherShell";
import {
  changeEmail,
  changePassword,
  displayName,
  formatPhone,
  isPhoneTaken,
  normalizeTunisianPhone,
  signOut,
  signOutEverywhere,
  updateProfile,
  type Account,
} from "@/lib/auth";
import { cleanRib, savePayoutDetails, usePayoutDetails } from "@/lib/payouts";
import { levels } from "@/data/catalog";

/** /account: profile, email, password and security for every role (plus payouts for teachers). */
export function AccountSettings() {
  return (
    <RequireRole roles={["student", "parent", "teacher"]}>
      {(account) =>
        account.role === "teacher" ? (
          <TeacherShell title="Account settings" intro="Your details, your password and the bank account for your payouts.">
            {(a) => <Settings account={a} />}
          </TeacherShell>
        ) : (
          <div className="min-h-[70vh] bg-gray-50">
            <div className="mx-auto max-w-3xl px-6 py-10 md:py-14">
              <p className="text-sm font-semibold tracking-wide text-brand uppercase">
                <T>{account.role === "parent" ? "Parent space" : "Student space"}</T>
              </p>
              <h1 className="home-heading font-display mt-3 text-3xl font-extrabold text-gray-900 md:text-4xl">
                <T>Account settings</T>
              </h1>
              <div className="mt-8">
                <Settings account={account} />
              </div>
            </div>
          </div>
        )
      }
    </RequireRole>
  );
}

function Card({ id, title, children }: { id?: string; title: string; children: ReactNode }) {
  return (
    <section id={id} className={`${panelClass} scroll-mt-6`}>
      <h2 className="font-display text-lg font-bold text-gray-800">
        <T>{title}</T>
      </h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function Status({ ok, children }: { ok: boolean; children: ReactNode }) {
  return (
    <p role={ok ? "status" : "alert"} className={`mt-3 text-sm ${ok ? "text-emerald-700" : "text-red-700"}`}>
      {children}
    </p>
  );
}

function Settings({ account }: { account: Account }) {
  return (
    <div className="max-w-3xl space-y-6">
      <Profile account={account} />
      <EmailCard account={account} />
      <PasswordCard />
      {account.role === "teacher" && <PayoutCard account={account} />}
      <SecurityCard account={account} />
    </div>
  );
}

function Profile({ account }: { account: Account }) {
  const { t } = useI18n();
  const [first, setFirst] = useState(account.firstName);
  const [last, setLast] = useState(account.lastName);
  const [phone, setPhone] = useState(account.phone ? formatPhone(account.phone) : "");
  const [level, setLevel] = useState(account.student?.level ?? "");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setMsg(null);
    if (!first.trim() || !last.trim()) return setMsg({ ok: false, text: t("Enter your first and last name.") });
    const normalized = normalizeTunisianPhone(phone);
    if (!normalized) return setMsg({ ok: false, text: t("Enter a Tunisian phone number, e.g. 20 123 456.") });
    setBusy(true);
    try {
      if (normalized !== account.phone && (await isPhoneTaken(normalized))) {
        setMsg({ ok: false, text: t("This phone number is already used by another account.") });
        return;
      }
      await updateProfile({ firstName: first, lastName: last, phone: normalized, schoolLevel: account.role === "student" ? level : undefined });
      setMsg({ ok: true, text: t("Your details are saved.") });
    } catch {
      setMsg({ ok: false, text: t("Your details could not be saved. Try again.") });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card title="Your details">
      <form onSubmit={submit} noValidate>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm font-semibold text-gray-700">
            <T>First name</T>
            <input dir="auto" value={first} onChange={(e) => setFirst(e.target.value)} maxLength={60} autoComplete="given-name" className={fieldClass} />
          </label>
          <label className="block text-sm font-semibold text-gray-700">
            <T>Last name</T>
            <input dir="auto" value={last} onChange={(e) => setLast(e.target.value)} maxLength={60} autoComplete="family-name" className={fieldClass} />
          </label>
          <label className="block text-sm font-semibold text-gray-700">
            <T>Phone number</T>
            <input dir="ltr" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} autoComplete="tel" placeholder="+216 20 123 456" className={fieldClass} />
          </label>
          {account.role === "student" && (
            <label className="block text-sm font-semibold text-gray-700">
              <T>School year</T>
              <select value={level} onChange={(e) => setLevel(e.target.value)} className={fieldClass}>
                <option value="">—</option>
                {levels.slice(1).map((l) => (
                  <option key={l.slug} value={l.slug}>
                    {t(l.label)}
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>
        {msg && <Status ok={msg.ok}>{msg.text}</Status>}
        <button type="submit" disabled={busy} className={`${primaryButton} mt-5`}>
          <T>{busy ? "Please wait…" : "Save"}</T>
        </button>
      </form>
    </Card>
  );
}

function EmailCard({ account }: { account: Account }) {
  const { t, locale } = useI18n();
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  return (
    <Card title="Email address">
      <p className="text-sm text-gray-600">
        <T>Current address:</T> <bdi dir="ltr" className="font-semibold">{account.email}</bdi>
      </p>
      <form
        noValidate
        className="mt-4 flex flex-wrap gap-3"
        onSubmit={async (e) => {
          e.preventDefault();
          setMsg(null);
          if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim())) return setMsg({ ok: false, text: t("Enter a valid email address.") });
          setBusy(true);
          const err = await changeEmail(email, `${window.location.origin}/${locale}/auth/callback?next=/account`);
          setBusy(false);
          setMsg(err ? { ok: false, text: t(err === "email-taken" ? "This email is already used by another account." : "The email could not be changed. Try again.") } : { ok: true, text: t("We sent a confirmation link to the new address. The change applies once you open it.") });
        }}
      >
        <input dir="ltr" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" aria-label={t("New email address")} placeholder={t("New email address")} className={`${fieldClass} mt-0 min-w-0 flex-1`} />
        <button type="submit" disabled={busy} className={secondaryButton}>
          <T>{busy ? "Please wait…" : "Change email"}</T>
        </button>
      </form>
      {msg && <Status ok={msg.ok}>{msg.text}</Status>}
    </Card>
  );
}

function PasswordCard() {
  const { t } = useI18n();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  return (
    <Card title="Password">
      <form
        noValidate
        onSubmit={async (e) => {
          e.preventDefault();
          setMsg(null);
          if (next.length < 8) return setMsg({ ok: false, text: t("Use at least 8 characters.") });
          if (next !== confirm) return setMsg({ ok: false, text: t("The two passwords do not match.") });
          setBusy(true);
          const err = await changePassword(current, next);
          setBusy(false);
          if (err) return setMsg({ ok: false, text: t(err === "wrong-password" ? "Your current password is not correct." : err === "weak-password" ? "Choose a stronger password." : "The password could not be changed. Try again.") });
          setCurrent("");
          setNext("");
          setConfirm("");
          setMsg({ ok: true, text: t("Your password has been changed.") });
        }}
      >
        <div className="grid gap-4 sm:grid-cols-3">
          <label className="block text-sm font-semibold text-gray-700">
            <T>Current password</T>
            <input type="password" value={current} onChange={(e) => setCurrent(e.target.value)} autoComplete="current-password" className={fieldClass} />
          </label>
          <label className="block text-sm font-semibold text-gray-700">
            <T>New password</T>
            <input type="password" value={next} onChange={(e) => setNext(e.target.value)} autoComplete="new-password" className={fieldClass} />
          </label>
          <label className="block text-sm font-semibold text-gray-700">
            <T>Confirm the new password</T>
            <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" className={fieldClass} />
          </label>
        </div>
        {msg && <Status ok={msg.ok}>{msg.text}</Status>}
        <button type="submit" disabled={busy || !current || !next} className={`${primaryButton} mt-5`}>
          <T>{busy ? "Please wait…" : "Update password"}</T>
        </button>
      </form>
    </Card>
  );
}

function PayoutCard({ account }: { account: Account }) {
  const { t } = useI18n();
  const { data, loading } = usePayoutDetails(account.id);
  return (
    <Card id="payouts" title="Payouts">
      <p className="text-sm leading-6 text-gray-600">
        <T>Karrini keeps 15% of each student payment. The rest is transferred to your bank account on the 5th of each month, for the previous month.</T>
      </p>
      {loading ? <div className="mt-4 h-24 animate-pulse rounded-lg bg-gray-100" /> : <PayoutForm key={data?.rib ?? "new"} account={account} holder={data?.holder ?? displayName(account)} rib={data?.rib ?? ""} t={t} />}
    </Card>
  );
}

function PayoutForm({ account, holder: h, rib: r, t }: { account: Account; holder: string; rib: string; t: (s: string) => string }) {
  const [holder, setHolder] = useState(h);
  const [rib, setRib] = useState(r);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  return (
    <form
      noValidate
      className="mt-4"
      onSubmit={async (e) => {
        e.preventDefault();
        setMsg(null);
        if (cleanRib(rib).length !== 20) return setMsg({ ok: false, text: t("A Tunisian RIB has 20 digits.") });
        setBusy(true);
        try {
          await savePayoutDetails(account.id, holder, rib);
          setMsg({ ok: true, text: t("Your bank account is saved.") });
        } catch {
          setMsg({ ok: false, text: t("Your bank account could not be saved. Try again.") });
        } finally {
          setBusy(false);
        }
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm font-semibold text-gray-700">
          <T>Account holder</T>
          <input dir="auto" value={holder} onChange={(e) => setHolder(e.target.value)} maxLength={120} className={fieldClass} />
        </label>
        <label className="block text-sm font-semibold text-gray-700">
          <T>RIB (20 digits)</T>
          <input dir="ltr" inputMode="numeric" value={rib} onChange={(e) => setRib(e.target.value)} maxLength={30} placeholder="00 000 0000000000000 00" className={fieldClass} />
        </label>
      </div>
      {msg && <Status ok={msg.ok}>{msg.text}</Status>}
      <button type="submit" disabled={busy} className={`${primaryButton} mt-5`}>
        <T>{busy ? "Please wait…" : "Save"}</T>
      </button>
    </form>
  );
}

function SecurityCard({ account }: { account: Account }) {
  const [busy, setBusy] = useState(false);
  return (
    <Card title="Security">
      <p className="text-sm leading-6 text-gray-600">
        <T>Lost a phone or used a shared computer? Sign out everywhere: every device will need your password again.</T>
      </p>
      <p className="mt-2 text-xs text-gray-500">
        <bdi dir="auto">{displayName(account)}</bdi> · <bdi dir="ltr">{account.email}</bdi>
      </p>
      <div className="mt-4 flex flex-wrap gap-3">
        <button type="button" onClick={() => void signOut()} className={secondaryButton}>
          <T>Sign out</T>
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            await signOutEverywhere();
          }}
          className="inline-flex min-h-12 items-center justify-center rounded-md border border-red-200 bg-white px-6 font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50"
        >
          <T>Sign out on all devices</T>
        </button>
      </div>
    </Card>
  );
}
