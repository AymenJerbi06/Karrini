import { T } from "@/components/I18n";
import Link from "@/components/LocalizedLink";
import { ChevronRightIcon } from "@/components/icons";
import { LessonPreview, Portrait } from "@/components/mockups/HomeVisuals";
import { Blob, Gear, Ring } from "@/components/shapes";

export function Hero() {
  return (
    <section className="bg-white">
      <div className="mx-auto max-w-7xl px-6 pt-10 pb-20 md:px-8 md:pt-12 md:pb-24">
        <div className="flex items-center justify-between gap-8">
          <div className="flex items-center gap-3">
            <div className="flex -space-x-3" dir="ltr" aria-hidden="true">
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className="h-10 w-10 overflow-hidden rounded-full ring-2 ring-white"
                >
                  <Portrait variant={i} />
                </span>
              ))}
            </div>
            <p className="text-sm text-gray-500">
              <T>Secondary & Bac. Starting in Sfax.</T>
            </p>
          </div>
          <Link
            href="/contact"
            className="hidden items-center gap-3 text-sm font-semibold text-brand hover:text-brand-dark md:inline-flex"
          >
            <T>Need help finding a teacher?</T>
            <ChevronRightIcon className="h-4 w-4 rtl:rotate-180" />
          </Link>
        </div>
        <div className="mt-9 grid items-center gap-16 lg:grid-cols-[1.3fr_1fr] lg:gap-20">
          <div>
            <h1 className="home-heading font-display text-[38px] leading-[1.25] font-extrabold tracking-[-0.035em] text-gray-900 sm:text-5xl lg:text-[56px]">
              <T>Online tutoring with</T>{" "}
              <span className="text-brand">
                <T>the right teacher for you.</T>
              </span>
            </h1>
            <p className="mt-7 max-w-2xl text-base leading-8 text-gray-600 md:text-lg">
              <T>
                Find your teacher, join a live class and get the support you
                need to understand and move forward.
              </T>
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-5">
              <Link
                href="/find-a-teacher"
                className="inline-flex min-h-14 items-center justify-center rounded bg-brand px-7 py-3 text-base font-medium text-white transition-colors hover:bg-brand-dark md:text-lg"
              >
                <T>Find a Teacher</T>
              </Link>
              <Link
                href="/contact"
                className="text-sm text-gray-500 underline underline-offset-4 hover:text-gray-900"
              >
                <T>Or, let us help you choose →</T>
              </Link>
            </div>
            <Link
              href="/classroom"
              className="mt-7 inline-flex items-center gap-2 text-sm text-gray-500 hover:text-brand"
            >
              <span aria-hidden="true" className="text-lg text-amber-500">
                ▷
              </span>
              <T>Take a look inside a lesson</T>
            </Link>
          </div>
          <div className="relative mx-auto w-full max-w-[480px] lg:mt-12">
            <Gear className="absolute -top-9 -left-5 h-20 w-20" />
            <Ring className="absolute -top-5 -right-7 h-24 w-24 rotate-12" />
            <div className="relative z-10">
              <LessonPreview />
            </div>
            <Blob className="absolute -bottom-9 right-14 z-20 h-20 w-20" />
          </div>
        </div>
      </div>
    </section>
  );
}
