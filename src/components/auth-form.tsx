import { HeroCountdown } from "@/components/countdown";
import { BLUEPRINT } from "@/lib/exam";

/** Right-hand panel on auth pages: countdown and exam pattern, styled like a boarding pass. */
export function AuthAside() {
  return (
    <div className="relative hidden overflow-hidden border-l border-ink-700 bg-ink-900 lg:flex lg:flex-col lg:justify-center lg:px-14">
      <svg className="pointer-events-none absolute -right-10 top-10 opacity-40" width="520" height="260" viewBox="0 0 520 260" aria-hidden>
        <path d="M10 240 C 160 230, 260 140, 330 90 S 470 20, 510 18" stroke="#5AA9FF" strokeWidth="1.5" strokeDasharray="4 7" fill="none" />
        <circle cx="510" cy="18" r="4" fill="#5AA9FF" />
      </svg>
      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-amber">AAI Junior Executive (Operations)</p>
      <h2 className="mt-2 max-w-md text-3xl font-semibold tracking-tight">Your preparation. Your progress. Your flight to success.</h2>
      <div className="mt-8 max-w-md"><HeroCountdown /></div>
      <div className="mt-8 max-w-md rounded-2xl border border-ink-700 bg-ink-950/60">
        <div className="grid grid-cols-2 divide-x divide-ink-700 text-sm">
          <div className="p-4">
            <div className="text-[10px] uppercase tracking-wider text-fg-subtle">Part A · Non-technical</div>
            {BLUEPRINT.filter((b) => b.part === "A").map((b) => (
              <div key={b.slug} className="mt-2 flex justify-between text-xs"><span className="text-fg-muted">{b.short}</span><span className="tabular">{b.count}</span></div>
            ))}
          </div>
          <div className="p-4">
            <div className="text-[10px] uppercase tracking-wider text-fg-subtle">Part B · Technical</div>
            {BLUEPRINT.filter((b) => b.part === "B").map((b) => (
              <div key={b.slug} className="mt-2 flex justify-between text-xs"><span className="text-fg-muted">{b.short}</span><span className="tabular">{b.count}</span></div>
            ))}
          </div>
        </div>
        <div className="runway mx-4" />
        <div className="flex justify-between px-4 py-3 text-xs text-fg-muted">
          <span>120 Questions</span><span>120 Marks</span><span>120 Minutes</span><span>No negative marking</span>
        </div>
      </div>
    </div>
  );
}
