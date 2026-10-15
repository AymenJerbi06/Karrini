import { T } from "@/components/I18n";

import { Logo } from "@/components/Logo";

// Original illustration of a live Karrini lesson: teacher video, broadcast question, live progress.
export function TeacherAvatar({
  skin = "#c98e66",
  hair = "#111827",
  shirt = "#374151",
}) {
  return (
    <svg viewBox="0 0 80 60" className="h-full w-full" aria-hidden>
      <rect width="80" height="60" fill="#e5e7eb" />
      <rect x="54" y="8" width="18" height="24" rx="1" fill="#d1d5db" />
      <path d="M18 60c2-14 10-20 22-20s20 6 22 20Z" fill={shirt} />
      <circle cx="40" cy="27" r="11" fill={skin} />
      <path
        d="M29 26c0-8 5-12 11-12s11 4 11 12c-3-4-7-5-11-5s-8 1-11 5Z"
        fill={hair}
      />
    </svg>
  );
}

export function LiveClassMockup() {
  return (
    <div className="overflow-hidden rounded-md bg-white shadow-[0_10px_30px_-5px_rgba(0,0,0,0.25)] ring-1 ring-black/5">
      <div className="flex items-center gap-3 border-b border-gray-100 px-3 py-2">
        <Logo className="text-[11px]" />
        <p className="text-[7px] font-semibold text-gray-700">
          <T>Classroom · Bac Mathematics</T>
        </p>
        <span className="ms-auto flex items-center gap-1 rounded bg-red-50 px-1.5 py-0.5 text-[6px] font-semibold text-red-600">
          <span className="h-1 w-1 rounded-full bg-red-600" />{" "}
          <T>LIVE · 40 learners</T>
        </span>
      </div>
      <div className="grid grid-cols-[1.1fr_1fr]">
        <div className="border-e border-gray-100 p-3">
          <div className="aspect-[4/3] overflow-hidden rounded">
            <TeacherAvatar />
          </div>
          <p className="mt-2 text-[7px] font-semibold text-gray-500 uppercase">
            <T>Professor broadcasts a question</T>
          </p>
          <p className="font-display mt-1 text-[15px] font-extrabold text-gray-900">
            x² − 5x + 6 = 0
          </p>
          <p className="mt-1 text-[7px] text-gray-500">
            <T>Every student can answer and show their working.</T>
          </p>
        </div>
        <div className="space-y-2 p-3">
          <p className="text-[7px] font-semibold text-gray-500 uppercase">
            <T>Teacher sees progress live</T>
          </p>
          <div className="flex items-end justify-between">
            <span className="font-display text-[22px] leading-none font-extrabold text-brand">
              80%
            </span>
            <span className="text-[7px] text-gray-500">
              <T>answered so far</T>
            </span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-gray-100">
            <div className="h-full w-4/5 rounded-full bg-brand" />
          </div>
          {[
            ["Correct", "21", "bg-emerald-500"],
            ["Incorrect", "8", "bg-red-500"],
            ["Needs review", "3", "bg-amber-400"],
            ["Still working", "8", "bg-gray-300"],
          ].map(([l, n, c]) => (
            <div
              key={l}
              className="flex items-center gap-1.5 text-[7px] text-gray-700"
            >
              <span className={`h-1.5 w-1.5 rounded-full ${c}`} />
              <T>{l}</T>
              <span className="ms-auto font-semibold text-gray-900">
                <T>{n}</T>
              </span>
            </div>
          ))}
          <div className="rounded border border-gray-100 bg-gray-50 p-1.5 text-[6px] text-gray-600">
            <span className="font-semibold text-gray-800">
              <T>Common mistake:</T>
            </span>{" "}
            <T>x = −2 and x = −3 (sign error)</T>
          </div>
        </div>
      </div>
    </div>
  );
}
