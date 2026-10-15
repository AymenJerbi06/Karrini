import { translate } from "@/lib/translations";
import { LegalPage } from "@/components/LegalPage";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  const base = { title: "Prototype Use | Qarrini" };
  return { ...base, title: translate(base.title, lang === "fr" ? "fr" : "ar") };
}
export default function TermsPage() {
  return (
    <LegalPage
      title="Using the Qarrini prototype"
      updated="14 October 2026"
      intro="Qarrini is a product concept for discussion with Sfax teachers and families. This site demonstrates the proposed experience and does not offer real tutoring bookings or paid subscriptions."
      sections={[
        {
          id: "examples",
          title: "Illustrative content",
          body: [
            "Teacher identities, biographies, experience, schedules, availability, prices and learning results are fictional examples. They do not represent actual teachers, endorsements, students or pilot outcomes.",
          ],
        },
        {
          id: "enrollment",
          title: "Demo enrollment",
          body: [
            "Adding a class to the demo dashboard creates a browser-local example only. It does not reserve a real place, create a real account or start a recurring subscription. No payment is requested or collected.",
          ],
        },
        {
          id: "classroom",
          title: "Classroom demonstration",
          body: [
            "Teacher and student views simulate a lesson on the same page. The class totals include seeded example responses. The prototype does not provide live video, multi-device synchronization or production access controls.",
          ],
        },
        {
          id: "pricing",
          title: "Proposed subscriptions",
          body: [
            "Prices are displayed in Tunisian dinars (DT) to illustrate monthly teacher-led class offers. Final commercial arrangements, payment methods, cancellation rules and account policies remain to be confirmed.",
          ],
        },
        {
          id: "feedback",
          title: "Exploring and giving feedback",
          body: [
            "Use example information when exploring the prototype. You can prepare feedback from the contact page and choose how to share it with the project team. The site's feedback form does not transmit messages.",
          ],
        },
      ]}
    />
  );
}
