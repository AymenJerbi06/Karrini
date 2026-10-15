import { T } from "@/components/I18n";

import Link from "@/components/LocalizedLink";
import { subjects } from "@/data/catalog";

export function Subjects() {
  return (
    <section className="bg-gray-800 px-6 py-12 text-center">
      <h2 className="font-display text-base font-bold text-white">
        <T>Find support in your subject</T>
      </h2>
      <div className="mx-auto mt-7 flex max-w-5xl flex-wrap justify-center gap-3">
        {subjects.map((s) => (
          <Link
            key={s.slug}
            href={`/find-a-teacher/all/${s.slug}`}
            className="rounded bg-gray-700 px-5 py-3 text-sm font-medium text-white transition-colors hover:bg-gray-600"
          >
            <T>{s.label}</T>
          </Link>
        ))}
      </div>
    </section>
  );
}
