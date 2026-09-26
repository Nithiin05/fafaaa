"use client";
import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { FileText, ListChecks, Search, Sigma, HelpCircle } from "lucide-react";
import { Card, CardHeader, EmptyState, Loading, PageHeader } from "@/components/ui";
import { StartError, useStart } from "@/components/use-start";
import { rpc } from "@/lib/rpc";

type Results = {
  topics: { topic_id: number; name: string; subject: string; subject_id: number }[];
  questions: { question_id: string; text: string; subject: string; topic: string; topic_id: number }[];
  tests: { id: string; title: string; kind: string }[];
  notes: { id: number; title: string; category: string; subject: string | null }[];
};

function SearchInner() {
  const params = useSearchParams();
  const router = useRouter();
  const initial = params.get("q") ?? "";
  const [q, setQ] = useState(initial);
  const [res, setRes] = useState<Results | null>(null);
  const [loading, setLoading] = useState(false);
  const { start, error, clearError } = useStart();

  useEffect(() => {
    setQ(initial);
    if (initial.trim().length < 2) { setRes(null); return; }
    setLoading(true);
    rpc<Results>("search_all", { p_query: initial }).then(setRes).catch(() => setRes(null)).finally(() => setLoading(false));
  }, [initial]);

  const total = res ? res.topics.length + res.questions.length + res.tests.length + res.notes.length : 0;

  return (
    <div className="animate-fade-up">
      <PageHeader title="Search" subtitle="Questions, topics, subjects, papers, mocks and revision notes." />
      <form onSubmit={(e) => { e.preventDefault(); router.push(`/search?q=${encodeURIComponent(q.trim())}`); }} className="relative mb-6 max-w-xl">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-subtle" />
        <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder='Try "Bernoulli", "ILS" or "Fayol"' className="h-12 w-full pl-10 text-base" aria-label="Search" />
      </form>

      {loading ? <Loading label="Searching…" /> : !res ? (
        <p className="text-sm text-fg-muted">Type at least 2 characters.</p>
      ) : total === 0 ? (
        <Card><EmptyState icon={<Search className="h-6 w-6" />} title={`No results for "${initial}"`} /></Card>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          {res.topics.length > 0 && (
            <Card>
              <CardHeader title="Topics" icon={<ListChecks className="h-4 w-4" />} />
              <ul className="divide-y divide-ink-700/60 px-5 pb-3 pt-1">
                {res.topics.map((t) => (
                  <li key={t.topic_id} className="flex items-center justify-between py-2.5 text-sm">
                    <span>{t.subject} → <b className="font-medium">{t.name}</b></span>
                    <button onClick={() => start("topic_practice", null, { topic_id: t.topic_id, count: 10 })} className="text-xs text-sky">Practise</button>
                  </li>
                ))}
              </ul>
            </Card>
          )}
          {res.questions.length > 0 && (
            <Card className="lg:row-span-2">
              <CardHeader title="Questions" subtitle="Answers stay hidden until you attempt them" icon={<HelpCircle className="h-4 w-4" />} />
              <ul className="divide-y divide-ink-700/60 px-5 pb-3 pt-1">
                {res.questions.map((x) => (
                  <li key={x.question_id} className="py-2.5 text-sm">
                    <div className="text-[11px] text-fg-subtle">{x.subject} → {x.topic} → Questions</div>
                    <p className="mt-0.5 line-clamp-2">{x.text}</p>
                    <button onClick={() => start("mistake_practice", null, { question_ids: [x.question_id] })} className="mt-1 text-xs text-sky">Attempt this question</button>
                  </li>
                ))}
              </ul>
            </Card>
          )}
          {res.tests.length > 0 && (
            <Card>
              <CardHeader title="Mocks & papers" icon={<FileText className="h-4 w-4" />} />
              <ul className="divide-y divide-ink-700/60 px-5 pb-3 pt-1">
                {res.tests.map((t) => (
                  <li key={t.id} className="py-2.5 text-sm">
                    <Link href={t.kind === "previous_paper" ? "/previous-papers" : "/mocks"} className="hover:text-sky">{t.title}</Link>
                  </li>
                ))}
              </ul>
            </Card>
          )}
          {res.notes.length > 0 && (
            <Card>
              <CardHeader title="Revision notes" icon={<Sigma className="h-4 w-4" />} />
              <ul className="divide-y divide-ink-700/60 px-5 pb-3 pt-1">
                {res.notes.map((n) => (
                  <li key={n.id} className="py-2.5 text-sm">
                    <Link href="/revision" className="hover:text-sky">{n.title}</Link>
                    <span className="ml-2 text-xs text-fg-subtle">{n.category === "formula" ? "Formulas" : "Aviation facts"}{n.subject ? ` · ${n.subject}` : ""}</span>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>
      )}
      <StartError message={error} onClose={clearError} />
    </div>
  );
}

export default function SearchPage() {
  return <Suspense fallback={<Loading />}><SearchInner /></Suspense>;
}
