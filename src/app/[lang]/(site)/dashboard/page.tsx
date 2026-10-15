import { translate } from "@/lib/translations";
import { DemoDashboard } from "@/components/DemoDashboard";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  const base = { title: "Your Dashboard | Qarrini" };
  return { ...base, title: translate(base.title, lang === "fr" ? "fr" : "ar") };
}
export default function DashboardPage() {
  return <DemoDashboard />;
}
