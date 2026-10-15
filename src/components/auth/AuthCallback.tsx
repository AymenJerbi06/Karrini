"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "@/components/LocalizedLink";
import { T, useI18n } from "@/components/I18n";
import { primaryButton } from "@/components/SiteUi";
import { CheckCircleIcon } from "@/components/icons";
import { currentAccount, homeFor, refreshAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase/client";

const safeNext = (next: string | null) => (next && next.startsWith("/") && !next.startsWith("//") ? next : null);

type Outcome = "working" | "confirmed" | "expired";

/** Landing page for confirmation and password-reset emails. */
export function AuthCallback() {
  const { locale } = useI18n();
  const router = useRouter();
  const params = useSearchParams();
  const next = safeNext(params.get("next"));
  const [outcome, setOutcome] = useState<Outcome>("working");

  useEffect(() => {
    let cancelled = false;
    const finish = async () => {
      await refreshAuth();
      const account = currentAccount();
      router.replace(`/${locale}${next ?? homeFor(account?.role ?? "student")}`);
    };
    (async () => {
      const hash = new URLSearchParams(window.location.hash.slice(1));
      const error = params.get("error_code") ?? hash.get("error_code") ?? params.get("error") ?? hash.get("error");
      if (error) {
        if (!cancelled) setOutcome("expired");
        return;
      }
      const sb = supabase();
      const code = params.get("code");
      if (code) {
        const { error: exchangeError } = await sb.auth.exchangeCodeForSession(code);
        if (cancelled) return;
        // Opened on another device: the email is confirmed, but this browser has no sign-in to finish.
        if (exchangeError) return setOutcome("confirmed");
        return finish();
      }
      const { data } = await sb.auth.getSession();
      if (cancelled) return;
      if (data.session) return finish();
      setOutcome("confirmed");
    })();
    return () => {
      cancelled = true;
    };
  }, [params, next, locale, router]);

  if (outcome === "working")
    return (
      <div role="status" className="py-10">
        <span className="block h-10 w-10 animate-spin rounded-full border-2 border-gray-200 border-t-brand" />
        <p className="mt-5 text-gray-600">
          <T>Confirming your account…</T>
        </p>
      </div>
    );

  if (outcome === "expired")
    return (
      <div role="alert" className="animate-rise">
        <h1 className="home-heading font-display text-3xl font-extrabold text-gray-900">
          <T>This link has expired or was already used.</T>
        </h1>
        <p className="mt-4 leading-7 text-gray-500">
          <T>Sign in with your email and password. If your email is not confirmed yet, you can ask for a new link there.</T>
        </p>
        <Link href={`/login${next ? `?next=${encodeURIComponent(next)}` : ""}`} className={`${primaryButton} mt-7 w-full`}>
          <T>Sign in</T>
        </Link>
      </div>
    );

  return (
    <div role="status" className="animate-rise">
      <span className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 text-brand">
        <CheckCircleIcon className="h-9 w-9" />
      </span>
      <h1 className="home-heading font-display mt-6 text-3xl font-extrabold text-gray-900">
        <T>Your email is confirmed.</T>
      </h1>
      <p className="mt-4 leading-7 text-gray-500">
        <T>Sign in with your email and password to continue.</T>
      </p>
      <Link href={`/login${next ? `?next=${encodeURIComponent(next)}` : ""}`} className={`${primaryButton} mt-7 w-full`}>
        <T>Sign in</T>
      </Link>
    </div>
  );
}
