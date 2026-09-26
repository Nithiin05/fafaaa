"use client";
import { useState } from "react";
import { AlertTriangle, Plus, Trash2 } from "lucide-react";
import { Badge, Button, Card, CardHeader, Field } from "@/components/ui";
import { slugify, useSyllabus } from "@/components/admin/use-syllabus";
import { supabase } from "@/lib/supabase/client";

export default function AdminSyllabus() {
  const { subjects, topics, reload } = useSyllabus();
  const [topic, setTopic] = useState({ subject_id: "", name: "", group: "" });
  const [subject, setSubject] = useState({ name: "", short_name: "", part: "A", questions_in_exam: 10 });
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const total = subjects.reduce((a, s) => a + s.questions_in_exam, 0);

  const report = (error: { code?: string; message: string } | null, ok: string) => {
    setMsg(error ? { ok: false, text: error.code === "23505" ? "That name already exists." : error.code === "23503" ? "It still has questions — move or delete them first." : error.message } : { ok: true, text: ok });
    if (!error) reload();
  };

  async function addTopic(e: React.FormEvent) {
    e.preventDefault();
    const sid = Number(topic.subject_id || subjects[0]?.id);
    const order = Math.max(0, ...topics.filter((t) => t.subject_id === sid).map((t) => t.sort_order)) + 1;
    const { error } = await supabase().from("topics").insert({ subject_id: sid, name: topic.name.trim(), slug: slugify(topic.name), topic_group: topic.group.trim() || null, sort_order: order });
    report(error, `Topic "${topic.name}" added.`);
    if (!error) setTopic({ ...topic, name: "" });
  }
  async function addSubject(e: React.FormEvent) {
    e.preventDefault();
    const { error } = await supabase().from("subjects").insert({ ...subject, slug: slugify(subject.name), sort_order: subjects.length + 1 });
    report(error, `Subject "${subject.name}" added. Remember the full-mock blueprint now totals ${total + subject.questions_in_exam}.`);
  }
  async function delTopic(id: number, name: string) {
    if (!window.confirm(`Delete topic "${name}"? Only possible if it has no questions.`)) return;
    const { error } = await supabase().from("topics").delete().eq("id", id);
    report(error, "Topic deleted.");
  }
  async function setCount(id: number, n: number) {
    const { error } = await supabase().from("subjects").update({ questions_in_exam: n }).eq("id", id);
    report(error, "Blueprint updated.");
  }

  return (
    <div className="space-y-6 animate-fade-up">
      {total !== 120 && (
        <p className="flex items-center gap-2 rounded-lg border border-amber/40 bg-amber-soft px-3 py-2 text-sm text-amber">
          <AlertTriangle className="h-4 w-4" />The full-mock blueprint currently totals {total} questions, not 120.
        </p>
      )}
      {msg && <p className={`rounded-lg border px-3 py-2 text-sm ${msg.ok ? "border-ok/30 bg-ok-soft text-ok" : "border-bad/30 bg-bad-soft text-bad"}`}>{msg.text}</p>}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Add topic" />
          <form onSubmit={addTopic} className="grid gap-3 p-5 sm:grid-cols-2">
            <Field label="Subject">
              <select className="w-full" value={topic.subject_id} onChange={(e) => setTopic({ ...topic, subject_id: e.target.value })}>
                {subjects.map((s) => <option key={s.id} value={s.id}>{s.short_name}</option>)}
              </select>
            </Field>
            <Field label="Group (optional)" hint="GA: use 'Aviation' or 'Static GK' so mocks keep the split"><input className="w-full" value={topic.group} onChange={(e) => setTopic({ ...topic, group: e.target.value })} /></Field>
            <Field label="Topic name"><input className="w-full" required value={topic.name} onChange={(e) => setTopic({ ...topic, name: e.target.value })} /></Field>
            <div className="flex items-end"><Button type="submit"><Plus className="h-4 w-4" />Add topic</Button></div>
          </form>
        </Card>
        <Card>
          <CardHeader title="Add subject" subtitle="Rarely needed — the seven exam subjects are already set up" />
          <form onSubmit={addSubject} className="grid gap-3 p-5 sm:grid-cols-2">
            <Field label="Name"><input className="w-full" required value={subject.name} onChange={(e) => setSubject({ ...subject, name: e.target.value })} /></Field>
            <Field label="Short name"><input className="w-full" required value={subject.short_name} onChange={(e) => setSubject({ ...subject, short_name: e.target.value })} /></Field>
            <Field label="Part"><select className="w-full" value={subject.part} onChange={(e) => setSubject({ ...subject, part: e.target.value })}><option value="A">A — Non-technical</option><option value="B">B — Technical</option></select></Field>
            <Field label="Questions in a mock"><input type="number" min={1} className="w-full" value={subject.questions_in_exam} onChange={(e) => setSubject({ ...subject, questions_in_exam: Number(e.target.value) })} /></Field>
            <div className="sm:col-span-2"><Button type="submit" variant="secondary"><Plus className="h-4 w-4" />Add subject</Button></div>
          </form>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {subjects.map((s) => (
          <Card key={s.id}>
            <div className="flex items-center justify-between gap-2 px-5 pt-4">
              <div><div className="font-semibold">{s.name}</div><div className="text-xs text-fg-subtle">Part {s.part} · slug {s.slug}</div></div>
              <label className="flex items-center gap-1.5 text-xs text-fg-muted">Per mock
                <input type="number" min={1} defaultValue={s.questions_in_exam} className="h-8 w-16 px-2 py-0 text-xs" onBlur={(e) => Number(e.target.value) !== s.questions_in_exam && setCount(s.id, Number(e.target.value))} />
              </label>
            </div>
            <ul className="max-h-72 space-y-0.5 overflow-y-auto px-3 pb-3 pt-2">
              {topics.filter((t) => t.subject_id === s.id).map((t) => (
                <li key={t.id} className="group flex items-center justify-between rounded-md px-2 py-1 text-sm hover:bg-ink-850">
                  <span className="min-w-0 truncate">{t.name} {t.topic_group && <Badge className="ml-1">{t.topic_group}</Badge>}</span>
                  <button onClick={() => delTopic(t.id, t.name)} className="invisible rounded p-1 text-fg-subtle hover:text-bad group-hover:visible" aria-label={`Delete ${t.name}`}><Trash2 className="h-3.5 w-3.5" /></button>
                </li>
              ))}
            </ul>
          </Card>
        ))}
      </div>
    </div>
  );
}
