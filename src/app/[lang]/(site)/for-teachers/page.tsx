import { translate } from "@/lib/translations";
import { T } from "@/components/I18n";
import Link from "@/components/LocalizedLink";
import { PageIntro, primaryButton } from "@/components/SiteUi";
import { LessonPreview } from "@/components/mockups/HomeVisuals";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  return {
    title: translate("Teach on Qarrini | Qarrini", lang === "fr" ? "fr" : "ar"),
  };
}
export default function TeachersInfoPage() {
  return (
    <>
      <PageIntro
        eyebrow="For Sfax teachers"
        title="Your teaching. A little more connected."
      >
        <T>Your classes, your students and the tools to hear from everyone.</T>
      </PageIntro>
      <section className="mx-auto grid max-w-6xl items-center gap-14 px-6 pb-20 pt-4 md:grid-cols-2 md:gap-20">
        <div>
          <h2 className="home-heading font-display text-3xl font-bold text-gray-900">
            <T>Keep the way you teach.</T>
          </h2>
          <p className="mt-5 text-lg leading-8 text-gray-500">
            <T>
              Explain a concept, ask a question and see who needs help. Private
              answers give quieter students room to participate.
            </T>
          </p>
          <Link href="/classroom" className={`${primaryButton} mt-8`}>
            <T>Try the teacher view</T>
          </Link>
          <p className="mt-4 text-xs text-gray-500">
            <T>Interactive preview · No sign-up needed.</T>
          </p>
        </div>
        <div className="p-3">
          <LessonPreview />
        </div>
      </section>
      <section className="bg-gray-50 px-6 py-16 md:py-20">
        <div className="mx-auto grid max-w-6xl gap-10 md:grid-cols-3">
          {[
            ["Your profile", "Share your subjects, experience and approach."],
            [
              "Your classes",
              "Set a timetable, a monthly offer and the materials included.",
            ],
            [
              "Your students",
              "Review answers, explain mistakes and share the next exercise.",
            ],
          ].map(([title, body], i) => (
            <article key={title}>
              <span className="font-display text-sm font-bold text-brand">
                0{i + 1}
              </span>
              <h2 className="font-display mt-4 text-xl font-bold text-gray-900">
                <T>{title}</T>
              </h2>
              <p className="mt-4 leading-8 text-gray-500">
                <T>{body}</T>
              </p>
            </article>
          ))}
        </div>
      </section>
      <section className="mx-auto max-w-3xl px-6 py-20 text-center">
        <h2 className="home-heading font-display text-3xl font-bold text-gray-900">
          <T>Help shape your next classroom.</T>
        </h2>
        <p className="mt-5 text-lg leading-8 text-gray-500">
          <T>
            We are building this with teachers in Sfax. Tell us what would make
            it useful for your classes.
          </T>
        </p>
        <Link href="/contact" className={`${primaryButton} mt-8`}>
          <T>Give teacher feedback</T>
        </Link>
        <details className="mx-auto mt-7 max-w-lg text-sm text-gray-500">
          <summary className="min-h-11 cursor-pointer py-3">
            <T>Before teaching on Qarrini</T>
          </summary>
          <p className="mt-3 leading-7">
            <T>
              Teacher onboarding, verification and fees will be confirmed before
              launch. This is a concept preview.
            </T>
          </p>
        </details>
      </section>
    </>
  );
}
