"use client";
import Link from "next/link";
import { LineChart as LineIcon } from "lucide-react";
import { Card, EmptyState, ErrorState, LinkButton, Loading, PageHeader, Stat } from "@/components/ui";
import { ChartCard, Columns, HBars, TopicHeatmap, TrendLine } from "@/components/charts";
import { useRpc } from "@/lib/rpc";
import { pct, shortDate } from "@/lib/format";

type Analytics = {
  mocks: { attempt_id: string; title: string; date: string; score: number; total: number; accuracy: number | null; minutes: number }[];
  daily: { date: string; answered: number; correct: number; accuracy: number | null }[];
  subjects: { name: string; attempted: number; correct: number; accuracy: number | null; avg_seconds: number | null }[];
  topics: { topic_id: number; name: string; subject: string; attempted: number; accuracy: number | null; strength: string | null }[];
};

export default function PerformancePage() {
  const { data, error, loading, reload } = useRpc<Analytics>("get_analytics");
  if (loading && !data) return <Loading />;
  if (error || !data) return <ErrorState message={error ?? ""} retry={reload} />;

  const { mocks, daily, subjects, topics } = data;
  if (!mocks.length && !daily.length) {
    return (
      <div className="animate-fade-up">
        <PageHeader title="Performance" />
        <Card><EmptyState icon={<LineIcon className="h-6 w-6" />} title="No attempts yet"
          action={<LinkButton href="/mocks" variant="primary" size="sm">Take a mock test</LinkButton>}>
          Charts appear after your first submitted test or practice set.
        </EmptyState></Card>
      </div>
    );
  }

  const scores = mocks.map((m) => m.score);
  const high = scores.length ? Math.max(...scores) : null;
  const low = scores.length ? Math.min(...scores) : null;
  const avg = scores.length ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10 : null;
  const totalAns = daily.reduce((a, d) => a + d.answered, 0);
  const totalCorrect = daily.reduce((a, d) => a + d.correct, 0);
  const ranked = subjects.filter((s) => s.attempted >= 10 && s.accuracy !== null).sort((a, b) => (b.accuracy ?? 0) - (a.accuracy ?? 0));
  const best = ranked[0];
  const worst = ranked.length > 1 ? ranked[ranked.length - 1] : undefined;

  const mockSeries = mocks.map((m, i) => ({ label: `M${i + 1}`, score: m.score, tip: `${m.title} · ${shortDate(m.date)}` }));
  const dailySeries = daily.map((d) => ({ label: shortDate(d.date), answered: d.answered, accuracy: d.accuracy ?? 0, tip: shortDate(d.date) }));
  const maxSec = Math.max(60, ...subjects.map((s) => s.avg_seconds ?? 0));

  return (
    <div className="animate-fade-up space-y-6">
      <PageHeader title="Performance" subtitle="Trends from your submitted tests and practice. No predictions — just your numbers." />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-6">
        <Stat label="Highest score" value={high ?? "—"} sub={high !== null ? `of ${mocks[scores.indexOf(high)].total}` : "no mocks yet"} />
        <Stat label="Average score" value={avg ?? "—"} sub={`${mocks.length} mock${mocks.length === 1 ? "" : "s"}`} />
        <Stat label="Lowest score" value={low ?? "—"} />
        <Stat label="Average accuracy" value={pct(totalAns ? (totalCorrect / totalAns) * 100 : null, 1)} sub={`${totalAns} answers (60 days)`} />
        <Stat label="Best subject" value={<span className="text-lg">{best?.name ?? "—"}</span>} sub={best ? pct(best.accuracy) : "needs 10+ answers"} />
        <Stat label="Weakest subject" value={<span className="text-lg">{worst?.name ?? "—"}</span>} sub={worst ? pct(worst.accuracy) : "needs 10+ answers"} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <ChartCard title="Mock test scores" subtitle="Score out of 120, in the order you took them"
          table={{ head: ["#", "Test", "Date", "Score", "Accuracy", "Minutes"], rows: mocks.map((m, i) => [i + 1, m.title, shortDate(m.date), `${m.score}/${m.total}`, pct(m.accuracy), m.minutes]) }}>
          {mocks.length ? <TrendLine data={mockSeries} xKey="label" yKey="score" yMax={120} fmt={(v) => `${v} / 120`} />
            : <EmptyState title="No mocks yet" action={<Link className="text-sm text-sky" href="/mocks">Start one</Link>} />}
        </ChartCard>
        <ChartCard title="Accuracy over time" subtitle="Daily accuracy across all attempts (%)"
          table={{ head: ["Date", "Answered", "Correct", "Accuracy"], rows: daily.map((d) => [shortDate(d.date), d.answered, d.correct, pct(d.accuracy)]) }}>
          <TrendLine data={dailySeries} xKey="label" yKey="accuracy" yMax={100} fmt={(v) => `${v}%`} />
        </ChartCard>
        <ChartCard title="Questions attempted" subtitle="Answered questions per day"
          table={{ head: ["Date", "Answered"], rows: daily.map((d) => [shortDate(d.date), d.answered]) }}>
          <Columns data={dailySeries} xKey="label" yKey="answered" fmt={(v) => `${v} questions`} />
        </ChartCard>
        <ChartCard title="Subject accuracy" subtitle="Latest attempt of each question"
          table={{ head: ["Subject", "Attempted", "Correct", "Accuracy"], rows: subjects.map((s) => [s.name, s.attempted, s.correct, pct(s.accuracy)]) }}>
          <HBars data={subjects} labelKey="name" valueKey="accuracy" fmt={(v) => `${Math.round(v)}%`} />
        </ChartCard>
        <ChartCard title="Time management" subtitle="Average seconds per answered question (120 min ÷ 120 Q = 60s budget)"
          table={{ head: ["Subject", "Avg seconds"], rows: subjects.map((s) => [s.name, s.avg_seconds ?? "—"]) }}>
          <HBars data={subjects} labelKey="name" valueKey="avg_seconds" max={maxSec} fmt={(v) => `${v}s`} />
        </ChartCard>
        <ChartCard title="Topic accuracy heatmap" subtitle="Each square is a topic you've attempted — hover for details"
          table={{ head: ["Subject", "Topic", "Answered", "Accuracy"], rows: topics.map((t) => [t.subject, t.name, t.attempted, pct(t.accuracy)]) }}>
          {topics.length ? <TopicHeatmap topics={topics} /> : <EmptyState title="No topics attempted yet" />}
        </ChartCard>
      </div>
    </div>
  );
}
