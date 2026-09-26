"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";

const TABS = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/questions", label: "Questions" },
  { href: "/admin/import", label: "Bulk import" },
  { href: "/admin/syllabus", label: "Subjects & topics" },
  { href: "/admin/tests", label: "Mocks & papers" },
  { href: "/admin/settings", label: "Settings" },
];

export function AdminNav() {
  const path = usePathname();
  return (
    <nav className="mt-2 flex gap-1 overflow-x-auto border-b border-ink-700">
      {TABS.map((t) => (
        <Link key={t.href} href={t.href}
          className={clsx("shrink-0 border-b-2 px-3 py-2 text-sm", (t.href === "/admin" ? path === t.href : path.startsWith(t.href)) ? "border-sky text-fg" : "border-transparent text-fg-muted hover:text-fg")}>
          {t.label}
        </Link>
      ))}
    </nav>
  );
}
