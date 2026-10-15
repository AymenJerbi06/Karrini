"use client";
import { T, Localized } from "@/components/I18n";

import Link from "@/components/LocalizedLink";
import { useState } from "react";
import { Logo } from "@/components/Logo";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { ChevronDownIcon, CloseIcon, MenuIcon } from "@/components/icons";
import { cn } from "@/lib/cn";
import { homeFor, signOut, useAuth } from "@/lib/auth";

const nav = [{ label: "Find a Teacher", href: "/find-a-teacher" }];

const explore = [
  { title: "How it Works", href: "/how-it-works" },
  {
    title: "Live classroom demo",
    desc: "Send a question as a teacher and answer it as a student.",
    href: "/classroom",
  },
  {
    title: "Student & parent dashboard",
    desc: "Classes, homework, corrections and progress in one place.",
    href: "/dashboard",
  },
  {
    title: "About Karrini",
    desc: "Why we are starting with Sfax teachers and families.",
    href: "/about-us",
  },
  {
    title: "Contact",
    desc: "Questions about the project? Talk to us.",
    href: "/contact",
  },
];

export function Header() {
  const [open, setOpen] = useState(false);
  const { account } = useAuth();
  const [res, setRes] = useState(false);

  return (
    <header className="relative z-40 border-b border-gray-200 bg-white">
      <div className="flex h-[74px] items-stretch">
        <Link
          href="/"
          className="flex items-center px-4 md:border-e md:border-gray-200 md:px-8"
        >
          <Logo className="text-[30px] leading-none" />
        </Link>

        <Localized
          as="nav"
          aria-label="Main navigation"
          className="hidden flex-1 items-center gap-10 ps-12 xl:flex"
        >
          {nav.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className="text-base font-medium text-gray-500 hover:text-gray-900"
            >
              <T>{n.label}</T>
            </Link>
          ))}
          <div className="relative" onMouseLeave={() => setRes(false)}>
            <button
              type="button"
              onClick={() => setRes((v) => !v)}
              onMouseEnter={() => setRes(true)}
              className="group inline-flex items-center gap-2 text-base font-medium text-gray-500 hover:text-gray-900"
              aria-expanded={res}
            >
              <T>Resources</T>
              <ChevronDownIcon
                className={cn(
                  "h-5 w-5 text-gray-400 transition-transform duration-150 group-hover:text-gray-500",
                  res && "rotate-180",
                )}
              />
            </button>
            <div
              className={cn(
                "absolute left-1/2 top-full w-80 -translate-x-1/2 pt-3 transition duration-150 ease-out",
                res
                  ? "visible translate-y-0 opacity-100"
                  : "invisible translate-y-1 opacity-0",
              )}
            >
              <div className="overflow-hidden rounded-lg bg-white p-2 shadow-lg ring-1 ring-black/5">
                {explore.map((r) => (
                  <Link
                    key={r.title}
                    href={r.href}
                    onClick={() => setRes(false)}
                    className="block rounded-md p-3 hover:bg-gray-50"
                  >
                    <p className="text-base font-medium text-gray-900">
                      <T>{r.title}</T>
                    </p>
                  </Link>
                ))}
              </div>
            </div>
          </div>
          <Link
            href="/for-teachers"
            className="text-base font-medium text-gray-500 hover:text-gray-900"
          >
            <T>For Teachers</T>
          </Link>
        </Localized>

        <div className="ms-auto flex items-center px-2 sm:px-4">
          <LanguageSwitcher />
        </div>
        <div className="hidden items-center border-s border-gray-200 px-6 xl:flex">
          {account ? (
            <>
              <span className="flex flex-col items-end leading-tight">
                <bdi dir="auto" className="text-sm font-semibold text-gray-800">
                  {account.firstName}
                </bdi>
                <span className="text-xs text-gray-500">
                  <T>{account.role === "teacher" ? "Teacher" : account.role === "parent" ? "Parent" : "Student"}</T>
                </span>
              </span>
              <Link
                href={homeFor(account.role)}
                className="ms-5 inline-flex items-center justify-center whitespace-nowrap rounded-md border border-transparent bg-brand px-4 py-2 text-base font-medium text-white shadow-sm transition-colors duration-150 hover:bg-brand-dark"
              >
                <T>My workspace</T>
              </Link>
              <button
                type="button"
                onClick={signOut}
                className="ms-4 whitespace-nowrap text-sm font-medium text-gray-500 hover:text-gray-900"
              >
                <T>Sign out</T>
              </button>
            </>
          ) : (
            <>
              <Link
                href="/register"
                className="whitespace-nowrap text-base font-medium text-gray-500 hover:text-gray-900"
              >
                <T>Register</T>
              </Link>
              <Link
                href="/login"
                className="ms-8 inline-flex items-center justify-center whitespace-nowrap rounded-md border border-transparent bg-brand px-4 py-2 text-base font-medium text-white shadow-sm transition-colors duration-150 hover:bg-brand-dark"
              >
                <T>Sign In</T>
              </Link>
            </>
          )}
        </div>

        <div className="flex items-center pe-4 xl:hidden">
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-expanded={open}
            aria-controls="mobile-navigation"
            className="inline-flex items-center justify-center rounded-md bg-gray-100 p-2 text-gray-400 hover:text-gray-500"
          >
            <span className="sr-only">
              <T>Open menu</T>
            </span>
            <MenuIcon className="h-6 w-6" />
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      <div
        id="mobile-navigation"
        inert={!open}
        className={cn(
          "absolute inset-x-0 top-0 origin-top-right p-2 transition duration-150 xl:hidden",
          open
            ? "scale-100 opacity-100"
            : "pointer-events-none scale-95 opacity-0",
        )}
      >
        <div className="rounded-lg bg-white shadow-lg ring-1 ring-black/5">
          <div className="flex items-center justify-between px-5 pt-4">
            <Logo className="text-[28px] leading-none" />
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="inline-flex items-center justify-center rounded-md bg-white p-2 text-gray-400 hover:bg-gray-100"
            >
              <span className="sr-only">
                <T>Close menu</T>
              </span>
              <CloseIcon className="h-6 w-6" />
            </button>
          </div>
          <div className="grid gap-y-4 px-5 py-6">
            {[
              ...nav,
              { label: "For Teachers", href: "/for-teachers" },
              ...explore.map((e) => ({ label: e.title, href: e.href })),
            ].map((l) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className="text-base font-medium text-gray-900 hover:text-gray-700"
              >
                <T>{l.label}</T>
              </Link>
            ))}
            {account ? (
              <>
                <Link
                  href={homeFor(account.role)}
                  onClick={() => setOpen(false)}
                  className="mt-2 flex w-full items-center justify-center rounded-md bg-brand px-4 py-2 text-base font-medium text-white shadow-sm"
                >
                  <T>My workspace</T>
                </Link>
                <button
                  type="button"
                  onClick={() => {
                    signOut();
                    setOpen(false);
                  }}
                  className="text-center text-base font-medium text-gray-500"
                >
                  <T>Sign out</T>
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  onClick={() => setOpen(false)}
                  className="mt-2 flex w-full items-center justify-center rounded-md bg-brand px-4 py-2 text-base font-medium text-white shadow-sm"
                >
                  <T>Sign In</T>
                </Link>
                <p className="text-center text-base font-medium text-gray-500">
                  <T>New here?</T>{" "}
                  <Link
                    href="/register"
                    onClick={() => setOpen(false)}
                    className="text-brand"
                  >
                    <T>Register</T>
                  </Link>
                </p>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
