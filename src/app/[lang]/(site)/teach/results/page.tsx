import { translate } from "@/lib/translations";
import { TeacherResults } from "@/components/workspace/TeacherResults";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  return { title: translate("Results | Karrini", lang === "fr" ? "fr" : "ar") };
}
export default function Page() {
  return <TeacherResults />;
}
