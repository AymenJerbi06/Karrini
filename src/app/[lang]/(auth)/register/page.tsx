import { Suspense } from "react";
import { translate } from "@/lib/translations";
import { SignUp } from "@/components/auth/SignUp";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  return { title: translate("Create your account | Karrini", lang === "fr" ? "fr" : "ar") };
}
export default function RegisterPage() {
  return (
    <Suspense fallback={<div className="min-h-96" />}>
      <SignUp />
    </Suspense>
  );
}
