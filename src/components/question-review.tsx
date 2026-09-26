"use client";
import { useState, type ReactNode } from "react";
import clsx from "clsx";
import { Check, ChevronDown, X, Clock, Lightbulb } from "lucide-react";
import { Badge } from "@/components/ui";
import { difficultyLabel } from "@/lib/exam";
import { letter } from "@/lib/format";

/** One question with the correct answer, the student's choice and the explanation. */
export function QuestionReview({ number, text, imageUrl, options, correct, selected, explanation, concept, difficulty, subject, topic,
  timeSpent, footer, collapsible = false, headerRight }: {
  number?: number; text: string; imageUrl?: string | null; options: string[]; correct: number | null | undefined; selected?: number | null;
  explanation?: string | null; concept?: string | null; difficulty?: string | null; subject: string; topic: string;
  timeSpent?: number; footer?: ReactNode; collapsible?: boolean; headerRight?: ReactNode;
}) {
  const [open, setOpen] = useState(!collapsible);
  const status = selected == null ? "skipped" : selected === correct ? "correct" : "wrong";
  return (
    <article className="rounded-2xl border border-ink-700 bg-ink-900 p-4 sm:p-5">
      <div className="flex flex-wrap items-center gap-1.5 text-xs text-fg-muted">
        {number !== undefined && <span className="mr-1 font-semibold text-fg">Q{number}</span>}
        {selected !== undefined && (status === "correct" ? <Badge tone="ok"><Check className="h-3 w-3" />Correct</Badge>
          : status === "wrong" ? <Badge tone="bad"><X className="h-3 w-3" />Incorrect</Badge> : <Badge>Not attempted</Badge>)}
        <span>{subject}</span><span className="text-fg-subtle">·</span><span>{topic}</span>
        {difficulty && <Badge>{difficultyLabel(difficulty)}</Badge>}
        {timeSpent !== undefined && <span className="inline-flex items-center gap-1 text-fg-subtle"><Clock className="h-3 w-3" />{timeSpent}s</span>}
        {headerRight && <span className="ml-auto">{headerRight}</span>}
      </div>
      <p className="mt-3 whitespace-pre-line leading-relaxed">{text}</p>
      {imageUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={imageUrl} alt="Question diagram" className="mt-3 max-h-64 rounded-lg border border-ink-700 bg-white object-contain" />
      )}
      {collapsible && (
        <button onClick={() => setOpen(!open)} className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-sky">
          {open ? "Hide answer" : "Show answer & explanation"} <ChevronDown className={clsx("h-3.5 w-3.5 transition", open && "rotate-180")} />
        </button>
      )}
      <div className="mt-3 space-y-2">
        {options.map((o, i) => {
          const slot = i + 1;
          const isCorrect = open && correct === slot;
          const isWrongPick = open && selected === slot && selected !== correct;
          return (
            <div key={i} className={clsx("flex items-start gap-3 rounded-lg border px-3 py-2 text-sm",
              isCorrect ? "border-ok/50 bg-ok-soft" : isWrongPick ? "border-bad/50 bg-bad-soft" : selected === slot ? "border-sky/40" : "border-ink-700")}>
              <span className={clsx("grid h-6 w-6 shrink-0 place-items-center rounded-full border text-[11px] font-semibold",
                isCorrect ? "border-ok bg-ok text-ink-950" : isWrongPick ? "border-bad bg-bad text-white" : "border-ink-600 text-fg-muted")}>{letter(i)}</span>
              <span className="pt-0.5">{o}</span>
              {selected === slot && <span className="ml-auto shrink-0 pt-0.5 text-[11px] text-fg-subtle">Your answer</span>}
            </div>
          );
        })}
      </div>
      {open && explanation && (
        <div className="mt-3 rounded-lg border border-ink-700 bg-ink-850 px-3.5 py-3 text-sm">
          <div className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-amber"><Lightbulb className="h-3.5 w-3.5" />Answer {correct ? letter(correct - 1) : ""} · Explanation</div>
          <p className="text-fg-muted">{explanation}</p>
          {concept && <p className="mt-2 text-xs text-fg-subtle">Concept tested: <span className="text-fg-muted">{concept}</span></p>}
        </div>
      )}
      {footer && <div className="mt-3 flex flex-wrap gap-2">{footer}</div>}
    </article>
  );
}
