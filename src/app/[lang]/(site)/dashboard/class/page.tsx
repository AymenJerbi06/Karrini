import { Suspense } from "react";
import { translate } from "@/lib/translations";
import { StudentClass } from "@/components/workspace/StudentClass";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  return { title: translate("My class | Karrini", lang === "fr" ? "fr" : "ar") };
}
export default function Page() {
  return (
    <Suspense fallback={<div className="min-h-[70vh] bg-gray-50" />}>
      <StudentClass />
    </Suspense>
  );
}
