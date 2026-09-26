"use client";
import { useState } from "react";
import clsx from "clsx";
import { ChevronDown } from "lucide-react";
import { Card } from "@/components/ui";

export type Note = { id: number; category: string; title: string; body: string; subject_id: number | null };

/** A quick-revision sheet: one "Label :: value" pair per line. */
export function NoteSheet({ note, defaultOpen = false }: { note: Note; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  const lines = note.body.split("\n").map((l) => l.split("::").map((x) => x.trim()));
  return (
    <Card as="div" className="overflow-hidden">
      <button id={`note-${note.id}`} onClick={() => setOpen(!open)} className="flex w-full items-center justify-between px-5 py-3.5 text-left" aria-expanded={open}>
        <span className="font-medium">{note.title}</span>
        <ChevronDown className={clsx("h-4 w-4 text-fg-muted transition", open && "rotate-180")} />
      </button>
      {open && (
        <dl className="divide-y divide-ink-700/60 border-t border-ink-700 text-sm">
          {lines.map(([k, v], i) => (
            <div key={i} className="grid gap-1 px-5 py-2.5 sm:grid-cols-[14rem_1fr] sm:gap-4">
              <dt className="text-fg-muted">{k}</dt><dd className="font-medium">{v}</dd>
            </div>
          ))}
        </dl>
      )}
    </Card>
  );
}

