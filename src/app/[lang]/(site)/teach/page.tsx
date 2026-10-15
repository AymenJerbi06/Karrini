import { translate } from "@/lib/translations";
import { TeacherOverview } from "@/components/workspace/TeacherOverview";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  return { title: translate("Teacher workspace | Qarrini", lang === "fr" ? "fr" : "ar") };
}
export default function Page() {
  return <TeacherOverview />;
}
