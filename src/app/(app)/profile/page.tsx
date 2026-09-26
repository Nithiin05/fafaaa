"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { Button, Card, CardHeader, Field, Loading, PageHeader } from "@/components/ui";
import { supabase } from "@/lib/supabase/client";
import { friendlyError } from "@/lib/rpc";
import { EXAM } from "@/lib/exam";
import { useExamDate } from "@/components/exam-date";

export default function ProfilePage() {
  const router = useRouter();
  const examDate = useExamDate();
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [uid, setUid] = useState("");
  const [name, setName] = useState("");
  const [targets, setTargets] = useState({ questions_per_day: 100, mocks_per_day: 1, topics_per_day: 2 });
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState<{ k: string; text: string; ok: boolean } | null>(null);
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const sb = supabase();
      const { data: { user } } = await sb.auth.getUser();
      if (!user) return;
      setEmail(user.email ?? ""); setUid(user.id);
      const [{ data: p }, { data: t }] = await Promise.all([
        sb.from("profiles").select("full_name").eq("id", user.id).single(),
        sb.from("daily_targets").select("questions_per_day, mocks_per_day, topics_per_day").eq("user_id", user.id).maybeSingle(),
      ]);
      setName(p?.full_name ?? "");
      if (t) setTargets(t);
      setLoading(false);
    })();
  }, []);

  const done = (k: string, error: { message: string } | null, okText: string) => {
    setSaving(null);
    setMsg({ k, ok: !error, text: error ? friendlyError(error.message) : okText });
  };

  async function saveName(e: React.FormEvent) {
    e.preventDefault(); setSaving("name");
    const { error } = await supabase().from("profiles").update({ full_name: name.trim() }).eq("id", uid);
    done("name", error, "Name updated."); router.refresh();
  }
  async function saveTargets(e: React.FormEvent) {
    e.preventDefault(); setSaving("targets");
    const { error } = await supabase().from("daily_targets").upsert({ user_id: uid, ...targets });
    done("targets", error, "Daily targets saved.");
  }
  async function savePassword(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 8) return setMsg({ k: "pw", ok: false, text: "Use at least 8 characters." });
    setSaving("pw");
    const { error } = await supabase().auth.updateUser({ password });
    setPassword(""); done("pw", error, "Password changed.");
  }
  async function signOut() {
    await supabase().auth.signOut(); router.replace("/login"); router.refresh();
  }

  if (loading) return <Loading />;
  const note = (k: string) => msg?.k === k && <p className={`text-xs ${msg.ok ? "text-ok" : "text-bad"}`}>{msg.text}</p>;

  return (
    <div className="animate-fade-up">
      <PageHeader title="Profile" subtitle={email} action={<Button variant="secondary" onClick={signOut}><LogOut className="h-4 w-4" />Sign out</Button>} />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Your details" />
          <form onSubmit={saveName} className="space-y-4 p-5">
            <Field label="Full name"><input value={name} onChange={(e) => setName(e.target.value)} className="w-full" required /></Field>
            <Field label="Email"><input value={email} disabled className="w-full opacity-60" /></Field>
            <div className="flex items-center gap-3"><Button type="submit" loading={saving === "name"}>Save</Button>{note("name")}</div>
          </form>
        </Card>

        <Card>
          <CardHeader title="Daily target" subtitle="Shown on your dashboard as today's progress" />
          <form onSubmit={saveTargets} className="space-y-4 p-5">
            <div className="grid grid-cols-3 gap-3">
              <Field label="Questions"><input type="number" min={1} max={1000} value={targets.questions_per_day} onChange={(e) => setTargets({ ...targets, questions_per_day: Number(e.target.value) })} className="w-full" /></Field>
              <Field label="Mock tests"><input type="number" min={0} max={5} value={targets.mocks_per_day} onChange={(e) => setTargets({ ...targets, mocks_per_day: Number(e.target.value) })} className="w-full" /></Field>
              <Field label="Topics"><input type="number" min={0} max={20} value={targets.topics_per_day} onChange={(e) => setTargets({ ...targets, topics_per_day: Number(e.target.value) })} className="w-full" /></Field>
            </div>
            <div className="flex items-center gap-3"><Button type="submit" loading={saving === "targets"}>Save targets</Button>{note("targets")}</div>
          </form>
        </Card>

        <Card>
          <CardHeader title="Change password" />
          <form onSubmit={savePassword} className="space-y-4 p-5">
            <Field label="New password" hint="At least 8 characters"><input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full" autoComplete="new-password" /></Field>
            <div className="flex items-center gap-3"><Button type="submit" variant="secondary" loading={saving === "pw"}>Update password</Button>{note("pw")}</div>
          </form>
        </Card>

        <Card>
          <CardHeader title="Exam" />
          <dl className="grid grid-cols-2 gap-3 p-5 text-sm">
            {[["Exam", EXAM.name], ["Date", new Date(examDate).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Kolkata" })], ["Questions", "120 (Part A 60, Part B 60)"], ["Duration", "120 minutes"], ["Marks", "120"], ["Negative marking", "None"]].map(([k, v]) => (
              <div key={k}><dt className="text-xs text-fg-subtle">{k}</dt><dd className="mt-0.5">{v}</dd></div>
            ))}
          </dl>
        </Card>
      </div>
    </div>
  );
}
