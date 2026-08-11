import { useState, type FormEvent } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Reset Password | Dahabo Global Logistics" },
      { name: "description", content: "Set a new password for your Dahabo Global Logistics account." },
      { property: "og:title", content: "Reset Password | Dahabo Global Logistics" },
      { property: "og:description", content: "Set a new password for your Dahabo Global Logistics account." },
    ],
  }),
  component: Page,
});

function Page() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!supabase) {
      setError("No database is connected yet. Ask your administrator to finish the Supabase setup.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords don't match.");
      return;
    }

    setSubmitting(true);
    const { error } = await supabase.auth.updateUser({ password });
    setSubmitting(false);
    if (error) {
      setError(
        error.message.toLowerCase().includes("session")
          ? "This reset link has expired. Request a new one from the sign-in page."
          : error.message,
      );
      return;
    }
    navigate({ to: "/staff-login" });
  }

  return (
    <AuthLayout
      title="Set a new password"
      subtitle="Opened from your reset link."
      footer={<Link to="/staff-login" className="font-semibold text-primary hover:text-gold">Back to sign in</Link>}
    >
      <form className="grid gap-4" onSubmit={handleSubmit}>
        {error ? (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </div>
        ) : null}
        <div className="grid gap-2">
          <Label htmlFor="p1">New password</Label>
          <Input id="p1" type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="p2">Confirm password</Label>
          <Input id="p2" type="password" required minLength={8} value={confirm} onChange={(e) => setConfirm(e.target.value)} />
        </div>
        <Button type="submit" disabled={submitting}>{submitting ? "Saving…" : "Set new password"}</Button>
      </form>
    </AuthLayout>
  );
}
