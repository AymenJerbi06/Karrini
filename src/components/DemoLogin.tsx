"use client";
import { T } from "@/components/I18n";
import Link from "@/components/LocalizedLink";
import { useRouter } from "next/navigation";
import { useI18n } from "@/components/I18n";
import { useState, type FormEvent } from "react";
import {
  saveDemoAccount,
  useDemoAccount,
  type DemoRole,
} from "@/lib/demo-account";
import { primaryButton } from "@/components/SiteUi";

export function DemoLogin() {
  const { locale } = useI18n();
  const router = useRouter();
  const account = useDemoAccount();
  const [selected, setSelected] = useState<DemoRole>("student");
  const [error, setError] = useState("");
  function open(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      saveDemoAccount({
        name: account?.name ?? "Amine",
        role: selected,
        enrollments: account?.enrollments ?? [],
      });
      router.push(`/${locale}/dashboard`);
    } catch {
      setError(
        "Local storage is unavailable. You can still explore the dashboard below.",
      );
    }
  }
  return (
    <>
      <p className="text-sm font-medium text-brand">
        <T>Welcome to Qarrini</T>
      </p>
      <h1 className="home-heading font-display mt-4 text-3xl font-extrabold text-gray-900">
        <T>Choose your workspace.</T>
      </h1>
      <p className="mt-4 leading-8 text-gray-500">
        <T>Explore a demo. No email or password needed.</T>
      </p>
      <form onSubmit={open} className="mt-8">
        <fieldset>
          <legend className="sr-only">
            <T>I am exploring as a</T>
          </legend>
          <div className="space-y-3">
            {(
              [
                ["student", "Student", "Classes, homework and lesson notes"],
                ["parent", "Parent", "Schedules and learning summaries"],
                ["teacher", "Teacher", "Teaching and class participation"],
              ] as const
            ).map(([role, title, description]) => (
              <label
                key={role}
                className={`flex min-h-20 cursor-pointer items-center gap-4 rounded-lg border p-5 transition-colors ${selected === role ? "border-brand bg-blue-50" : "border-gray-200 hover:border-gray-400"}`}
              >
                <input
                  type="radio"
                  name="workspace"
                  value={role}
                  checked={selected === role}
                  onChange={() => {
                    setSelected(role);
                    setError("");
                  }}
                  className="h-5 w-5 shrink-0"
                />
                <span>
                  <span className="block font-semibold text-gray-900">
                    <T>{title}</T>
                  </span>
                  <span className="mt-1 block text-sm text-gray-500">
                    <T>{description}</T>
                  </span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>
        <button type="submit" className={`${primaryButton} mt-7 w-full`}>
          <T>Open my workspace</T>
        </button>
      </form>
      {error && (
        <p role="alert" className="mt-4 text-sm leading-7 text-red-700">
          <T>{error}</T>{" "}
          <Link href="/dashboard" className="underline">
            <T>Open dashboard</T>
          </Link>
        </p>
      )}
      <p className="mt-6 text-center text-sm text-gray-500">
        <T>Looking for a class?</T>{" "}
        <Link
          href="/find-a-teacher"
          className="font-semibold text-brand underline underline-offset-4"
        >
          <T>Browse teachers</T>
        </Link>
      </p>
      <p className="mt-6 text-center text-xs leading-6 text-gray-500">
        <T>Demo only · Details stay in this browser.</T>
      </p>
    </>
  );
}
