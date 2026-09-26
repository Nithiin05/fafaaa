"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import { ShieldCheck, Trophy, RotateCcw, Play, PlaneTakeoff } from "lucide-react";
import { Badge, Button, Card, EmptyState, ErrorState, Loading, PageHeader } from "@/components/ui";
import { StartTestModal } from "@/components/start-test-modal";
import { StartError, useStart } from "@/components/use-start";
import { useRpc } from "@/lib/rpc";
import type { TestCard } from "@/lib/types";

const LEVEL_TONE: Record<string, "muted" | "sky" | "amber" | "review" | "ok"> = {
  Foundation: "ok", Standard: "sky", "Exam Level": "amber", "Advanced Practice": "review", "Exam Simulation": "amber", "Final Simulation": "amber",
};

export default function MocksPage() {
  const router = useRouter();
  const mocks = useRpc<TestCard[]>("list_tests", { p_kind: "full_mock" });
  const sims = useRpc<TestCard[]>("list_tests", { p_kind: "exam_simulation" });
  const { start, busy, error, clearError } = useStart();
  const [pick, setPick] = useState<{ id: string | null; title: string; kind: "full_mock" | "exam_simulation" } | null>(null);

  if ((mocks.loading && !mocks.data) || (sims.loading && !sims.data)) return <Loading />;
  if (mocks.error || sims.error) return <ErrorState message={mocks.error ?? sims.error ?? ""} retry={() => { mocks.reload(); sims.reload(); }} />;

  const series = [...(mocks.data ?? []), ...(sims.data ?? [])].sort((a, b) => (a.series_number ?? 99) - (b.series_number ?? 99));

  return (
    <div className="animate-fade-up">
      <PageHeader title="Full Mock Tests" subtitle="Every mock has exactly 120 questions: English 15 · Reasoning 15 · Quantitative 15 · GA & Aviation 15 · Physics 24 · Mathematics 24 · Management 12." />

      {/* Real exam simulation */}
      <Card className="relative mb-8 overflow-hidden p-5 sm:p-6">
        <div className="absolute inset-y-0 left-0 w-1 bg-amber" />
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-amber"><ShieldCheck className="h-4 w-4" />Real exam simulation</div>
            <h2 className="mt-1.5 text-lg font-semibold">Sit the CBT under real conditions</h2>
            <p className="mt-1 max-w-xl text-sm text-fg-muted">120 questions · 120 minutes · exact subject distribution · no explanations or pause · automatic submission at 00:00. A fresh paper every time.</p>
          </div>
          <Button size="lg" onClick={() => setPick({ id: null, title: "Real Exam Simulation", kind: "exam_simulation" })}><Play className="h-4 w-4" />Start simulation</Button>
        </div>
      </Card>

      <h2 className="mb-3 text-sm font-semibold uppercase tracking-[0.16em] text-fg-subtle">Mock test series</h2>
      {series.length === 0 ? <Card><EmptyState icon={<PlaneTakeoff className="h-6 w-6" />} title="No mocks published yet">An admin can publish mocks from Admin → Tests.</EmptyState></Card> : (
        <div className="grid gap-4 md:grid-cols-2">
          {series.map((t) => {
            const label = t.series_label ?? "Mock";
            return (
              <div key={t.id} className="flex overflow-hidden rounded-2xl border border-ink-700 bg-ink-900 shadow-card">
                {/* boarding-pass stub */}
                <div className="flex w-24 shrink-0 flex-col items-center justify-center bg-ink-850 px-2 py-4 text-center sm:w-28">
                  <div className="text-[10px] uppercase tracking-[0.2em] text-fg-subtle">Mock</div>
                  <div className="text-3xl font-semibold tabular">{String(t.series_number ?? "—").padStart(2, "0")}</div>
                  <Badge tone={LEVEL_TONE[label] ?? "muted"} className="mt-2">{label}</Badge>
                </div>
                <div className="perforated w-[2px] shrink-0" aria-hidden />
                <div className="flex min-w-0 flex-1 flex-col p-4">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="truncate font-semibold">{t.title}</h3>
                    {t.kind === "exam_simulation" && <ShieldCheck className="h-4 w-4 shrink-0 text-amber" aria-label="Simulation" />}
                  </div>
                  <p className="mt-1 line-clamp-2 text-xs text-fg-muted">{t.description}</p>
                  <div className="mt-3 grid grid-cols-3 gap-2 text-[11px]">
                    <div><div className="text-fg-subtle">Questions</div><div className="font-semibold tabular">{t.question_count}</div></div>
                    <div><div className="text-fg-subtle">Duration</div><div className="font-semibold tabular">{t.duration} min</div></div>
                    <div><div className="text-fg-subtle">Best</div><div className="font-semibold tabular">{t.best_score !== null ? `${t.best_score}/${t.question_count}` : "—"}</div></div>
                  </div>
                  <div className="mt-4 flex items-center justify-between gap-2">
                    <span className={clsx("text-xs", t.attempts ? "text-ok" : "text-fg-subtle")}>
                      {t.attempts ? <><Trophy className="mr-1 inline h-3.5 w-3.5" />Attempted {t.attempts}×</> : "Not attempted"}
                    </span>
                    {t.in_progress ? (
                      <Button size="sm" variant="secondary" className="border-amber/40 text-amber" onClick={() => router.push(`/test/${t.in_progress}`)}>Resume</Button>
                    ) : (
                      <Button size="sm" variant={t.attempts ? "secondary" : "primary"} onClick={() => setPick({ id: t.id, title: t.title, kind: t.kind as "full_mock" })}>
                        {t.attempts ? <><RotateCcw className="h-3.5 w-3.5" />Retake</> : <><Play className="h-3.5 w-3.5" />Start</>}
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
      <p className="mt-6 text-xs text-fg-subtle">Mocks are assembled from the question bank when you start, so every attempt gets a different set and order. Questions you haven&apos;t seen are preferred.</p>

      <StartTestModal open={!!pick} onClose={() => setPick(null)} title={pick?.title ?? ""} simulation={pick?.kind === "exam_simulation"}
        loading={busy === "mock"} onStart={() => pick && start(pick.kind, pick.id, {}, "mock")} />
      <StartError message={error} onClose={() => { clearError(); setPick(null); }} />
    </div>
  );
}
