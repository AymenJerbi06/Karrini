import { translate } from "@/lib/translations";
import { LegalPage } from "@/components/LegalPage";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  const base = { title: "Safeguarding & Minors | Qarrini" };
  return { ...base, title: translate(base.title, lang === "fr" ? "fr" : "ar") };
}
export default function SafeguardingPage() {
  return (
    <LegalPage
      title="Safeguarding & minors"
      updated="14 October 2026"
      intro="A safe place to make mistakes is central to the Qarrini concept. The principles below describe the proposed learning experience; this demonstration does not host real lessons or connect minors with teachers."
      sections={[
        {
          id: "private",
          title: "Private student work",
          body: [
            "Student answers should be private from classmates by default. Teachers can use anonymous examples to explain a misconception. A public scoreboard of mistakes is not part of the concept.",
          ],
        },
        {
          id: "parents",
          title: "Appropriate parent involvement",
          body: [
            "The proposed parent experience includes class schedules, subscriptions and age-appropriate progress summaries. It is separate from a student's live answer workspace. Appropriate parental permissions must be established before real minors are onboarded.",
          ],
        },
        {
          id: "teachers",
          title: "Teacher review and class access",
          body: [
            "The proposed launch process includes a review of professional information before teacher profiles are publicly promoted. Only enrolled learners should access restricted classes and materials. The teachers and review indicators in this prototype are illustrative.",
          ],
        },
        {
          id: "feedback",
          title: "Respectful feedback",
          body: [
            "A handwritten solution, diagram or written explanation awaiting review must remain separate from an incorrect answer. Teacher feedback should help students understand the method and feel able to try again.",
          ],
        },
        {
          id: "launch",
          title: "Safeguards before launch",
          body: [
            "A real service will need defined reporting routes, staff responsibilities, account permissions and policies for live lessons, communications and recordings. These arrangements will be confirmed before real teaching takes place.",
          ],
        },
      ]}
    />
  );
}
