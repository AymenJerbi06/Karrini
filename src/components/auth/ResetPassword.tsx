"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import Link from "@/components/LocalizedLink";
import { T, useI18n } from "@/components/I18n";
import { fieldClass, primaryButton } from "@/components/SiteUi";
import { homeFor, useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase/client";

/** Choose a new password after opening the reset email (the callback signs the user in first). */
export function ResetPassword() {
  const { t, locale } = useI18n();
  const router = useRouter();
  const { ready, account } = useAuth();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (password.length < 8) return setError(t("Use a password of at least 8 characters."));
    if (password !== confirm) return setError(t("The two passwords do not match."));
    setBusy(true);
    const { error } = await supabase().auth.updateUser({ password });
    setBusy(false);
    if (error) return setError(t("The password could not be changed. Open the link from the email again."));
    router.push(`/${locale}${homeFor(account?.role ?? "student")}`);
  }

  if (!ready) return <div className="min-h-64" aria-busy="true" />;

  if (!account)
    return (
      <div className="animate-rise">
        <h1 className="home-heading font-display text-3xl font-extrabold text-gray-900">
          <T>Open the link from your email first.</T>
        </h1>
        <p className="mt-4 leading-7 text-gray-500">
          <T>To choose a new password, use the reset link we sent you. You can ask for a new one on the sign-in page.</T>
        </p>
        <Link href="/login" className={`${primaryButton} mt-7 w-full`}>
          <T>Sign in</T>
        </Link>
      </div>
    );

  return (
    <form onSubmit={submit} noValidate className="animate-rise">
      <h1 className="home-heading font-display text-3xl font-extrabold text-gray-900">
        <T>Choose a new password</T>
      </h1>
      <div className="mt-7 space-y-4">
        <label className="block text-sm font-semibold text-gray-700">
          <T>New password</T>
          <input type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} className={fieldClass} />
        </label>
        <label className="block text-sm font-semibold text-gray-700">
          <T>Repeat the new password</T>
          <input type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} className={fieldClass} />
        </label>
      </div>
      {error && (
        <p role="alert" className="mt-4 text-sm text-red-700">
          {error}
        </p>
      )}
      <button type="submit" disabled={busy} className={`${primaryButton} mt-7 w-full`}>
        <T>{busy ? "Please wait…" : "Save my new password"}</T>
      </button>
    </form>
  );
}
