"use client";
import { useMemo, useState } from "react";
import { Bookmark as BookmarkIcon, Play, Trash2 } from "lucide-react";
import { Button, Card, EmptyState, ErrorState, Loading, PageHeader, Segmented } from "@/components/ui";
import { QuestionReview } from "@/components/question-review";
import { StartError, useStart } from "@/components/use-start";
import { useRpc } from "@/lib/rpc";
import { supabase } from "@/lib/supabase/client";
import { BOOKMARK_CATEGORIES } from "@/lib/exam";
import type { Bookmark } from "@/lib/types";

export default function BookmarksPage() {
  const { data, error, loading, reload, setData } = useRpc<Bookmark[]>("get_bookmarks");
  const [cat, setCat] = useState<string>("all");
  const { start, busy, error: startError, clearError } = useStart();

  const list = useMemo(() => (data ?? []).filter((b) => cat === "all" || b.category === cat), [data, cat]);
  const counts = useMemo(() => (data ?? []).reduce<Record<string, number>>((a, b) => ({ ...a, [b.category]: (a[b.category] ?? 0) + 1 }), {}), [data]);

  async function recategorise(b: Bookmark, category: string) {
    if (category === b.category) return;
    const { data: { user } } = await supabase().auth.getUser();
    if (!user) return;
    await supabase().from("bookmarks").delete().match({ user_id: user.id, question_id: b.question_id, category: b.category });
    await supabase().from("bookmarks").upsert({ user_id: user.id, question_id: b.question_id, category });
    reload();
  }
  async function remove(b: Bookmark) {
    setData((d) => (d ?? []).filter((x) => !(x.question_id === b.question_id && x.category === b.category)));
    await supabase().from("bookmarks").delete().match({ question_id: b.question_id, category: b.category });
  }

  if (loading && !data) return <Loading />;
  if (error || !data) return <ErrorState message={error ?? ""} retry={reload} />;

  const ids = Array.from(new Set(list.map((b) => b.question_id)));

  return (
    <div className="animate-fade-up">
      <PageHeader title="Bookmarks" subtitle="Questions you saved during tests and practice. Tap the bookmark icon on any question to add it."
        action={<Button disabled={!ids.length} loading={!!busy} onClick={() => start("mistake_practice", null, { question_ids: ids.slice(0, 100) })}><Play className="h-4 w-4" />Practise these ({ids.length})</Button>} />
      <Segmented className="mb-4" value={cat} onChange={setCat}
        options={[{ value: "all", label: `All (${data.length})` }, ...BOOKMARK_CATEGORIES.map((c) => ({ value: c.value as string, label: `${c.label} (${counts[c.value] ?? 0})` }))]} />
      {list.length === 0 ? (
        <Card><EmptyState icon={<BookmarkIcon className="h-6 w-6" />} title="No bookmarks here yet" /></Card>
      ) : (
        <div className="space-y-4">
          {list.map((b) => (
            <QuestionReview key={b.question_id + b.category} text={b.text} imageUrl={b.image_url} options={b.options}
              correct={b.revealed ? b.correct : null} explanation={b.explanation} subject={b.subject} topic={b.topic} collapsible={b.revealed}
              headerRight={!b.revealed ? <span className="text-fg-subtle">Answer shown after you attempt it</span> : undefined}
              footer={<>
                <select value={b.category} onChange={(e) => recategorise(b, e.target.value)} className="h-8 py-0 text-xs" aria-label="Bookmark category">
                  {BOOKMARK_CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
                <Button size="sm" variant="ghost" onClick={() => remove(b)}><Trash2 className="h-3.5 w-3.5" />Remove</Button>
              </>} />
          ))}
        </div>
      )}
      <StartError message={startError} onClose={clearError} />
    </div>
  );
}
