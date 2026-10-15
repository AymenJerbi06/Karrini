import { translate } from "@/lib/translations";
import { LegalPage } from "@/components/LegalPage";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  const base = { title: "Prototype Privacy Notice | Karrini" };
  return { ...base, title: translate(base.title, lang === "fr" ? "fr" : "ar") };
}
export default function PrivacyPage() {
  return (
    <LegalPage
      title="Prototype privacy notice"
      updated="14 October 2026"
      intro="This notice explains how the Karrini demonstration handles the information you enter. The prototype has no real student accounts, payment processing or connected classroom service."
      sections={[
        {
          id: "demo-account",
          title: "Browser-local demo details",
          body: [
            "Demo enrollment stores a nickname, selected account view and teacher identifiers in this browser's local storage. This lets the dashboard show your selected example classes after navigation or a reload. Please use a nickname rather than personal information.",
            "Use ‘Reset my saved demo’ at the bottom of the dashboard to remove these details. Clearing this site's browser data also removes them.",
          ],
        },
        {
          id: "classroom",
          title: "Classroom answers and photos",
          body: [
            "Classroom answers, marks, comments and any attached photo are held in the current page for the demonstration. They are not uploaded to a classroom server or sent to another device. Resetting the lesson or leaving the page clears this classroom state.",
            "Use example work and avoid attaching photos that contain names, faces or other personal details.",
          ],
        },
        {
          id: "feedback",
          title: "Feedback notes",
          body: [
            "The feedback form prepares a note that you can copy or download. It has no connected inbox and does not send the note to Karrini. You decide whether and how to share the prepared note.",
          ],
        },
        {
          id: "future",
          title: "Before a real launch",
          body: [
            "Real accounts, parental access, recordings, payments and student data handling require their own published policies and appropriate safeguards before launch. Those services are not offered by this demonstration.",
          ],
        },
      ]}
    />
  );
}
