"use client";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { Badge, Card, CardHeader, ErrorState, Loading, Stat } from "@/components/ui";
import { useRpc } from "@/lib/rpc";
import { SOURCE_LABEL, difficultyLabel } from "@/lib/exam";
import { dateTime, pct } from "@/lib/format";

type Stats = {
  users: number; active_7d: number; attempts: number; mocks: number; questions: number; unverified: number;
  by_subject: { name: string; needed: number; total: number; verified: number }[];
  by_source: Record<string, number>; by_difficulty: Record<string, number>;
  hardest: { question_id: string; text: string; subject: string; answers: number; accuracy: number }[];
  user_rows: { id: string; name: string | null; email: string; role: string; joined: string; answered: number; accuracy: number | null; mocks: number; last_active: string | null }[];
};

export default function AdminOverview() {
  const { data, error, loading, reload } = useRpc<Stats>("admin_stats");
  if (loading && !data) return <Loading />;
  if (error || !data) return <ErrorState message={error ?? ""} retry={reload} />;

  return (
    <div className="space-y-6 animate-fade-up">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-6">
        <Stat label="Students" value={data.users} />
        <Stat label="Active (7 days)" value={data.active_7d} />
        <Stat label="Tests submitted" value={data.attempts} />
        <Stat label="Mocks submitted" value={data.mocks} />
        <Stat label="Active questions" value={data.questions} />
        <Stat label="Unverified" value={data.unverified} sub="excluded from full mocks" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Mock readiness by subject" subtitle="Verified questions available vs. questions needed in one mock" />
          <div className="overflow-x-auto px-5 pb-5 pt-3">
            <table className="w-full text-sm">
              <thead className="text-left text-xs text-fg-subtle"><tr><th className="pb-2 font-medium">Subject</th><th className="pb-2 font-medium">Per mock</th><th className="pb-2 font-medium">Verified</th><th className="pb-2 font-medium">Total</th><th className="pb-2 font-medium">Distinct mocks</th></tr></thead>
              <tbody className="tabular">
                {data.by_subject.map((s) => (
                  <tr key={s.name} className="border-t border-ink-700/60">
                    <td className="py-2">{s.name}</td><td>{s.needed}</td>
                    <td>{s.verified < s.needed ? <span className="inline-flex items-center gap-1 text-bad"><AlertTriangle className="h-3.5 w-3.5" />{s.verified}</span> : <span className="inline-flex items-center gap-1 text-ok"><CheckCircle2 className="h-3.5 w-3.5" />{s.verified}</span>}</td>
                    <td>{s.total}</td><td className="text-fg-muted">{Math.floor(s.verified / s.needed)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-3 text-xs text-fg-subtle">&ldquo;Distinct mocks&rdquo; = how many non-overlapping sections the verified bank can fill. Add questions to raise it.</p>
          </div>
        </Card>

        <Card>
          <CardHeader title="Question bank" />
          <div className="grid gap-5 p-5 sm:grid-cols-2">
            <div>
              <div className="mb-2 text-xs font-medium text-fg-muted">By source</div>
              {Object.entries(data.by_source).map(([k, v]) => <div key={k} className="flex justify-between py-1 text-sm"><span>{SOURCE_LABEL[k] ?? k}</span><span className="tabular">{v}</span></div>)}
            </div>
            <div>
              <div className="mb-2 text-xs font-medium text-fg-muted">By difficulty</div>
              {Object.entries(data.by_difficulty).map(([k, v]) => <div key={k} className="flex justify-between py-1 text-sm"><span>{difficultyLabel(k)}</span><span className="tabular">{v}</span></div>)}
            </div>
          </div>
          <div className="border-t border-ink-700 px-5 py-4">
            <div className="mb-2 text-xs font-medium text-fg-muted">Lowest-accuracy questions (5+ answers)</div>
            {data.hardest.length ? data.hardest.map((h) => (
              <div key={h.question_id} className="flex items-start justify-between gap-3 py-1.5 text-sm">
                <span className="line-clamp-1">{h.text}</span><span className="shrink-0 text-xs tabular text-bad">{pct(h.accuracy)} of {h.answers}</span>
              </div>
            )) : <p className="text-sm text-fg-muted">Not enough answers yet.</p>}
          </div>
        </Card>
      </div>

      <Card>
        <CardHeader title="Students" subtitle="Most recently active first (up to 200)" />
        <div className="overflow-x-auto px-5 pb-5 pt-3">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="text-left text-xs text-fg-subtle"><tr><th className="pb-2 font-medium">Name</th><th className="pb-2 font-medium">Email</th><th className="pb-2 font-medium">Questions</th><th className="pb-2 font-medium">Accuracy</th><th className="pb-2 font-medium">Mocks</th><th className="pb-2 font-medium">Last active</th></tr></thead>
            <tbody className="tabular">
              {data.user_rows.map((u) => (
                <tr key={u.id} className="border-t border-ink-700/60">
                  <td className="py-2">{u.name ?? "—"} {u.role === "admin" && <Badge tone="amber">admin</Badge>}</td>
                  <td className="text-fg-muted">{u.email}</td><td>{u.answered}</td><td>{pct(u.accuracy)}</td><td>{u.mocks}</td>
                  <td className="text-fg-muted">{dateTime(u.last_active)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
