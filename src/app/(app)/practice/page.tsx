"use client";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import clsx from "clsx";
import { Play } from "lucide-react";
import { Button, Card, ErrorState, Loading, PageHeader, ProgressBar, Segmented } from "@/components/ui";
import { StartError, useStart } from "@/components/use-start";
import { useRpc } from "@/lib/rpc";
import { DIFFICULTIES, QUESTION_COUNTS } from "@/lib/exam";
import { pct } from "@/lib/format";
import type { SyllabusSubject } from "@/lib/types";

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-3 sm:grid-cols-[9rem_1fr] sm:gap-6">
      <div className="flex items-center gap-2 sm:items-start sm:pt-1">
        <span className="grid h-6 w-6 place-items-center rounded-full border border-ink-600 text-xs font-semibold text-fg-muted">{n}</span>
        <span className="text-sm font-medium">{title}</span>
      </div>
      <div>{children}</div>
    </div>
  );
}

function PracticeBuilder() {
  const params = useSearchParams();
  const { data, error, loading, reload } = useRpc<SyllabusSubject[]>("get_syllabus_progress");
  const [subjectId, setSubjectId] = useState<number | null>(null);
  const [topicId, setTopicId] = useState<number | "all">("all");
  const [difficulty, setDifficulty] = useState<string>("");
  const [count, setCount] = useState(10);
  const { start, busy, error: startError, clearError } = useStart();

  useEffect(() => {
    if (!data) return;
    const fromUrl = Number(params.get("subject"));
    setSubjectId(data.find((s) => s.subject_id === fromUrl)?.subject_id ?? data[0]?.subject_id ?? null);
    const t = Number(params.get("topic"));
    if (t) setTopicId(t);
  }, [data, params]);

  const subject = useMemo(() => data?.find((s) => s.subject_id === subjectId), [data, subjectId]);
  const topic = subject?.topics.find((t) => t.topic_id === topicId);
  const available = topic ? topic.total : subject?.total ?? 0;

  if (loading && !data) return <Loading />;
  if (error || !data) return <ErrorState message={error ?? ""} retry={reload} />;

  return (
    <div className="animate-fade-up">
      <PageHeader title="Subject Practice" subtitle="Choose a subject, topic, difficulty and number of questions. Explanations are shown when you finish the set." />
      <Card className="space-y-7 p-5 sm:p-6">
        <Step n={1} title="Subject">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
            {data.map((s) => (
              <button key={s.subject_id} onClick={() => { setSubjectId(s.subject_id); setTopicId("all"); }}
                className={clsx("rounded-xl border px-3 py-2.5 text-left transition-colors",
                  s.subject_id === subjectId ? "border-sky bg-sky-soft" : "border-ink-700 bg-ink-850 hover:border-ink-600")}>
                <div className="text-sm font-medium">{s.short_name}</div>
                <div className="mt-1 text-[11px] text-fg-subtle tabular">Part {s.part} · {s.total} questions · {pct(s.coverage)} done</div>
              </button>
            ))}
          </div>
        </Step>

        <Step n={2} title="Topic">
          <select value={String(topicId)} onChange={(e) => setTopicId(e.target.value === "all" ? "all" : Number(e.target.value))} className="w-full sm:max-w-md">
            <option value="all">All topics in {subject?.short_name} ({subject?.total} questions)</option>
            {subject?.topics.map((t) => (
              <option key={t.topic_id} value={t.topic_id} disabled={t.total === 0}>
                {t.name} — {t.total} question{t.total === 1 ? "" : "s"}{t.attempted ? ` · ${Math.round(t.coverage)}% done` : ""}
              </option>
            ))}
          </select>
          {topic && (
            <div className="mt-3 max-w-md">
              <div className="flex justify-between text-xs text-fg-muted"><span>{topic.attempted}/{topic.total} attempted</span><span>Accuracy {pct(topic.accuracy)}</span></div>
              <ProgressBar value={topic.coverage} className="mt-1.5" />
            </div>
          )}
        </Step>

        <Step n={3} title="Difficulty">
          <Segmented value={difficulty} onChange={setDifficulty} options={[{ value: "", label: "Any" }, ...DIFFICULTIES.map((d) => ({ value: d.value as string, label: d.label }))]} />
        </Step>

        <Step n={4} title="Questions">
          <Segmented value={count} onChange={setCount} options={QUESTION_COUNTS.map((c) => ({ value: c, label: `${c}` }))} />
          {available > 0 && available < count && <p className="mt-2 text-xs text-amber">Only {available} question{available === 1 ? "" : "s"} available here — the set will have {available}.</p>}
        </Step>

        <div className="flex flex-col gap-3 border-t border-ink-700 pt-5 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-fg-muted">
            {subject?.short_name} → {topic?.name ?? "All topics"} → {DIFFICULTIES.find((d) => d.value === difficulty)?.label ?? "Any difficulty"} → {count} questions
          </p>
          <Button size="lg" disabled={!available} loading={!!busy}
            onClick={() => start(topic ? "topic_practice" : "subject_practice", null,
              { subject_id: subjectId, ...(topic ? { topic_id: topic.topic_id } : {}), ...(difficulty ? { difficulty } : {}), count })}>
            <Play className="h-4 w-4" />Start practice
          </Button>
        </div>
      </Card>
      <StartError message={startError} onClose={clearError} />
    </div>
  );
}

export default function PracticePage() {
  return <Suspense fallback={<Loading />}><PracticeBuilder /></Suspense>;
}
