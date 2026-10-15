import { T } from "@/components/I18n";

const cards = [
  {
    title: "Space to try.",
    body: "Work through questions, make mistakes and learn with your teacher's support.",
    role: "For students",
    initials: "Student avatar initial",
    color: "bg-brand",
  },
  {
    title: "A clearer view.",
    body: "Keep up with upcoming classes, homework and your child's learning journey.",
    role: "For parents",
    initials: "Parent avatar initial",
    color: "bg-[#b58842]",
  },
  {
    title: "Teach with insight.",
    body: "See how your class is doing and give help where it matters.",
    role: "For teachers",
    initials: "Teacher avatar initial",
    color: "bg-[#5b8a83]",
  },
];

export function LearningTogether() {
  return (
    <section className="bg-gray-50 px-6 py-16 md:py-20">
      <div className="mx-auto max-w-7xl">
        <h2 className="home-heading font-display text-center text-3xl font-extrabold tracking-tight text-gray-900 md:text-4xl">
          <T>Learning brings us together.</T>
        </h2>
        <p className="mx-auto mt-5 max-w-3xl text-center text-base text-gray-500 md:text-lg">
          <T>A place for students, parents and teachers.</T>
        </p>
        <div className="mt-12 flex snap-x snap-mandatory gap-5 overflow-x-auto pb-4 [scrollbar-width:thin] md:grid md:grid-cols-3 md:overflow-visible md:pb-0">
          {cards.map((card) => (
            <article
              key={card.title}
              className="flex min-h-[270px] w-[85%] shrink-0 snap-center flex-col rounded-lg border border-gray-200 bg-white p-7 shadow-sm md:w-auto"
            >
              <h3 className="font-display text-lg font-bold text-gray-900">
                <T>{card.title}</T>
              </h3>
              <p className="mt-4 text-base leading-7 text-gray-500">
                <T>{card.body}</T>
              </p>
              <div className="mt-auto flex items-center gap-3 pt-8">
                <span
                  aria-hidden="true"
                  className={`flex h-10 w-10 items-center justify-center rounded-full text-sm text-white ${card.color}`}
                >
                  <T>{card.initials}</T>
                </span>
                <span className="text-sm font-semibold text-gray-600">
                  <T>{card.role}</T>
                </span>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
