import { translate } from "@/lib/translations";
import { T } from "@/components/I18n";
import Link from "@/components/LocalizedLink";
import { PageIntro, primaryButton } from "@/components/SiteUi";
import { PeopleVisual } from "@/components/mockups/HomeVisuals";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  return {
    title: translate("About Qarrini | Qarrini", lang === "fr" ? "fr" : "ar"),
  };
}
export default function AboutPage() {
  return (
    <>
      <PageIntro
        eyebrow="About Qarrini"
        title="Closer to your teacher. Closer to understanding."
      >
        <T>Online tutoring built around the people who make learning happen.</T>
      </PageIntro>
      <section className="mx-auto grid max-w-6xl items-center gap-14 px-6 pb-20 pt-6 md:grid-cols-[1.2fr_1fr] md:gap-24">
        <div>
          <h2 className="home-heading font-display text-3xl font-bold text-gray-900">
            <T>Starting close to home.</T>
          </h2>
          <p className="mt-5 text-lg leading-8 text-gray-500">
            <T>
              Our first community is Sfax: secondary-school students, their
              families and the teachers they turn to for support.
            </T>
          </p>
          <p className="mt-5 text-lg leading-8 text-gray-500">
            <T>
              Qarrini brings finding a class, taking part and practising
              afterwards into one place. There is room to ask, try and learn
              from mistakes.
            </T>
          </p>
        </div>
        <PeopleVisual />
      </section>
      <section className="bg-gray-50 px-6 py-16 md:py-20">
        <div className="mx-auto grid max-w-6xl gap-10 md:grid-cols-3">
          {[
            [
              "Teachers at the centre",
              "Your teacher's methods and relationship with students come first.",
            ],
            [
              "A voice for every learner",
              "Private answers make it easier to participate and ask for help.",
            ],
            [
              "Learning together",
              "Students, parents and teachers share a clearer view of the journey.",
            ],
          ].map(([title, body]) => (
            <article key={title}>
              <h2 className="font-display text-xl font-bold text-gray-900">
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
          <T>A concept we are building together</T>
        </h2>
        <p className="mt-5 text-lg leading-8 text-gray-500">
          <T>
            This preview helps us learn from teachers and families before real
            classes open.
          </T>
        </p>
        <Link href="/contact" className={`${primaryButton} mt-8`}>
          <T>Share your feedback</T>
        </Link>
      </section>
    </>
  );
}
