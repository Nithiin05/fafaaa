"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import type { TestKind } from "@/lib/types";

/** Turns database error codes into messages a student can act on. */
export function friendlyError(message: string | undefined | null): string {
  const m = message ?? "";
  if (m.includes("NOT_ENOUGH_QUESTIONS")) {
    const detail = m.split("NOT_ENOUGH_QUESTIONS:")[1]?.trim();
    return `The question bank doesn't have enough questions for a full mock yet${detail ? ` (${detail})` : ""}. An admin needs to add more.`;
  }
  if (m.includes("NO_QUESTIONS_AVAILABLE")) return "No questions are available for this selection yet. Try another topic or difficulty.";
  if (m.includes("PAPER_HAS_NO_QUESTIONS")) return "This paper has no questions uploaded yet.";
  if (m.includes("NOT_AUTHENTICATED")) return "Your session has expired. Please sign in again.";
  if (m.includes("ATTEMPT_NOT_FOUND")) return "This test could not be found.";
  if (m.includes("ADMIN_ONLY")) return "Only administrators can do this.";
  if (m.includes("Failed to fetch")) return "Can't reach the server. Check your connection.";
  return m || "Something went wrong.";
}

export async function rpc<T>(fn: string, args?: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase().rpc(fn, args);
  if (error) throw new Error(friendlyError(error.message));
  return data as T;
}

/** Loads an RPC on mount; `reload()` refetches. */
export function useRpc<T>(fn: string, args?: Record<string, unknown>) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const key = JSON.stringify(args ?? {});
  const alive = useRef(true);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const d = await rpc<T>(fn, JSON.parse(key));
      if (alive.current) setData(d);
    } catch (e) {
      if (alive.current) setError((e as Error).message);
    } finally {
      if (alive.current) setLoading(false);
    }
  }, [fn, key]);

  useEffect(() => {
    alive.current = true;
    reload();
    return () => { alive.current = false; };
  }, [reload]);

  return { data, error, loading, reload, setData };
}

/** Starts a test or practice set and returns the attempt id. */
export function startAttempt(kind: TestKind, testId?: string | null, config: Record<string, unknown> = {}) {
  return rpc<string>("start_attempt", { p_kind: kind, p_test_id: testId ?? null, p_config: config });
}
