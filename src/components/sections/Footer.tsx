import { T } from "@/components/I18n";

import Link from "@/components/LocalizedLink";
import { Logo } from "@/components/Logo";

const groups = [
  {
    h: "Students & Parents",
    links: [
      ["Find a Teacher", "/find-a-teacher"],
      ["How it Works", "/how-it-works"],
      ["Student Dashboard", "/dashboard"],
    ],
  },
  {
    h: "Teachers",
    links: [
      ["Teach on Qarrini", "/for-teachers"],
      ["Live Classroom Demo", "/classroom"],
    ],
  },
  {
    h: "Other",
    links: [
      ["About Qarrini", "/about-us"],
      ["Contact Us", "/contact"],
      ["Privacy Policy", "/privacy-policy"],
      ["Safeguarding & Minors", "/safeguarding-policy"],
      ["Terms of Use", "/terms-of-use"],
    ],
  },
];

const popular = [
  ["Bac Mathematics", "/find-a-teacher/bac/math"],
  ["Bac Physics–Chemistry", "/find-a-teacher/bac/physics"],
  ["Bac Natural Sciences", "/find-a-teacher/bac/sciences"],
  ["Bac Computer Science", "/find-a-teacher/bac/computer-science"],
  ["Bac Philosophy", "/find-a-teacher/bac/philosophy"],
  ["Bac French", "/find-a-teacher/bac/french"],
  ["Bac English", "/find-a-teacher/bac/english"],
  ["Bac Economics", "/find-a-teacher/bac/economics"],
  ["3rd Secondary Maths", "/find-a-teacher/3rd-secondary/math"],
  ["3rd Secondary Physics", "/find-a-teacher/3rd-secondary/physics"],
  ["2nd Secondary French", "/find-a-teacher/2nd-secondary/french"],
  ["1st Secondary English", "/find-a-teacher/1st-secondary/english"],
  ["7th–9th Basic Maths", "/find-a-teacher/basic/math"],
  ["All Mathematics", "/find-a-teacher/all/math"],
];

const Heading = ({ children }: { children: React.ReactNode }) => (
  <h3 className="text-sm font-semibold tracking-wider text-gray-500 uppercase">
    <T>{children}</T>
  </h3>
);

export function Footer() {
  return (
    <footer
      className="border-t border-gray-200 bg-gray-50"
      aria-labelledby="footer-heading"
    >
      <h2 id="footer-heading" className="sr-only">
        <T>Footer</T>
      </h2>
      <div className="mx-auto max-w-7xl px-6 pt-16 pb-8 lg:px-8 lg:pt-20">
        <div className="grid gap-12 md:grid-cols-3 md:gap-8">
          <div className="space-y-8">
            <Logo className="text-[40px] leading-none" />
            <p className="text-base text-gray-600">
              <T>Bringing teachers and learners closer. Starting in Sfax.</T>
            </p>
          </div>

          <div className="space-y-8">
            {groups.map((g) => (
              <div key={g.h}>
                <Heading>
                  <T>{g.h}</T>
                </Heading>
                <ul className="mt-4 space-y-4">
                  {g.links.map(([l, h]) => (
                    <li key={l}>
                      <Link
                        href={h}
                        className="text-base text-gray-500 hover:text-gray-900"
                      >
                        <T>{l}</T>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div>
            <Heading>
              <T>Popular Classes</T>
            </Heading>
            <ul className="mt-4 grid grid-cols-2 gap-x-6 gap-y-4">
              {popular.map(([l, h]) => (
                <li key={l}>
                  <Link
                    href={h}
                    className="text-base text-gray-500 hover:text-gray-900"
                  >
                    <T>{l}</T>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-12 border-t border-gray-200 pt-8 text-center">
          <p className="text-base text-gray-400">
            <T>&copy; 2026 Qarrini. All rights reserved.</T>
          </p>
          <p className="mt-2 text-xs text-gray-400">
            <T>Prototype · No real bookings or payments.</T>
          </p>
        </div>
      </div>
    </footer>
  );
}
