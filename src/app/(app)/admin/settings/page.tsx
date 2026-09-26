"use client";
import { useEffect, useState } from "react";
import { Button, Card, CardHeader, Field, Loading } from "@/components/ui";
import { supabase } from "@/lib/supabase/client";

type S = {
  needs_revision_below: number; strong_above: number; min_attempts: number;
  aviation: number; static_gk: number; verified_only: boolean; exam_local: string; duration: number;
};

/** "2026-10-21T00:00:00+05:30" <-> "2026-10-21T00:00" (IST wall clock for the input) */
const toLocal = (iso: string) => new Date(new Date(iso).getTime() + 5.5 * 3600e3).toISOString().slice(0, 16);
const fromLocal = (v: string) => `${v}:00+05:30`;

export default function AdminSettings() {
  const [s, setS] = useState<S | null>(null);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase().from("app_settings").select("key, value").then(({ data }) => {
      const m = Object.fromEntries((data ?? []).map((r) => [r.key, r.value]));
      const th = m.topic_status_thresholds ?? {};
      const split = m.ga_mock_split ?? {};
      setS({
        needs_revision_below: th.needs_revision_below ?? 60, strong_above: th.strong_above ?? 80, min_attempts: th.min_attempts ?? 10,
        aviation: split.Aviation ?? 11, static_gk: split["Static GK"] ?? 4, verified_only: m.full_mock_verified_only ?? true,
        exam_local: toLocal(m.exam_datetime ?? "2026-10-21T00:00:00+05:30"), duration: m.mock_duration_minutes ?? 120,
      });
    });
  }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!s) return;
    if (s.needs_revision_below >= s.strong_above) return setMsg({ ok: false, text: "The 'needs revision' threshold must be below the 'strong' threshold." });
    setSaving(true);
    const rows = [
      { key: "topic_status_thresholds", value: { needs_revision_below: s.needs_revision_below, strong_above: s.strong_above, min_attempts: s.min_attempts } },
      { key: "ga_mock_split", value: { Aviation: s.aviation, "Static GK": s.static_gk } },
      { key: "full_mock_verified_only", value: s.verified_only },
      { key: "exam_datetime", value: fromLocal(s.exam_local) },
      { key: "mock_duration_minutes", value: s.duration },
    ];
    const { error } = await supabase().from("app_settings").upsert(rows);
    setSaving(false);
    setMsg(error ? { ok: false, text: error.message } : { ok: true, text: "Settings saved." });
  }

  if (!s) return <Loading />;
  const num = (k: keyof S) => (e: React.ChangeEvent<HTMLInputElement>) => setS({ ...s, [k]: Number(e.target.value) });

  return (
    <form onSubmit={save} className="grid gap-6 lg:grid-cols-2 animate-fade-up">
      <Card>
        <CardHeader title="Weak-topic detection" subtitle="Used for topic status, weak topics and subject strength" />
        <div className="grid gap-3 p-5 sm:grid-cols-3">
          <Field label="Needs revision below (%)"><input type="number" min={1} max={99} className="w-full" value={s.needs_revision_below} onChange={num("needs_revision_below")} /></Field>
          <Field label="Strong above (%)"><input type="number" min={1} max={100} className="w-full" value={s.strong_above} onChange={num("strong_above")} /></Field>
          <Field label="Minimum attempts"><input type="number" min={1} className="w-full" value={s.min_attempts} onChange={num("min_attempts")} /></Field>
        </div>
        <p className="px-5 pb-5 text-xs text-fg-subtle">A topic is marked <b>Needs revision</b> when accuracy &lt; {s.needs_revision_below}% after at least {s.min_attempts} questions, and <b>Strong</b> when accuracy &gt; {s.strong_above}%.</p>
      </Card>

      <Card>
        <CardHeader title="Full mock generation" />
        <div className="grid gap-3 p-5 sm:grid-cols-2">
          <Field label="GA: aviation questions"><input type="number" min={0} max={15} className="w-full" value={s.aviation} onChange={num("aviation")} /></Field>
          <Field label="GA: static GK questions"><input type="number" min={0} max={15} className="w-full" value={s.static_gk} onChange={num("static_gk")} /></Field>
          <Field label="Mock duration (minutes)"><input type="number" min={1} className="w-full" value={s.duration} onChange={num("duration")} /></Field>
          <label className="flex items-end gap-2 pb-2 text-sm"><input type="checkbox" className="h-4 w-4 p-0" checked={s.verified_only} onChange={(e) => setS({ ...s, verified_only: e.target.checked })} />Use verified questions only</label>
        </div>
        {s.aviation + s.static_gk !== 15 && <p className="px-5 pb-4 text-xs text-amber">Aviation + static GK = {s.aviation + s.static_gk}. Any shortfall below 15 is filled from any GA topic.</p>}
      </Card>

      <Card>
        <CardHeader title="Exam date" subtitle="Drives every countdown; switches to “Exam completed” after this time" />
        <div className="p-5"><Field label="Date and time (IST)"><input type="datetime-local" className="w-full" value={s.exam_local} onChange={(e) => setS({ ...s, exam_local: e.target.value })} /></Field></div>
      </Card>

      <div className="flex items-start gap-3 lg:col-span-2">
        <Button type="submit" loading={saving}>Save settings</Button>
        {msg && <p className={`pt-2 text-sm ${msg.ok ? "text-ok" : "text-bad"}`}>{msg.text}</p>}
      </div>
    </form>
  );
}
