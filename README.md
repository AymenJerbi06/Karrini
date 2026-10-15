# Qarrini

A concept website for interactive, teacher-led private tutoring in Sfax, based on `Qarrini_Guide_Download/Qarrini_Guide.pdf`. The homepage follows Sherpa's spacious section structure with concise copy, alternating feature rows, simple illustrations and a dark four-step journey, while retaining Qarrini's teal, cream and gold identity and Arabic/French typography.

## Run locally

```sh
npm install
npm run dev
```

Open the local URL printed by Next.js. For a production check, run `npm run build`, then `npm start`. This project uses Next.js 16.4.1; consult its bundled `node_modules/next/dist/docs/` before changing framework APIs.

## Main journeys

- **Sign up** (`/register`): choose student, parent or teacher → sign up with a **phone number** (+216, verified with a 6-digit code) or with **email + password** (a verified phone number is still required) → profile (school year, or subject/levels/experience for teachers, who start as *pending verification*).
- **Sign in** (`/login`): separate Student / Parent / Teacher tabs; phone + code or email + password. A teacher number used on the student tab (or vice versa) is detected and the user is offered the right sign-in.
- **Teacher workspace** (`/teach`): overview, **materials** upload (PDF, Word, PowerPoint, images; drag and drop), **question bank** prepared before class, and **results** of every live session with CSV export.
- **Live classroom** (`/classroom`): the teacher goes live with camera/mic/screen share (WebRTC), sends prepared questions or writes new ones on the spot, and sees right/wrong counts, percentages, the breakdown per option and **the names and answers of students who got it wrong**. Private feedback, anonymous sharing, answer release, raised hands, optional time limits.
- **Student dashboard** (`/dashboard`): live-now banner, teachers' materials (open/download), personal answers with feedback, progress. Parents see a linked child's classes and progress.
- Home → Find a Teacher → teacher profile → join the class (sign up, or one-click add when already signed in).

### Try the full classroom on one computer

1. Window 1: `/login` → **Teacher demo** → Start live class → Start live session.
2. Window 2 (new window or private window): `/login` → **Student demo** → Join the live class.
3. Send a question from window 1, answer it in window 2, and watch the results update.

Demo teacher: `hichem.demo@qarrini.tn` / `qarrini2026` (or phone `20 000 001`). Demo student: phone `50 000 002`. Codes are shown on screen as a "demo SMS".

## Prototype boundaries

Teacher profiles, prices and timetables are illustrative. Accounts, materials (IndexedDB) and session results are stored **in this browser only**; a second window stands in for a second device. No real SMS, payments or contact inbox is connected. Video works between windows of the same browser (peer-to-peer WebRTC); production uses an SFU, a room server and TURN — see **`docs/ARCHITECTURE.md`**. Example classmates in the live class are simulated and labelled "example". Pending written work is never counted as wrong.

The guide is used as product context, not as instructions to onboard users, charge money or publish a live service. Teacher verification, final pricing, subscription rules and safeguards require decisions before launch.

`src/data/catalog.ts` holds the example teacher data. Old Sherpa-specific routes redirect to the corresponding Qarrini experience. No new application dependencies are required.

## Arabic, French and Qarrini branding

Arabic (`/ar`, RTL) and French (`/fr`, LTR) are the two main languages. Unprefixed URLs redirect to Arabic or the visitor's saved language preference. The language switcher preserves the current page and query parameters. All public pages, teacher information, demo workspaces, forms and accessibility labels are translated.

The custom Qarrini identity uses an open-book speech-bubble symbol, a bilingual wordmark, and teal, warm cream and gold. See `docs/BRAND.md` for colours, typography and asset locations.

Translations live in `src/data/i18n/`; the concise homepage copy is in `home.ts`. Run `node scripts/check-translations.cjs` to validate translation pairs, number/currency phrases and locale-aware links. Pages now live under `src/app/[lang]/`.
