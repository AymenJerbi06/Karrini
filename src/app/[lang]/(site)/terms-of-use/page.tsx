import { translate } from "@/lib/translations";
import { LegalPage } from "@/components/LegalPage";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  const base = { title: "Prototype Use | Karrini" };
  return { ...base, title: translate(base.title, lang === "fr" ? "fr" : "ar") };
}
export default function TermsPage() {
  return (
    <LegalPage
      title="Using the Karrini prototype"
      updated="15 October 2026"
      intro="Karrini is a product concept for discussion with Sfax teachers and families. This site demonstrates the proposed experience and does not offer real tutoring bookings or paid subscriptions."
      sections={[
        {
          id: "teachers",
          title: "Teaching on Karrini",
          body: [
            "Only teachers with a Karrini account who have been approved by the Karrini team can open the teacher portal and appear to students. To be considered, a teacher submits an application describing their subject, school years, how many sessions they give each week, their teaching methods and their price.",
            "Karrini keeps a 15% commission on every payment a student makes for a teacher's classes. The teacher receives the remaining 85%. By submitting an application, the teacher accepts these Terms and this commission.",
            "The Karrini team may approve, decline or withdraw an approval, for example if the information provided is inaccurate or a class does not respect these Terms. Information on teacher pages is provided by the teachers themselves.",
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
