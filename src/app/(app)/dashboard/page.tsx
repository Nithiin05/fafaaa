"use client";
import Link from "next/link";
import {
  ArrowRight, BookOpen, Clock, Flame, FileText, PlaneTakeoff, RotateCcw, Target, TrendingUp, CheckCircle2, CircleDot,
} from "lucide-react";
import { Badge, Button, Card, CardHeader, EmptyState, ErrorState, LinkButton, Loading, ProgressBar, ProgressRing, RunwayDivider, Stat } from "@/components/ui";
import { HeroCountdown } from "@/components/countdown";
import { useExamDate } from "@/components/exam-date";
import { StartError, useStart } from "@/components/use-start";
import { useRpc } from "@/lib/rpc";
import { STRENGTH } from "@/lib/exam";
import { num, pct, shortDate } from "@/lib/format";
import type { Dashboard } from "@/lib/types";

export default function DashboardPage() {
  const { data, error, loading, reload } = useRpc<Dashboard>("get_dashboard");
  const examDate = useExamDate();
  const { start, busy, error: startError, clearError } = useStart();

  if (loading && !data) return <Loading />;
  if (error || !data) return <ErrorState message={error ?? "Could not load your dashboard."} retry={reload} />;

  const { overall, mocks, subjects, today, targets } = data;
  const weakIds = data.weak_topics.map((t) => t.topic_id).slice(0, 3);

  return (
    <div className="space-y-6 animate-fade-up">
      {data.live_attempt && (
        <Link href={`/test/${data.live_attempt.attempt_id}`}
          className="flex items-center justify-between gap-3 rounded-xl border border-amber/40 bg-amber-soft px-4 py-3 text-sm">
          <span><b className="font-semibold text-amber">Test in progress:</b> {data.live_attempt.title} — your answers are saved.</span>
          <span className="inline-flex items-center gap-1 font-medium text-amber">Resume <ArrowRight className="h-4 w-4" /></span>
        </Link>
      )}

      {/* Hero */}
      <Card className="relative overflow-hidden p-5 sm:p-7">
        <svg className="pointer-events-none absolute -right-8 -top-4 hidden opacity-25 lg:block" width="460" height="200" viewBox="0 0 460 200" aria-hidden>
          <path d="M0 190 C 150 185, 230 110, 290 70 S 410 14, 455 12" stroke="#5AA9FF" strokeWidth="1.5" strokeDasharray="4 8" fill="none" />
          <circle cx="455" cy="12" r="4" fill="#5AA9FF" />
        </svg>
        <div className="grid gap-6 lg:grid-cols-[1fr_1.1fr] lg:items-center">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-fg-subtle">Preparation dashboard</p>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">AAI Junior Executive (Operations) 2026</h1>
            <p className="mt-2 text-fg-muted">Your preparation. Your progress. Your flight to success.</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {["120 Questions", "120 Marks", "120 Minutes", "No Negative Marking"].map((c) => <Badge key={c}>{c}</Badge>)}
              {data.streak > 0 && <Badge tone="amber"><Flame className="h-3 w-3" /> {data.streak}-day streak</Badge>}
            </div>
          </div>
          <HeroCountdown target={examDate} />
        </div>
      </Card>

      {/* Top stats */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="flex items-center gap-4 p-4 sm:col-span-2 lg:col-span-1 lg:row-span-2 lg:flex-col lg:justify-center lg:text-center">
          <ProgressRing value={overall.coverage} size={112} sub="coverage" />
          <div>
            <div className="text-sm font-semibold">Overall preparation</div>
            <p className="mt-1 text-xs text-fg-muted">Unique questions attempted out of everything in the bank.</p>
          </div>
        </Card>
        <Stat label="Questions attempted" value={num(overall.attempted)} sub={`of ${num(overall.total_questions)} available`} icon={<CircleDot className="h-4 w-4" />} />
        <Stat label="Questions correct" value={num(overall.correct)} sub="latest attempt of each question" icon={<CheckCircle2 className="h-4 w-4" />} />
        <Stat label="Accuracy" value={pct(overall.accuracy, 1)} sub={overall.attempted ? "correct ÷ attempted" : "attempt questions to see this"} icon={<Target className="h-4 w-4" />} />
        <Stat label="Mock tests completed" value={`${mocks.completed}`} sub={`${mocks.available} mocks in the series`} icon={<PlaneTakeoff className="h-4 w-4" />} />
        <Stat label="Average mock score" value={mocks.avg_score !== null ? `${mocks.avg_score} / ${mocks.avg_total ?? 120}` : "—"} sub="across completed full-length tests" icon={<TrendingUp className="h-4 w-4" />} />
        <Stat label="Average time" value={mocks.avg_minutes !== null ? `${mocks.avg_minutes} min` : "—"} sub="per full-length test" icon={<Clock className="h-4 w-4" />} />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        {/* Subject progress */}
        <Card>
          <CardHeader title="Subject progress" subtitle="Coverage of the question bank and accuracy, from your attempts" action={<LinkButton href="/syllabus" size="sm" variant="ghost">Syllabus <ArrowRight className="h-3.5 w-3.5" /></LinkButton>} />
          <div className="divide-y divide-ink-700/70 px-5 pb-3 pt-2">
            {subjects.map((s) => (
              <Link key={s.subject_id} href={`/practice?subject=${s.subject_id}`} className="group block py-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="truncate text-sm font-medium group-hover:text-sky">{s.name}</span>
                    {s.strength && <Badge tone={STRENGTH[s.strength].tone}>{STRENGTH[s.strength].label}</Badge>}
                  </div>
                  <span className="text-sm font-semibold tabular">{pct(s.coverage)}</span>
                </div>
                <ProgressBar value={s.coverage} className="mt-2" />
                <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-fg-subtle tabular">
                  <span>{s.attempted} attempted</span><span>{s.remaining} remaining</span>
                  <span>Accuracy {pct(s.accuracy)}</span>
                  <span>Avg mock score {s.avg_mock_score ?? "—"}</span>
                </div>
              </Link>
            ))}
          </div>
        </Card>

        <div className="space-y-6">
          {/* Today's target */}
          <Card>
            <CardHeader title="Today's target" subtitle="Set your goals in Profile" action={<LinkButton href="/profile" size="sm" variant="ghost">Edit</LinkButton>} />
            <div className="space-y-4 px-5 pb-5 pt-4">
              {[
                { label: "Questions", v: today.questions, t: targets?.questions_per_day ?? 100 },
                { label: "Mock tests", v: today.mocks, t: targets?.mocks_per_day ?? 1 },
                { label: "Topics", v: today.topics, t: targets?.topics_per_day ?? 2 },
              ].map((x) => (
                <div key={x.label}>
                  <div className="flex justify-between text-xs"><span className="text-fg-muted">{x.label}</span><span className="tabular"><b className="font-semibold text-fg">{x.v}</b> / {x.t}</span></div>
                  <ProgressBar value={x.t ? (x.v / x.t) * 100 : 0} tone={x.v >= x.t ? "ok" : "sky"} className="mt-1.5" />
                </div>
              ))}
              {data.streak > 0
                ? <p className="text-xs text-fg-muted"><Flame className="mr-1 inline h-3.5 w-3.5 text-amber" />{data.streak}-day streak — keep your preparation going.</p>
                : <p className="text-xs text-fg-muted">Practise today to start a streak.</p>}
            </div>
          </Card>

          {/* Weak topics */}
          <Card>
            <CardHeader title="Weak topics" subtitle="Below the accuracy threshold with enough attempts" />
            {data.weak_topics.length ? (
              <div className="px-5 pb-5 pt-3">
                <div className="space-y-2.5">
                  {data.weak_topics.map((t) => (
                    <div key={t.topic_id} className="flex items-center justify-between text-sm">
                      <span className="min-w-0 truncate">{t.name} <span className="text-xs text-fg-subtle">· {t.subject}</span></span>
                      <span className="font-semibold text-bad tabular">{pct(t.accuracy)}</span>
                    </div>
                  ))}
                </div>
                <Button size="sm" className="mt-4 w-full" loading={busy === "weak"}
                  onClick={() => start("subject_practice", null, { topic_ids: weakIds, count: 20 }, "weak")}>Practice weak topics</Button>
              </div>
            ) : (
              <EmptyState title="No weak topics yet">Topics show up here once you&apos;ve answered enough questions in them and accuracy is low.</EmptyState>
            )}
          </Card>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_1.6fr]">
        <Card>
          <CardHeader title="Recent mocks" action={<LinkButton href="/performance" size="sm" variant="ghost">View performance <ArrowRight className="h-3.5 w-3.5" /></LinkButton>} />
          {data.recent_mocks.length ? (
            <div className="divide-y divide-ink-700/70 px-5 pb-3 pt-2">
              {data.recent_mocks.map((m) => (
                <Link key={m.attempt_id} href={`/results/${m.attempt_id}`} className="flex items-center justify-between py-2.5 text-sm hover:text-sky">
                  <span className="min-w-0 truncate">{m.title} <span className="text-xs text-fg-subtle">· {shortDate(m.submitted_at)}</span></span>
                  <span className="font-semibold tabular">{m.score}/{m.total}</span>
                </Link>
              ))}
            </div>
          ) : <EmptyState title="No mocks yet" action={<LinkButton href="/mocks" size="sm" variant="primary">Take your first mock</LinkButton>} />}
        </Card>

        <Card>
          <CardHeader title="Quick actions" />
          <RunwayDivider className="mx-5 mt-4" />
          <div className="grid gap-2 p-5 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { href: "/mocks", icon: PlaneTakeoff, label: "Start full mock", sub: "120 Q · 120 min" },
              { href: "/practice", icon: BookOpen, label: "Practice by subject", sub: "Pick topic & difficulty" },
              { href: "/topics", icon: Target, label: "Topic practice", sub: "Go straight to a topic" },
              { href: "/previous-papers", icon: FileText, label: "Previous papers", sub: "Official & memory-based" },
              { href: "/revision", icon: RotateCcw, label: "Revision", sub: "Formulas, facts, mistakes" },
            ].map(({ href, icon: Icon, label, sub }) => (
              <Link key={href} href={href} className="group flex items-center gap-3 rounded-xl border border-ink-700 bg-ink-850 px-3.5 py-3 hover:border-sky/40">
                <Icon className="h-4 w-4 text-sky" />
                <div className="min-w-0"><div className="text-sm font-medium">{label}</div><div className="text-[11px] text-fg-subtle">{sub}</div></div>
              </Link>
            ))}
            {weakIds.length > 0 && (
              <button onClick={() => start("subject_practice", null, { topic_ids: weakIds, count: 20 }, "weak2")}
                className="flex items-center gap-3 rounded-xl border border-ink-700 bg-ink-850 px-3.5 py-3 text-left hover:border-sky/40">
                <Target className="h-4 w-4 text-bad" />
                <div><div className="text-sm font-medium">Practice weak topics</div><div className="text-[11px] text-fg-subtle">{weakIds.length} topic{weakIds.length > 1 ? "s" : ""}</div></div>
              </button>
            )}
          </div>
        </Card>
      </div>
      <StartError message={startError} onClose={clearError} />
    </div>
  );
}
