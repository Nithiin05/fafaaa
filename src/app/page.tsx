import Link from "next/link";
import { BarChart3, BookOpenCheck, FileText, NotebookPen, PlaneTakeoff, Target } from "lucide-react";
import { Brand } from "@/components/brand";
import { HeroCountdown } from "@/components/countdown";
import { BLUEPRINT } from "@/lib/exam";

const FEATURES = [
  { icon: PlaneTakeoff, title: "Full-length CBT mocks", body: "120 questions in the exact 15/15/15/15/24/24/12 split, a real 120-minute timer and a CBT-style question palette." },
  { icon: FileText, title: "Previous papers", body: "Official and memory-based papers, clearly labelled, whenever they are uploaded." },
  { icon: Target, title: "Subject & topic practice", body: "Pick a subject, topic, difficulty and number of questions. Explanations after every set." },
  { icon: BookOpenCheck, title: "Syllabus coverage", body: "Coverage and accuracy for every topic, calculated from your real attempts." },
  { icon: NotebookPen, title: "Mistake book & revision", body: "Every wrong answer is saved for revision, alongside formula sheets and aviation facts." },
  { icon: BarChart3, title: "Performance analytics", body: "Score trends, subject accuracy, weak topics and time management." },
];

export default function Landing() {
  return (
    <div className="min-h-screen">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5">
        <Brand href="/" />
        <div className="flex items-center gap-2">
          <Link href="/login" className="rounded-lg px-3 py-2 text-sm text-fg-muted hover:text-fg">Sign in</Link>
          <Link href="/signup" className="rounded-lg bg-sky px-4 py-2 text-sm font-semibold text-ink-950 hover:bg-[#7bbaff]">Start preparing</Link>
        </div>
      </header>

      <section className="relative mx-auto max-w-6xl px-5 pb-16 pt-10 sm:pt-16">
        <svg className="pointer-events-none absolute right-0 top-0 hidden opacity-30 md:block" width="560" height="300" viewBox="0 0 560 300" aria-hidden>
          <path d="M0 290 C 180 280, 290 170, 370 110 S 510 30, 555 26" stroke="#5AA9FF" strokeWidth="1.5" strokeDasharray="4 8" fill="none" />
          <circle cx="555" cy="26" r="4" fill="#5AA9FF" />
        </svg>
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-amber">CBT · 21 October 2026</p>
        <h1 className="mt-3 max-w-3xl text-4xl font-semibold tracking-tight sm:text-5xl">AAI Junior Executive (Operations) 2026</h1>
        <p className="mt-4 max-w-xl text-lg text-fg-muted">Your preparation. Your progress. Your flight to success.</p>

        <div className="mt-10 grid gap-8 lg:grid-cols-[1.2fr_1fr] lg:items-end">
          <HeroCountdown />
          <div className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4 lg:grid-cols-2">
            {["120 Questions", "120 Marks", "120 Minutes", "No Negative Marking"].map((f) => (
              <div key={f} className="rounded-xl border border-ink-700 bg-ink-900 px-4 py-3 font-medium">{f}</div>
            ))}
          </div>
        </div>

        <div className="mt-10 flex flex-wrap gap-3">
          <Link href="/signup" className="rounded-lg bg-sky px-6 py-3 text-sm font-semibold text-ink-950 hover:bg-[#7bbaff]">Create free account</Link>
          <Link href="/login" className="rounded-lg border border-ink-700 bg-ink-900 px-6 py-3 text-sm hover:border-ink-600">I already have an account</Link>
        </div>
      </section>

      <div className="runway mx-auto max-w-6xl" />

      <section className="mx-auto max-w-6xl px-5 py-14">
        <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-fg-subtle">Exam pattern</h2>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          {(["A", "B"] as const).map((part) => (
            <div key={part} className="rounded-2xl border border-ink-700 bg-ink-900 p-5">
              <div className="flex items-baseline justify-between">
                <h3 className="font-semibold">Part {part} — {part === "A" ? "Non-Technical" : "Technical"}</h3>
                <span className="text-xs text-fg-muted">60 questions · 60 marks</span>
              </div>
              <div className="mt-4 space-y-2.5">
                {BLUEPRINT.filter((b) => b.part === part).map((b) => (
                  <div key={b.slug} className="flex items-center gap-3 text-sm">
                    <span className="w-44 shrink-0 text-fg-muted sm:w-56">{b.name}</span>
                    <div className="h-1.5 flex-1 rounded-full bg-ink-700"><div className="h-full rounded-full bg-sky" style={{ width: `${(b.count / 24) * 100}%` }} /></div>
                    <span className="w-6 text-right tabular">{b.count}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 pb-20">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map(({ icon: Icon, title, body }) => (
            <div key={title} className="rounded-2xl border border-ink-700 bg-ink-900 p-5">
              <Icon className="h-5 w-5 text-sky" />
              <h3 className="mt-3 font-semibold">{title}</h3>
              <p className="mt-1.5 text-sm text-fg-muted">{body}</p>
            </div>
          ))}
        </div>
        <p className="mt-10 text-center text-xs text-fg-subtle">
          Fafaaa is an independent preparation platform, not affiliated with the Airports Authority of India. Practice questions are original unless labelled as previous-paper questions.
        </p>
      </section>
    </div>
  );
}
