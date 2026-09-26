"use client";
import Link from "next/link";
import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button, Field } from "@/components/ui";
import { supabase } from "@/lib/supabase/client";
import { friendlyError } from "@/lib/rpc";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(params.get("error") === "link" ? "That link has expired. Please try again." : "");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const { error } = await supabase().auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) return setError(error.message === "Invalid login credentials" ? "Incorrect email or password." : friendlyError(error.message));
    router.replace(params.get("next") || "/dashboard");
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Welcome back</h1>
        <p className="mt-1 text-sm text-fg-muted">Sign in to continue your preparation.</p>
      </div>
      <Field label="Email"><input type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full" /></Field>
      <Field label="Password"><input type="password" required autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full" /></Field>
      {error && <p className="rounded-lg border border-bad/30 bg-bad-soft px-3 py-2 text-xs text-bad">{error}</p>}
      <Button type="submit" loading={loading} className="w-full">Sign in</Button>
      <div className="flex justify-between text-xs">
        <Link href="/forgot-password" className="text-fg-muted hover:text-fg">Forgot password?</Link>
        <Link href="/signup" className="text-sky hover:underline">Create an account</Link>
      </div>
    </form>
  );
}

export default function LoginPage() {
  return <Suspense><LoginForm /></Suspense>;
}
