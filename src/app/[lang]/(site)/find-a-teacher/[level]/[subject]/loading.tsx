import { T } from "@/components/I18n";

export default function LoadingMatches() {
  return (
    <div
      className="mx-auto max-w-7xl px-4 py-14"
      role="status"
      aria-live="polite"
    >
      <p className="text-center text-sm font-semibold text-brand">
        <T>Finding your teacher matches…</T>
      </p>
      <div aria-hidden className="mt-10 grid gap-8 lg:grid-cols-[260px_1fr]">
        <div className="h-80 rounded-xl bg-gray-100" />
        <div className="space-y-5">
          <div className="h-48 rounded-xl bg-gray-100" />
          <div className="h-48 rounded-xl bg-gray-100" />
        </div>
      </div>
    </div>
  );
}
