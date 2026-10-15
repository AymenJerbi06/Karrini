import { Suspense } from "react";
import { translate } from "@/lib/translations";
import { AuthCallback } from "@/components/auth/AuthCallback";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  return { title: translate("Confirming your account | Qarrini", lang === "fr" ? "fr" : "ar") };
}
export default function Page() {
  return (
    <Suspense fallback={<div className="min-h-64" />}>
      <AuthCallback />
    </Suspense>
  );
}
