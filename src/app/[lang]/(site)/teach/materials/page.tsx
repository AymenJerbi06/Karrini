import { translate } from "@/lib/translations";
import { TeacherMaterials } from "@/components/workspace/TeacherMaterials";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  return { title: translate("Class materials | Qarrini", lang === "fr" ? "fr" : "ar") };
}
export default function Page() {
  return <TeacherMaterials />;
}
