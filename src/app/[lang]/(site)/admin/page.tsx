import { translate } from "@/lib/translations";
import { AdminReview } from "@/components/workspace/AdminReview";

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  return { title: translate("Teacher applications | Karrini", lang === "fr" ? "fr" : "ar"), robots: { index: false } };
}

export default function AdminPage() {
  return <AdminReview />;
}
