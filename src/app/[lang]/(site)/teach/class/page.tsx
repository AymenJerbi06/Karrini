import { Suspense } from "react";
import { translate } from "@/lib/translations";
import { TeacherClass } from "@/components/workspace/TeacherClass";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  return { title: translate("Manage class | Karrini", lang === "fr" ? "fr" : "ar") };
}
export default function Page() {
  return (
    <Suspense fallback={<div className="min-h-[70vh] bg-gray-50" />}>
      <TeacherClass />
    </Suspense>
  );
}
