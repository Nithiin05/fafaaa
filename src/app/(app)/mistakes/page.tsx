"use client";
import { useMemo, useState } from "react";
import { Check, NotebookPen, Play, Trash2 } from "lucide-react";
import { Badge, Button, Card, EmptyState, ErrorState, Loading, PageHeader, Segmented } from "@/components/ui";
import { QuestionReview } from "@/components/question-review";
import { StartError, useStart } from "@/components/use-start";
import { useRpc } from "@/lib/rpc";
import { supabase } from "@/lib/supabase/client";
import { relativeDays } from "@/lib/format";
import { BLUEPRINT } from "@/lib/exam";
import type { Mistake } from "@/lib/types";

export default function MistakesPage() {
  const [showLearned, setShowLearned] = useState(false);
  const { data, error, loading, reload, setData } = useRpc<Mistake[]>("get_mistakes", { p_subject: null, p_include_learned: showLearned });
  const [subject, setSubject] = useState<string>("All");
  const { start, busy, error: startError, clearError } = useStart();

  const list = useMemo(() => (data ?? []).filter((m) => subject === "All" || m.subject === subject), [data, subject]);

  async function markLearned(m: Mistake) {
    setData((d) => (d ?? []).map((x) => (x.question_id === m.question_id ? { ...x, learned: !m.learned } : x)).filter((x) => showLearned || !x.learned));
    await supabase().from("mistakes").update({ learned: !m.learned }).eq("question_id", m.question_id);
  }
  async function remove(m: Mistake) {
    setData((d) => (d ?? []).filter((x) => x.question_id !== m.question_id));
    await supabase().from("mistakes").delete().eq("question_id", m.question_id);
  }

  if (loading && !data) return <Loading />;
  if (error || !data) return <ErrorState message={error ?? ""} retry={reload} />;

  const subjectId = list[0]?.subject_id;
  const active = list.filter((m) => !m.learned);

  return (
    <div className="animate-fade-up">
      <PageHeader title="Mistake Book" subtitle="Every question you answer incorrectly is added here automatically."
        action={<Button disabled={!active.length} loading={!!busy}
          onClick={() => start("mistake_practice", null, { count: Math.min(active.length, 50), ...(subject !== "All" && subjectId ? { subject_id: subjectId } : {}) })}>
          <Play className="h-4 w-4" />Practise mistakes{active.length ? ` (${Math.min(active.length, 50)})` : ""}</Button>} />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Segmented value={subject} onChange={setSubject}
          options={[{ value: "All", label: "All" }, ...BLUEPRINT.map((b) => ({ value: b.short as string, label: b.short === "Quantitative" ? "Quant" : b.short }))]} />
        <label className="flex items-center gap-2 text-xs text-fg-muted">
          <input type="checkbox" checked={showLearned} onChange={(e) => setShowLearned(e.target.checked)} className="h-4 w-4 p-0" />Show learned
        </label>
      </div>

      {list.length === 0 ? (
        <Card><EmptyState icon={<NotebookPen className="h-6 w-6" />} title={data.length ? "No mistakes in this subject" : "Your mistake book is empty"}>
          Wrong answers from mocks and practice sets will appear here with the correct answer and explanation.
        </EmptyState></Card>
      ) : (
        <div className="space-y-4">
          {list.map((m) => (
            <QuestionReview key={m.question_id} text={m.text} imageUrl={m.image_url} options={m.options} correct={m.correct}
              explanation={m.explanation} concept={m.concept} subject={m.subject} topic={m.topic} collapsible
              headerRight={<span className="flex items-center gap-2">
                <Badge tone="bad">Wrong {m.wrong_count}×</Badge>
                <span className="text-fg-subtle">last {relativeDays(m.last_wrong_at)}</span>
                {m.learned && <Badge tone="ok">Learned</Badge>}
              </span>}
              footer={<>
                <Button size="sm" variant="secondary" onClick={() => markLearned(m)}><Check className="h-3.5 w-3.5" />{m.learned ? "Mark not learned" : "Mark as learned"}</Button>
                <Button size="sm" variant="ghost" onClick={() => remove(m)}><Trash2 className="h-3.5 w-3.5" />Remove</Button>
              </>} />
          ))}
        </div>
      )}
      <StartError message={startError} onClose={clearError} />
    </div>
  );
}
