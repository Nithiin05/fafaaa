"use client";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, CheckCircle2, Clock, RotateCcw, Target, XCircle, MinusCircle, Timer } from "lucide-react";
import { Badge, Button, Card, CardHeader, EmptyState, ErrorState, Loading, ProgressBar, ProgressRing, Segmented } from "@/components/ui";
import { ChartCard, HBars } from "@/components/charts";
import { QuestionReview } from "@/components/question-review";
import { StartError, useStart } from "@/components/use-start";
import { rpc } from "@/lib/rpc";
import { dateTime, duration, pct } from "@/lib/format";
import type { AttemptPayload, ResultPayload } from "@/lib/types";

type Filter = "all" | "incorrect" | "unattempted" | "correct" | "marked" | "slow";

export default function ResultPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [attempt, setAttempt] = useState<AttemptPayload | null>(null);
  const [result, setResult] = useState<ResultPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<"analysis" | "review">("analysis");
  const [filter, setFilter] = useState<Filter>("all");
  const { start, busy, error: startError, clearError } = useStart();

  useEffect(() => {
    (async () => {
      try {
        const a = await rpc<AttemptPayload>("get_attempt", { p_attempt: params.id });
        if (a.attempt.status === "in_progress") { router.replace(`/test/${params.id}`); return; }
        const r = await rpc<ResultPayload>("get_result", { p_attempt: params.id });
        setAttempt(a); setResult(r);
      } catch (e) { setError((e as Error).message); }
    })();
  }, [params.id, router]);

  const slowSet = useMemo(() => new Set(result?.slow_questions.map((s) => s.position)), [result]);
  const reviewList = useMemo(() => (attempt?.questions ?? []).filter((q) => {
    if (filter === "incorrect") return q.is_correct === false;
    if (filter === "unattempted") return q.selected === null;
    if (filter === "correct") return q.is_correct === true;
    if (filter === "marked") return q.palette === "marked" || q.palette === "answered_marked";
    if (filter === "slow") return slowSet.has(q.position);
    return true;
  }), [attempt, filter, slowSet]);

  if (error) return <ErrorState message={error} />;
  if (!attempt || !result) return <Loading label="Scoring your test…" />;

  const a = attempt.attempt;
  const attempted = (a.correct ?? 0) + (a.incorrect ?? 0);
  const accuracy = attempted ? ((a.correct ?? 0) / attempted) * 100 : null;
  const topicsWithAttempts = result.topics.filter((t) => t.attempted > 0);
  // weakest: below 60% accuracy; strongest: 60% and above — so a topic never appears in both lists
  const weakest = topicsWithAttempts.filter((t) => (t.accuracy ?? 0) < 60)
    .sort((x, y) => (x.accuracy ?? 0) - (y.accuracy ?? 0) || y.attempted - x.attempted).slice(0, 5);
  const strongest = topicsWithAttempts.filter((t) => (t.accuracy ?? 0) >= 60)
    .sort((x, y) => (y.accuracy ?? 0) - (x.accuracy ?? 0) || y.correct - x.correct).slice(0, 5);
  const weakIds = weakest.map((t) => t.topic_id).slice(0, 3);
  const isFull = ["full_mock", "exam_simulation", "previous_paper"].includes(a.kind);

  return (
    <div className="space-y-6 animate-fade-up">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href={isFull ? "/mocks" : "/practice"} className="inline-flex items-center gap-1 text-xs text-fg-muted hover:text-fg"><ArrowLeft className="h-3.5 w-3.5" />Back</Link>
          <h1 className="mt-1 text-xl font-semibold tracking-tight sm:text-2xl">{a.title}</h1>
          <p className="text-sm text-fg-muted">
            {a.status === "auto_submitted" ? "Auto-submitted when time ran out" : "Submitted"} · {dateTime(a.submitted_at)}
          </p>
        </div>
        <Segmented value={tab} onChange={setTab} options={[{ value: "analysis", label: "Analysis" }, { value: "review", label: "Review answers" }]} />
      </div>

      {tab === "analysis" ? (
        <>
          {/* Score strip */}
          <Card className="grid gap-5 p-5 sm:grid-cols-[auto_1fr] sm:items-center sm:p-6">
            <ProgressRing value={a.total ? ((a.score ?? 0) / a.total) * 100 : 0} size={128} stroke={10}
              label={<span>{a.score}<span className="text-sm text-fg-muted">/{a.total}</span></span>} sub="score" />
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
              {[
                { icon: Target, label: "Accuracy", value: pct(accuracy) },
                { icon: CheckCircle2, label: "Correct", value: a.correct, tone: "text-ok" },
                { icon: XCircle, label: "Incorrect", value: a.incorrect, tone: "text-bad" },
                { icon: MinusCircle, label: "Unattempted", value: a.unattempted },
                { icon: Clock, label: "Time taken", value: duration(a.time_taken_seconds) },
              ].map(({ icon: Icon, label, value, tone }) => (
                <div key={label} className="rounded-xl border border-ink-700 bg-ink-850 px-3 py-2.5">
                  <div className="flex items-center gap-1.5 text-[11px] text-fg-subtle"><Icon className="h-3.5 w-3.5" />{label}</div>
                  <div className={`mt-1 text-lg font-semibold tabular ${tone ?? ""}`}>{value}</div>
                </div>
              ))}
            </div>
          </Card>

          <div className="flex flex-wrap gap-2">
            <Button onClick={() => setTab("review")}>Review answers</Button>
            <Button variant="secondary" disabled={!a.incorrect} loading={busy === "retry"}
              onClick={() => start("mistake_practice", null, { from_attempt: a.id }, "retry")}><RotateCcw className="h-4 w-4" />Retry incorrect questions</Button>
            <Button variant="secondary" disabled={!weakIds.length} loading={busy === "weak"}
              onClick={() => start("subject_practice", null, { topic_ids: weakIds, count: 20 }, "weak")}><Target className="h-4 w-4" />Practice weak topics</Button>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            {/* Subject breakdown */}
            <Card>
              <CardHeader title="Subject breakdown" subtitle="Score in each section" />
              <div className="overflow-x-auto px-5 pb-5 pt-3">
                <table className="w-full min-w-[420px] text-sm">
                  <thead className="text-left text-xs text-fg-subtle">
                    <tr><th className="pb-2 font-medium">Subject</th><th className="pb-2 font-medium">Score</th><th className="pb-2 font-medium">Wrong</th><th className="pb-2 font-medium">Skipped</th><th className="pb-2 font-medium">Time</th></tr>
                  </thead>
                  <tbody className="tabular">
                    {result.subjects.map((s) => (
                      <tr key={s.subject_id} className="border-t border-ink-700/70">
                        <td className="py-2.5 pr-3">
                          <div>{s.name}</div>
                          <ProgressBar value={(s.correct / s.total) * 100} className="mt-1.5 w-28" height="h-1" tone="ok" />
                        </td>
                        <td className="py-2.5 font-semibold">{s.correct}/{s.total}</td>
                        <td className="py-2.5 text-bad">{s.incorrect}</td>
                        <td className="py-2.5 text-fg-muted">{s.unattempted}</td>
                        <td className="py-2.5 text-fg-muted">{duration(s.time)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>

            <ChartCard title="Subject-wise accuracy" subtitle="Correct ÷ attempted in each section"
              table={{ head: ["Subject", "Accuracy", "Correct", "Attempted"], rows: result.subjects.map((s) => [s.name, pct(s.accuracy), s.correct, s.correct + s.incorrect]) }}>
              <HBars data={result.subjects} labelKey="name" valueKey="accuracy" fmt={(v) => `${Math.round(v)}%`} />
            </ChartCard>
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            <TopicList title="Weakest topics" items={weakest} tone="bad" />
            <TopicList title="Strongest topics" items={strongest} tone="ok" />
            <Card>
              <CardHeader title="Time management" subtitle={`Average ${result.avg_time_per_question}s per question`} icon={<Timer className="h-4 w-4" />} />
              <div className="px-5 pb-5 pt-3">
                {result.slow_questions.length ? (
                  <>
                    <p className="mb-2 text-xs text-fg-muted">Questions that took much longer than your average:</p>
                    <div className="flex flex-wrap gap-1.5">
                      {result.slow_questions.map((s) => (
                        <button key={s.position} onClick={() => { setFilter("slow"); setTab("review"); }}
                          className="rounded-md border border-ink-700 bg-ink-850 px-2 py-1 text-xs tabular hover:border-amber/50">
                          Q{s.position} · {s.time}s {s.is_correct === false ? "✗" : s.is_correct ? "✓" : ""}
                        </button>
                      ))}
                    </div>
                  </>
                ) : <p className="text-sm text-fg-muted">No questions took unusually long. Good pacing.</p>}
              </div>
            </Card>
          </div>
        </>
      ) : (
        <div className="space-y-4">
          <Segmented value={filter} onChange={setFilter} options={[
            { value: "all", label: `All (${attempt.questions.length})` },
            { value: "incorrect", label: `Incorrect (${a.incorrect})` },
            { value: "unattempted", label: `Unattempted (${a.unattempted})` },
            { value: "correct", label: `Correct (${a.correct})` },
            { value: "marked", label: "Marked" },
            { value: "slow", label: "Slow" },
          ]} />
          {reviewList.length ? reviewList.map((q) => (
            <QuestionReview key={q.position} number={q.position} text={q.text} imageUrl={q.image_url} options={q.options}
              correct={q.correct} selected={q.selected} explanation={q.explanation} concept={q.concept} difficulty={q.difficulty}
              subject={q.subject} topic={q.topic} timeSpent={q.time_spent}
              headerRight={q.source === "demo" ? <Badge>Demo</Badge> : undefined} />
          )) : <Card><EmptyState title="Nothing here" /></Card>}
        </div>
      )}
      <StartError message={startError} onClose={clearError} />
    </div>
  );
}

function TopicList({ title, items, tone }: { title: string; items: ResultPayload["topics"]; tone: "ok" | "bad" }) {
  return (
    <Card>
      <CardHeader title={title} />
      <div className="space-y-2.5 px-5 pb-5 pt-3">
        {items.length ? items.map((t) => (
          <div key={t.topic_id} className="flex items-center justify-between gap-3 text-sm">
            <span className="min-w-0 truncate">{t.name} <span className="text-xs text-fg-subtle">· {t.subject}</span></span>
            <span className={`shrink-0 font-semibold tabular ${tone === "ok" ? "text-ok" : "text-bad"}`}>{t.correct}/{t.attempted}</span>
          </div>
        )) : <p className="text-sm text-fg-muted">{tone === "bad" ? "No topics below 60% in this test." : "No topics at 60% or above yet."}</p>}
      </div>
    </Card>
  );
}
