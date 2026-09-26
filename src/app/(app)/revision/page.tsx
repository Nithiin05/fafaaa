"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { CalendarClock, Flame, History, Bookmark, Sigma, PlaneTakeoff, Target, Repeat } from "lucide-react";
import { Badge, Button, Card, CardHeader, EmptyState, ErrorState, Loading, PageHeader, Segmented } from "@/components/ui";
import { StartError, useStart } from "@/components/use-start";
import { NoteSheet, type Note } from "@/components/note-sheet";
import { useRpc } from "@/lib/rpc";
import { supabase } from "@/lib/supabase/client";
import { BOOKMARK_CATEGORIES } from "@/lib/exam";
import { pct, relativeDays } from "@/lib/format";

type QItem = { question_id: string; text: string; subject: string; topic: string; wrong_count?: number; days_ago?: number; last_wrong_at?: string };
type Revision = {
  revise_today: QItem[]; weak_topics: { topic_id: number; name: string; subject: string; accuracy: number; attempted: number; status: string }[];
  frequently_incorrect: QItem[]; marked: Record<string, number>;
  recently_practiced: { topic_id: number; name: string; subject: string; last: string; answered: number; accuracy: number }[];
  last7_mistakes: QItem[];
};

function QList({ items, empty }: { items: QItem[]; empty: string }) {
  if (!items.length) return <p className="px-5 pb-5 pt-3 text-sm text-fg-muted">{empty}</p>;
  return (
    <ul className="divide-y divide-ink-700/60 px-5 pb-3 pt-1">
      {items.map((q) => (
        <li key={q.question_id} className="py-2.5 text-sm">
          <p className="line-clamp-2">{q.text}</p>
          <div className="mt-1 flex flex-wrap gap-2 text-[11px] text-fg-subtle">
            <span>{q.subject} · {q.topic}</span>
            {q.wrong_count ? <span className="text-bad">wrong {q.wrong_count}×</span> : null}
            {q.last_wrong_at && <span>{relativeDays(q.last_wrong_at)}</span>}
          </div>
        </li>
      ))}
    </ul>
  );
}

export default function RevisionPage() {
  const { data, error, loading, reload } = useRpc<Revision>("get_revision");
  const [notes, setNotes] = useState<Note[]>([]);
  const [sheet, setSheet] = useState<"formula" | "aviation_fact">("formula");
  const { start, busy, error: startError, clearError } = useStart();

  useEffect(() => {
    supabase().from("revision_notes").select("id, category, title, body, subject_id").order("sort_order").then(({ data }) => setNotes((data as Note[]) ?? []));
  }, []);

  if (loading && !data) return <Loading />;
  if (error || !data) return <ErrorState message={error ?? ""} retry={reload} />;

  const todayIds = data.revise_today.map((q) => q.question_id);
  const weakIds = data.weak_topics.slice(0, 3).map((t) => t.topic_id);
  const freqIds = data.frequently_incorrect.map((q) => q.question_id);
  const weekIds = data.last7_mistakes.map((q) => q.question_id);

  return (
    <div className="animate-fade-up space-y-6">
      <PageHeader title="Revision Centre" subtitle="Personalised from your attempts: what to revise today, weak areas, and quick-revision sheets." />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Revise today" subtitle="Unlearned mistakes due for a revisit (made today, 1, 3 or 7+ days ago)" icon={<CalendarClock className="h-4 w-4" />}
            action={<Button size="sm" disabled={!todayIds.length} loading={busy === "today"} onClick={() => start("mistake_practice", null, { question_ids: todayIds }, "today")}>Practise</Button>} />
          <QList items={data.revise_today} empty="Nothing due. Keep practising — mistakes will be scheduled here." />
        </Card>

        <Card>
          <CardHeader title="Weak topics" subtitle="Topics below the strong threshold (3+ answered)" icon={<Target className="h-4 w-4" />}
            action={<Button size="sm" disabled={!weakIds.length} loading={busy === "weak"} onClick={() => start("subject_practice", null, { topic_ids: weakIds, count: 20 }, "weak")}>Practise top 3</Button>} />
          {data.weak_topics.length ? (
            <ul className="space-y-2 px-5 pb-5 pt-3">
              {data.weak_topics.slice(0, 8).map((t) => (
                <li key={t.topic_id} className="flex items-center justify-between gap-3 text-sm">
                  <span className="min-w-0 truncate">{t.name} <span className="text-xs text-fg-subtle">· {t.subject}</span></span>
                  <span className="flex items-center gap-2">
                    {t.status === "needs_revision" && <Badge tone="bad">Needs revision</Badge>}
                    <span className="font-semibold tabular">{pct(t.accuracy)}</span>
                  </span>
                </li>
              ))}
            </ul>
          ) : <EmptyState title="No weak topics yet">Answer at least 3 questions in a topic to see it assessed.</EmptyState>}
        </Card>

        <Card>
          <CardHeader title="Frequently incorrect" subtitle="Questions you've got wrong twice or more" icon={<Repeat className="h-4 w-4" />}
            action={<Button size="sm" variant="secondary" disabled={!freqIds.length} loading={busy === "freq"} onClick={() => start("mistake_practice", null, { question_ids: freqIds }, "freq")}>Practise</Button>} />
          <QList items={data.frequently_incorrect} empty="None yet." />
        </Card>

        <Card>
          <CardHeader title="Last 7 days mistakes" icon={<Flame className="h-4 w-4" />}
            action={<Button size="sm" variant="secondary" disabled={!weekIds.length} loading={busy === "week"} onClick={() => start("mistake_practice", null, { question_ids: weekIds.slice(0, 100) }, "week")}>Practise</Button>} />
          <QList items={data.last7_mistakes.slice(0, 10)} empty="No mistakes in the last 7 days." />
        </Card>

        <Card>
          <CardHeader title="Marked questions" subtitle="Your bookmarks by category" icon={<Bookmark className="h-4 w-4" />} action={<Link href="/bookmarks" className="text-xs text-sky">Open</Link>} />
          <div className="grid grid-cols-2 gap-2 p-5 sm:grid-cols-3">
            {BOOKMARK_CATEGORIES.map((c) => (
              <Link key={c.value} href="/bookmarks" className="rounded-xl border border-ink-700 bg-ink-850 px-3 py-2.5 hover:border-ink-600">
                <div className="text-[11px] text-fg-subtle">{c.label}</div><div className="text-lg font-semibold tabular">{data.marked[c.value] ?? 0}</div>
              </Link>
            ))}
          </div>
        </Card>

        <Card>
          <CardHeader title="Recently practised" subtitle="Last 14 days" icon={<History className="h-4 w-4" />} />
          {data.recently_practiced.length ? (
            <ul className="space-y-2 px-5 pb-5 pt-3">
              {data.recently_practiced.map((t) => (
                <li key={t.topic_id} className="flex items-center justify-between gap-3 text-sm">
                  <span className="min-w-0 truncate">{t.name} <span className="text-xs text-fg-subtle">· {relativeDays(t.last)}</span></span>
                  <span className="text-xs tabular text-fg-muted">{t.answered} Q · {pct(t.accuracy)}</span>
                </li>
              ))}
            </ul>
          ) : <p className="px-5 pb-5 pt-3 text-sm text-fg-muted">Nothing practised recently.</p>}
        </Card>
      </div>

      <section>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">Quick revision</h2>
          <Segmented value={sheet} onChange={setSheet} options={[
            { value: "formula", label: <span className="inline-flex items-center gap-1.5"><Sigma className="h-3.5 w-3.5" />Important formulas</span> },
            { value: "aviation_fact", label: <span className="inline-flex items-center gap-1.5"><PlaneTakeoff className="h-3.5 w-3.5" />Aviation facts</span> },
          ]} />
        </div>
        <div className="space-y-2">
          {notes.filter((n) => n.category === sheet).map((n, i) => <NoteSheet key={n.id} note={n} defaultOpen={i === 0} />)}
          {!notes.length && <Card><EmptyState title="No revision notes yet" /></Card>}
        </div>
      </section>
      <StartError message={startError} onClose={clearError} />
    </div>
  );
}
