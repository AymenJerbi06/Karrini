"use client";
import { useState } from "react";
import { T } from "@/components/I18n";
import {
  ChatBubbleIcon,
  RewindIcon,
  SearchIcon,
  VideoIcon,
} from "@/components/icons";
import { Laptop } from "@/components/mockups/Laptop";
import { LessonPreview, Portrait } from "@/components/mockups/HomeVisuals";
import { Logo } from "@/components/Logo";
import { cn } from "@/lib/cn";

const steps = [
  {
    title: "1. Find your teacher",
    body: "Browse by subject, school year and timetable.",
    Icon: SearchIcon,
  },
  {
    title: "2. Choose your class",
    body: "Compare the monthly offer and pick the class that suits you.",
    Icon: ChatBubbleIcon,
  },
  {
    title: "3. Learn together, live",
    body: "Join your teacher, practise and ask questions inside Qarrini.",
    Icon: VideoIcon,
  },
  {
    title: "4. Keep learning after class",
    body: "Find your lesson notes, homework and corrections in one place.",
    Icon: RewindIcon,
  },
];

function JourneyScreen({ active }: { active: number }) {
  if (active === 2)
    return (
      <div className="absolute inset-0 flex items-center bg-gray-50 p-2">
        <div className="w-full">
          <LessonPreview />
        </div>
      </div>
    );
  return (
    <div className="absolute inset-0 bg-white p-[6%]" aria-hidden="true">
      <div className="flex items-center justify-between border-b border-gray-100 pb-3">
        <Logo className="text-[12px] text-brand!" />
        <span className="text-[8px] text-gray-500">
          <T>Secondary & Bac</T>
        </span>
      </div>
      <p className="font-display mt-5 text-[clamp(12px,1.4vw,20px)] font-bold text-gray-900">
        <T>
          {active === 0
            ? "Find your teacher"
            : active === 1
              ? "Your next class"
              : "Your lesson notes"}
        </T>
      </p>
      {active === 0 ? (
        <div className="mt-4 grid grid-cols-3 gap-3">
          {["Mathematics", "Physics–Chemistry", "French"].map((subject, i) => (
            <div
              key={subject}
              className="overflow-hidden rounded border border-gray-200"
            >
              <div className="aspect-[1.3] overflow-hidden">
                <Portrait variant={i} />
              </div>
              <p className="px-2 py-3 text-[9px] font-semibold text-gray-700">
                <T>{subject}</T>
              </p>
            </div>
          ))}
        </div>
      ) : active === 1 ? (
        <div className="mt-4 flex items-center gap-4 rounded border border-gray-200 p-4">
          <div className="h-20 w-20 shrink-0 overflow-hidden rounded">
            <Portrait />
          </div>
          <div className="space-y-3 text-[10px] text-gray-500">
            <p className="text-[13px] font-bold text-gray-900">
              <T>Bac Mathematics</T>
            </p>
            <p>
              <T>Tue & Thu · 18:00</T>
            </p>
            <span className="inline-block rounded bg-blue-50 px-2 py-1 text-brand">
              <T>Monthly class</T>
            </span>
          </div>
        </div>
      ) : (
        <div className="mt-4 rounded border border-gray-200 bg-gray-50 p-5 text-[11px] text-gray-600">
          <p className="font-semibold text-brand">
            <T>Lesson notes & exercises</T>
          </p>
          <div className="mt-4 space-y-3" dir="ltr">
            <p>x² − 5x + 6 = 0</p>
            <p>(x − 2)(x − 3) = 0</p>
            <p className="text-brand">x = 2, x = 3 ✓</p>
          </div>
        </div>
      )}
    </div>
  );
}

export function HowItWorks({ showIntro = true }: { showIntro?: boolean }) {
  const [active, setActive] = useState(0);
  return (
    <section id="how" className="bg-gray-800 py-16 md:py-20">
      <div className="mx-auto max-w-7xl px-6 md:px-12">
        {showIntro && (
          <>
            <h2 className="home-heading font-display text-4xl font-extrabold tracking-[-0.03em] text-white md:text-5xl">
              <T>How does it work?</T>
            </h2>
            <p className="mt-6 max-w-3xl text-base leading-8 text-gray-300 md:text-lg">
              <T>
                Find a teacher, choose your class and make room for learning.
              </T>
            </p>
          </>
        )}
        <div
          className={cn(
            "grid items-center gap-14 lg:grid-cols-2 lg:gap-20",
            showIntro && "mt-12 lg:mt-16",
          )}
        >
          <div className="order-2 lg:order-1">
            <Laptop>
              <JourneyScreen active={active} />
            </Laptop>
          </div>
          <div className="order-1 space-y-3 lg:order-2">
            {steps.map(({ title, body, Icon }, i) => (
              <button
                key={title}
                type="button"
                aria-pressed={i === active}
                onClick={() => setActive(i)}
                className={cn(
                  "flex w-full gap-6 rounded-2xl px-5 py-6 text-start transition-colors md:p-7",
                  i === active ? "bg-gray-700" : "hover:bg-gray-700/40",
                )}
              >
                <Icon className="mt-1 h-7 w-7 shrink-0 text-white" />
                <div>
                  <h3 className="font-display text-lg font-bold text-white">
                    <T>{title}</T>
                  </h3>
                  <p className="mt-3 text-sm leading-7 text-gray-300">
                    <T>{body}</T>
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
