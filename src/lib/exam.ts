/** Static exam facts. The exam date can also be changed by admins in Settings (app_settings.exam_datetime). */
export const EXAM = {
  name: "AAI Junior Executive (Operations) 2026",
  shortName: "AAI JE Operations",
  dateISO: "2026-10-21T00:00:00+05:30",
  totalQuestions: 120,
  totalMarks: 120,
  durationMinutes: 120,
  negativeMarking: false,
};

export const BLUEPRINT = [
  { slug: "english", name: "English Language", short: "English", part: "A", count: 15 },
  { slug: "reasoning", name: "Reasoning Aptitude", short: "Reasoning", part: "A", count: 15 },
  { slug: "quant", name: "Quantitative Aptitude", short: "Quantitative", part: "A", count: 15 },
  { slug: "ga-aviation", name: "General Awareness & Aviation", short: "GA & Aviation", part: "A", count: 15 },
  { slug: "physics", name: "Physics", short: "Physics", part: "B", count: 24 },
  { slug: "mathematics", name: "Mathematics", short: "Mathematics", part: "B", count: 24 },
  { slug: "management", name: "Business Management", short: "Management", part: "B", count: 12 },
] as const;

export const DIFFICULTIES = [
  { value: "easy", label: "Easy" },
  { value: "moderate", label: "Moderate" },
  { value: "exam", label: "Exam Level" },
  { value: "challenging", label: "Challenging" },
] as const;

export const difficultyLabel = (d?: string | null) =>
  DIFFICULTIES.find((x) => x.value === d)?.label ?? "—";

export const TOPIC_STATUS: Record<string, { label: string; tone: "muted" | "sky" | "ok" | "bad" }> = {
  not_started: { label: "Not started", tone: "muted" },
  in_progress: { label: "In progress", tone: "sky" },
  completed: { label: "Completed", tone: "ok" },
  needs_revision: { label: "Needs revision", tone: "bad" },
};

export const STRENGTH: Record<string, { label: string; tone: "ok" | "bad" | "amber" }> = {
  strong: { label: "Strong", tone: "ok" },
  average: { label: "Average", tone: "amber" },
  weak: { label: "Weak", tone: "bad" },
};

export const BOOKMARK_CATEGORIES = [
  { value: "important", label: "Important" },
  { value: "revise_later", label: "Revise later" },
  { value: "difficult", label: "Difficult" },
  { value: "formula", label: "Formula" },
  { value: "aviation", label: "Aviation" },
] as const;

export const SOURCE_LABEL: Record<string, string> = {
  demo: "Demo question",
  original: "Original",
  previous_official: "Previous paper (official)",
  previous_memory_based: "Previous paper (memory-based)",
};

export const QUESTION_COUNTS = [5, 10, 20, 30, 50];
