import { translate } from "@/lib/translations";
import { TeacherQuestions } from "@/components/workspace/TeacherQuestions";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  return { title: translate("Prepare your questions | Qarrini", lang === "fr" ? "fr" : "ar") };
}
export default function Page() {
  return <TeacherQuestions />;
}
