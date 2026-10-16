// Reference lists for Karrini: school years, subjects and class formats.
// Teachers and classes come from the database (only admin-approved teachers are published).

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
  { slug: "economics", label: "Economics" },
  { slug: "management", label: "Management (Gestion)" },
] as const;

/** Teaching methods a teacher can offer (used in applications, filters and class pages). */
export const formats = [
  { value: "any", label: "Any format" },
  { value: "online", label: "Live online class" },
  { value: "small", label: "Small group (max 8)" },
  { value: "private", label: "1:1 private" },
] as const;

export type Format = "online" | "small" | "private";

export function labelFor(list: readonly { slug: string; label: string }[], slug: string) {
  return list.find((x) => x.slug === slug)?.label ?? slug;
}

export function formatLabel(f: string) {
  return formats.find((x) => x.value === f)?.label ?? f;
}

/** Commission Karrini keeps on every student payment (shown in the teacher application and terms). */
export const COMMISSION_PCT = 15;
