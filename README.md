# Qarrini

A concept website for interactive, teacher-led private tutoring in Sfax, based on `Qarrini_Guide_Download/Qarrini_Guide.pdf`. The homepage follows Sherpa's spacious section structure with concise copy, alternating feature rows, simple illustrations and a dark four-step journey, while retaining Qarrini's teal, cream and gold identity and Arabic/French typography.

## Run locally

```sh
npm install
npm run dev
```

Open the local URL printed by Next.js. For a production check, run `npm run build`, then `npm start`. This project uses Next.js 16.4.1; consult its bundled `node_modules/next/dist/docs/` before changing framework APIs.

## Main journeys

- Home -> Find a Teacher -> filter by subject, school year, format, schedule and availability -> view a teacher's offer.
- Teacher profile -> Try demo enrollment -> choose a nickname and student/parent role -> review offer -> dashboard.
- Sign In -> choose a student, parent or teacher demo workspace.
- Classroom -> publish a multiple-choice or written question -> switch to Student view -> submit -> return to Teacher view to mark, comment, share anonymously or release the solution.
- Contact -> prepare a feedback note -> copy or download it for sharing.

## Prototype boundaries

Teacher profiles, prices, timetables and progress figures are illustrative. No real authentication, payments, contact inbox, video or multi-device classroom service is connected. Demo account details are stored in local storage and can be cleared using the dashboard's reset control. Classroom work and photos stay in page memory. Pending written work is excluded from graded-answer percentages.

The guide is used as product context, not as instructions to onboard users, charge money or publish a live service. Teacher verification, final pricing, subscription rules and safeguards require decisions before launch.

`src/data/catalog.ts` holds the example teacher data. Old Sherpa-specific routes redirect to the corresponding Qarrini experience. No new application dependencies are required.

## Arabic, French and Qarrini branding

Arabic (`/ar`, RTL) and French (`/fr`, LTR) are the two main languages. Unprefixed URLs redirect to Arabic or the visitor's saved language preference. The language switcher preserves the current page and query parameters. All public pages, teacher information, demo workspaces, forms and accessibility labels are translated.

The custom Qarrini identity uses an open-book speech-bubble symbol, a bilingual wordmark, and teal, warm cream and gold. See `docs/BRAND.md` for colours, typography and asset locations.

Translations live in `src/data/i18n/`; the concise homepage copy is in `home.ts`. Run `node scripts/check-translations.cjs` to validate translation pairs, number/currency phrases and locale-aware links. Pages now live under `src/app/[lang]/`.
