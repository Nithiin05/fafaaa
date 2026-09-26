"use client";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { FileText, Play, RotateCcw, Trophy, Info } from "lucide-react";
import { Badge, Button, Card, CardHeader, EmptyState, ErrorState, Loading, PageHeader, Segmented } from "@/components/ui";
import { StartTestModal } from "@/components/start-test-modal";
import { StartError, useStart } from "@/components/use-start";
import { useRpc } from "@/lib/rpc";
import type { TestCard } from "@/lib/types";

type Tab = "official" | "memory" | "shift" | "subject";
type Counts = { subject_id: number; name: string; official: number; memory: number }[];

const isMemory = (t: TestCard) => (t.sources ?? []).includes("previous_memory_based") && !(t.sources ?? []).includes("previous_official");

export default function PreviousPapersPage() {
  const router = useRouter();
  const papers = useRpc<TestCard[]>("list_tests", { p_kind: "previous_paper" });
  const counts = useRpc<Counts>("get_previous_question_counts");
  const [tab, setTab] = useState<Tab>("official");
  const [pick, setPick] = useState<TestCard | null>(null);
  const { start, busy, error, clearError } = useStart();

  const list = useMemo(() => (papers.data ?? []).filter((p) => p.question_count > 0), [papers.data]);
  const official = list.filter((p) => !isMemory(p));
  const memory = list.filter(isMemory);
  const byYear = useMemo(() => {
    const g: Record<string, TestCard[]> = {};
    list.forEach((p) => { (g[String(p.paper_year ?? "Undated")] ??= []).push(p); });
    return Object.entries(g).sort((a, b) => b[0].localeCompare(a[0]));
  }, [list]);

  if ((papers.loading && !papers.data) || (counts.loading && !counts.data)) return <Loading />;
  if (papers.error || counts.error) return <ErrorState message={papers.error ?? counts.error ?? ""} />;

  const card = (p: TestCard) => (
    <Card key={p.id} className="flex flex-col p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="font-semibold">{p.title}</h3>
          <p className="mt-0.5 text-xs text-fg-muted tabular">{p.paper_year ?? "—"}{p.paper_shift ? ` | ${p.paper_shift}` : ""}</p>
        </div>
        <Badge tone={isMemory(p) ? "review" : "amber"}>{isMemory(p) ? "Memory-based" : "Official"}</Badge>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2 text-[11px]">
        <div><div className="text-fg-subtle">Questions</div><div className="font-semibold tabular">{p.question_count}</div></div>
        <div><div className="text-fg-subtle">Duration</div><div className="font-semibold tabular">{p.duration} min</div></div>
        <div><div className="text-fg-subtle">Best score</div><div className="font-semibold tabular">{p.best_score !== null ? `${p.best_score}/${p.question_count}` : "—"}</div></div>
      </div>
      <div className="mt-4 flex items-center justify-between">
        <span className="text-xs text-fg-subtle">{p.attempts ? <span className="text-ok"><Trophy className="mr-1 inline h-3.5 w-3.5" />Attempted</span> : "Not attempted"}</span>
        {p.in_progress
          ? <Button size="sm" variant="secondary" className="text-amber" onClick={() => router.push(`/test/${p.in_progress}`)}>Resume</Button>
          : <Button size="sm" variant={p.attempts ? "secondary" : "primary"} onClick={() => setPick(p)}>{p.attempts ? <><RotateCcw className="h-3.5 w-3.5" />Retake</> : <><Play className="h-3.5 w-3.5" />Start paper</>}</Button>}
      </div>
    </Card>
  );

  const empty = (what: string) => (
    <Card>
      <EmptyState icon={<FileText className="h-6 w-6" />} title={`No ${what} uploaded yet`}>
        Only real papers appear here — practice questions are never presented as previous-year papers. Administrators can upload papers from Admin → Import.
      </EmptyState>
    </Card>
  );

  return (
    <div className="animate-fade-up">
      <PageHeader title="Previous Papers" subtitle="Official and memory-based AAI JE (Operations) papers, clearly labelled by source." />
      <Segmented className="mb-5" value={tab} onChange={setTab} options={[
        { value: "official", label: `Official papers (${official.length})` },
        { value: "memory", label: `Memory-based (${memory.length})` },
        { value: "shift", label: "Shift-wise" },
        { value: "subject", label: "Subject-wise questions" },
      ]} />

      {tab === "official" && (official.length ? <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{official.map(card)}</div> : empty("official papers"))}
      {tab === "memory" && (memory.length ? <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{memory.map(card)}</div> : empty("memory-based papers"))}
      {tab === "shift" && (byYear.length ? (
        <div className="space-y-6">
          {byYear.map(([year, ps]) => (
            <div key={year}>
              <h2 className="mb-3 text-sm font-semibold text-fg-muted">{year}</h2>
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{ps.sort((a, b) => (a.paper_shift ?? "").localeCompare(b.paper_shift ?? "")).map(card)}</div>
            </div>
          ))}
        </div>
      ) : empty("papers"))}
      {tab === "subject" && (
        <Card>
          <CardHeader title="Previous questions by subject" subtitle="Practise only questions that came from uploaded previous papers" />
          <div className="divide-y divide-ink-700/70 px-5 pb-3 pt-2">
            {(counts.data ?? []).map((c) => {
              const total = c.official + c.memory;
              return (
                <div key={c.subject_id} className="flex items-center justify-between gap-3 py-3">
                  <div>
                    <div className="text-sm font-medium">{c.name}</div>
                    <div className="text-xs text-fg-subtle tabular">{c.official} official · {c.memory} memory-based</div>
                  </div>
                  <Button size="sm" variant="secondary" disabled={!total} loading={busy === `s${c.subject_id}`}
                    onClick={() => start("subject_practice", null, { subject_id: c.subject_id, previous_only: true, count: Math.min(20, total) }, `s${c.subject_id}`)}>
                    Practise {total ? Math.min(20, total) : ""}
                  </Button>
                </div>
              );
            })}
          </div>
          <p className="flex items-start gap-2 border-t border-ink-700 px-5 py-3 text-xs text-fg-subtle"><Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />Counts only include questions uploaded with an official or memory-based source.</p>
        </Card>
      )}

      <StartTestModal open={!!pick} onClose={() => setPick(null)} title={pick?.title ?? ""} questions={pick?.question_count} minutes={pick?.duration}
        loading={busy === "paper"} onStart={() => pick && start("previous_paper", pick.id, {}, "paper")} />
      <StartError message={error} onClose={() => { clearError(); setPick(null); }} />
    </div>
  );
}
