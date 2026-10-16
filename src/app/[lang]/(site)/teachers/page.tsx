import { Suspense } from "react";
import { translate } from "@/lib/translations";
import { TeacherProfile } from "@/components/TeacherProfile";

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  return { title: translate("Teacher | Karrini", lang === "fr" ? "fr" : "ar") };
}

// The class id comes from ?id=…, read inside the Suspense boundary.
export default function TeacherPage() {
  return (
    <Suspense fallback={<div className="min-h-[60vh]" />}>
      <TeacherProfile />
    </Suspense>
  );
}
