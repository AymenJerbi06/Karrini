import { T } from "@/components/I18n";

export default function LoadingTeacher() {
  return (
    <div
      className="mx-auto max-w-6xl px-4 py-14"
      role="status"
      aria-live="polite"
    >
      <p className="text-sm font-semibold text-brand">
        <T>Loading teacher profile…</T>
      </p>
      <div aria-hidden className="mt-8 grid gap-8 lg:grid-cols-[1fr_340px]">
        <div className="h-80 rounded-xl bg-gray-100" />
        <div className="h-96 rounded-xl border border-gray-200 bg-gray-50" />
      </div>
    </div>
  );
}
