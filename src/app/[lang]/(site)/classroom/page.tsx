import { Suspense } from "react";
import { translate } from "@/lib/translations";
import { LiveClassroom } from "@/components/classroom/LiveClassroom";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  return { title: translate("Live classroom | Qarrini", lang === "fr" ? "fr" : "ar") };
}
export default function ClassroomPage() {
  return (
    <Suspense fallback={<div className="min-h-[70vh] bg-gray-50" />}>
      <LiveClassroom />
    </Suspense>
  );
}
