"use client";
import { useEffect, useState } from "react";
import { Button, Field, Modal } from "@/components/ui";
import { supabase } from "@/lib/supabase/client";
import { DIFFICULTIES, SOURCE_LABEL } from "@/lib/exam";
import type { Subject, Topic } from "@/components/admin/use-syllabus";

export type QuestionRow = {
  id?: string; subject_id: number; topic_id: number; subtopic: string | null; question_text: string;
  option_a: string; option_b: string; option_c: string; option_d: string; correct_option: string;
  explanation: string; concept: string | null; difficulty: string; source: string; is_verified: boolean;
  year: number | null; exam: string | null; shift: string | null; tags: string[]; image_url: string | null; is_active: boolean;
};

const blank = (subjectId: number, topicId: number): QuestionRow => ({
  subject_id: subjectId, topic_id: topicId, subtopic: null, question_text: "", option_a: "", option_b: "", option_c: "", option_d: "",
  correct_option: "A", explanation: "", concept: null, difficulty: "exam", source: "original", is_verified: true,
  year: null, exam: null, shift: null, tags: [], image_url: null, is_active: true,
});

function dbError(code: string | undefined, message: string) {
  if (code === "23505") return "This question already exists in the bank.";
  if (code === "23514") return "Check the fields: all four options must be different, and previous-paper questions need a year and exam name.";
  return message;
}

export function QuestionForm({ open, onClose, onSaved, initial, subjects, topics }:
  { open: boolean; onClose: () => void; onSaved: () => void; initial: QuestionRow | null; subjects: Subject[]; topics: Topic[] }) {
  const [q, setQ] = useState<QuestionRow>(blank(1, 1));
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    const s = subjects[0]?.id ?? 1;
    setQ(initial ?? blank(s, topics.find((t) => t.subject_id === s)?.id ?? 1));
    setError("");
  }, [open, initial, subjects, topics]);

  const set = <K extends keyof QuestionRow>(k: K, v: QuestionRow[K]) => setQ((p) => ({ ...p, [k]: v }));
  const subjectTopics = topics.filter((t) => t.subject_id === q.subject_id);

  async function save() {
    const opts = [q.option_a, q.option_b, q.option_c, q.option_d].map((o) => o.trim());
    if (!q.question_text.trim() || opts.some((o) => !o) || !q.explanation.trim()) return setError("Question, all four options and the explanation are required.");
    if (new Set(opts).size < 4) return setError("The four options must all be different.");
    setSaving(true);
    // only real columns (rows from the list carry extra display fields)
    const payload = {
      subject_id: q.subject_id, topic_id: q.topic_id, subtopic: q.subtopic, question_text: q.question_text.trim(),
      option_a: opts[0], option_b: opts[1], option_c: opts[2], option_d: opts[3], correct_option: q.correct_option,
      explanation: q.explanation.trim(), concept: q.concept, difficulty: q.difficulty, source: q.source,
      is_verified: q.is_verified, year: q.year, exam: q.exam, shift: q.shift, tags: q.tags, image_url: q.image_url, is_active: q.is_active,
    };
    const sb = supabase();
    const { error } = q.id ? await sb.from("questions").update(payload).eq("id", q.id) : await sb.from("questions").insert(payload);
    setSaving(false);
    if (error) return setError(dbError(error.code, error.message));
    onSaved(); onClose();
  }

  return (
    <Modal wide open={open} onClose={onClose} title={q.id ? "Edit question" : "Add question"}
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button onClick={save} loading={saving}>Save question</Button></>}>
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Subject">
            <select className="w-full" value={q.subject_id} onChange={(e) => { const s = Number(e.target.value); set("subject_id", s); set("topic_id", topics.find((t) => t.subject_id === s)?.id ?? 0); }}>
              {subjects.map((s) => <option key={s.id} value={s.id}>{s.short_name}</option>)}
            </select>
          </Field>
          <Field label="Topic">
            <select className="w-full" value={q.topic_id} onChange={(e) => set("topic_id", Number(e.target.value))}>
              {subjectTopics.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </Field>
          <Field label="Subtopic (optional)"><input className="w-full" value={q.subtopic ?? ""} onChange={(e) => set("subtopic", e.target.value || null)} /></Field>
        </div>
        <Field label="Question"><textarea rows={4} className="w-full" value={q.question_text} onChange={(e) => set("question_text", e.target.value)} /></Field>
        <div className="grid gap-3 sm:grid-cols-2">
          {(["a", "b", "c", "d"] as const).map((l) => (
            <Field key={l} label={`Option ${l.toUpperCase()}`}>
              <div className="flex items-center gap-2">
                <input type="radio" name="correct" checked={q.correct_option === l.toUpperCase()} onChange={() => set("correct_option", l.toUpperCase())} className="h-4 w-4 p-0" aria-label={`Option ${l.toUpperCase()} is correct`} />
                <input className="w-full" value={q[`option_${l}`]} onChange={(e) => set(`option_${l}`, e.target.value)} />
              </div>
            </Field>
          ))}
        </div>
        <p className="-mt-2 text-xs text-fg-subtle">Select the radio button next to the correct option. Correct answer: <b className="text-fg">{q.correct_option}</b></p>
        <Field label="Explanation"><textarea rows={3} className="w-full" value={q.explanation} onChange={(e) => set("explanation", e.target.value)} /></Field>
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Concept tested"><input className="w-full" value={q.concept ?? ""} onChange={(e) => set("concept", e.target.value || null)} /></Field>
          <Field label="Difficulty">
            <select className="w-full" value={q.difficulty} onChange={(e) => set("difficulty", e.target.value)}>
              {DIFFICULTIES.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
            </select>
          </Field>
          <Field label="Source">
            <select className="w-full" value={q.source} onChange={(e) => set("source", e.target.value)}>
              {Object.entries(SOURCE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </Field>
        </div>
        <div className="grid gap-3 sm:grid-cols-4">
          <Field label="Year"><input type="number" className="w-full" value={q.year ?? ""} onChange={(e) => set("year", e.target.value ? Number(e.target.value) : null)} /></Field>
          <Field label="Exam"><input className="w-full" placeholder="AAI JE Ops" value={q.exam ?? ""} onChange={(e) => set("exam", e.target.value || null)} /></Field>
          <Field label="Shift"><input className="w-full" value={q.shift ?? ""} onChange={(e) => set("shift", e.target.value || null)} /></Field>
          <Field label="Tags (comma separated)"><input className="w-full" value={q.tags.join(", ")} onChange={(e) => set("tags", e.target.value.split(",").map((t) => t.trim()).filter(Boolean))} /></Field>
        </div>
        <Field label="Image URL (optional)"><input className="w-full" value={q.image_url ?? ""} onChange={(e) => set("image_url", e.target.value || null)} /></Field>
        <div className="flex flex-wrap gap-5 text-sm">
          <label className="flex items-center gap-2"><input type="checkbox" className="h-4 w-4 p-0" checked={q.is_verified} onChange={(e) => set("is_verified", e.target.checked)} />Answer verified (eligible for full mocks)</label>
          <label className="flex items-center gap-2"><input type="checkbox" className="h-4 w-4 p-0" checked={q.is_active} onChange={(e) => set("is_active", e.target.checked)} />Active</label>
        </div>
        {error && <p className="rounded-lg border border-bad/30 bg-bad-soft px-3 py-2 text-sm text-bad">{error}</p>}
      </div>
    </Modal>
  );
}
