"use client";
import { useState } from "react";
import clsx from "clsx";
import { ChevronDown, Play } from "lucide-react";
import { Badge, Button, Card, ErrorState, Loading, Modal, PageHeader, ProgressBar, ProgressRing, Segmented } from "@/components/ui";
import { TopicStatus } from "@/components/topic-status";
import { StartError, useStart } from "@/components/use-start";
import { useRpc } from "@/lib/rpc";
import { pct } from "@/lib/format";
import type { SyllabusSubject, TopicProgress } from "@/lib/types";

export default function SyllabusPage() {
  const { data, error, loading, reload } = useRpc<SyllabusSubject[]>("get_syllabus_progress");
  const [open, setOpen] = useState<number | null>(null);
  const [pick, setPick] = useState<TopicProgress | null>(null);
  const [count, setCount] = useState(10);
  const { start, busy, error: startError, clearError } = useStart();

  if (loading && !data) return <Loading />;
  if (error || !data) return <ErrorState message={error ?? ""} retry={reload} />;

  const totals = data.reduce((a, s) => ({ total: a.total + s.total, attempted: a.attempted + s.attempted }), { total: 0, attempted: 0 });
  const allTopics = data.flatMap((s) => s.topics);
  const byStatus = (st: string) => allTopics.filter((t) => t.status === st).length;

  return (
    <div className="animate-fade-up">
      <PageHeader title="Syllabus Coverage" subtitle="Every subject and topic of the AAI JE (Operations) syllabus. Click a topic to practise it." />

      <Card className="mb-6 flex flex-col gap-5 p-5 sm:flex-row sm:items-center">
        <ProgressRing value={totals.total ? (totals.attempted / totals.total) * 100 : 0} size={104} sub="covered" />
        <div className="grid flex-1 grid-cols-2 gap-3 sm:grid-cols-4">
          {[["Not started", "not_started", "text-fg-muted"], ["In progress", "in_progress", "text-sky"], ["Completed", "completed", "text-ok"], ["Needs revision", "needs_revision", "text-bad"]].map(([l, k, c]) => (
            <div key={k} className="rounded-xl border border-ink-700 bg-ink-850 px-3 py-2.5">
              <div className="text-[11px] text-fg-subtle">{l}</div>
              <div className={clsx("text-xl font-semibold tabular", c)}>{byStatus(k)}</div>
              <div className="text-[10px] text-fg-subtle">topics</div>
            </div>
          ))}
        </div>
      </Card>

      <div className="space-y-3">
        {data.map((s) => {
          const isOpen = open === s.subject_id;
          return (
            <Card key={s.subject_id}>
              <button onClick={() => setOpen(isOpen ? null : s.subject_id)} className="flex w-full items-center gap-4 px-5 py-4 text-left" aria-expanded={isOpen}>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold">{s.name}</span>
                    <Badge>Part {s.part} · {s.questions_in_exam} in exam</Badge>
                  </div>
                  <div className="mt-2 flex items-center gap-3">
                    <ProgressBar value={s.coverage} className="max-w-sm" />
                    <span className="shrink-0 text-xs tabular text-fg-muted">{pct(s.coverage)} · acc {pct(s.accuracy)}</span>
                  </div>
                </div>
                <span className="hidden text-xs text-fg-subtle sm:block">{s.topics.length} topics</span>
                <ChevronDown className={clsx("h-4 w-4 text-fg-muted transition", isOpen && "rotate-180")} />
              </button>
              {isOpen && (
                <div className="overflow-x-auto border-t border-ink-700">
                  <table className="w-full min-w-[640px] text-sm">
                    <thead className="text-left text-[11px] uppercase tracking-wider text-fg-subtle">
                      <tr>
                        <th className="px-5 py-2.5 font-medium">Topic</th><th className="px-2 py-2.5 font-medium">Available</th>
                        <th className="px-2 py-2.5 font-medium">Attempted</th><th className="px-2 py-2.5 font-medium">Correct</th>
                        <th className="px-2 py-2.5 font-medium">Accuracy</th><th className="px-2 py-2.5 font-medium">Completion</th>
                        <th className="px-5 py-2.5 font-medium">Status</th>
                      </tr>
                    </thead>
                    <tbody className="tabular">
                      {s.topics.map((t) => (
                        <tr key={t.topic_id} onClick={() => t.total && setPick(t)}
                          className={clsx("border-t border-ink-700/60", t.total ? "cursor-pointer hover:bg-ink-850" : "opacity-60")}>
                          <td className="px-5 py-2.5"><div className="font-sans">{t.name}</div>{t.group && <div className="text-[11px] text-fg-subtle">{t.group}</div>}</td>
                          <td className="px-2 py-2.5">{t.total}</td>
                          <td className="px-2 py-2.5">{t.attempted}</td>
                          <td className="px-2 py-2.5">{t.correct}</td>
                          <td className="px-2 py-2.5">{pct(t.accuracy)}</td>
                          <td className="px-2 py-2.5"><div className="flex items-center gap-2"><ProgressBar value={t.coverage} className="w-20" /><span className="text-xs">{pct(t.coverage)}</span></div></td>
                          <td className="px-5 py-2.5"><TopicStatus status={t.status} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          );
        })}
      </div>

      <Modal open={!!pick} onClose={() => setPick(null)} title={pick?.name ?? ""}
        footer={<>
          <Button variant="secondary" onClick={() => setPick(null)}>Cancel</Button>
          <Button loading={!!busy} onClick={() => pick && start("topic_practice", null, { topic_id: pick.topic_id, count })}><Play className="h-4 w-4" />Start</Button>
        </>}>
        <p className="mb-3 text-sm text-fg-muted">{pick?.total} questions available · {pick?.attempted} attempted · accuracy {pct(pick?.accuracy)}</p>
        <Segmented value={count} onChange={setCount} options={[5, 10, 25, 50].map((c) => ({ value: c, label: `${c} questions` }))} />
      </Modal>
      <StartError message={startError} onClose={clearError} />
    </div>
  );
}
