"use client";
import Link from "next/link";
import clsx from "clsx";
import { AlertTriangle, Loader2, X } from "lucide-react";
import { useEffect, type ReactNode, type ButtonHTMLAttributes } from "react";

export function Card({ className, children, as: As = "section" }: { className?: string; children: ReactNode; as?: "section" | "div" | "article" }) {
  return <As className={clsx("min-w-0 rounded-2xl border border-ink-700 bg-ink-900 shadow-card", className)}>{children}</As>;
}

export function CardHeader({ title, subtitle, action, icon }: { title: ReactNode; subtitle?: ReactNode; action?: ReactNode; icon?: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 px-5 pt-5">
      <div className="flex items-start gap-2.5 min-w-0">
        {icon && <span className="mt-0.5 text-fg-muted">{icon}</span>}
        <div className="min-w-0">
          <h2 className="text-sm font-semibold tracking-wide text-fg">{title}</h2>
          {subtitle && <p className="mt-0.5 text-xs text-fg-muted">{subtitle}</p>}
        </div>
      </div>
      {action}
    </div>
  );
}

type Variant = "primary" | "secondary" | "ghost" | "danger";
const variants: Record<Variant, string> = {
  primary: "bg-sky text-ink-950 hover:bg-[#7bbaff] font-semibold",
  secondary: "bg-ink-800 text-fg border border-ink-700 hover:border-ink-600 hover:bg-ink-700",
  ghost: "text-fg-muted hover:text-fg hover:bg-ink-800",
  danger: "bg-bad-soft text-bad border border-bad/30 hover:bg-bad/20",
};
const sizes = { sm: "h-8 px-3 text-xs gap-1.5", md: "h-10 px-4 text-sm gap-2", lg: "h-12 px-6 text-base gap-2" };

export function Button({ variant = "primary", size = "md", loading, className, children, ...rest }:
  ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: keyof typeof sizes; loading?: boolean }) {
  return (
    <button
      {...rest}
      disabled={rest.disabled || loading}
      className={clsx("inline-flex items-center justify-center rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap",
        variants[variant], sizes[size], className)}
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin" />}
      {children}
    </button>
  );
}

export function LinkButton({ href, variant = "secondary", size = "md", className, children }:
  { href: string; variant?: Variant; size?: keyof typeof sizes; className?: string; children: ReactNode }) {
  return (
    <Link href={href} className={clsx("inline-flex items-center justify-center rounded-lg transition-colors whitespace-nowrap", variants[variant], sizes[size], className)}>
      {children}
    </Link>
  );
}

const tones = {
  muted: "bg-ink-800 text-fg-muted border-ink-700",
  sky: "bg-sky-soft text-sky border-sky/25",
  ok: "bg-ok-soft text-ok border-ok/25",
  bad: "bg-bad-soft text-bad border-bad/25",
  amber: "bg-amber-soft text-amber border-amber/25",
  review: "bg-review-soft text-review border-review/25",
};
export type Tone = keyof typeof tones;

export function Badge({ tone = "muted", children, className }: { tone?: Tone; children: ReactNode; className?: string }) {
  return <span className={clsx("inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[11px] font-medium leading-none whitespace-nowrap", tones[tone], className)}>{children}</span>;
}

export function ProgressBar({ value, tone = "sky", className, height = "h-1.5" }: { value: number; tone?: "sky" | "ok" | "bad" | "amber"; className?: string; height?: string }) {
  const color = { sky: "bg-sky", ok: "bg-ok", bad: "bg-bad", amber: "bg-amber" }[tone];
  const v = Math.max(0, Math.min(100, value || 0));
  return (
    <div className={clsx("w-full overflow-hidden rounded-full bg-ink-700/70", height, className)} role="progressbar" aria-valuenow={Math.round(v)} aria-valuemin={0} aria-valuemax={100}>
      <div className={clsx("h-full rounded-full transition-[width] duration-700", color)} style={{ width: `${v}%` }} />
    </div>
  );
}

export function ProgressRing({ value, size = 96, stroke = 8, label, sub }: { value: number; size?: number; stroke?: number; label?: ReactNode; sub?: ReactNode }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const v = Math.max(0, Math.min(100, value || 0));
  return (
    <div className="relative inline-grid place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#1F2C47" strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#5AA9FF" strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c - (v / 100) * c} style={{ transition: "stroke-dashoffset .8s ease" }} />
      </svg>
      <div className="absolute text-center">
        <div className="text-xl font-semibold tabular">{label ?? `${Math.round(v)}%`}</div>
        {sub && <div className="text-[10px] uppercase tracking-wider text-fg-subtle">{sub}</div>}
      </div>
    </div>
  );
}

export function Stat({ label, value, sub, icon }: { label: string; value: ReactNode; sub?: ReactNode; icon?: ReactNode }) {
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between text-xs text-fg-muted">
        <span>{label}</span>
        {icon && <span className="text-fg-subtle">{icon}</span>}
      </div>
      <div className="mt-2 text-2xl font-semibold tabular tracking-tight">{value}</div>
      {sub && <div className="mt-1 text-xs text-fg-subtle tabular">{sub}</div>}
    </Card>
  );
}

export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-fg-muted">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function Loading({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-16 text-sm text-fg-muted">
      <Loader2 className="h-4 w-4 animate-spin" /> {label}
    </div>
  );
}

export function ErrorState({ message, retry }: { message: string; retry?: () => void }) {
  return (
    <Card className="flex flex-col items-center gap-3 px-6 py-10 text-center">
      <AlertTriangle className="h-6 w-6 text-amber" />
      <p className="max-w-md text-sm text-fg-muted">{message}</p>
      {retry && <Button variant="secondary" size="sm" onClick={retry}>Try again</Button>}
    </Card>
  );
}

export function EmptyState({ icon, title, children, action }: { icon?: ReactNode; title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 px-6 py-10 text-center">
      {icon && <div className="mb-1 text-fg-subtle">{icon}</div>}
      <p className="text-sm font-medium">{title}</p>
      {children && <div className="max-w-md text-sm text-fg-muted">{children}</div>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

export function Segmented<T extends string | number>({ value, onChange, options, className }:
  { value: T; onChange: (v: T) => void; options: { value: T; label: ReactNode }[]; className?: string }) {
  return (
    <div className={clsx("inline-flex flex-wrap gap-1 rounded-xl border border-ink-700 bg-ink-900 p-1", className)} role="radiogroup">
      {options.map((o) => (
        <button key={String(o.value)} role="radio" aria-checked={value === o.value} onClick={() => onChange(o.value)}
          className={clsx("rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
            value === o.value ? "bg-ink-700 text-fg" : "text-fg-muted hover:text-fg")}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Modal({ open, onClose, title, children, footer, wide }:
  { open: boolean; onClose: () => void; title: ReactNode; children: ReactNode; footer?: ReactNode; wide?: boolean }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 backdrop-blur-sm sm:items-center sm:p-4" onClick={onClose}>
      <div role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}
        className={clsx("w-full max-h-[90vh] overflow-y-auto rounded-t-2xl border border-ink-700 bg-ink-900 animate-fade-up sm:rounded-2xl", wide ? "sm:max-w-2xl" : "sm:max-w-md")}>
        <div className="flex items-center justify-between border-b border-ink-700 px-5 py-4">
          <h3 className="text-base font-semibold">{title}</h3>
          <button onClick={onClose} className="rounded-md p-1 text-fg-muted hover:bg-ink-800 hover:text-fg" aria-label="Close"><X className="h-4 w-4" /></button>
        </div>
        <div className="px-5 py-4">{children}</div>
        {footer && <div className="flex justify-end gap-2 border-t border-ink-700 px-5 py-4 safe-bottom">{footer}</div>}
      </div>
    </div>
  );
}

export function Field({ label, hint, children }: { label: string; hint?: ReactNode; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-fg-muted">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-fg-subtle">{hint}</span>}
    </label>
  );
}

export const RunwayDivider = ({ className }: { className?: string }) => <div className={clsx("runway", className)} aria-hidden />;
