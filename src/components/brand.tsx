import Link from "next/link";

/** Brand mark: a runway seen from the approach, with a route line climbing away. */
export function BrandMark({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden>
      <rect width="32" height="32" rx="9" fill="#15213A" />
      <path d="M11 27 L14.5 7 M21 27 L17.5 7" stroke="#93A0BA" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M16 25v-2.4M16 19.6v-2.2M16 14.6v-2M16 10.4V9" stroke="#F2B544" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M6 20c5-1 9-5 11-9s6-6 9-6" stroke="#5AA9FF" strokeWidth="1.8" fill="none" strokeLinecap="round" />
      <circle cx="26" cy="5" r="1.8" fill="#5AA9FF" />
    </svg>
  );
}

export function Brand({ href = "/dashboard" }: { href?: string }) {
  return (
    <Link href={href} className="flex items-center gap-2.5">
      <BrandMark />
      <div className="leading-tight">
        <div className="text-sm font-semibold tracking-tight">Fafaaa</div>
        <div className="text-[10px] font-medium uppercase tracking-[0.18em] text-fg-subtle">AAI JE Ops · 2026</div>
      </div>
    </Link>
  );
}
