import { redirect } from "next/navigation";
import { serverSupabase } from "@/lib/supabase/server";
import { EXAM } from "@/lib/exam";

/** Current user + profile + exam date (from admin settings). Redirects to /login when signed out. */
export async function requireSession() {
  const sb = serverSupabase();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) redirect("/login");
  const [{ data: profile }, { data: setting }] = await Promise.all([
    sb.from("profiles").select("full_name, role").eq("id", user.id).single(),
    sb.from("app_settings").select("value").eq("key", "exam_datetime").maybeSingle(),
  ]);
  const examDate = typeof setting?.value === "string" ? setting.value : EXAM.dateISO;
  return { user, profile, isAdmin: profile?.role === "admin", examDate };
}
