import { translate } from "@/lib/translations";
import { StudentDashboard } from "@/components/workspace/StudentDashboard";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  return { title: translate("Your Dashboard | Karrini", lang === "fr" ? "fr" : "ar") };
}
export default function DashboardPage() {
  return <StudentDashboard />;
}
