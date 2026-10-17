import { translate } from "@/lib/translations";

import { T } from "@/components/I18n";
import { PageIntro } from "@/components/SiteUi";
import { TeacherDirectory } from "@/components/TeacherDirectory";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  const base = { title: "Find a Teacher | Karrini" };
  return { ...base, title: translate(base.title, lang === "fr" ? "fr" : "ar") };
}
export default function TeachersPage() {
  return (
    <>
      <PageIntro eyebrow="Teachers in Sfax" title="Find your teacher">
        <T>Choose a subject and school year. Find a class that fits.</T>
      </PageIntro>
      <TeacherDirectory />
    </>
  );
}
