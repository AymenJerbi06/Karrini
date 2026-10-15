import { Suspense } from "react";
import { translate } from "@/lib/translations";
import { JoinClass } from "@/components/workspace/JoinClass";

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  return { title: translate("Join a class | Qarrini", lang === "fr" ? "fr" : "ar") };
}

// The class id comes from ?class=…, read inside the Suspense boundary.
export default function JoinPage() {
  return (
    <Suspense fallback={<div className="min-h-[60vh] bg-gray-50" />}>
      <JoinClass />
    </Suspense>
  );
}
