"use client";
import { Button, Modal } from "@/components/ui";

/** CBT instructions shown before any timed full-length test. */
export function StartTestModal({ open, onClose, onStart, title, loading, questions = 120, minutes = 120, simulation = false }:
  { open: boolean; onClose: () => void; onStart: () => void; title: string; loading?: boolean; questions?: number; minutes?: number; simulation?: boolean }) {
  return (
    <Modal open={open} onClose={onClose} title={title}
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button onClick={onStart} loading={loading}>Start test</Button></>}>
      <ul className="space-y-2 text-sm text-fg-muted">
        <li>• <b className="text-fg">{questions} questions</b>, <b className="text-fg">{minutes} minutes</b>. One mark each, no negative marking.</li>
        <li>• The timer starts now and keeps running if you close the page. The test is <b className="text-fg">submitted automatically</b> at 00:00.</li>
        <li>• Every answer is saved as you go. If you lose connection, answers are kept on this device and synced when you&apos;re back.</li>
        <li>• Use <b className="text-fg">Mark for review</b> to flag questions. Marked questions that have an answer are still scored.</li>
        <li>• Answers and explanations are shown only after you submit.</li>
        {simulation && <li className="text-amber">• Real exam simulation: no pause and no hints — treat it like the actual CBT.</li>}
      </ul>
      <div className="mt-4 grid grid-cols-2 gap-2 text-[11px] text-fg-muted">
        {[["bg-ink-800 border-ink-700", "Not visited"], ["bg-bad/90 border-bad", "Not answered"], ["bg-ok border-ok", "Answered"], ["bg-review border-review", "Marked for review"]].map(([c, l]) => (
          <div key={l} className="flex items-center gap-2"><span className={`h-4 w-4 rounded border ${c}`} />{l}</div>
        ))}
      </div>
    </Modal>
  );
}
