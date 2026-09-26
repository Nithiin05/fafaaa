"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import clsx from "clsx";
import {
  LayoutDashboard, PlaneTakeoff, FileText, BookOpen, Target, NotebookPen, LineChart, ListChecks,
  RotateCcw, User, Bookmark, Search, Shield, MoreHorizontal, X, LogOut,
} from "lucide-react";
import { Brand } from "@/components/brand";
import { CompactCountdown } from "@/components/countdown";
import { supabase } from "@/lib/supabase/client";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/mocks", label: "Full Mock Tests", icon: PlaneTakeoff },
  { href: "/previous-papers", label: "Previous Papers", icon: FileText },
  { href: "/practice", label: "Subject Practice", icon: BookOpen },
  { href: "/topics", label: "Topic Practice", icon: Target },
  { href: "/mistakes", label: "Mistake Book", icon: NotebookPen },
  { href: "/performance", label: "Performance", icon: LineChart },
  { href: "/syllabus", label: "Syllabus", icon: ListChecks },
  { href: "/revision", label: "Revision", icon: RotateCcw },
  { href: "/bookmarks", label: "Bookmarks", icon: Bookmark },
  { href: "/profile", label: "Profile", icon: User },
];

const HEADER_LINKS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/mocks", label: "Mock Tests" },
  { href: "/practice", label: "Practice" },
  { href: "/previous-papers", label: "Previous Papers" },
  { href: "/performance", label: "Progress" },
];

const MOBILE = [
  { href: "/dashboard", label: "Home", icon: LayoutDashboard },
  { href: "/mocks", label: "Mocks", icon: PlaneTakeoff },
  { href: "/practice", label: "Practice", icon: BookOpen },
  { href: "/performance", label: "Progress", icon: LineChart },
];

const isActive = (path: string, href: string) => path === href || path.startsWith(href + "/");

export function AppShell({ children, isAdmin, examDate, name }: { children: ReactNode; isAdmin: boolean; examDate: string; name: string | null }) {
  const path = usePathname();
  const router = useRouter();
  const [more, setMore] = useState(false);
  const [q, setQ] = useState("");
  useEffect(() => setMore(false), [path]);

  const nav = isAdmin ? [...NAV, { href: "/admin", label: "Admin", icon: Shield }] : NAV;

  async function signOut() {
    await supabase().auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  return (
    <div className="min-h-screen">
      {/* Desktop / tablet sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-ink-700 bg-ink-950 md:flex">
        <div className="px-5 py-5"><Brand /></div>
        <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 pb-4">
          {nav.map(({ href, label, icon: Icon }) => (
            <Link key={href} href={href}
              className={clsx("flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                isActive(path, href) ? "bg-ink-800 text-fg" : "text-fg-muted hover:bg-ink-900 hover:text-fg")}>
              <Icon className={clsx("h-4 w-4", isActive(path, href) && "text-sky")} />
              {label}
            </Link>
          ))}
        </nav>
        <div className="border-t border-ink-700 px-3 py-3">
          <div className="truncate px-3 pb-2 text-xs text-fg-subtle">{name ?? "Student"}</div>
          <button onClick={signOut} className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-fg-muted hover:bg-ink-900 hover:text-fg">
            <LogOut className="h-4 w-4" /> Sign out
          </button>
        </div>
      </aside>

      <div className="md:pl-60">
        {/* Header */}
        <header className="sticky top-0 z-20 border-b border-ink-700 bg-ink-950/85 backdrop-blur">
          <div className="mx-auto flex h-14 max-w-7xl items-center gap-3 px-4 sm:px-6">
            <div className="md:hidden"><Brand /></div>
            <nav className="hidden items-center gap-1 xl:flex">
              {HEADER_LINKS.map((l) => (
                <Link key={l.href} href={l.href}
                  className={clsx("rounded-md px-2.5 py-1.5 text-xs font-medium", isActive(path, l.href) ? "text-fg" : "text-fg-muted hover:text-fg")}>
                  {l.label}
                </Link>
              ))}
            </nav>
            <form className="ml-auto hidden flex-1 justify-end sm:flex" onSubmit={(e) => { e.preventDefault(); if (q.trim()) router.push(`/search?q=${encodeURIComponent(q.trim())}`); }}>
              <div className="relative w-full max-w-xs">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-fg-subtle" />
                <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search questions, topics, notes…" aria-label="Search"
                  className="h-9 w-full rounded-lg pl-8 text-xs" />
              </div>
            </form>
            <Link href="/search" className="ml-auto rounded-lg p-2 text-fg-muted hover:bg-ink-800 sm:hidden" aria-label="Search"><Search className="h-4 w-4" /></Link>
            <CompactCountdown target={examDate} className="hidden sm:inline-flex" />
          </div>
        </header>

        <main className="mx-auto max-w-7xl px-4 pb-28 pt-6 sm:px-6 md:pb-12">{children}</main>
      </div>

      {/* Mobile bottom navigation */}
      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-ink-700 bg-ink-950/95 backdrop-blur safe-bottom md:hidden">
        <div className="grid grid-cols-5">
          {MOBILE.map(({ href, label, icon: Icon }) => (
            <Link key={href} href={href} className={clsx("flex flex-col items-center gap-1 py-2.5 text-[10px]", isActive(path, href) ? "text-sky" : "text-fg-muted")}>
              <Icon className="h-5 w-5" />{label}
            </Link>
          ))}
          <button onClick={() => setMore(true)} className="flex flex-col items-center gap-1 py-2.5 text-[10px] text-fg-muted">
            <MoreHorizontal className="h-5 w-5" />More
          </button>
        </div>
      </nav>

      {more && (
        <div className="fixed inset-0 z-40 bg-black/60 md:hidden" onClick={() => setMore(false)}>
          <div className="absolute inset-x-0 bottom-0 rounded-t-2xl border-t border-ink-700 bg-ink-900 p-4 safe-bottom animate-fade-up" onClick={(e) => e.stopPropagation()}>
            <div className="mb-3 flex items-center justify-between">
              <CompactCountdown target={examDate} />
              <button onClick={() => setMore(false)} className="rounded-md p-1.5 text-fg-muted" aria-label="Close"><X className="h-5 w-5" /></button>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {nav.map(({ href, label, icon: Icon }) => (
                <Link key={href} href={href} className={clsx("flex flex-col items-center gap-1.5 rounded-xl border px-2 py-3 text-center text-[11px]",
                  isActive(path, href) ? "border-sky/40 bg-sky-soft text-fg" : "border-ink-700 bg-ink-850 text-fg-muted")}>
                  <Icon className="h-5 w-5" />{label}
                </Link>
              ))}
              <button onClick={signOut} className="flex flex-col items-center gap-1.5 rounded-xl border border-ink-700 bg-ink-850 px-2 py-3 text-[11px] text-fg-muted">
                <LogOut className="h-5 w-5" />Sign out
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
