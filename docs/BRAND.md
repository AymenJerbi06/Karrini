# Qarrini / قرّيني

Qarrini's symbol combines an open book, a speech bubble and a gold spark. The book represents learning, the bubble represents a teacher listening to the student, and the spark represents the moment a concept becomes clear.

The Arabic wordmark is **قرّيني**, with **Qarrini** as the French/Latin name. The signature is **معاك حتى تفهم** / **Apprendre, ensemble.**

| Role | Colour |
| --- | --- |
| Brand teal | `#176B58` |
| Deep teal | `#0E4B40` |
| Ink | `#102F29` |
| Warm paper | `#FBF9F2` |
| Gold | `#E9B665` |

Arabic uses Noto Sans Arabic. French uses Open Sans, with Plus Jakarta Sans for headings and the Latin wordmark. Fonts are self-hosted by Next.js.

The homepage uses a white canvas, generous spacing, one short paragraph per feature and simple illustrations. Cream is reserved for the learning cards, closing invitation and footer. Portrait illustrations and teacher cards are examples; the page does not present invented reviews or performance statistics.

The reusable symbol is `public/brand/qarrini-mark.svg`; the browser icon is `src/app/icon.svg`. The bilingual wordmark lives in `src/components/Logo.tsx`.

Arabic is the default locale at `/ar` and French is at `/fr`. The switcher preserves the current page, query string and hash, and remembers the preference with the `qarrini-locale` cookie. All navigation links retain the selected language. Arabic documents render with `lang="ar"` and `dir="rtl"` from the server.

Translations are grouped by purpose under `src/data/i18n/`. `T` translates authored text leaves; `Localized` handles accessible labels and placeholders. User-entered answers, comments and feedback remain in their original language. Run `node scripts/check-translations.cjs` to check translation pairs and localized link/number behavior.
