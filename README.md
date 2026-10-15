# Karrini

A concept website for interactive, teacher-led private tutoring in Sfax, based on `Karrini_Guide_Download/Karrini_Guide.pdf`. The homepage follows Sherpa's spacious section structure with concise copy, alternating feature rows, simple illustrations and a dark four-step journey, while retaining Karrini's teal, cream and gold identity and Arabic/French typography.

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

### Backend: Supabase

- **Auth:** email + password with a confirmation email (Supabase sends it through the SMTP provider set in the dashboard — Resend once `karrini.tn` is verified). Every profile requires a +216 phone number; SMS verification is planned.
- **Database:** `supabase/migrations/` (applied automatically on push to `main` by the Supabase GitHub integration). Row Level Security on every table; answer keys and explanations are teacher-only.
- **Storage:** private `materials` bucket, files opened through 60-second signed URLs.
- **Realtime:** private channels `class:<id>` (teacher + enrolled students only) carry questions, answers, raised hands and WebRTC signalling.
- **Env vars** (`.env.local` locally, Vercel in production — never committed): `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY` (server only), `RESEND_API_KEY` (server only).

### Pilot flow

1. The teacher creates an account (role *Teacher*), confirms the email, opens **Teacher workspace → Overview** and shares the **class link** (copy or WhatsApp).
2. Students open the link, create a student account, confirm their email and land back on the class to join it.
3. The teacher uploads materials, prepares questions, then **Start live class**. Students see "Live now" on their dashboard and join from their own phone or computer.

## Prototype boundaries

Directory teachers, prices and timetables are illustrative examples. Video is peer-to-peer WebRTC (fine for a teacher plus about 4–6 students); larger classes need an SFU such as LiveKit — see **`docs/ARCHITECTURE.md`**. The teacher's browser grades answers and relays the live lesson, so it must stay open during the session. Answer photos are shown live but not stored. No payments, SMS or contact inbox are connected; parent–child linking is not built yet. Example classmates (off by default) are simulated and never saved.

The guide is used as product context, not as instructions to onboard users, charge money or publish a live service. Teacher verification, final pricing, subscription rules and safeguards require decisions before launch.

`src/data/catalog.ts` holds the example teacher data. Old Sherpa-specific routes redirect to the corresponding Karrini experience. No new application dependencies are required.

## Arabic, French and Karrini branding

Arabic (`/ar`, RTL) and French (`/fr`, LTR) are the two main languages. Unprefixed URLs redirect to Arabic or the visitor's saved language preference. The language switcher preserves the current page and query parameters. All public pages, teacher information, demo workspaces, forms and accessibility labels are translated.

The custom Karrini identity uses an open-book speech-bubble symbol, a bilingual wordmark, and teal, warm cream and gold. See `docs/BRAND.md` for colours, typography and asset locations.

Translations live in `src/data/i18n/`; the concise homepage copy is in `home.ts`. Run `node scripts/check-translations.cjs` to validate translation pairs, number/currency phrases and locale-aware links. Pages now live under `src/app/[lang]/`.
