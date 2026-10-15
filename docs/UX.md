# Qarrini secondary-page UX

The supplied UX reference guides these changes. Principles are applied where they help a real task; they are not a requirement to add more features or more persuasion. The approved homepage keeps its layout and identity.

| Principle                            | Application                                                                                                                                            |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Jakob’s law, similarity              | Familiar search controls, consistent card anatomy, native disclosure controls, shared fields and button styles.                                        |
| Hick’s law, Tesler’s law             | Search starts with name, subject and school year. Secondary filters are available under “More filters”; applied filters remain visible and removable.  |
| Fitts’s law                          | Main actions and new disclosure controls have generous targets. Radio choices use the whole card as a label. Review actions have larger click areas.   |
| Proximity, hierarchy, Miller’s law   | Profile identity, class details and price are separate groups. Information pages make fewer distinct points, with short paragraphs and clear headings. |
| Von Restorff effect, serial position | One main action in each task area. The next lesson leads the dashboard; the monthly offer precedes long biography content on mobile.                   |
| Zeigarnik effect, peak–end rule      | Enrolment shows three steps, retains values when going back, displays the offer again before completion, and keeps the existing success state.         |
| Response time, system status         | Search updates locally, result counts are announced, validation explains the next step, and classroom review focuses the selected answer.              |
| Recognition over recall              | The offer review includes the schedule and price. Lesson resources stay grouped together. Active controls expose their selected state.                 |
| Postel’s law                         | Search accepts French accents or unaccented input and Arabic diacritics; whitespace-only form input is handled with a useful message.                  |
| Clear choices                        | Prices and prototype limitations remain visible. Availability is not presented as a countdown or scarcity pitch.                                       |

The dashboard puts announcements and detailed progress behind disclosures. Classroom response statistics appear once a question is published. Pending written work remains separate from wrong answers and from work not submitted.

Authentication, payments, contact delivery and multi-device live lessons remain outside this browser-local prototype. The contact page explicitly prepares a note for copying/downloading; editing it invalidates an older prepared version.

Arabic and French copy is in `src/data/i18n/experience.ts`. Policy wording is retained; the policy layout has readable line lengths, section links and a proper heading hierarchy.

Usability references: [Progressive disclosure](https://www.nngroup.com/articles/progressive-disclosure/), [recognition and recall](https://www.nngroup.com/articles/recognition-and-recall/), and [visibility of system status](https://www.nngroup.com/articles/visibility-system-status/).

Validation: TypeScript, the translation/link checks and a production build; browser checks of search/empty results, applied filter removal, enrolment validation and back navigation, homework completion, written-answer review, anonymous sharing, solution release and feedback-note preparation. Responsive checks cover Arabic and French layouts. These checks validate the implementation, not a measured claim that every usability principle has been satisfied.
