"use client";
import Link from "next/link";
import { useState } from "react";
import { Button, Field } from "@/components/ui";
import { supabase } from "@/lib/supabase/client";
import { friendlyError } from "@/lib/rpc";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase().auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
    });
    setLoading(false);
    if (error) setError(friendlyError(error.message)); else setSent(true);
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Reset your password</h1>
        <p className="mt-1 text-sm text-fg-muted">We&apos;ll email you a link to set a new password.</p>
      </div>
      {sent ? (
        <p className="rounded-lg border border-ok/30 bg-ok-soft px-3 py-2 text-sm text-ok">If an account exists for {email}, a reset link is on its way.</p>
      ) : (
        <>
          <Field label="Email"><input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="w-full" /></Field>
          {error && <p className="rounded-lg border border-bad/30 bg-bad-soft px-3 py-2 text-xs text-bad">{error}</p>}
          <Button type="submit" loading={loading} className="w-full">Send reset link</Button>
        </>
      )}
      <p className="text-center text-xs"><Link href="/login" className="text-fg-muted hover:text-fg">Back to sign in</Link></p>
    </form>
  );
}
