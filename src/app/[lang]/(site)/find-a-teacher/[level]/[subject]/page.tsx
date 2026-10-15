import { T } from "@/components/I18n";
import { notFound } from "next/navigation";
import { TeacherDirectory } from "@/components/TeacherDirectory";
import { PageIntro } from "@/components/SiteUi";
import { labelFor, levels, subjects } from "@/data/catalog";

export function generateStaticParams() {
  return levels.flatMap((l) =>
    subjects.map((s) => ({ level: l.slug, subject: s.slug })),
  );
}
export default async function FilteredTeachersPage({
  params,
}: {
  params: Promise<{ level: string; subject: string }>;
}) {
  const { level, subject } = await params;
  if (
    !levels.some((l) => l.slug === level) ||
    !subjects.some((s) => s.slug === subject)
  )
    notFound();
  return (
    <>
      <PageIntro
        eyebrow={level === "all" ? "Teachers in Sfax" : labelFor(levels, level)}
        title={
          subject === "all"
            ? "Find your teacher"
            : `${labelFor(subjects, subject)} teachers`
        }
      >
        <T>Choose a subject and school year. Find a class that fits.</T>
      </PageIntro>
      <TeacherDirectory
        key={`${level}-${subject}`}
        initialLevel={level}
        initialSubject={subject}
      />
    </>
  );
}
