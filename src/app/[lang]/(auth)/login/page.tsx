import { Suspense } from "react";
import { translate } from "@/lib/translations";
import { SignIn } from "@/components/auth/SignIn";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  return { title: translate("Sign in | Qarrini", lang === "fr" ? "fr" : "ar") };
}
export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-96" />}>
      <SignIn />
    </Suspense>
  );
}
