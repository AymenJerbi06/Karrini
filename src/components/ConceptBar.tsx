import { T } from "@/components/I18n";

import Link from "@/components/LocalizedLink";

// Thin notice reminding visitors this is a concept prototype (per the Karrini guide).
export function ConceptBar() {
  return (
    <div className="bg-gray-800 px-4 py-1.5 text-center text-xs text-gray-300">
      <T>
        Concept prototype · Teachers, prices and schedules shown are
        illustrative.
      </T>{" "}
      <Link
        href="/classroom"
        className="font-semibold text-white underline hover:text-brand"
      >
        <T>Try the live classroom demo →</T>
      </Link>
    </div>
  );
}
