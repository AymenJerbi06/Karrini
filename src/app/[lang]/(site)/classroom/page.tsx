import { translate } from "@/lib/translations";
import { ClassroomDemo } from "@/components/ClassroomDemo";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  const base = { title: "Interactive Classroom Demo | Qarrini" };
  return { ...base, title: translate(base.title, lang === "fr" ? "fr" : "ar") };
}
export default function ClassroomPage() {
  return <ClassroomDemo />;
}
