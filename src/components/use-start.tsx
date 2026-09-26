"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { startAttempt } from "@/lib/rpc";
import type { TestKind } from "@/lib/types";

/** Starts a test/practice set and navigates to the test screen. */
export function useStart() {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function start(kind: TestKind, testId: string | null = null, config: Record<string, unknown> = {}, key = "default") {
    setBusy(key);
    setError(null);
    try {
      const id = await startAttempt(kind, testId, config);
      router.push(`/test/${id}`);
    } catch (e) {
      setError((e as Error).message);
      setBusy(null);
    }
  }
  return { start, busy, error, clearError: () => setError(null) };
}

export function StartError({ message, onClose }: { message: string | null; onClose: () => void }) {
  if (!message) return null;
  return (
    <div className="fixed inset-x-4 bottom-24 z-50 mx-auto max-w-md rounded-xl border border-bad/30 bg-ink-850 px-4 py-3 text-sm shadow-card md:bottom-6" role="alert">
      <div className="flex items-start justify-between gap-3">
        <p className="text-fg">{message}</p>
        <button onClick={onClose} className="text-xs text-fg-muted hover:text-fg">Dismiss</button>
      </div>
    </div>
  );
}
