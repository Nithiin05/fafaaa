"use client";
import { useEffect, useState } from "react";
import clsx from "clsx";
import { CheckCircle2, Timer } from "lucide-react";
import { EXAM } from "@/lib/exam";

function useRemaining(target: string) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  if (now === null) return null; // not mounted yet — avoids hydration mismatch
  const ms = new Date(target).getTime() - now;
  if (ms <= 0) return { done: true, d: 0, h: 0, m: 0, s: 0 };
  const total = Math.floor(ms / 1000);
  return { done: false, d: Math.floor(total / 86400), h: Math.floor((total % 86400) / 3600), m: Math.floor((total % 3600) / 60), s: total % 60 };
}

const pad = (n: number) => String(n).padStart(2, "0");

/** Big countdown for the dashboard / landing hero. */
export function HeroCountdown({ target = EXAM.dateISO }: { target?: string }) {
  const r = useRemaining(target);
  if (r?.done) {
    return (
      <div className="flex items-center gap-3 rounded-2xl border border-ok/30 bg-ok-soft px-5 py-4">
        <CheckCircle2 className="h-6 w-6 text-ok" />
        <div>
          <div className="text-sm font-semibold text-ok">Exam completed</div>
          <div className="text-xs text-fg-muted">The AAI JE (Operations) CBT was held on {new Date(target).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}.</div>
        </div>
      </div>
    );
  }
  const units = [
    { v: r?.d, l: "Days" }, { v: r?.h, l: "Hours" }, { v: r?.m, l: "Minutes" }, { v: r?.s, l: "Seconds" },
  ];
  return (
    <div>
      <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-amber">Exam in</div>
      <div className="grid grid-cols-4 gap-2 sm:gap-3">
        {units.map((u) => (
          <div key={u.l} className="rounded-xl border border-ink-700 bg-ink-950/60 px-2 py-3 text-center sm:px-4">
            <div className="text-2xl font-semibold tabular tracking-tight sm:text-4xl">{u.v === undefined ? "--" : pad(u.v)}</div>
            <div className="mt-1 text-[10px] uppercase tracking-wider text-fg-subtle sm:text-xs">{u.l}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Compact countdown for the header and test screen. */
export function CompactCountdown({ target = EXAM.dateISO, className }: { target?: string; className?: string }) {
  const r = useRemaining(target);
  return (
    <div className={clsx("inline-flex items-center gap-2 rounded-lg border border-ink-700 bg-ink-900 px-2.5 py-1.5 text-xs", className)}>
      {r?.done ? <CheckCircle2 className="h-3.5 w-3.5 text-ok" /> : <Timer className="h-3.5 w-3.5 text-amber" />}
      {r === null ? <span className="text-fg-muted">Exam countdown</span>
        : r.done ? <span className="font-medium text-ok">Exam completed</span>
        : <span className="tabular"><span className="text-fg-muted">Exam in </span><b className="font-semibold">{r.d}d {pad(r.h)}h {pad(r.m)}m</b></span>}
    </div>
  );
}
