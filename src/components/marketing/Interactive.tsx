"use client";

import { useEffect, useState, type ComponentType, type SVGProps } from "react";
import { T, useI18n } from "@/components/I18n";
import { CountUp, Reveal } from "@/components/ui/Motion";
import {
  BookIcon,
  ChatBubbleIcon,
  CheckCircleIcon,
  HandIcon,
  SearchIcon,
  TrendIcon,
  UploadIcon,
  UsersIcon,
  VideoIcon,
} from "@/components/icons";
import { cn } from "@/lib/cn";

type Icon = ComponentType<SVGProps<SVGSVGElement>>;

/* ---------------- Teacher: before / during / after class ---------------- */

const phases: { key: string; label: string; title: string; items: { Icon: Icon; title: string; body: string }[] }[] = [
  {
    key: "before",
    label: "Before class",
    title: "Prepare once, teach with confidence.",
    items: [
      { Icon: UploadIcon, title: "Upload your materials", body: "Notes, exercise sheets, homework and corrections, in PDF, Word or images." },
      { Icon: ChatBubbleIcon, title: "Write your questions", body: "Multiple choice, numbers and equations, short answers or handwritten working." },
      { Icon: UsersIcon, title: "Know your class", body: "See who is enrolled and who struggled in the last session." },
    ],
  },
  {
    key: "during",
    label: "During class",
    title: "Teach live and hear from every student.",
    items: [
      { Icon: VideoIcon, title: "Video built in", body: "Camera, microphone and screen sharing, without leaving Karrini." },
      { Icon: ChatBubbleIcon, title: "Ask at the right moment", body: "Send a prepared question in one click, or write a new one on the spot." },
      { Icon: TrendIcon, title: "See results instantly", body: "Right, wrong, percentages, and who made which mistake." },
    ],
  },
  {
    key: "after",
    label: "After class",
    title: "Follow up with the students who need it.",
    items: [
      { Icon: CheckCircleIcon, title: "Private feedback", body: "Mark written answers and send a personal explanation." },
      { Icon: BookIcon, title: "Everything is saved", body: "Each session's results stay available, with a CSV export." },
      { Icon: HandIcon, title: "Nobody is left behind", body: "A list of students to follow up, based on their answers." },
    ],
  },
];

export function TeacherJourney() {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  useEffect(() => {
    if (paused) return;
    const id = setInterval(() => setActive((a) => (a + 1) % phases.length), 6000);
    return () => clearInterval(id);
  }, [paused]);
  const phase = phases[active];
  return (
    <section className="bg-white px-6 py-16 md:py-20">
      <div className="mx-auto max-w-6xl">
        <Reveal>
          <h2 className="home-heading font-display text-3xl font-bold text-gray-900">
            <T>A lesson with Karrini, step by step.</T>
          </h2>
        </Reveal>
        <div className="mt-8 flex flex-wrap gap-2" role="group">
          {phases.map((p, i) => (
            <button
              key={p.key}
              type="button"
              aria-pressed={i === active}
              onClick={() => {
                setActive(i);
                setPaused(true);
              }}
              className={cn(
                "relative min-h-12 overflow-hidden rounded-full border px-5 text-sm font-semibold transition-colors",
                i === active ? "border-gray-800 bg-gray-800 text-white" : "border-gray-200 text-gray-600 hover:bg-gray-50",
              )}
            >
              <T>{p.label}</T>
              {i === active && !paused && (
                <span key={active} className="absolute inset-x-0 bottom-0 h-0.5 origin-left animate-[grow_6s_linear] bg-brand" aria-hidden />
              )}
            </button>
          ))}
        </div>
        <div key={phase.key} className="animate-rise mt-8">
          <p className="font-display text-xl font-bold text-gray-800">
            <T>{phase.title}</T>
          </p>
          <div className="mt-6 grid gap-5 md:grid-cols-3">
            {phase.items.map(({ Icon, title, body }, i) => (
              <article
                key={title}
                style={{ animationDelay: `${i * 90}ms` }}
                className="animate-rise rounded-xl border border-gray-200 bg-gray-50 p-6 transition-transform hover:-translate-y-1"
              >
                <Icon className="h-7 w-7 text-brand" />
                <h3 className="font-display mt-4 text-lg font-bold text-gray-900">
                  <T>{title}</T>
                </h3>
                <p className="mt-2 text-sm leading-6 text-gray-500">
                  <T>{body}</T>
                </p>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------------- Animated live-results preview ---------------- */

const previewWrong = [
  { name: "Amine K.", answer: "x = −2 ; x = −3" },
  { name: "Sarra M.", answer: "x = 1 ; x = 6" },
  { name: "Omar F.", answer: "x = −2 ; x = −3" },
];

/** Self-playing illustration of the teacher's results panel (example data). */
export function LiveResultsPreview() {
  const { t } = useI18n();
  const [step, setStep] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setStep((s) => (s + 1) % 7), 1400);
    return () => clearInterval(id);
  }, []);
  const answered = [4, 11, 18, 24, 29, 32, 32][step];
  const wrong = [1, 2, 4, 5, 7, 8, 8][step];
  const right = answered - wrong;
  const shown = previewWrong.slice(0, Math.min(3, Math.ceil(wrong / 3)));
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm" aria-label={t("Example of live results")}>
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold tracking-wide text-gray-500 uppercase">
          <T>Live results · example</T>
        </p>
        <span className="animate-live h-2.5 w-2.5 rounded-full bg-red-500" aria-hidden />
      </div>
      <p className="font-display mt-3 text-lg font-bold text-gray-900" dir="ltr">
        x² − 5x + 6 = 0
      </p>
      <div className="mt-4 grid grid-cols-3 gap-2 text-center">
        <div className="rounded-lg bg-emerald-50 p-3">
          <p className="font-display text-2xl font-extrabold text-emerald-700">
            <CountUp value={right} />
          </p>
          <p className="text-[11px] text-emerald-800">
            <T>Right</T>
          </p>
        </div>
        <div className="rounded-lg bg-red-50 p-3">
          <p className="font-display text-2xl font-extrabold text-red-700">
            <CountUp value={wrong} />
          </p>
          <p className="text-[11px] text-red-800">
            <T>Wrong</T>
          </p>
        </div>
        <div className="rounded-lg bg-gray-50 p-3">
          <p className="font-display text-2xl font-extrabold text-gray-900">
            <CountUp value={answered ? Math.round((right / answered) * 100) : 0} suffix="%" />
          </p>
          <p className="text-[11px] text-gray-500">
            <T>Correct</T>
          </p>
        </div>
      </div>
      <div className="mt-4 flex h-2.5 overflow-hidden rounded-full bg-gray-100">
        <div className="bg-emerald-500 transition-all duration-700" style={{ width: `${(right / 40) * 100}%` }} />
        <div className="bg-red-500 transition-all duration-700" style={{ width: `${(wrong / 40) * 100}%` }} />
      </div>
      <p className="mt-2 text-xs text-gray-500">{t("{n} of 40 students answered", { n: answered })}</p>
      <div className="mt-4 rounded-xl border border-red-100">
        <p className="border-b border-red-100 bg-red-50/60 px-4 py-2 text-sm font-semibold text-red-900">
          <T>Got it wrong</T>
        </p>
        <ul className="divide-y divide-gray-100">
          {shown.map((w) => (
            <li key={w.name} className="animate-rise flex justify-between gap-3 px-4 py-2 text-sm">
              <span className="font-semibold text-gray-800">{w.name}</span>
              <span className="font-mono text-red-700" dir="ltr">
                {w.answer}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

/* ---------------- How it works: student / teacher journey ---------------- */

const journeys = {
  student: [
    { Icon: SearchIcon, title: "Browse teachers", body: "Choose your school year and subject, then compare teachers, timetables and class offers." },
    { Icon: BookIcon, title: "Choose a class", body: "See what the monthly subscription includes: live lessons, length, materials and practice." },
    { Icon: CheckCircleIcon, title: "Sign up with your phone", body: "Create your account with your phone number or email. A parent can follow along." },
    { Icon: UsersIcon, title: "Open your dashboard", body: "Your classes, next live lesson, materials and homework, all in one place." },
    { Icon: VideoIcon, title: "Join and take part", body: "Watch your teacher, answer questions privately and get feedback during the lesson." },
    { Icon: TrendIcon, title: "Review and progress", body: "Revisit notes, corrections and your answers after every lesson." },
  ],
  teacher: [
    { Icon: CheckCircleIcon, title: "Join as a verified teacher", body: "Share your experience and subjects. Karrini reviews your profile before promoting it." },
    { Icon: BookIcon, title: "Create your class offer", body: "Set the level, subject, timetable and monthly price, and describe your approach." },
    { Icon: UploadIcon, title: "Prepare your lesson", body: "Upload materials and write the questions you want to ask during class." },
    { Icon: VideoIcon, title: "Teach from inside Karrini", body: "Start the video lesson, share your screen and publish questions when you need them." },
    { Icon: TrendIcon, title: "Review results and follow up", body: "See who answered, who got it wrong and why, then send feedback and homework." },
  ],
} as const;

export function JourneyToggle() {
  const [who, setWho] = useState<"student" | "teacher">("student");
  const steps = journeys[who];
  return (
    <section className="bg-gray-50 px-6 py-16 md:py-20">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <Reveal>
            <h2 className="home-heading font-display text-3xl font-bold text-gray-900">
              <T>Your journey on Karrini</T>
            </h2>
            <p className="mt-3 max-w-xl leading-7 text-gray-500">
              <T>Choose your side to see each step.</T>
            </p>
          </Reveal>
          <div className="grid grid-cols-2 gap-1 rounded-xl bg-white p-1.5 shadow-sm ring-1 ring-gray-200" role="group">
            {(
              [
                ["student", "I'm a student"],
                ["teacher", "I'm a teacher"],
              ] as const
            ).map(([k, label]) => (
              <button
                key={k}
                type="button"
                aria-pressed={who === k}
                onClick={() => setWho(k)}
                className={cn(
                  "min-h-11 rounded-lg px-5 text-sm font-semibold transition-all duration-200",
                  who === k ? "bg-gray-800 text-white shadow" : "text-gray-500 hover:text-gray-800",
                )}
              >
                <T>{label}</T>
              </button>
            ))}
          </div>
        </div>
        <ol key={who} className="relative mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {steps.map(({ Icon, title, body }, i) => (
            <li
              key={title}
              style={{ animationDelay: `${i * 80}ms` }}
              className="animate-rise group rounded-xl border border-gray-200 bg-white p-6 shadow-sm transition-all hover:-translate-y-1 hover:shadow-md"
            >
              <div className="flex items-center gap-3">
                <span className="font-display flex h-9 w-9 items-center justify-center rounded-full bg-emerald-50 text-sm font-bold text-brand transition-colors group-hover:bg-brand group-hover:text-white" dir="ltr">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <Icon className="h-6 w-6 text-gray-400 transition-colors group-hover:text-brand" />
              </div>
              <h3 className="font-display mt-4 text-lg font-bold text-gray-900">
                <T>{title}</T>
              </h3>
              <p className="mt-2 text-sm leading-6 text-gray-500">
                <T>{body}</T>
              </p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

/* ---------------- Simple disclosure list (FAQ) ---------------- */

export function DisclosureList({ title, items }: { title: string; items: [string, string][] }) {
  return (
    <section className="mx-auto max-w-3xl px-6 py-16 md:py-20">
      <h2 className="home-heading font-display text-center text-3xl font-bold text-gray-900">
        <T>{title}</T>
      </h2>
      <div className="mt-10 divide-y divide-gray-200 border-y border-gray-200">
        {items.map(([q, a]) => (
          <details key={q} className="group py-2">
            <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-6 font-semibold text-gray-900">
              <T>{q}</T>
              <span className="text-2xl font-light text-gray-400 transition-transform duration-200 group-open:rotate-45" aria-hidden>
                +
              </span>
            </summary>
            <p className="pb-4 leading-7 text-gray-600">
              <T>{a}</T>
            </p>
          </details>
        ))}
      </div>
    </section>
  );
}
