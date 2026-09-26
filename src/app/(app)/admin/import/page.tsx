"use client";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Papa from "papaparse";
import { Download, FileUp, CheckCircle2, AlertTriangle } from "lucide-react";
import { Button, Card, CardHeader, Field } from "@/components/ui";
import { rpc } from "@/lib/rpc";
import { supabase } from "@/lib/supabase/client";

const REQUIRED = ["question", "optionA", "optionB", "optionC", "optionD", "correctAnswer", "explanation", "subject", "topic"];
const OPTIONAL = ["difficulty", "source", "year", "exam", "shift", "subtopic", "concept", "tags", "image", "verified"];
const ALL = [...REQUIRED, ...OPTIONAL];
const CHUNK = 200;

type Row = Record<string, string>;
type Result = { inserted: number; failed: number; errors: { row: number; message: string }[] };

/** Maps any header spelling ("Option A", "option_a", "correct answer") to the importer's keys. */
function normaliseHeader(h: string) {
  const k = h.toLowerCase().replace(/[^a-z]/g, "");
  return ALL.find((a) => a.toLowerCase() === k) ?? (k === "answer" || k === "correct" ? "correctAnswer" : k === "imageurl" ? "image" : h);
}

function ImportInner() {
  const params = useSearchParams();
  const [rows, setRows] = useState<Row[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [fileName, setFileName] = useState("");
  const [parseError, setParseError] = useState("");
  const [tests, setTests] = useState<{ id: string; title: string; kind: string }[]>([]);
  const [testId, setTestId] = useState(params.get("test") ?? "");
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<Result | null>(null);

  useEffect(() => {
    supabase().from("tests").select("id, title, kind").order("created_at", { ascending: false }).then(({ data }) => setTests(data ?? []));
  }, []);

  async function onFile(file: File) {
    setResult(null); setParseError(""); setFileName(file.name);
    try {
      let raw: Row[] = [];
      if (/\.xlsx?$/i.test(file.name)) {
        const readXlsx = (await import("read-excel-file")).default;
        const sheet = await readXlsx(file);
        const [head, ...body] = sheet;
        raw = body.map((r) => Object.fromEntries(head.map((h, i) => [String(h ?? ""), r[i] == null ? "" : String(r[i])])));
      } else {
        const parsed = Papa.parse<Row>(await file.text(), { header: true, skipEmptyLines: "greedy" });
        if (parsed.errors.length) throw new Error(`Row ${parsed.errors[0].row}: ${parsed.errors[0].message}`);
        raw = parsed.data;
      }
      const mapped = raw.map((r) => Object.fromEntries(Object.entries(r).map(([k, v]) => [normaliseHeader(k), String(v ?? "").trim()])))
        .filter((r) => Object.values(r).some(Boolean));
      setRows(mapped);
      setHeaders(Object.keys(mapped[0] ?? {}));
    } catch (e) {
      setRows([]); setParseError((e as Error).message);
    }
  }

  const missing = REQUIRED.filter((h) => !headers.includes(h));

  async function runImport() {
    setRunning(true); setProgress(0);
    const total: Result = { inserted: 0, failed: 0, errors: [] };
    for (let i = 0; i < rows.length; i += CHUNK) {
      try {
        const r = await rpc<Result>("admin_import_questions", { p_rows: rows.slice(i, i + CHUNK), p_test_id: testId || null });
        total.inserted += r.inserted; total.failed += r.failed;
        total.errors.push(...r.errors.map((e) => ({ row: e.row + i + 1, message: e.message }))); // +1 for the header row
      } catch (e) {
        total.failed += Math.min(CHUNK, rows.length - i);
        total.errors.push({ row: i + 2, message: `Batch failed: ${(e as Error).message}` });
      }
      setProgress(Math.min(rows.length, i + CHUNK));
    }
    setResult(total); setRunning(false);
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr] animate-fade-up">
      <Card>
        <CardHeader title="Bulk upload questions" subtitle="CSV or Excel (.xlsx). Each row is checked; bad rows are reported and skipped, good rows are saved." />
        <div className="space-y-5 p-5">
          <label className="flex cursor-pointer flex-col items-center gap-2 rounded-xl border border-dashed border-ink-600 bg-ink-850 px-4 py-8 text-center hover:border-sky/50">
            <FileUp className="h-6 w-6 text-sky" />
            <span className="text-sm font-medium">{fileName || "Choose a .csv or .xlsx file"}</span>
            <span className="text-xs text-fg-subtle">{rows.length ? `${rows.length} rows found` : "First row must contain the column headers"}</span>
            <input type="file" accept=".csv,.xlsx,.xls" className="sr-only" onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} />
          </label>
          {parseError && <p className="text-sm text-bad">{parseError}</p>}
          {rows.length > 0 && missing.length > 0 && (
            <p className="flex items-start gap-2 rounded-lg border border-bad/30 bg-bad-soft px-3 py-2 text-sm text-bad"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />Missing columns: {missing.join(", ")}</p>
          )}

          <Field label="Also add these questions to a mock or previous paper (optional)" hint="Questions are appended in file order — use this to upload a full previous paper.">
            <select value={testId} onChange={(e) => setTestId(e.target.value)} className="w-full">
              <option value="">Question bank only</option>
              {tests.map((t) => <option key={t.id} value={t.id}>{t.title} ({t.kind.replace("_", " ")})</option>)}
            </select>
          </Field>

          {rows.length > 0 && (
            <div className="overflow-x-auto rounded-lg border border-ink-700">
              <table className="w-full min-w-[640px] text-xs">
                <thead className="bg-ink-850 text-left text-fg-subtle"><tr>{["#", "question", "correctAnswer", "subject", "topic", "difficulty", "source"].map((h) => <th key={h} className="px-2 py-2 font-medium">{h}</th>)}</tr></thead>
                <tbody>
                  {rows.slice(0, 5).map((r, i) => (
                    <tr key={i} className="border-t border-ink-700"><td className="px-2 py-1.5 text-fg-subtle">{i + 2}</td><td className="max-w-xs truncate px-2 py-1.5">{r.question}</td><td className="px-2 py-1.5">{r.correctAnswer}</td><td className="px-2 py-1.5">{r.subject}</td><td className="px-2 py-1.5">{r.topic}</td><td className="px-2 py-1.5">{r.difficulty}</td><td className="px-2 py-1.5">{r.source}</td></tr>
                  ))}
                </tbody>
              </table>
              {rows.length > 5 && <p className="px-2 py-1.5 text-[11px] text-fg-subtle">…and {rows.length - 5} more</p>}
            </div>
          )}

          <Button onClick={runImport} disabled={!rows.length || missing.length > 0} loading={running}>
            {running ? `Importing ${progress}/${rows.length}…` : `Import ${rows.length || ""} questions`}
          </Button>

          {result && (
            <div className="space-y-2">
              <p className="flex items-center gap-2 text-sm"><CheckCircle2 className="h-4 w-4 text-ok" /><b>{result.inserted}</b> imported · <b className={result.failed ? "text-bad" : ""}>{result.failed}</b> skipped</p>
              {result.errors.length > 0 && (
                <div className="max-h-64 overflow-y-auto rounded-lg border border-ink-700 bg-ink-850 p-3 text-xs">
                  {result.errors.map((e, i) => <div key={i} className="py-0.5"><span className="text-fg-subtle">Row {e.row}:</span> {e.message}</div>)}
                </div>
              )}
            </div>
          )}
        </div>
      </Card>

      <Card>
        <CardHeader title="File format" />
        <div className="space-y-4 p-5 text-sm">
          <a href="/question-import-template.csv" download className="inline-flex items-center gap-2 text-sky hover:underline"><Download className="h-4 w-4" />Download CSV template</a>
          <div>
            <div className="mb-1 text-xs font-medium text-fg-muted">Required columns</div>
            <code className="block rounded-lg bg-ink-850 p-3 text-xs leading-relaxed text-fg">{REQUIRED.join(", ")}</code>
          </div>
          <div>
            <div className="mb-1 text-xs font-medium text-fg-muted">Optional columns</div>
            <code className="block rounded-lg bg-ink-850 p-3 text-xs leading-relaxed text-fg">{OPTIONAL.join(", ")}</code>
          </div>
          <ul className="space-y-1.5 text-xs text-fg-muted">
            <li>• <b className="text-fg">correctAnswer</b>: A, B, C or D (1–4 also accepted).</li>
            <li>• <b className="text-fg">subject / topic</b>: the name or slug shown in Subjects &amp; topics (e.g. &ldquo;Physics&rdquo;, &ldquo;Current Electricity&rdquo;).</li>
            <li>• <b className="text-fg">difficulty</b>: easy, moderate, exam (or &ldquo;exam level&rdquo;), challenging.</li>
            <li>• <b className="text-fg">source</b>: original, demo, official (previous_official) or memory (previous_memory_based). Previous-paper rows need <b className="text-fg">year</b> and <b className="text-fg">exam</b>.</li>
            <li>• <b className="text-fg">verified</b>: defaults to true. Set to false for answers still being checked — unverified questions are left out of full mocks.</li>
            <li>• Duplicate questions (same text) are skipped automatically.</li>
          </ul>
        </div>
      </Card>
    </div>
  );
}

export default function ImportPage() {
  return <Suspense><ImportInner /></Suspense>;
}
