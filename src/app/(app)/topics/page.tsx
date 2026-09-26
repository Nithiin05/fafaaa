"use client";
import { useMemo, useState } from "react";
import { Play, Search } from "lucide-react";
import { Button, Card, EmptyState, ErrorState, Loading, PageHeader, ProgressBar, Segmented } from "@/components/ui";
import { TopicStatus } from "@/components/topic-status";
import { StartError, useStart } from "@/components/use-start";
import { useRpc } from "@/lib/rpc";
import { pct } from "@/lib/format";
import type { SyllabusSubject } from "@/lib/types";

export default function TopicsPage() {
  const { data, error, loading, reload } = useRpc<SyllabusSubject[]>("get_syllabus_progress");
  const [q, setQ] = useState("");
  const [subject, setSubject] = useState<number | 0>(0);
  const [count, setCount] = useState(10);
  const { start, busy, error: startError, clearError } = useStart();

  const rows = useMemo(() => (data ?? [])
    .filter((s) => !subject || s.subject_id === subject)
    .flatMap((s) => s.topics.map((t) => ({ ...t, subject: s.short_name, subject_id: s.subject_id })))
    .filter((t) => !q || t.name.toLowerCase().includes(q.toLowerCase())), [data, q, subject]);

  if (loading && !data) return <Loading />;
  if (error || !data) return <ErrorState message={error ?? ""} retry={reload} />;

  return (
    <div className="animate-fade-up">
      <PageHeader title="Topic Practice" subtitle="Go straight to any topic. Completion and accuracy update as soon as you finish a set." />
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="relative w-full lg:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-subtle" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Find a topic…" className="w-full pl-9" aria-label="Find a topic" />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-fg-muted">Questions per set</span>
          <Segmented value={count} onChange={setCount} options={[5, 10, 25, 50].map((c) => ({ value: c, label: String(c) }))} />
        </div>
      </div>
      <Segmented className="mb-4" value={subject} onChange={setSubject}
        options={[{ value: 0, label: "All" }, ...data.map((s) => ({ value: s.subject_id, label: s.short_name }))]} />

      <Card>
        {rows.length === 0 ? <EmptyState title="No topics match" /> : (
          <ul className="divide-y divide-ink-700/70">
            {rows.map((t) => (
              <li key={t.topic_id} className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:px-5">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-medium">{t.name}</span>
                    <TopicStatus status={t.status} />
                  </div>
                  <div className="mt-0.5 text-xs text-fg-subtle">{t.subject}{t.group ? ` · ${t.group}` : ""}</div>
                </div>
                <div className="flex items-center gap-4 sm:w-[22rem]">
                  <div className="flex-1">
                    <div className="flex justify-between text-[11px] text-fg-subtle tabular"><span>{t.attempted}/{t.total}</span><span>Acc {pct(t.accuracy)}</span></div>
                    <ProgressBar value={t.coverage} className="mt-1" />
                  </div>
                  <Button size="sm" variant="secondary" disabled={!t.total} loading={busy === `t${t.topic_id}`}
                    onClick={() => start("topic_practice", null, { topic_id: t.topic_id, count }, `t${t.topic_id}`)}>
                    <Play className="h-3.5 w-3.5" />{t.total ? "Practise" : "No questions"}
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
      <StartError message={startError} onClose={clearError} />
    </div>
  );
}
