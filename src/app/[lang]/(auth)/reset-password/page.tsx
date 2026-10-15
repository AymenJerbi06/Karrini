import { Suspense } from "react";
import { translate } from "@/lib/translations";
import { ResetPassword } from "@/components/auth/ResetPassword";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  return { title: translate("Choose a new password | Karrini", lang === "fr" ? "fr" : "ar") };
}
export default function Page() {
  return (
    <Suspense fallback={<div className="min-h-64" />}>
      <ResetPassword />
    </Suspense>
  );
}
