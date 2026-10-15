"use client";
import { useState, type ReactNode } from "react";
import { T, Localized } from "@/components/I18n";
import Link from "@/components/LocalizedLink";
import { ChevronRightIcon } from "@/components/icons";
import {
  PeopleVisual,
  Portrait,
  PriceVisual,
  ProgressVisual,
  VideoVisual,
} from "@/components/mockups/HomeVisuals";
import { Blob, Cross } from "@/components/shapes";
import { labelFor, subjects, teachers } from "@/data/catalog";
import { cn } from "@/lib/cn";

function Row({
  title,
  body,
  visual,
  reverse,
}: {
  title: ReactNode;
  body: string;
  visual: ReactNode;
  reverse?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center gap-14 py-16 md:min-h-[480px] md:gap-20 md:py-20",
        reverse ? "md:flex-row-reverse" : "md:flex-row",
      )}
    >
      <div className="w-full md:w-[55%]">
        <h2 className="home-heading font-display text-[28px] leading-[1.3] font-extrabold tracking-[-0.025em] text-gray-900 lg:text-[34px]">
          <T>{title}</T>
        </h2>
        <p className="mt-6 max-w-xl text-base leading-8 text-gray-500 md:text-lg">
          <T>{body}</T>
        </p>
      </div>
      <div className="relative w-full md:w-[45%]">{visual}</div>
    </div>
  );
}

function TeacherStack() {
  const [index, setIndex] = useState(0);
  const list = teachers.slice(0, 4);
  const teacher = list[index];
  return (
    <div className="relative mx-auto max-w-[340px] px-3 pt-4 pb-2">
      <Cross className="absolute -top-4 -right-7 h-20 w-20" />
      <Blob color="#76a887" className="absolute bottom-16 -left-7 h-16 w-16" />
      <div className="absolute inset-x-3 top-7 bottom-16 rotate-[9deg] rounded-md border border-gray-200 bg-white shadow-sm" />
      <div className="absolute inset-x-3 top-7 bottom-16 -rotate-[7deg] rounded-md border border-gray-200 bg-white shadow-sm" />
      <Link
        href={`/teachers/${teacher.id}`}
        className="relative block min-h-[320px] rounded-md border border-gray-200 bg-white p-6 shadow-[0_14px_25px_-12px_rgba(16,47,41,0.3)] transition-transform hover:-translate-y-1"
      >
        <div className="mb-5 flex items-center justify-between gap-3">
          <div className="h-28 w-28 overflow-hidden rounded">
            <Portrait variant={index} />
          </div>
          <span className="rounded bg-gray-50 px-2 py-1 text-xs text-gray-500">
            <T>Example profile</T>
          </span>
        </div>
        <p className="font-display text-xl font-bold text-gray-900">
          <T>{teacher.name}</T>
        </p>
        <p className="mt-3 text-base text-gray-500">
          <T>{labelFor(subjects, teacher.subject)}</T>
        </p>
        <span className="mt-5 inline-block rounded border border-blue-200 bg-blue-50 px-3 py-1 text-sm text-brand">
          <T>Sfax · Secondary & Bac</T>
        </span>
      </Link>
      <div className="relative mt-7 flex items-center justify-center gap-4">
        <Localized
          as="button"
          type="button"
          aria-label="Previous teacher"
          onClick={() => setIndex((index + list.length - 1) % list.length)}
          className="rounded-full p-2 text-gray-500 hover:bg-gray-100"
        >
          <ChevronRightIcon className="h-4 w-4 rotate-180 rtl:rotate-0" />
        </Localized>
        <p className="text-sm text-gray-500" aria-live="polite">
          <T>Meet our example teachers</T>
        </p>
        <Localized
          as="button"
          type="button"
          aria-label="Next teacher"
          onClick={() => setIndex((index + 1) % list.length)}
          className="rounded-full p-2 text-gray-500 hover:bg-gray-100"
        >
          <ChevronRightIcon className="h-4 w-4 rtl:rotate-180" />
        </Localized>
      </div>
    </div>
  );
}

export function Features() {
  return (
    <section className="mx-auto max-w-7xl px-6 py-6 md:px-12 md:py-12">
      <Row
        title={
          <>
            <T>A place to find</T>{" "}
            <span className="text-brand">
              <T>your teacher.</T>
            </span>
          </>
        }
        body="Explore teachers by subject and school year. Choose the approach and timetable that suit you."
        visual={<TeacherStack />}
      />
      <Row
        reverse
        title="Build understanding. Grow in confidence."
        body="Answer questions during the lesson and get feedback from your teacher, while there is still time to ask."
        visual={<ProgressVisual />}
      />
      <Row
        title="A real lesson. Wherever you are."
        body="See your teacher, follow the board and work through exercises together, all inside Karrini."
        visual={<VideoVisual />}
      />
      <Row
        reverse
        title="Clear prices, from the start."
        body="See the monthly price, timetable and included lessons before choosing a class. Everything is in Tunisian dinars."
        visual={<PriceVisual />}
      />
      <Row
        title="A little help finding the right fit."
        body="Not sure where to start? Tell us what you need, and the Karrini team can help you find your way."
        visual={<PeopleVisual />}
      />
    </section>
  );
}
