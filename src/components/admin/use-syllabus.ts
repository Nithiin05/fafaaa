"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";

export type Subject = { id: number; slug: string; name: string; short_name: string; part: "A" | "B"; questions_in_exam: number; sort_order: number };
export type Topic = { id: number; subject_id: number; slug: string; name: string; topic_group: string | null; sort_order: number };

/** Subjects and topics for admin forms. */
export function useSyllabus() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const sb = supabase();
    Promise.all([
      sb.from("subjects").select("*").order("sort_order"),
      sb.from("topics").select("*").order("sort_order"),
    ]).then(([s, t]) => { setSubjects((s.data as Subject[]) ?? []); setTopics((t.data as Topic[]) ?? []); });
  }, [tick]);
  return { subjects, topics, reload: () => setTick((x) => x + 1) };
}

export const slugify = (s: string) => s.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
