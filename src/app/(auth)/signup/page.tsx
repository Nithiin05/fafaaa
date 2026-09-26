"use client";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { MailCheck } from "lucide-react";
import { Button, Field } from "@/components/ui";
import { supabase } from "@/lib/supabase/client";
import { friendlyError } from "@/lib/rpc";

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 8) return setError("Use at least 8 characters for your password.");
    setLoading(true);
    setError("");
    const { data, error } = await supabase().auth.signUp({
      email, password,
      options: { data: { full_name: name.trim() }, emailRedirectTo: `${window.location.origin}/auth/callback` },
    });
    setLoading(false);
    if (error) return setError(friendlyError(error.message));
    if (data.session) { router.replace("/dashboard"); router.refresh(); } else setSent(true);
  }

  if (sent) {
    return (
      <div className="space-y-3 text-center">
        <MailCheck className="mx-auto h-8 w-8 text-sky" />
        <h1 className="text-xl font-semibold">Check your email</h1>
        <p className="text-sm text-fg-muted">We sent a confirmation link to <b className="text-fg">{email}</b>. Open it to activate your account.</p>
        <Link href="/login" className="text-sm text-sky hover:underline">Back to sign in</Link>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Create your account</h1>
        <p className="mt-1 text-sm text-fg-muted">Your attempts, progress and mistakes are saved to your account.</p>
      </div>
      <Field label="Full name"><input required value={name} onChange={(e) => setName(e.target.value)} className="w-full" autoComplete="name" /></Field>
      <Field label="Email"><input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="w-full" autoComplete="email" /></Field>
      <Field label="Password" hint="At least 8 characters"><input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className="w-full" autoComplete="new-password" /></Field>
      {error && <p className="rounded-lg border border-bad/30 bg-bad-soft px-3 py-2 text-xs text-bad">{error}</p>}
      <Button type="submit" loading={loading} className="w-full">Sign up</Button>
      <p className="text-center text-xs text-fg-muted">Already registered? <Link href="/login" className="text-sky hover:underline">Sign in</Link></p>
    </form>
  );
}
