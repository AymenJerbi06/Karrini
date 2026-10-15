import { T } from "@/components/I18n";
import Link from "@/components/LocalizedLink";

const questions = [
  [
    "What is Karrini?",
    "A tutoring platform designed for Sfax, bringing teachers and students together in interactive online classes.",
  ],
  [
    "Who are the classes for?",
    "We are starting with secondary-school and Bac students. Each teacher's profile shows the school years they teach.",
  ],
  [
    "How does a class subscription work?",
    "Choose a teacher's monthly offer. The price, timetable and included lessons are shown before enrollment.",
  ],
  [
    "Is registration free?",
    "Browsing teachers and creating an account are planned to be free. You pay when you join a teacher's class.",
  ],
  [
    "Can other students see my answers?",
    "Your answers stay private from classmates. Teachers can share an anonymous example to explain a correction.",
  ],
  [
    "What happens to handwritten answers?",
    "Your teacher reviews written work and gives feedback. Answers awaiting review are shown separately.",
  ],
  [
    "What can parents see?",
    "Upcoming classes, homework and progress summaries, together in the parent dashboard.",
  ],
  [
    "Can I book a real class today?",
    "This is a prototype. Profiles, prices and schedules are examples; bookings and payments are not active yet.",
  ],
];

export function Faq() {
  return (
    <section className="mx-auto max-w-4xl px-6 py-20 md:py-24" id="faq">
      <h2 className="home-heading font-display text-center text-4xl font-extrabold text-gray-900">
        <T>FAQs</T>
      </h2>
      <p className="mt-5 text-center text-base leading-8 text-gray-500 md:text-lg">
        <T>A question about Karrini?</T>{" "}
        <Link
          href="/contact"
          className="underline underline-offset-4 hover:text-brand"
        >
          <T>Our team is here to help.</T>
        </Link>
      </p>
      <div className="mt-16 divide-y divide-gray-200">
        {questions.map(([q, a]) => (
          <details key={q} className="group py-7">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-6 text-base font-medium text-gray-900 md:text-lg [&::-webkit-details-marker]:hidden">
              <T>{q}</T>
              <span
                aria-hidden="true"
                className="text-3xl font-light text-gray-700 transition-transform group-open:rotate-45"
              >
                +
              </span>
            </summary>
            <p className="mt-5 pe-8 leading-8 text-gray-500">
              <T>{a}</T>
            </p>
          </details>
        ))}
      </div>
    </section>
  );
}
