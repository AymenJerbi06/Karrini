# Page Topology & Behaviors (design reference: sherpa-online.com, archived 2026-07-27)

Live site sits behind a Cloudflare human-check, so extraction used the Wayback Machine snapshot.
Layout, palette, type scale and interactions were mirrored; all copy, logo, illustrations and
imagery in Karrini are original.

## Tokens
- Body: Open Sans 16/24. Display: Polymath (commercial) → Plus Jakarta Sans 800 stand-in.
- Brand green `#28B661`, CTA blue-600 `#2563EB`, stars amber-400/500, chat launcher `#3F70A2`.
- Neutrals: Tailwind gray scale (900 headings, 700 section h2, 500 body copy, 800 dark bands).

## Sections (top → bottom) — file
| # | Section | Interaction | File |
|---|---|---|---|
| 1 | Header 74px, logo cell w/ border-r, nav, Register + green Sign In | hover dropdown, mobile drawer | `sections/Header.tsx` |
| 2 | Hero: avatar stack + stars, H1 60/75 800, CTA blue 52px, classroom mockup w/ shapes | static | `sections/Hero.tsx` |
| 3 | Stats bar gray-100, 3 items | static | `sections/StatsBar.tsx` |
| 4 | 5 alternating feature rows (h2 36/40 gray-700, p 18/28 gray-500) | tutor row = swipe carousel | `sections/Features.tsx` |
| 5 | How it works — gray-800, 4 step tabs (active bg gray-700, rounded-2xl) + laptop screen | click + 6s auto-advance, 500ms fade | `sections/HowItWorks.tsx` |
| 6 | Reviews — gray-50, marquee `scroll-left 60s linear infinite` | time-driven, pause on hover | `sections/Reviews.tsx` |
| 7 | Subjects chips — gray-800, chips gray-700 → hover gray-600 | hover | `sections/Subjects.tsx` |
| 8 | FAQs — max-w-3xl divide-y, plus icon | click accordion | `sections/Faq.tsx` |
| 9 | CTA — gray-50, h2 48/48, blue + white chat buttons | static | `sections/Cta.tsx` |
| 10 | Footer — 3 cols (brand / link groups / 2-col popular) | link hover | `sections/Footer.tsx` |
| — | Floating chat launcher (fixed bottom-right) | hover scale | `ChatLauncher.tsx` |

Responsive: single breakpoint at `md` (768px) — rows stack, nav collapses to drawer,
stats bar shows first item only.

## Additional pages (added 2026-10-14)

Sherpa template → Karrini route. Pages marked * were missing or unstyled in the archive, so the layout
was rebuilt from the page's heading structure using the same visual system.

| Sherpa | Karrini route | Notes |
|---|---|---|
| /find-a-tutor | `/find-a-tutor` | hero + Subject/Level/Budget filters, tutor cards w/ green "View Full Profile", explainer |
| /find-a-tutor/GCSE/Maths | `/find-a-tutor/[level]/[subject]` | same template, prefiltered (88 static combos) |
| tutor profile* | `/tutors/[id]` | profile, subjects, availability grid, sticky booking card |
| /login | `/login` | split screen, form left / dark brand panel right, no site chrome |
| /register* | `/register` | 3-step: subject/level/grade → account → done |
| /becomeatutor* | `/become-a-tutor` | hero, how it works, comparison, why teach, values, CTA, FAQ |
| /blog* | `/blog`, `/blog/[slug]` | featured post + grid; article page |
| /find-a-send-tutor* | `/learning-support` | learning-support / homeschooling |
| /about-us | `/about-us` | arc + doodle-pattern hero, pillars, story/stats, team |
| /contact | `/contact` | simple contact block |
| /privacy-policy* | `/privacy-policy`, `/safeguarding-policy`, `/terms-of-use` | shared `LegalPage` w/ TOC; placeholder text |
| /schools* | `/schools` | hero, how it works, 6 pillars, testimonials, lead form |
| /pta-fundraising* | `/parent-councils` | hero, how it works, example earnings, lead form |

Route groups: `(site)` has header/footer/chat; `(auth)` (login, register) is chrome-free.
Mock data lives in `src/data/catalog.ts`.

## Qarrini content adaptation (14 October 2026)

The tables above record the original Sherpa-inspired concept. The current implementation follows the Qarrini guide while retaining those visual tokens and section treatments.

Current public routes: `/`, `/find-a-teacher`, `/find-a-teacher/[level]/[subject]`, `/teachers/[id]`, `/how-it-works`, `/for-teachers`, `/about-us`, `/contact`, `/privacy-policy`, `/safeguarding-policy`, `/terms-of-use`.

Demo routes: `/register` (three-step local enrollment), `/login` (role chooser), `/dashboard` (student, parent and teacher views), `/classroom` (same-page question, answer, review and feedback cycle).

UK curricula, GBP rates, fabricated review claims, schools partnerships and PTA fundraising are not part of the Qarrini concept. Legacy template URLs redirect to relevant Qarrini pages. Home reviews are replaced by factual product information and subject links.

Demo state is browser-local; there is no production authentication, payment, messaging, video or multi-device classroom backend. Every teacher identity, class price, timetable and progress figure is illustrative.
