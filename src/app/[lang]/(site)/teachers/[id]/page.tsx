import { T } from "@/components/I18n";
import Link from "@/components/LocalizedLink";
import { notFound } from "next/navigation";
import { CheckIcon, ChevronRightIcon } from "@/components/icons";
import { Portrait } from "@/components/mockups/HomeVisuals";
import { primaryButton } from "@/components/SiteUi";
import {
  formatLabel,
  labelFor,
  levels,
  placesLeft,
  subjects,
  teachers,
} from "@/data/catalog";

export function generateStaticParams() {
  return teachers.map((teacher) => ({ id: teacher.id }));
}
export default async function TeacherPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const teacher = teachers.find((teacher) => teacher.id === id);
  if (!teacher) notFound();
  return (
    <div className="mx-auto max-w-6xl px-6 py-10 md:px-8 md:py-14">
      <Link
        href="/find-a-teacher"
        className="inline-flex min-h-11 items-center gap-2 text-sm text-gray-500 hover:text-brand"
      >
        <ChevronRightIcon className="h-4 w-4 rotate-180 rtl:rotate-0" />
        <T>All teachers</T>
      </Link>
      <header className="mt-5 flex flex-col gap-6 border-b border-gray-200 pb-9 sm:flex-row sm:items-center">
        <div className="h-28 w-28 shrink-0 overflow-hidden rounded-xl">
          <Portrait variant={teachers.indexOf(teacher)} />
        </div>
        <div>
          <p className="text-sm font-medium text-brand">
            <T>{labelFor(subjects, teacher.subject)}</T> ·{" "}
            <T>{teacher.location}</T>
          </p>
          <h1 className="home-heading font-display mt-2 text-3xl font-extrabold text-gray-900 md:text-4xl">
            <T>{teacher.name}</T>
          </h1>
          <p className="mt-3 text-sm text-gray-500">
            <T>{teacher.years}</T> <T>years teaching</T> ·{" "}
            <T>Example profile</T>
          </p>
        </div>
      </header>
      <div className="mt-9 grid items-start gap-12 lg:grid-cols-[1fr_340px]">
        <div className="order-2 min-w-0 space-y-10 lg:order-1">
          <section>
            <h2 className="font-display text-2xl font-bold leading-9 text-gray-900">
              <T>{teacher.headline}</T>
            </h2>
            <dl className="mt-6 grid gap-x-8 gap-y-5 sm:grid-cols-2">
              {[
                [
                  "School years",
                  teacher.levels.map((l) => labelFor(levels, l)).join(" · "),
                ],
                ["Class format", formatLabel(teacher.format)],
              ].map(([label, value]) => (
                <div key={label}>
                  <dt className="text-sm text-gray-500">
                    <T>{label}</T>
                  </dt>
                  <dd className="mt-2 font-medium text-gray-800">
                    <T>{value}</T>
                  </dd>
                </div>
              ))}
            </dl>
          </section>
          <section className="border-t border-gray-200 pt-9">
            <h2 className="font-display text-xl font-bold text-gray-900">
              <T>Weekly timetable</T>
            </h2>
            <p className="mt-2 text-sm text-gray-500">
              <T>All times are local to Sfax, Tunisia.</T>
            </p>
            <div className="mt-5 divide-y divide-gray-200 rounded-lg bg-gray-50 px-5">
              {teacher.timetable.map((slot) => (
                <div
                  key={slot.day}
                  className="flex flex-wrap justify-between gap-4 py-5"
                >
                  <span className="font-semibold text-gray-800">
                    <T>{slot.day}</T>
                  </span>
                  <bdi className="text-gray-600" dir="ltr">
                    {slot.time}
                  </bdi>
                </div>
              ))}
            </div>
          </section>
          <section className="divide-y divide-gray-200 border-y border-gray-200">
            <details className="group py-6">
              <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-4 font-display text-xl font-bold text-gray-900 [&::-webkit-details-marker]:hidden">
                <T>About the teacher</T>
                <span
                  aria-hidden="true"
                  className="text-2xl font-normal text-brand group-open:rotate-45"
                >
                  +
                </span>
              </summary>
              <p className="mt-4 leading-8 text-gray-500">
                <T>{teacher.bio}</T>
              </p>
            </details>
            <details className="group py-6">
              <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-4 font-display text-xl font-bold text-gray-900 [&::-webkit-details-marker]:hidden">
                <T>How I teach</T>
                <span
                  aria-hidden="true"
                  className="text-2xl font-normal text-brand group-open:rotate-45"
                >
                  +
                </span>
              </summary>
              <ul className="mt-5 space-y-4">
                {teacher.approach.map((item) => (
                  <li key={item} className="flex gap-3 leading-7 text-gray-500">
                    <CheckIcon className="mt-1 h-5 w-5 shrink-0 text-brand" />
                    <T>{item}</T>
                  </li>
                ))}
              </ul>
            </details>
          </section>
          <Link
            href="/classroom"
            className="inline-flex min-h-11 items-center text-sm font-semibold text-brand underline underline-offset-4"
          >
            <T>Take a look inside a lesson</T>
          </Link>
        </div>
        <aside className="order-1 rounded-xl border border-gray-200 bg-white p-6 shadow-sm lg:sticky lg:top-6 lg:order-2 lg:p-7">
          <h2 className="text-sm font-medium text-gray-500">
            <T>Monthly class offer</T>
          </h2>
          <p className="font-display mt-3 text-4xl font-extrabold text-gray-900">
            <T>{teacher.price}</T> <T>DT</T>
            <span className="text-base font-normal text-gray-500">
              {" "}
              <T>/ month</T>
            </span>
          </p>
          <p className="mt-3 text-sm text-gray-500">
            <T>{teacher.lessonsPerMonth}</T> × <T>{teacher.duration}</T>{" "}
            <T>min lessons</T>
          </p>
          <ul className="my-7 space-y-4">
            {teacher.includes.map((item) => (
              <li
                key={item}
                className="flex gap-3 text-sm leading-6 text-gray-600"
              >
                <CheckIcon className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
                <T>{item}</T>
              </li>
            ))}
          </ul>
          {placesLeft(teacher) > 0 ? (
            <Link
              href={`/register?teacher=${teacher.id}`}
              className={`${primaryButton} w-full`}
            >
              <T>Try demo enrollment</T>
            </Link>
          ) : (
            <p className="rounded-md bg-gray-50 p-4 text-center text-sm text-gray-600">
              <T>This example class is full</T>
            </p>
          )}
          <p className="mt-4 text-center text-xs leading-6 text-gray-500">
            <T>Example offer · No payment is taken.</T>
          </p>
          <Link
            href="/find-a-teacher"
            className="mt-4 flex min-h-11 items-center justify-center text-sm text-brand underline underline-offset-4"
          >
            <T>Compare other classes</T>
          </Link>
        </aside>
      </div>
    </div>
  );
}
