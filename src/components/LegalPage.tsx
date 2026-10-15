import { T } from "@/components/I18n";

export type LegalSection = { id: string; title: string; body: string[] };
export function LegalPage({
  title,
  updated,
  intro,
  sections,
}: {
  title: string;
  updated: string;
  intro: string;
  sections: LegalSection[];
}) {
  return (
    <div className="mx-auto max-w-6xl px-6 py-12 md:py-16">
      <header className="max-w-3xl">
        <h1 className="home-heading font-display text-3xl font-extrabold tracking-tight text-gray-900 md:text-[44px]">
          <T>{title}</T>
        </h1>
        <p className="mt-5 text-sm text-gray-500">
          <T>Last updated </T>
          <T>{updated}</T>
        </p>
        <p className="mt-6 text-sm leading-7 text-gray-600">
          <T>
            Prototype policy · Final terms will be available before real classes
            open.
          </T>
        </p>
      </header>
      <div className="mt-12 grid gap-12 lg:grid-cols-[230px_1fr] lg:gap-16">
        <nav className="lg:sticky lg:top-6 lg:self-start">
          <details className="rounded-lg bg-gray-50 p-5" open>
            <summary className="min-h-11 cursor-pointer text-sm font-semibold text-gray-700">
              <T>On this page</T>
            </summary>
            <ol className="mt-3 space-y-1 text-sm">
              {sections.map((section, i) => (
                <li key={section.id}>
                  <a
                    href={`#${section.id}`}
                    className="flex min-h-11 items-center gap-3 rounded px-2 py-2 leading-6 text-gray-600 hover:bg-white hover:text-brand"
                  >
                    <span className="text-xs text-gray-400">{i + 1}</span>
                    <T>{section.title}</T>
                  </a>
                </li>
              ))}
            </ol>
          </details>
        </nav>
        <article className="max-w-3xl">
          <p className="text-lg leading-8 text-gray-600">
            <T>{intro}</T>
          </p>
          {sections.map((section, i) => (
            <section
              key={section.id}
              id={section.id}
              className="scroll-mt-8 border-b border-gray-100 py-9"
            >
              <h2 className="font-display text-xl font-bold text-gray-900">
                <span className="me-3 text-base text-brand">{i + 1}.</span>
                <T>{section.title}</T>
              </h2>
              {section.body.map((paragraph, k) => (
                <p key={k} className="mt-5 leading-8 text-gray-600">
                  <T>{paragraph}</T>
                </p>
              ))}
            </section>
          ))}
        </article>
      </div>
    </div>
  );
}
