"use client";
import { useState } from "react";
import { T, Localized, useI18n } from "@/components/I18n";
import Link from "@/components/LocalizedLink";
import { formats, formatLabel, labelFor, levels, subjects } from "@/data/catalog";
import { fieldClass, panelClass, primaryButton, secondaryButton } from "@/components/SiteUi";
import { SearchIcon } from "@/components/icons";
import { Portrait } from "@/components/mockups/HomeVisuals";
import { useDirectory } from "@/lib/classes";

/** Directory of every teacher's class (rejected teachers' classes are unpublished and unreadable). */
export function TeacherDirectory({
  initialLevel = "all",
  initialSubject = "all",
}: {
  initialLevel?: string;
  initialSubject?: string;
}) {
  const { t: tr } = useI18n();
  const { data: classes, loading } = useDirectory();
  const [level, setLevel] = useState(initialLevel);
  const [subject, setSubject] = useState(initialSubject);
  const [format, setFormat] = useState("any");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("recommended");
  const normalize = (value: string) =>
    value
      .normalize("NFD")
      .replace(/[̀-ًͯ-ٟ]/g, "")
      .toLowerCase()
      .trim();
  const filtered = classes
    .filter(
      (c) =>
        (level === "all" || c.levels.includes(level)) &&
        (subject === "all" || c.subject === subject) &&
        (format === "any" || c.methods.includes(format)) &&
        normalize(
          [c.teacherName, c.location, c.headline, labelFor(subjects, c.subject)].flatMap((value) => [value, tr(value)]).join(" "),
        ).includes(normalize(search)),
    )
    .sort((a, b) => (sort === "price" ? (a.price ?? 1e9) - (b.price ?? 1e9) : sort === "experience" ? b.years - a.years : 0));
  const advancedCount = Number(format !== "any");
  const hasFilters = level !== "all" || subject !== "all" || advancedCount > 0 || search !== "";
  function reset() {
    setLevel("all");
    setSubject("all");
    setFormat("any");
    setSearch("");
    setSort("recommended");
  }
  return (
    <section className="mx-auto max-w-6xl px-6 pb-20 md:px-8">
      <Localized as="div" aria-label="Teacher filters" className="rounded-xl bg-gray-50 p-5 md:p-7">
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
            <select className={fieldClass} value={subject} onChange={(e) => setSubject(e.target.value)}>
              {subjects.map((s) => (
                <option key={s.slug} value={s.slug}>
                  {tr(s.label)}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm font-semibold text-gray-700">
            <T>School year</T>
            <select className={fieldClass} value={level} onChange={(e) => setLevel(e.target.value)}>
              {levels.map((s) => (
                <option key={s.slug} value={s.slug}>
                  {tr(s.label)}
                </option>
              ))}
            </select>
          </label>
        </div>
        <details className="mt-5 border-t border-gray-200 pt-2">
          <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 text-sm font-semibold text-brand [&::-webkit-details-marker]:hidden">
            <span aria-hidden="true">+</span>
            <T>More filters</T>
            {advancedCount > 0 && <span className="rounded-full bg-brand px-2 text-xs text-white">{advancedCount}</span>}
          </summary>
          <div className="grid items-end gap-5 pt-3 sm:grid-cols-3">
            <label className="text-sm font-semibold text-gray-700">
              <T>Class format</T>
              <select className={fieldClass} value={format} onChange={(e) => setFormat(e.target.value)}>
                {formats.map((s) => (
                  <option key={s.value} value={s.value}>
                    {tr(s.label)}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </details>
      </Localized>
      {advancedCount > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          <Localized
            as="button"
            type="button"
            aria-label={`${tr("Remove filter")}: ${tr(formatLabel(format))}`}
            onClick={() => setFormat("any")}
            className="inline-flex min-h-11 items-center gap-3 rounded-full border border-gray-200 bg-white px-4 text-sm text-gray-600"
          >
            <T>{formatLabel(format)}</T>
            <span aria-hidden="true">×</span>
          </Localized>
        </div>
      )}
      <div className="my-7 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-4">
          <p aria-live="polite" aria-atomic="true" className="text-sm font-semibold text-gray-800">
            {tr(filtered.length === 1 ? "directory.result.one" : "directory.result.other", { count: filtered.length })}
          </p>
          {hasFilters && (
            <button type="button" onClick={reset} className="min-h-11 px-2 text-sm text-brand underline underline-offset-4">
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
            <option value="recommended">{tr("Default order")}</option>
            <option value="price">{tr("Lowest monthly price")}</option>
            <option value="experience">{tr("Most experience")}</option>
          </select>
        </label>
      </div>
      <div className="space-y-6">
        {loading && (
          <div className="h-40 animate-pulse rounded-xl bg-gray-100" aria-busy="true" />
        )}
        {filtered.map((c) => (
          <article key={c.id} className="rounded-xl border border-gray-200 bg-white p-6 transition-shadow hover:shadow-sm md:p-8">
            <div className="grid items-start gap-6 sm:grid-cols-[100px_1fr] lg:grid-cols-[112px_1fr_200px]">
              <div className="h-24 w-24 overflow-hidden rounded-lg lg:h-28 lg:w-28">
                <Portrait variant={c.portrait} />
              </div>
              <div className="min-w-0">
                <p className="text-sm text-brand">
                  <T>{labelFor(subjects, c.subject)}</T>
                  {c.location && (
                    <>
                      <span className="mx-2 text-gray-300">·</span>
                      <bdi dir="auto">{c.location}</bdi>
                    </>
                  )}
                </p>
                <h2 className="font-display mt-2 text-xl font-bold text-gray-900 md:text-2xl">
                  <Link href={`/teachers?id=${c.id}`} className="hover:text-brand">
                    <bdi dir="auto">{c.teacherName}</bdi>
                  </Link>
                </h2>
                {c.headline && (
                  <p dir="auto" className="mt-3 max-w-xl text-sm leading-7 text-gray-500">
                    {c.headline}
                  </p>
                )}
                <p className="mt-3 text-sm text-gray-600">{c.levels.map((l) => tr(labelFor(levels, l))).join(" · ")}</p>
                <p className="mt-2 text-xs text-gray-500">
                  {c.methods.map((m) => tr(formatLabel(m))).join(" · ")}
                  {c.years > 0 && <> · {tr("{n} years teaching", { n: c.years })}</>}
                </p>
              </div>
              <div className="sm:col-start-2 lg:col-start-auto lg:text-end">
                {c.price != null && (
                  <p className="font-display text-2xl font-bold text-gray-900">
                    <span dir="ltr">{c.price}</span> <T>DT</T>
                    <span className="text-sm font-normal text-gray-500">
                      {" "}
                      <T>/ month</T>
                    </span>
                  </p>
                )}
                {c.sessionsPerWeek && c.sessionMinutes && (
                  <p className="mt-2 text-xs text-gray-500">
                    {tr("{n} sessions a week · {m} min", { n: c.sessionsPerWeek, m: c.sessionMinutes })}
                  </p>
                )}
                <Link href={`/teachers?id=${c.id}`} className={`${primaryButton} mt-5 w-full sm:w-auto lg:w-full`}>
                  <T>View class</T>
                </Link>
              </div>
            </div>
          </article>
        ))}
        {!loading && !filtered.length && (
          <div className={`${panelClass} py-14 text-center`}>
            <h2 className="font-display text-xl font-bold text-gray-900">
              <T>{classes.length ? "No classes match just yet" : "Our first teachers are joining soon"}</T>
            </h2>
            <p className="mt-3 text-gray-500">
              <T>
                {classes.length
                  ? "Try a different school year, subject or schedule."
                  : "Teachers appear here as soon as they join Karrini. Check back soon, or ask your teacher for their class link."}
              </T>
            </p>
            {classes.length > 0 && (
              <button type="button" className={`${secondaryButton} mt-6`} onClick={reset}>
                <T>Clear all filters</T>
              </button>
            )}
          </div>
        )}
      </div>
      <p className="mt-7 text-center text-xs text-gray-500">
        <T>All times are local to Sfax.</T>
      </p>
    </section>
  );
}
