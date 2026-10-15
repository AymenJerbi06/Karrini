// Illustrative data for the Qarrini concept prototype.
// Teachers, prices and schedules are fictional until validated with real Sfax teachers.

export const levels = [
  { slug: "all", label: "All school years" },
  { slug: "basic", label: "7th–9th Basic" },
  { slug: "1st-secondary", label: "1st Secondary" },
  { slug: "2nd-secondary", label: "2nd Secondary" },
  { slug: "3rd-secondary", label: "3rd Secondary" },
  { slug: "bac", label: "Bac (4th year)" },
] as const;

export const subjects = [
  { slug: "all", label: "All subjects" },
  { slug: "math", label: "Mathematics" },
  { slug: "physics", label: "Physics–Chemistry" },
  { slug: "sciences", label: "Natural Sciences" },
  { slug: "computer-science", label: "Computer Science" },
  { slug: "french", label: "French" },
  { slug: "english", label: "English" },
  { slug: "arabic", label: "Arabic" },
  { slug: "philosophy", label: "Philosophy" },
  { slug: "economics", label: "Economics & Management" },
] as const;

export const formats = [
  { value: "any", label: "Any format" },
  { value: "online", label: "Live online class" },
  { value: "small", label: "Small group (max 8)" },
  { value: "private", label: "1:1 private" },
] as const;

export const schedules = [
  { value: "any", label: "Any time" },
  { value: "weekday", label: "Weekday evenings" },
  { value: "weekend", label: "Weekends" },
] as const;

export type Format = "online" | "small" | "private";

export type Teacher = {
  id: string;
  name: string;
  subject: string;
  levels: string[];
  sections?: string;
  years: number;
  location: string;
  headline: string;
  bio: string;
  approach: string[];
  format: Format;
  timetable: { day: string; time: string; weekend?: boolean }[];
  lessonsPerMonth: number;
  duration: number;
  price: number;
  includes: string[];
  capacity: number;
  enrolled: number;
  color: string;
};

export const teachers: Teacher[] = [
  {
    id: "hichem-trabelsi",
    name: "Mr. Hichem Trabelsi",
    subject: "math",
    levels: ["3rd-secondary", "bac"],
    sections: "Bac Math & Experimental Sciences",
    years: 18,
    location: "Sfax Ville",
    headline: "Bac mathematics with a method for every type of exam question",
    bio: "I have prepared Bac students in Sfax for eighteen years. My classes move step by step from the method to timed exam practice, and I check every student's working, not just the final answer.",
    approach: [
      "Method first, then guided practice, then timed exam questions",
      "Live questions every 15 minutes so nobody falls behind",
      "Monthly mock exam with personal corrections",
    ],
    format: "online",
    timetable: [
      { day: "Tuesday", time: "18:00 – 19:30" },
      { day: "Thursday", time: "18:00 – 19:30" },
    ],
    lessonsPerMonth: 8,
    duration: 90,
    price: 95,
    includes: [
      "8 live classes of 90 min",
      "Lesson notes & exercise sheets (PDF)",
      "Weekly homework with corrections",
      "Monthly mock exam",
    ],
    capacity: 40,
    enrolled: 28,
    color: "bg-emerald-600",
  },
  {
    id: "sonia-kammoun",
    name: "Ms. Sonia Kammoun",
    subject: "physics",
    levels: ["2nd-secondary", "3rd-secondary", "bac"],
    sections: "All science sections",
    years: 14,
    location: "Sakiet Ezzit",
    headline:
      "Physics–chemistry explained through experiments and clear diagrams",
    bio: "I teach physics and chemistry with a focus on understanding, not memorising. Every chapter starts with a real situation, then we build the formulas together.",
    approach: [
      "Short videos of experiments before each chapter",
      "Diagram-based questions answered on the drawing pad",
      "Revision sheet at the end of every unit",
    ],
    format: "online",
    timetable: [
      { day: "Monday", time: "19:00 – 20:30" },
      { day: "Saturday", time: "10:00 – 11:30", weekend: true },
    ],
    lessonsPerMonth: 8,
    duration: 90,
    price: 85,
    includes: [
      "8 live classes of 90 min",
      "Experiment videos & notes",
      "Practice sessions before tests",
    ],
    capacity: 35,
    enrolled: 31,
    color: "bg-blue-600",
  },
  {
    id: "anis-ellouze",
    name: "Mr. Anis Ellouze",
    subject: "sciences",
    levels: ["bac"],
    sections: "Bac Experimental Sciences",
    years: 11,
    location: "Route de Tunis",
    headline:
      "Natural sciences for the Bac: genetics, physiology and exam writing",
    bio: "My students learn how to read documents, build an argument and write the answer the examiner expects. We practise with past Bac papers from the first month.",
    approach: [
      "Document analysis in every class",
      "Written-explanation questions reviewed personally",
      "Past Bac papers with marking guides",
    ],
    format: "online",
    timetable: [
      { day: "Wednesday", time: "17:30 – 19:00" },
      { day: "Sunday", time: "09:30 – 11:00", weekend: true },
    ],
    lessonsPerMonth: 8,
    duration: 90,
    price: 80,
    includes: [
      "8 live classes of 90 min",
      "Past-paper bank",
      "Written answers reviewed by the teacher",
    ],
    capacity: 40,
    enrolled: 22,
    color: "bg-teal-600",
  },
  {
    id: "rim-chaabane",
    name: "Ms. Rim Chaabane",
    subject: "french",
    levels: ["2nd-secondary", "3rd-secondary", "bac"],
    years: 9,
    location: "Sakiet Eddaier",
    headline:
      "French expression, text analysis and essay writing in small groups",
    bio: "Small groups give every student time to speak and write. We work on comprehension, grammar in context and structured essays.",
    approach: [
      "Speaking practice in every lesson",
      "Essay plans corrected line by line",
      "Vocabulary lists per theme",
    ],
    format: "small",
    timetable: [
      { day: "Friday", time: "18:00 – 19:30" },
      { day: "Saturday", time: "15:00 – 16:30", weekend: true },
    ],
    lessonsPerMonth: 8,
    duration: 90,
    price: 70,
    includes: [
      "8 small-group classes (max 8)",
      "Two corrected essays per month",
      "Grammar & vocabulary sheets",
    ],
    capacity: 8,
    enrolled: 6,
    color: "bg-pink-600",
  },
  {
    id: "walid-jarraya",
    name: "Mr. Walid Jarraya",
    subject: "computer-science",
    levels: ["3rd-secondary", "bac"],
    sections: "Bac Computer Science & Math",
    years: 7,
    location: "El Ain",
    headline:
      "Algorithms and programming, practised live, one problem at a time",
    bio: "We write algorithms together, then every student solves a variation on their own. I see each answer live and we fix mistakes before they become habits.",
    approach: [
      "Live coding & algorithm tracing",
      "Short exercises after every concept",
      "Bac practical exam preparation",
    ],
    format: "online",
    timetable: [
      { day: "Monday", time: "17:00 – 18:30" },
      { day: "Thursday", time: "17:00 – 18:30" },
    ],
    lessonsPerMonth: 8,
    duration: 90,
    price: 75,
    includes: [
      "8 live classes of 90 min",
      "Exercise bank with solutions",
      "Practical-exam simulations",
    ],
    capacity: 30,
    enrolled: 30,
    color: "bg-violet-700",
  },
  {
    id: "ines-bouaziz",
    name: "Ms. Ines Bouaziz",
    subject: "english",
    levels: ["1st-secondary", "2nd-secondary", "3rd-secondary", "bac"],
    years: 10,
    location: "Sfax Ville",
    headline: "English for confident speaking and strong Bac written answers",
    bio: "Lessons combine reading, listening and writing tasks. Students answer short questions throughout, so I always know who needs more help.",
    approach: [
      "Reading & listening practice",
      "Writing tasks with personal feedback",
      "Exam-style language questions",
    ],
    format: "online",
    timetable: [
      { day: "Wednesday", time: "19:00 – 20:00" },
      { day: "Saturday", time: "12:00 – 13:00", weekend: true },
    ],
    lessonsPerMonth: 8,
    duration: 60,
    price: 55,
    includes: [
      "8 live classes of 60 min",
      "Writing feedback",
      "Monthly progress summary",
    ],
    capacity: 35,
    enrolled: 19,
    color: "bg-sky-600",
  },
  {
    id: "mourad-fourati",
    name: "Mr. Mourad Fourati",
    subject: "philosophy",
    levels: ["bac"],
    years: 20,
    location: "Route de l'Aéroport",
    headline:
      "Philosophy for the Bac: from the question to a structured dissertation",
    bio: "We learn to analyse a subject, build a problem and write a dissertation step by step. Students submit short written explanations every class.",
    approach: [
      "Subject analysis method",
      "Short written answers reviewed live",
      "Model dissertations explained",
    ],
    format: "online",
    timetable: [{ day: "Sunday", time: "16:00 – 17:30", weekend: true }],
    lessonsPerMonth: 4,
    duration: 90,
    price: 60,
    includes: [
      "4 live classes of 90 min",
      "One dissertation corrected each month",
      "Course summaries",
    ],
    capacity: 40,
    enrolled: 26,
    color: "bg-amber-500",
  },
  {
    id: "amel-masmoudi",
    name: "Ms. Amel Masmoudi",
    subject: "math",
    levels: ["basic", "1st-secondary"],
    years: 12,
    location: "Thyna",
    headline: "Building strong foundations in maths before secondary school",
    bio: "In small groups, younger students learn to explain their reasoning. I use lots of short questions so every child participates.",
    approach: [
      "Short questions every few minutes",
      "Handwritten working checked live",
      "Regular revision games",
    ],
    format: "small",
    timetable: [
      { day: "Tuesday", time: "16:30 – 17:30" },
      { day: "Saturday", time: "09:00 – 10:00", weekend: true },
    ],
    lessonsPerMonth: 8,
    duration: 60,
    price: 50,
    includes: [
      "8 small-group classes (max 8)",
      "Exercise sheets",
      "Parent progress summary each month",
    ],
    capacity: 8,
    enrolled: 5,
    color: "bg-rose-600",
  },
  {
    id: "slim-damak",
    name: "Mr. Slim Damak",
    subject: "economics",
    levels: ["3rd-secondary", "bac"],
    sections: "Economics & Management",
    years: 15,
    location: "Sfax Ville",
    headline: "Economics and management with real Tunisian business examples",
    bio: "Every concept is linked to a real case. Students practise calculations and written analysis with immediate feedback.",
    approach: [
      "Case studies from local companies",
      "Calculation questions checked automatically",
      "Written analysis reviewed by the teacher",
    ],
    format: "private",
    timetable: [{ day: "Flexible", time: "Agreed with each family" }],
    lessonsPerMonth: 4,
    duration: 60,
    price: 120,
    includes: [
      "4 private lessons of 60 min",
      "Personal study plan",
      "Homework corrections",
    ],
    capacity: 6,
    enrolled: 4,
    color: "bg-indigo-600",
  },
];

export function labelFor(
  list: readonly { slug: string; label: string }[],
  slug: string,
) {
  return list.find((x) => x.slug === slug)?.label ?? slug;
}

export function formatLabel(f: Format) {
  return formats.find((x) => x.value === f)?.label ?? f;
}

export const placesLeft = (t: Teacher) => Math.max(0, t.capacity - t.enrolled);

export const initials = (name: string) =>
  name
    .replace(/^(Mr\.|Ms\.)\s*/, "")
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2);
