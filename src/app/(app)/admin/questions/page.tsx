"use client";
import { useCallback, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Pencil, Plus, Trash2, CheckCircle2, Circle } from "lucide-react";
import { Badge, Button, Card, EmptyState, ErrorState, Loading } from "@/components/ui";
import { QuestionForm, type QuestionRow } from "@/components/admin/question-form";
import { useSyllabus } from "@/components/admin/use-syllabus";
import { rpc } from "@/lib/rpc";
import { supabase } from "@/lib/supabase/client";
import { SOURCE_LABEL, difficultyLabel } from "@/lib/exam";
import { pct } from "@/lib/format";

type Row = QuestionRow & { id: string; subject: string; topic: string; answers: number; accuracy: number | null; created_at: string };
const PAGE = 25;

export default function AdminQuestions() {
  const { subjects, topics } = useSyllabus();
  const [filters, setFilters] = useState({ subject: "", topic: "", source: "", verified: "", search: "" });
  const [page, setPage] = useState(0);
  const [data, setData] = useState<{ total: number; rows: Row[] } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<QuestionRow | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    try {
      const d = await rpc<{ total: number; rows: Row[] }>("admin_list_questions", {
        p_subject: filters.subject ? Number(filters.subject) : null, p_topic: filters.topic ? Number(filters.topic) : null,
        p_search: filters.search || null, p_source: filters.source || null,
        p_verified: filters.verified === "" ? null : filters.verified === "yes", p_limit: PAGE, p_offset: page * PAGE,
      });
      setData(d); setError(null);
    } catch (e) { setError((e as Error).message); }
  }, [filters, page]);

  useEffect(() => { const t = setTimeout(load, 250); return () => clearTimeout(t); }, [load]);

  const setF = (k: keyof typeof filters, v: string) => { setPage(0); setFilters((f) => ({ ...f, [k]: v, ...(k === "subject" ? { topic: "" } : {}) })); };

  async function del(r: Row) {
    if (!window.confirm("Delete this question? Questions that students have already attempted are deactivated instead, so their history stays intact.")) return;
    try {
      const res = await rpc<string>("admin_delete_question", { p_id: r.id });
      setNotice(res === "deleted" ? "Question deleted." : "Question has attempts, so it was deactivated instead.");
      load();
    } catch (e) { setNotice((e as Error).message); }
  }
  async function toggleVerified(r: Row) {
    await supabase().from("questions").update({ is_verified: !r.is_verified }).eq("id", r.id);
    load();
  }

  if (error) return <ErrorState message={error} retry={load} />;
  const pages = data ? Math.max(1, Math.ceil(data.total / PAGE)) : 1;

  return (
    <div className="animate-fade-up">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-lg font-semibold">Questions {data && <span className="text-sm font-normal text-fg-muted">({data.total})</span>}</h1>
        <Button onClick={() => { setEditing(null); setFormOpen(true); }}><Plus className="h-4 w-4" />Add question</Button>
      </div>

      <div className="mb-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
        <input placeholder="Search question text…" value={filters.search} onChange={(e) => setF("search", e.target.value)} className="lg:col-span-1" />
        <select value={filters.subject} onChange={(e) => setF("subject", e.target.value)}>
          <option value="">All subjects</option>{subjects.map((s) => <option key={s.id} value={s.id}>{s.short_name}</option>)}
        </select>
        <select value={filters.topic} onChange={(e) => setF("topic", e.target.value)} disabled={!filters.subject}>
          <option value="">All topics</option>{topics.filter((t) => String(t.subject_id) === filters.subject).map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
        <select value={filters.source} onChange={(e) => setF("source", e.target.value)}>
          <option value="">All sources</option>{Object.entries(SOURCE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <select value={filters.verified} onChange={(e) => setF("verified", e.target.value)}>
          <option value="">Verified + unverified</option><option value="yes">Verified only</option><option value="no">Unverified only</option>
        </select>
      </div>
      {notice && <p className="mb-3 rounded-lg border border-ink-700 bg-ink-850 px-3 py-2 text-sm">{notice}</p>}

      <Card>
        {!data ? <Loading /> : data.rows.length === 0 ? <EmptyState title="No questions match these filters" /> : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-sm">
              <thead className="text-left text-xs text-fg-subtle">
                <tr><th className="px-4 py-3 font-medium">Question</th><th className="px-2 py-3 font-medium">Subject / topic</th><th className="px-2 py-3 font-medium">Difficulty</th><th className="px-2 py-3 font-medium">Source</th><th className="px-2 py-3 font-medium">Verified</th><th className="px-2 py-3 font-medium">Answers</th><th className="px-4 py-3" /></tr>
              </thead>
              <tbody>
                {data.rows.map((r) => (
                  <tr key={r.id} className={`border-t border-ink-700/60 align-top ${r.is_active ? "" : "opacity-50"}`}>
                    <td className="max-w-md px-4 py-3"><p className="line-clamp-2">{r.question_text}</p><span className="text-[11px] text-fg-subtle">Answer {r.correct_option}{!r.is_active && " · inactive"}</span></td>
                    <td className="px-2 py-3 text-xs"><div>{r.subject}</div><div className="text-fg-subtle">{r.topic}</div></td>
                    <td className="px-2 py-3 text-xs">{difficultyLabel(r.difficulty)}</td>
                    <td className="px-2 py-3"><Badge tone={r.source.startsWith("previous") ? "amber" : "muted"}>{SOURCE_LABEL[r.source]}{r.year ? ` ${r.year}` : ""}</Badge></td>
                    <td className="px-2 py-3">
                      <button onClick={() => toggleVerified(r)} className="inline-flex items-center gap-1 text-xs" aria-label="Toggle verified">
                        {r.is_verified ? <><CheckCircle2 className="h-4 w-4 text-ok" />Yes</> : <><Circle className="h-4 w-4 text-fg-subtle" />No</>}
                      </button>
                    </td>
                    <td className="px-2 py-3 text-xs tabular">{r.answers}{r.answers ? ` · ${pct(r.accuracy)}` : ""}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-right">
                      <button onClick={() => { setEditing(r); setFormOpen(true); }} className="rounded-md p-1.5 text-fg-muted hover:bg-ink-800 hover:text-fg" aria-label="Edit"><Pencil className="h-4 w-4" /></button>
                      <button onClick={() => del(r)} className="rounded-md p-1.5 text-fg-muted hover:bg-bad-soft hover:text-bad" aria-label="Delete"><Trash2 className="h-4 w-4" /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
      <div className="mt-3 flex items-center justify-end gap-2 text-sm">
        <span className="text-fg-muted tabular">Page {page + 1} of {pages}</span>
        <Button size="sm" variant="secondary" disabled={page === 0} onClick={() => setPage(page - 1)} aria-label="Previous page"><ChevronLeft className="h-4 w-4" /></Button>
        <Button size="sm" variant="secondary" disabled={page + 1 >= pages} onClick={() => setPage(page + 1)} aria-label="Next page"><ChevronRight className="h-4 w-4" /></Button>
      </div>

      <QuestionForm open={formOpen} onClose={() => setFormOpen(false)} onSaved={load} initial={editing} subjects={subjects} topics={topics} />
    </div>
  );
}
