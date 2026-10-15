"use client";
import { useState } from "react";
import { T, Localized, useI18n } from "@/components/I18n";
import Link from "@/components/LocalizedLink";
import {
  formats,
  formatLabel,
  labelFor,
  levels,
  placesLeft,
  schedules,
  subjects,
  teachers,
} from "@/data/catalog";
import {
  fieldClass,
  panelClass,
  primaryButton,
  secondaryButton,
} from "@/components/SiteUi";
import { SearchIcon } from "@/components/icons";
import { Portrait } from "@/components/mockups/HomeVisuals";

export function TeacherDirectory({
  initialLevel = "all",
  initialSubject = "all",
}: {
  initialLevel?: string;
  initialSubject?: string;
}) {
  const { t: tr } = useI18n();
  const [level, setLevel] = useState(initialLevel);
  const [subject, setSubject] = useState(initialSubject);
  const [format, setFormat] = useState("any");
  const [schedule, setSchedule] = useState("any");
  const [available, setAvailable] = useState(false);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("recommended");
  const normalize = (value: string) =>
    value
      .normalize("NFD")
      .replace(/[\u0300-\u036f\u064b-\u065f]/g, "")
      .toLowerCase()
      .trim();
  const filtered = teachers
    .filter(
      (teacher) =>
        (level === "all" || teacher.levels.includes(level)) &&
        (subject === "all" || teacher.subject === subject) &&
        (format === "any" || teacher.format === format) &&
        (!available || placesLeft(teacher) > 0) &&
        (schedule === "any" ||
          teacher.timetable.some((s) =>
            schedule === "weekend" ? s.weekend : !s.weekend,
          )) &&
        normalize(
          [
            teacher.name,
            teacher.location,
            teacher.headline,
            labelFor(subjects, teacher.subject),
          ]
            .flatMap((value) => [value, tr(value)])
            .join(" "),
        ).includes(normalize(search)),
    )
    .sort((a, b) =>
      sort === "price"
        ? a.price - b.price
        : sort === "experience"
          ? b.years - a.years
          : 0,
    );
  const advancedCount =
    Number(format !== "any") + Number(schedule !== "any") + Number(available);
  const hasFilters =
    level !== "all" || subject !== "all" || advancedCount > 0 || search !== "";
  function reset() {
    setLevel("all");
    setSubject("all");
    setFormat("any");
    setSchedule("any");
    setAvailable(false);
    setSearch("");
    setSort("recommended");
  }
  return (
    <section className="mx-auto max-w-6xl px-6 pb-20 md:px-8">
      <Localized
        as="div"
        aria-label="Teacher filters"
        className="rounded-xl bg-gray-50 p-5 md:p-7"
      >
        <div className="grid gap-5 md:grid-cols-[1.2fr_1fr_1fr]">
          <label className="block text-sm font-semibold text-gray-700">
            <T>Search name or location</T>
            <span className="relative mt-2 block">
              <SearchIcon className="pointer-events-none absolute top-4 start-3 h-5 w-5 text-gray-400" />
              <Localized
                as="input"
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Teacher name or area in Sfax"
                className={`${fieldClass} mt-0 ps-10`}
              />
            </span>
          </label>
          <label className="text-sm font-semibold text-gray-700">
            <T>Subject</T>
            <select
              className={fieldClass}
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
            >
              {subjects.map((s) => (
                <option key={s.slug} value={s.slug}>
                  <T>{s.label}</T>
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm font-semibold text-gray-700">
            <T>School year</T>
            <select
              className={fieldClass}
              value={level}
              onChange={(e) => setLevel(e.target.value)}
            >
              {levels.map((s) => (
                <option key={s.slug} value={s.slug}>
                  <T>{s.label}</T>
                </option>
              ))}
            </select>
          </label>
        </div>
        <details className="mt-5 border-t border-gray-200 pt-2">
          <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 text-sm font-semibold text-brand [&::-webkit-details-marker]:hidden">
            <span aria-hidden="true">+</span>
            <T>More filters</T>
            {advancedCount > 0 && (
              <span className="rounded-full bg-brand px-2 text-xs text-white">
                {advancedCount}
              </span>
            )}
          </summary>
          <div className="grid items-end gap-5 pt-3 sm:grid-cols-3">
            <label className="text-sm font-semibold text-gray-700">
              <T>Class format</T>
              <select
                className={fieldClass}
                value={format}
                onChange={(e) => setFormat(e.target.value)}
              >
                {formats.map((s) => (
                  <option key={s.value} value={s.value}>
                    <T>{s.label}</T>
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm font-semibold text-gray-700">
              <T>Schedule</T>
              <select
                className={fieldClass}
                value={schedule}
                onChange={(e) => setSchedule(e.target.value)}
              >
                {schedules.map((s) => (
                  <option key={s.value} value={s.value}>
                    <T>{s.label}</T>
                  </option>
                ))}
              </select>
            </label>
            <label className="flex min-h-12 cursor-pointer items-center gap-3 text-sm text-gray-600">
              <input
                type="checkbox"
                checked={available}
                onChange={(e) => setAvailable(e.target.checked)}
                className="h-5 w-5 shrink-0"
              />
              <T>Only classes with places</T>
            </label>
          </div>
        </details>
      </Localized>
      {advancedCount > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {[
            {
              label:
                format !== "any"
                  ? formats.find((f) => f.value === format)!.label
                  : "",
              clear: () => setFormat("any"),
            },
            {
              label:
                schedule !== "any"
                  ? schedules.find((s) => s.value === schedule)!.label
                  : "",
              clear: () => setSchedule("any"),
            },
            {
              label: available ? "Only classes with places" : "",
              clear: () => setAvailable(false),
            },
          ]
            .filter((f) => f.label)
            .map((f) => (
              <Localized
                as="button"
                key={f.label}
                type="button"
                aria-label={`${tr("Remove filter")}: ${tr(f.label)}`}
                onClick={f.clear}
                className="inline-flex min-h-11 items-center gap-3 rounded-full border border-gray-200 bg-white px-4 text-sm text-gray-600"
              >
                <T>{f.label}</T>
                <span aria-hidden="true">×</span>
              </Localized>
            ))}
        </div>
      )}
      <div className="my-7 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-4">
          <p
            aria-live="polite"
            aria-atomic="true"
            className="text-sm font-semibold text-gray-800"
          >
            {tr(
              filtered.length === 1
                ? "directory.result.one"
                : "directory.result.other",
              { count: filtered.length },
            )}
          </p>
          {hasFilters && (
            <button
              type="button"
              onClick={reset}
              className="min-h-11 px-2 text-sm text-brand underline underline-offset-4"
            >
              <T>Clear all filters</T>
            </button>
          )}
        </div>
        <label className="flex items-center gap-3 text-sm text-gray-500">
          <T>Sort teachers</T>
          <select
            className="min-h-11 max-w-[210px] rounded-md border border-gray-200 bg-white px-3 text-sm text-gray-700"
            value={sort}
            onChange={(e) => setSort(e.target.value)}
          >
            <option value="recommended">
              <T>Default order</T>
            </option>
            <option value="price">
              <T>Lowest monthly price</T>
            </option>
            <option value="experience">
              <T>Most experience</T>
            </option>
          </select>
        </label>
      </div>
      <div className="space-y-6">
        {filtered.map((teacher) => (
          <article
            key={teacher.id}
            className="rounded-xl border border-gray-200 bg-white p-6 transition-shadow hover:shadow-sm md:p-8"
          >
            <div className="grid items-start gap-6 sm:grid-cols-[100px_1fr] lg:grid-cols-[112px_1fr_200px]">
              <div className="h-24 w-24 overflow-hidden rounded-lg lg:h-28 lg:w-28">
                <Portrait variant={teachers.indexOf(teacher)} />
              </div>
              <div className="min-w-0">
                <p className="text-sm text-brand">
                  <T>{labelFor(subjects, teacher.subject)}</T>
                  <span className="mx-2 text-gray-300">·</span>
                  <T>{teacher.location}</T>
                </p>
                <h2 className="font-display mt-2 text-xl font-bold text-gray-900 md:text-2xl">
                  <Link
                    href={`/teachers/${teacher.id}`}
                    className="hover:text-brand"
                  >
                    <T>{teacher.name}</T>
                  </Link>
                </h2>
                <p className="mt-3 max-w-xl text-sm leading-7 text-gray-500">
                  <T>{teacher.headline}</T>
                </p>
                <p className="mt-3 text-sm text-gray-600">
                  <T>
                    {teacher.levels.map((l) => labelFor(levels, l)).join(" · ")}
                  </T>
                </p>
                <p className="mt-2 text-xs text-gray-500">
                  <T>{formatLabel(teacher.format)}</T> · <T>{teacher.years}</T>{" "}
                  <T>years teaching</T>
                </p>
              </div>
              <div className="sm:col-start-2 lg:col-start-auto lg:text-end">
                <p className="font-display text-2xl font-bold text-gray-900">
                  <T>{teacher.price}</T> <T>DT</T>
                  <span className="text-sm font-normal text-gray-500">
                    {" "}
                    <T>/ month</T>
                  </span>
                </p>
                <p className="mt-2 text-xs text-gray-500">
                  <T>{teacher.lessonsPerMonth}</T> × <T>{teacher.duration}</T>{" "}
                  <T>min lessons</T>
                </p>
                {!placesLeft(teacher) && (
                  <p className="mt-3 text-sm text-gray-500">
                    <T>Class full</T>
                  </p>
                )}
                <Link
                  href={`/teachers/${teacher.id}`}
                  className={`${primaryButton} mt-5 w-full sm:w-auto lg:w-full`}
                >
                  <T>View class</T>
                </Link>
              </div>
            </div>
          </article>
        ))}
        {!filtered.length && (
          <div className={`${panelClass} py-14 text-center`}>
            <h2 className="font-display text-xl font-bold text-gray-900">
              <T>No classes match just yet</T>
            </h2>
            <p className="mt-3 text-gray-500">
              <T>Try a different school year, subject or schedule.</T>
            </p>
            <button
              type="button"
              className={`${secondaryButton} mt-6`}
              onClick={reset}
            >
              <T>Clear all filters</T>
            </button>
          </div>
        )}
      </div>
      <p className="mt-7 text-center text-xs text-gray-500">
        <T>Example profiles and prices · All times are local to Sfax.</T>
      </p>
    </section>
  );
}
