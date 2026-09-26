"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Brand } from "@/components/brand";
import { Button, Card, Field } from "@/components/ui";
import { supabase } from "@/lib/supabase/client";
import { friendlyError } from "@/lib/rpc";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 8) return setError("Use at least 8 characters.");
    setLoading(true);
    const { error } = await supabase().auth.updateUser({ password });
    setLoading(false);
    if (error) return setError(friendlyError(error.message));
    router.replace("/dashboard");
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-8 px-4">
      <Brand />
      <Card className="w-full max-w-sm p-6">
        <form onSubmit={submit} className="space-y-4">
          <h1 className="text-lg font-semibold">Set a new password</h1>
          <Field label="New password"><input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className="w-full" autoComplete="new-password" /></Field>
          {error && <p className="text-xs text-bad">{error}</p>}
          <Button type="submit" loading={loading} className="w-full">Save password</Button>
        </form>
      </Card>
    </div>
  );
}
