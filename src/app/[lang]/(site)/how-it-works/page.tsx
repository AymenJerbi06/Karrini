import { translate } from "@/lib/translations";
import { T } from "@/components/I18n";
import Link from "@/components/LocalizedLink";
import { PageIntro, primaryButton } from "@/components/SiteUi";
import { HowItWorks } from "@/components/sections/HowItWorks";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  return {
    title: translate("How it Works | Qarrini", lang === "fr" ? "fr" : "ar"),
  };
}
export default function HowPage() {
  return (
    <>
      <PageIntro eyebrow="Learning with Qarrini" title="How does it work?">
        <T>
          From choosing a teacher to reviewing your lesson, one simple journey.
        </T>
      </PageIntro>
      <HowItWorks showIntro={false} />
      <section className="mx-auto max-w-6xl px-6 py-16 md:py-20">
        <div className="flex flex-col justify-between gap-8 rounded-xl bg-gray-50 p-8 md:flex-row md:items-center md:p-10">
          <div>
            <h2 className="font-display text-2xl font-bold text-gray-900">
              <T>Try it for yourself.</T>
            </h2>
            <p className="mt-3 max-w-xl leading-8 text-gray-500">
              <T>
                Explore a lesson as a teacher or student. No sign-up needed.
              </T>
            </p>
            <Link
              href="/classroom"
              className="mt-3 inline-flex min-h-11 items-center text-sm text-brand underline underline-offset-4"
            >
              <T>Open the classroom demo</T>
            </Link>
          </div>
          <Link href="/find-a-teacher" className={`${primaryButton} shrink-0`}>
            <T>Find a Teacher</T>
          </Link>
        </div>
      </section>
    </>
  );
}
