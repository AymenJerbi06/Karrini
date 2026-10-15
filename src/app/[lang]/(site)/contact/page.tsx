import { translate } from "@/lib/translations";
import { T } from "@/components/I18n";
import Link from "@/components/LocalizedLink";
import { PageIntro } from "@/components/SiteUi";
import { FeedbackForm } from "@/components/FeedbackForm";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  return {
    title: translate(
      "Contact & Feedback | Karrini",
      lang === "fr" ? "fr" : "ar",
    ),
  };
}
export default function ContactPage() {
  return (
    <>
      <PageIntro eyebrow="Contact & feedback" title="We are listening.">
        <T>What would make Karrini work better for you?</T>
      </PageIntro>
      <section className="mx-auto grid max-w-6xl items-start gap-12 px-6 pb-20 lg:grid-cols-[1fr_1.4fr] lg:gap-20">
        <div className="max-w-md">
          <h2 className="font-display text-xl font-bold text-gray-900">
            <T>Your experience matters.</T>
          </h2>
          <p className="mt-4 leading-8 text-gray-500">
            <T>
              Tell us what helps you teach or learn. A few words are enough.
            </T>
          </p>
          <p className="mt-6 rounded-lg bg-gray-50 p-5 text-sm leading-7 text-gray-600">
            <T>
              This preview prepares a note for you to copy or download. Nothing
              is sent automatically.
            </T>
          </p>
          <Link
            href="/classroom"
            className="mt-5 inline-flex min-h-11 items-center text-sm text-brand underline underline-offset-4"
          >
            <T>Try the classroom first →</T>
          </Link>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-6 md:p-8">
          <FeedbackForm />
        </div>
      </section>
    </>
  );
}
