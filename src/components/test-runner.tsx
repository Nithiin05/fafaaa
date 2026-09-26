"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import {
  Bookmark, BookmarkCheck, ChevronLeft, ChevronRight, CloudOff, Check, Grid3X3, Loader2, Flag, Eraser, X, Clock, ShieldCheck,
} from "lucide-react";
import { BrandMark } from "@/components/brand";
import { CompactCountdown } from "@/components/countdown";
import { Badge, Button, ErrorState, Loading, Modal } from "@/components/ui";
import { rpc } from "@/lib/rpc";
import { supabase } from "@/lib/supabase/client";
import { clock, letter } from "@/lib/format";
import type { AttemptPayload, AttemptQuestion, Palette } from "@/lib/types";

type Pending = { position: number; selected: number | null; marked: boolean; time_delta: number };
type SaveState = "saved" | "saving" | "offline";

const paletteOf = (selected: number | null, marked: boolean): Palette =>
  selected !== null ? (marked ? "answered_marked" : "answered") : marked ? "marked" : "not_answered";
const isMarked = (p: Palette) => p === "marked" || p === "answered_marked";

const PALETTE_STYLE: Record<Palette, string> = {
  not_visited: "bg-ink-800 text-fg-muted border-ink-700",
  not_answered: "bg-bad/90 text-white border-bad",
  answered: "bg-ok text-ink-950 border-ok",
  marked: "bg-review text-ink-950 border-review",
  answered_marked: "bg-review text-ink-950 border-review",
};
const PALETTE_LABEL: Record<Palette, string> = {
  not_visited: "Not visited", not_answered: "Not answered", answered: "Answered",
  marked: "Marked for review", answered_marked: "Answered & marked",
};

export function TestRunner({ attemptId, examDate }: { attemptId: string; examDate: string }) {
  const router = useRouter();
  const storageKey = `aai-pending-${attemptId}`;

  const [meta, setMeta] = useState<AttemptPayload["attempt"] | null>(null);
  const [sections, setSections] = useState<AttemptPayload["sections"]>([]);
  const [qs, setQs] = useState<AttemptQuestion[]>([]);
  const [idx, setIdx] = useState(0);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [save, setSave] = useState<SaveState>("saved");
  const [now, setNow] = useState(() => Date.now());
  const [offset, setOffset] = useState(0);
  const [confirm, setConfirm] = useState(false);
  const [submitting, setSubmitting] = useState<null | "manual" | "auto">(null);
  const [drawer, setDrawer] = useState(false);
  const [bookmarks, setBookmarks] = useState<Set<string>>(new Set());

  const pending = useRef(new Map<number, Pending>());
  const inflight = useRef(false);
  const enteredAt = useRef(Date.now());
  const autoFired = useRef(false);
  const finished = useRef(false);
  const qsRef = useRef<AttemptQuestion[]>([]);
  const idxRef = useRef(0);
  useEffect(() => { qsRef.current = qs; }, [qs]);
  useEffect(() => { idxRef.current = idx; }, [idx]);

  // ---------- persistence ----------
  const persistLocal = useCallback(() => {
    try {
      if (pending.current.size) localStorage.setItem(storageKey, JSON.stringify([...pending.current.values()]));
      else localStorage.removeItem(storageKey);
    } catch { /* storage unavailable — server saves still work */ }
  }, [storageKey]);

  const queue = useCallback((position: number, patch: Partial<Pending>) => {
    const prev = pending.current.get(position);
    const q = qsRef.current.find((x) => x.position === position);
    const base: Pending = prev ?? { position, selected: q?.selected ?? null, marked: q ? isMarked(q.palette) : false, time_delta: 0 };
    pending.current.set(position, {
      ...base, ...patch,
      time_delta: base.time_delta + (patch.time_delta ?? 0),
    });
    persistLocal();
  }, [persistLocal]);

  const flush = useCallback(async (): Promise<boolean> => {
    if (inflight.current || finished.current) return true;
    if (!pending.current.size) { setSave("saved"); return true; }
    inflight.current = true;
    const items = [...pending.current.values()];
    pending.current.clear();
    setSave("saving");
    try {
      const res = await rpc<{ ok: boolean; status: string }>("save_answers", { p_attempt: attemptId, p_items: items });
      if (!res.ok) {
        finished.current = true;
        try { localStorage.removeItem(storageKey); } catch {}
        router.replace(`/results/${attemptId}`);
        return false;
      }
      persistLocal();
      setSave(pending.current.size ? "saving" : "saved");
      return true;
    } catch {
      // put items back (newer local edits win; time deltas add up)
      for (const it of items) {
        const cur = pending.current.get(it.position);
        pending.current.set(it.position, cur ? { ...cur, time_delta: cur.time_delta + it.time_delta } : it);
      }
      persistLocal();
      setSave("offline");
      return false;
    } finally {
      inflight.current = false;
    }
  }, [attemptId, persistLocal, router, storageKey]);

  // ---------- load ----------
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await rpc<AttemptPayload>("get_attempt", { p_attempt: attemptId });
        if (cancelled) return;
        if (data.attempt.status !== "in_progress") { router.replace(`/results/${attemptId}`); return; }
        let questions = data.questions;
        // restore unsynced answers kept on this device
        try {
          const raw = localStorage.getItem(storageKey);
          if (raw) {
            const saved: Pending[] = JSON.parse(raw);
            for (const p of saved) pending.current.set(p.position, p);
            questions = questions.map((q) => {
              const p = pending.current.get(q.position);
              return p ? { ...q, selected: p.selected, palette: paletteOf(p.selected, p.marked) } : q;
            });
          }
        } catch {}
        setOffset(new Date(data.attempt.server_now).getTime() - Date.now());
        setMeta(data.attempt);
        setSections(data.sections);
        // open on the first unanswered question
        const first = questions.findIndex((q) => q.palette === "not_visited" || q.palette === "not_answered");
        const start = first < 0 ? 0 : first;
        if (questions[start]?.palette === "not_visited") {
          questions = questions.map((q, i) => (i === start ? { ...q, palette: "not_answered" } : q));
        }
        qsRef.current = questions;
        setQs(questions);
        setIdx(start);
        enteredAt.current = Date.now();
        const ids = questions.map((q) => q.question_id);
        const { data: bm } = await supabase().from("bookmarks").select("question_id").in("question_id", ids);
        if (!cancelled && bm) setBookmarks(new Set(bm.map((b) => b.question_id as string)));
        if (pending.current.size) flush();
      } catch (e) {
        if (!cancelled) setLoadError((e as Error).message);
      }
    })();
    return () => { cancelled = true; };
  }, [attemptId, flush, router, storageKey]);

  // ---------- clocks & background sync ----------
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 500);
    const f = setInterval(() => { flush(); }, 5000);
    const vis = () => {
      if (document.visibilityState === "hidden") {
        recordTime();
        flush();
      } else enteredAt.current = Date.now();
    };
    document.addEventListener("visibilitychange", vis);
    return () => { clearInterval(t); clearInterval(f); document.removeEventListener("visibilitychange", vis); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flush]);

  const timed = !!meta?.deadline_at;
  const remaining = meta?.deadline_at ? (new Date(meta.deadline_at).getTime() - (now + offset)) / 1000 : 0;
  const elapsed = meta ? (now + offset - new Date(meta.started_at).getTime()) / 1000 : 0;

  useEffect(() => {
    if (!timed || !meta || finished.current) return;
    const warn = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ""; };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [timed, meta]);

  // ---------- navigation & answering ----------
  const current = qs[idx];

  function recordTime() {
    const q = qsRef.current[idxRef.current];
    if (!q) return;
    const delta = Math.round((Date.now() - enteredAt.current) / 1000);
    enteredAt.current = Date.now();
    if (delta > 0) queue(q.position, { time_delta: delta });
  }

  const updateQ = (i: number, patch: Partial<AttemptQuestion>) =>
    setQs((prev) => { const next = prev.map((q, j) => (j === i ? { ...q, ...patch } : q)); qsRef.current = next; return next; });

  const goTo = useCallback((i: number) => {
    if (i < 0 || i >= qsRef.current.length || i === idxRef.current) return;
    recordTime();
    const target = qsRef.current[i];
    if (target.palette === "not_visited") {
      updateQ(i, { palette: "not_answered" });
      queue(target.position, { selected: null, marked: false });
    }
    setIdx(i);
    setDrawer(false);
    flush();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flush, queue]);

  function choose(slot: number) {
    if (!current) return;
    const marked = isMarked(current.palette);
    updateQ(idx, { selected: slot, palette: paletteOf(slot, marked) });
    queue(current.position, { selected: slot, marked });
  }
  function clearResponse() {
    if (!current) return;
    const marked = isMarked(current.palette);
    updateQ(idx, { selected: null, palette: paletteOf(null, marked) });
    queue(current.position, { selected: null, marked });
  }
  function markAndNext() {
    if (!current) return;
    const marked = !isMarked(current.palette);
    updateQ(idx, { palette: paletteOf(current.selected, marked) });
    queue(current.position, { selected: current.selected, marked });
    if (marked) goTo(idx + 1); else flush();
  }
  function saveAndNext() {
    flush();
    if (idx < qs.length - 1) goTo(idx + 1); else setConfirm(true);
  }

  const doSubmit = useCallback(async (mode: "manual" | "auto") => {
    if (finished.current) return;
    setSubmitting(mode);
    recordTime();
    // retry the final save a few times before submitting
    for (let i = 0; i < 3 && pending.current.size; i++) {
      const ok = await flush();
      if (!ok && finished.current) return;
      if (!ok) await new Promise((r) => setTimeout(r, 1200));
    }
    try {
      await rpc("submit_attempt", { p_attempt: attemptId });
      finished.current = true;
      try { localStorage.removeItem(storageKey); } catch {}
      router.replace(`/results/${attemptId}`);
    } catch (e) {
      setSubmitting(null);
      setSave("offline");
      alertOnce((e as Error).message);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attemptId, flush, router, storageKey]);

  const [submitError, setSubmitError] = useState<string | null>(null);
  const alertOnce = (m: string) => setSubmitError(m);

  // auto-submit when time runs out
  useEffect(() => {
    if (timed && meta && remaining <= 0 && !autoFired.current) {
      autoFired.current = true;
      doSubmit("auto");
    }
  }, [timed, meta, remaining, doSubmit]);

  // keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (confirm || submitting || e.metaKey || e.ctrlKey || e.altKey) return;
      const k = e.key.toLowerCase();
      if (["1", "2", "3", "4"].includes(k)) choose(Number(k));
      else if (["a", "b", "c", "d"].includes(k)) choose("abcd".indexOf(k) + 1);
      else if (k === "arrowright") goTo(idx + 1);
      else if (k === "arrowleft") goTo(idx - 1);
      else return;
      e.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  async function toggleBookmark() {
    if (!current) return;
    const id = current.question_id;
    const has = bookmarks.has(id);
    const next = new Set(bookmarks);
    if (has) next.delete(id); else next.add(id);
    setBookmarks(next);
    const { data: { user } } = await supabase().auth.getUser();
    if (!user) return;
    if (has) await supabase().from("bookmarks").delete().eq("question_id", id).eq("user_id", user.id);
    else await supabase().from("bookmarks").insert({ user_id: user.id, question_id: id, category: "important" });
  }

  const counts = useMemo(() => {
    const c: Record<Palette, number> = { not_visited: 0, not_answered: 0, answered: 0, marked: 0, answered_marked: 0 };
    qs.forEach((q) => { c[q.palette]++; });
    return c;
  }, [qs]);

  const currentSection = sections.findIndex((s) => current && current.position >= s.start && current.position < s.start + s.count);

  if (loadError) return <div className="mx-auto max-w-lg p-6"><ErrorState message={loadError} retry={() => location.reload()} /></div>;
  if (!meta || !current) return <Loading label="Preparing your test…" />;

  const isPractice = !["full_mock", "exam_simulation", "previous_paper"].includes(meta.kind);
  const low = timed && remaining <= 300;
  const mid = timed && remaining <= 600;

  const paletteGrid = (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-[11px]">
        {(Object.keys(PALETTE_LABEL) as Palette[]).map((p) => (
          <div key={p} className="flex items-center gap-2">
            <span className={clsx("relative grid h-5 w-5 place-items-center rounded border text-[10px] font-semibold tabular", PALETTE_STYLE[p])}>
              {counts[p]}
              {p === "answered_marked" && <span className="absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full bg-ok ring-2 ring-ink-900" />}
            </span>
            <span className="text-fg-muted">{PALETTE_LABEL[p]}</span>
          </div>
        ))}
      </div>
      {sections.map((s, si) => (
        <div key={s.subject_id}>
          <div className={clsx("mb-2 text-[11px] font-semibold uppercase tracking-wider", si === currentSection ? "text-sky" : "text-fg-subtle")}>{s.name}</div>
          <div className="grid grid-cols-6 gap-1.5 sm:grid-cols-8 lg:grid-cols-6">
            {qs.slice(s.start - 1, s.start - 1 + s.count).map((q) => {
              const i = q.position - 1;
              return (
                <button key={q.position} onClick={() => goTo(i)} aria-label={`Question ${q.position}: ${PALETTE_LABEL[q.palette]}`}
                  className={clsx("relative h-9 rounded-md border text-xs font-semibold tabular transition",
                    PALETTE_STYLE[q.palette], i === idx && "ring-2 ring-sky ring-offset-2 ring-offset-ink-900")}>
                  {q.position}
                  {q.palette === "answered_marked" && <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-ok ring-2 ring-ink-900" />}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div className="flex min-h-screen flex-col">
      {/* Top bar */}
      <header className="sticky top-0 z-20 border-b border-ink-700 bg-ink-950/95 backdrop-blur">
        <div className="flex h-14 items-center gap-3 px-3 sm:px-5">
          <BrandMark size={28} />
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-semibold">{meta.title}</div>
            <div className="flex items-center gap-2 text-[11px] text-fg-subtle">
              {meta.kind === "exam_simulation" ? <span className="inline-flex items-center gap-1 text-amber"><ShieldCheck className="h-3 w-3" />Real exam simulation · no pause</span>
                : isPractice ? "Practice · untimed" : "Full-length test"}
              <span className="hidden sm:inline">·</span>
              <span className="hidden items-center gap-1 sm:inline-flex">
                {save === "saving" ? <><Loader2 className="h-3 w-3 animate-spin" />Saving</> : save === "offline" ? <span className="inline-flex items-center gap-1 text-amber"><CloudOff className="h-3 w-3" />Offline — answers kept on this device</span> : <><Check className="h-3 w-3 text-ok" />Saved</>}
              </span>
            </div>
          </div>
          <CompactCountdown target={examDate} className="hidden lg:inline-flex" />
          <div className={clsx("flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-base font-semibold tabular sm:text-lg",
            low ? "border-bad/50 bg-bad-soft text-bad" : mid ? "border-amber/40 bg-amber-soft text-amber" : "border-ink-700 bg-ink-900")}
            aria-live="off" aria-label={timed ? "Time remaining" : "Time elapsed"}>
            <Clock className="h-4 w-4" />{timed ? clock(remaining) : clock(elapsed)}
          </div>
          <Button size="sm" onClick={() => setConfirm(true)} className="hidden sm:inline-flex">Submit test</Button>
        </div>
        {/* Section tabs */}
        {sections.length > 1 && (
          <div className="flex gap-1 overflow-x-auto border-t border-ink-700/60 px-3 py-1.5 sm:px-5">
            {sections.map((s, si) => {
              const answered = qs.slice(s.start - 1, s.start - 1 + s.count).filter((q) => q.selected !== null).length;
              return (
                <button key={s.subject_id} onClick={() => goTo(s.start - 1)}
                  className={clsx("shrink-0 rounded-md px-2.5 py-1 text-xs", si === currentSection ? "bg-ink-800 text-fg" : "text-fg-muted hover:text-fg")}>
                  {s.name} <span className="tabular text-fg-subtle">{answered}/{s.count}</span>
                </button>
              );
            })}
          </div>
        )}
      </header>

      <div className="flex flex-1">
        {/* Question */}
        <main className="flex min-w-0 flex-1 flex-col">
          <div className="mx-auto w-full max-w-3xl flex-1 px-4 py-5 sm:px-6 sm:py-7">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <div className="text-xs font-semibold uppercase tracking-wider text-fg-subtle">Question {current.position} of {qs.length}</div>
                <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-fg-muted">
                  <span>{current.subject}</span><span className="text-fg-subtle">·</span><span>{current.topic}</span>
                  {current.source === "demo" && <Badge>Demo</Badge>}
                  {current.source?.startsWith("previous") && current.year && <Badge tone="amber">{current.exam ?? "Previous paper"} {current.year}</Badge>}
                  {isMarked(current.palette) && <Badge tone="review"><Flag className="h-3 w-3" />Marked</Badge>}
                </div>
              </div>
              <button onClick={toggleBookmark} className="rounded-lg p-2 text-fg-muted hover:bg-ink-800 hover:text-fg"
                aria-label={bookmarks.has(current.question_id) ? "Remove bookmark" : "Bookmark question"}>
                {bookmarks.has(current.question_id) ? <BookmarkCheck className="h-5 w-5 text-amber" /> : <Bookmark className="h-5 w-5" />}
              </button>
            </div>

            <p className="whitespace-pre-line text-[17px] leading-relaxed text-fg sm:text-lg">{current.text}</p>
            {current.image_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={current.image_url} alt="Question diagram" className="mt-4 max-h-80 rounded-lg border border-ink-700 bg-white object-contain" />
            )}

            <div className="mt-6 space-y-2.5" role="radiogroup" aria-label="Options">
              {current.options.map((opt, i) => {
                const slot = i + 1;
                const selected = current.selected === slot;
                return (
                  <button key={i} role="radio" aria-checked={selected} onClick={() => choose(slot)}
                    className={clsx("flex w-full items-start gap-3 rounded-xl border px-4 py-3.5 text-left text-[15px] transition-colors",
                      selected ? "border-sky bg-sky-soft" : "border-ink-700 bg-ink-900 hover:border-ink-600 hover:bg-ink-850")}>
                    <span className={clsx("grid h-7 w-7 shrink-0 place-items-center rounded-full border text-xs font-semibold",
                      selected ? "border-sky bg-sky text-ink-950" : "border-ink-600 text-fg-muted")}>{letter(i)}</span>
                    <span className="pt-0.5 leading-relaxed">{opt}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Action bar */}
          <div className="sticky bottom-0 border-t border-ink-700 bg-ink-950/95 backdrop-blur safe-bottom">
            <div className="mx-auto flex max-w-3xl flex-wrap items-center gap-2 px-3 py-3 sm:px-6">
              <Button variant="secondary" size="sm" onClick={markAndNext} className="border-review/30">
                <Flag className="h-3.5 w-3.5 text-review" /><span className="hidden sm:inline">{isMarked(current.palette) ? "Unmark" : "Mark for review & next"}</span><span className="sm:hidden">{isMarked(current.palette) ? "Unmark" : "Mark"}</span>
              </Button>
              <Button variant="ghost" size="sm" onClick={clearResponse} disabled={current.selected === null}><Eraser className="h-3.5 w-3.5" /><span className="hidden sm:inline">Clear response</span><span className="sm:hidden">Clear</span></Button>
              <div className="ml-auto flex items-center gap-2">
                <Button variant="secondary" size="sm" onClick={() => setDrawer(true)} className="lg:hidden" aria-label="Question palette"><Grid3X3 className="h-3.5 w-3.5" />{counts.answered + counts.answered_marked}/{qs.length}</Button>
                <Button variant="secondary" size="sm" onClick={() => goTo(idx - 1)} disabled={idx === 0} aria-label="Previous"><ChevronLeft className="h-4 w-4" /><span className="hidden sm:inline">Previous</span></Button>
                <Button size="sm" onClick={saveAndNext}>{idx === qs.length - 1 ? "Save & finish" : "Save & next"}<ChevronRight className="h-4 w-4" /></Button>
              </div>
              <Button size="sm" variant="secondary" onClick={() => setConfirm(true)} className="w-full sm:hidden">Submit test</Button>
            </div>
          </div>
        </main>

        {/* Desktop palette */}
        <aside className="hidden w-80 shrink-0 overflow-y-auto border-l border-ink-700 bg-ink-900 p-4 lg:block" style={{ maxHeight: "calc(100vh - 92px)", position: "sticky", top: 92 }}>
          <div className="mb-3 text-sm font-semibold">Question palette</div>
          {paletteGrid}
        </aside>
      </div>

      {/* Mobile palette drawer */}
      {drawer && (
        <div className="fixed inset-0 z-40 bg-black/60 lg:hidden" onClick={() => setDrawer(false)}>
          <div className="absolute inset-x-0 bottom-0 max-h-[80vh] overflow-y-auto rounded-t-2xl border-t border-ink-700 bg-ink-900 p-4 safe-bottom animate-fade-up" onClick={(e) => e.stopPropagation()}>
            <div className="mb-3 flex items-center justify-between">
              <span className="text-sm font-semibold">Question palette</span>
              <button onClick={() => setDrawer(false)} className="rounded-md p-1.5 text-fg-muted" aria-label="Close"><X className="h-5 w-5" /></button>
            </div>
            {paletteGrid}
          </div>
        </div>
      )}

      {/* Submit confirmation */}
      <Modal open={confirm && !submitting} onClose={() => setConfirm(false)} title="Submit test?"
        footer={<>
          <Button variant="secondary" onClick={() => setConfirm(false)}>Keep working</Button>
          <Button onClick={() => doSubmit("manual")}>Submit</Button>
        </>}>
        <p className="text-sm text-fg-muted">You can&apos;t change answers after submitting.{timed && <> Time left: <b className="text-fg tabular">{clock(remaining)}</b>.</>}</p>
        <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
          {([["Answered", counts.answered + counts.answered_marked, "text-ok"], ["Not answered", counts.not_answered, "text-bad"],
             ["Marked for review", counts.marked + counts.answered_marked, "text-review"], ["Not visited", counts.not_visited, "text-fg-muted"]] as const).map(([l, v, c]) => (
            <div key={l} className="rounded-lg border border-ink-700 bg-ink-850 px-3 py-2">
              <div className="text-[11px] text-fg-subtle">{l}</div><div className={clsx("text-lg font-semibold tabular", c)}>{v}</div>
            </div>
          ))}
        </div>
        {save === "offline" && <p className="mt-3 text-xs text-amber">You seem to be offline. We&apos;ll retry saving before submitting.</p>}
      </Modal>

      {submitting && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-ink-950/90 backdrop-blur">
          <div className="text-center">
            <Loader2 className="mx-auto h-7 w-7 animate-spin text-sky" />
            <p className="mt-3 font-semibold">{submitting === "auto" ? "Time's up — submitting your answers" : "Submitting your answers"}</p>
            <p className="mt-1 text-sm text-fg-muted">Please don&apos;t close this page.</p>
          </div>
        </div>
      )}
      <Modal open={!!submitError} onClose={() => setSubmitError(null)} title="Couldn't submit yet"
        footer={<Button onClick={() => { setSubmitError(null); doSubmit("manual"); }}>Try again</Button>}>
        <p className="text-sm text-fg-muted">{submitError} Your answers are safe on this device and on the server up to the last save.</p>
      </Modal>
    </div>
  );
}
