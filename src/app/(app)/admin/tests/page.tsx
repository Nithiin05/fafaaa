"use client";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, AlertTriangle, Eye, EyeOff, Plus, Shuffle, Trash2, Upload, Eraser } from "lucide-react";
import { Badge, Button, Card, CardHeader, Field, Loading } from "@/components/ui";
import { rpc } from "@/lib/rpc";
import { supabase } from "@/lib/supabase/client";

type Test = {
  id: string; kind: string; title: string; series_label: string | null; series_number: number | null; paper_year: number | null;
  paper_shift: string | null; duration_minutes: number; is_published: boolean; description: string | null; config: Record<string, unknown>;
  test_questions: { count: number }[];
};

const PROFILES: Record<string, Record<string, number>> = {
  Foundation: { easy: 3, moderate: 2, exam: 1, challenging: 0.2 },
  Standard: { easy: 1, moderate: 3, exam: 2, challenging: 0.5 },
  "Exam Level": { easy: 0.5, moderate: 1.5, exam: 3, challenging: 1 },
  "Advanced Practice": { easy: 0.2, moderate: 1, exam: 2, challenging: 3 },
  "Exam Simulation": { easy: 1, moderate: 2, exam: 3, challenging: 1 },
};
const KIND_LABEL: Record<string, string> = { full_mock: "Full mock", exam_simulation: "Exam simulation", previous_paper: "Previous paper" };

export default function AdminTests() {
  const [tests, setTests] = useState<Test[] | null>(null);
  const [form, setForm] = useState({ kind: "full_mock", title: "", series_label: "Standard", series_number: "", paper_year: "", paper_shift: "", duration_minutes: 120, description: "", is_published: false });
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [checks, setChecks] = useState<Record<string, { subject: string; expected: number; actual: number }[]>>({});

  const load = useCallback(async () => {
    const { data } = await supabase().from("tests").select("*, test_questions(count)").order("kind").order("series_number", { nullsFirst: false }).order("created_at");
    setTests((data as Test[]) ?? []);
  }, []);
  useEffect(() => { load(); }, [load]);

  const say = (text: string, ok = true) => setMsg({ text, ok });

  async function create(e: React.FormEvent) {
    e.preventDefault();
    const isPaper = form.kind === "previous_paper";
    const row = {
      kind: form.kind, title: form.title.trim(), duration_minutes: form.duration_minutes, description: form.description.trim() || null,
      is_published: form.is_published,
      series_label: isPaper ? null : form.series_label, series_number: form.series_number ? Number(form.series_number) : null,
      paper_year: form.paper_year ? Number(form.paper_year) : null, paper_shift: form.paper_shift.trim() || null,
      config: isPaper ? {} : { weights: PROFILES[form.series_label] ?? {} },
    };
    const { error } = await supabase().from("tests").insert(row);
    if (error) return say(error.message.includes("paper_year") || error.code === "23514" ? "Previous papers need a year." : error.message, false);
    say(`"${row.title}" created.${isPaper ? " Now upload its questions from Bulk import." : ""}`);
    setForm({ ...form, title: "" });
    load();
  }

  async function togglePublish(t: Test) {
    await supabase().from("tests").update({ is_published: !t.is_published }).eq("id", t.id);
    load();
  }
  async function fill(t: Test) {
    try { const n = await rpc<number>("admin_fill_test", { p_test_id: t.id }); say(`${t.title}: fixed set of ${n} verified questions saved.`); check(t); load(); }
    catch (e) { say((e as Error).message, false); }
  }
  async function clearQs(t: Test) {
    if (!window.confirm("Remove all fixed questions from this test? Mocks without fixed questions are generated fresh for each attempt.")) return;
    await supabase().from("test_questions").delete().eq("test_id", t.id);
    say(`${t.title} will now be generated fresh for each attempt.`); load();
  }
  async function del(t: Test) {
    if (!window.confirm(`Delete "${t.title}"?`)) return;
    const { error } = await supabase().from("tests").delete().eq("id", t.id);
    if (error) say("Students have attempted this test, so it can't be deleted. Unpublish it instead.", false); else { say("Deleted."); load(); }
  }
  async function check(t: Test) {
    const r = await rpc<{ subject: string; expected: number; actual: number }[]>("mock_blueprint_errors", { p_test_id: t.id });
    setChecks((c) => ({ ...c, [t.id]: r }));
  }

  if (!tests) return <Loading />;
  const isPaper = form.kind === "previous_paper";

  return (
    <div className="space-y-6 animate-fade-up">
      {msg && <p className={`rounded-lg border px-3 py-2 text-sm ${msg.ok ? "border-ok/30 bg-ok-soft text-ok" : "border-bad/30 bg-bad-soft text-bad"}`}>{msg.text}</p>}
      <Card>
        <CardHeader title="Create mock or previous paper" subtitle="Mocks without fixed questions are assembled from the verified bank at the start of every attempt (always exactly 120 in the blueprint split)." />
        <form onSubmit={create} className="grid gap-3 p-5 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Type">
            <select className="w-full" value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value })}>
              {Object.entries(KIND_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </Field>
          <Field label="Title"><input className="w-full" required placeholder={isPaper ? "AAI JE Operations — 2024 Shift 1" : "Mock 11 — Exam Level"} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></Field>
          {isPaper ? (<>
            <Field label="Year"><input type="number" required className="w-full" value={form.paper_year} onChange={(e) => setForm({ ...form, paper_year: e.target.value })} /></Field>
            <Field label="Shift"><input className="w-full" placeholder="Shift 1" value={form.paper_shift} onChange={(e) => setForm({ ...form, paper_shift: e.target.value })} /></Field>
          </>) : (<>
            <Field label="Difficulty profile">
              <select className="w-full" value={form.series_label} onChange={(e) => setForm({ ...form, series_label: e.target.value })}>
                {Object.keys(PROFILES).map((p) => <option key={p}>{p}</option>)}
              </select>
            </Field>
            <Field label="Series number"><input type="number" className="w-full" value={form.series_number} onChange={(e) => setForm({ ...form, series_number: e.target.value })} /></Field>
          </>)}
          <Field label="Duration (minutes)"><input type="number" min={1} className="w-full" value={form.duration_minutes} onChange={(e) => setForm({ ...form, duration_minutes: Number(e.target.value) })} /></Field>
          <Field label="Description"><input className="w-full" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></Field>
          <label className="flex items-end gap-2 pb-2 text-sm"><input type="checkbox" className="h-4 w-4 p-0" checked={form.is_published} onChange={(e) => setForm({ ...form, is_published: e.target.checked })} />Publish now</label>
          <div className="flex items-end"><Button type="submit"><Plus className="h-4 w-4" />Create</Button></div>
        </form>
      </Card>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-sm">
            <thead className="text-left text-xs text-fg-subtle"><tr><th className="px-4 py-3 font-medium">Test</th><th className="px-2 py-3 font-medium">Type</th><th className="px-2 py-3 font-medium">Questions</th><th className="px-2 py-3 font-medium">Status</th><th className="px-4 py-3 text-right font-medium">Actions</th></tr></thead>
            <tbody>
              {tests.map((t) => {
                const n = t.test_questions?.[0]?.count ?? 0;
                const isMock = t.kind !== "previous_paper";
                const c = checks[t.id];
                return (
                  <tr key={t.id} className="border-t border-ink-700/60 align-top">
                    <td className="px-4 py-3">
                      <div className="font-medium">{t.title}</div>
                      <div className="text-xs text-fg-subtle">{isMock ? t.series_label : `${t.paper_year ?? ""} ${t.paper_shift ?? ""}`} · {t.duration_minutes} min</div>
                      {c && (c.length === 0
                        ? <div className="mt-1 inline-flex items-center gap-1 text-xs text-ok"><CheckCircle2 className="h-3.5 w-3.5" />Matches the 120-question blueprint</div>
                        : <div className="mt-1 text-xs text-bad"><AlertTriangle className="mr-1 inline h-3.5 w-3.5" />{c.map((x) => `${x.subject} ${x.actual}/${x.expected}`).join(" · ")}</div>)}
                    </td>
                    <td className="px-2 py-3"><Badge tone={isMock ? "sky" : "amber"}>{KIND_LABEL[t.kind]}</Badge></td>
                    <td className="px-2 py-3 text-xs tabular">{n ? `${n} fixed` : isMock ? "Generated per attempt" : <span className="text-bad">None yet</span>}</td>
                    <td className="px-2 py-3">{t.is_published ? <Badge tone="ok">Published</Badge> : <Badge>Draft</Badge>}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-right">
                      <div className="inline-flex flex-wrap justify-end gap-1">
                        <Button size="sm" variant="ghost" onClick={() => togglePublish(t)}>{t.is_published ? <><EyeOff className="h-3.5 w-3.5" />Unpublish</> : <><Eye className="h-3.5 w-3.5" />Publish</>}</Button>
                        {isMock && <Button size="sm" variant="ghost" onClick={() => fill(t)} title="Save a fixed set of 120 questions"><Shuffle className="h-3.5 w-3.5" />{n ? "Refill" : "Fix 120"}</Button>}
                        {isMock && n > 0 && <Button size="sm" variant="ghost" onClick={() => check(t)}>Check</Button>}
                        {n > 0 && <Button size="sm" variant="ghost" onClick={() => clearQs(t)}><Eraser className="h-3.5 w-3.5" /></Button>}
                        {!isMock && <Link href={`/admin/import?test=${t.id}`} className="inline-flex h-8 items-center gap-1.5 rounded-lg px-3 text-xs text-fg-muted hover:bg-ink-800 hover:text-fg"><Upload className="h-3.5 w-3.5" />Upload</Link>}
                        <Button size="sm" variant="ghost" onClick={() => del(t)} aria-label="Delete"><Trash2 className="h-3.5 w-3.5" /></Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
