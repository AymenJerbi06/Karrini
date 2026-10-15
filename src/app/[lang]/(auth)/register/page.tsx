import { translate } from "@/lib/translations";

import { T } from "@/components/I18n";

import { Suspense } from "react";
import { DemoEnrollment } from "@/components/DemoEnrollment";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  const base = { title: "Try Enrollment | Qarrini" };
  return { ...base, title: translate(base.title, lang === "fr" ? "fr" : "ar") };
}
export default function RegisterPage() {
  return (
    <Suspense
      fallback={
        <p className="text-gray-500">
          <T>Loading class offers…</T>
        </p>
      }
    >
      <DemoEnrollment />
    </Suspense>
  );
}
