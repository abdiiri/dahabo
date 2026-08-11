import { useState, type FormEvent } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";

export const Route = createFileRoute("/forgot-password")({
  head: () => ({
    meta: [
      { title: "Forgot Password | Dahabo Global Logistics" },
      { name: "description", content: "Request a password reset link for your Dahabo Global Logistics account." },
      { property: "og:title", content: "Forgot Password | Dahabo Global Logistics" },
      { property: "og:description", content: "Request a password reset link for your Dahabo Global Logistics account." },
    ],
  }),
  component: Page,
});

function Page() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!isSupabaseConfigured || !supabase) {
      setError("No database is connected yet. Ask your administrator to finish the Supabase setup.");
      return;
    }

    setSubmitting(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setSubmitting(false);
    // Don't reveal whether the email exists — always show the same message.
    if (error) {
      setError(error.message);
      return;
    }
    setSent(true);
  }

  return (
    <AuthLayout
      title="Reset your password"
      subtitle="We'll email you a secure reset link."
      footer={<Link to="/staff-login" className="font-semibold text-primary hover:text-gold">Back to sign in</Link>}
    >
      {sent ? (
        <p className="text-sm text-muted-foreground">
          If an account exists for <span className="font-medium text-foreground">{email}</span>, a reset link is on
          its way. Check your inbox.
        </p>
      ) : (
        <form className="grid gap-4" onSubmit={handleSubmit}>
          {error ? (
            <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </div>
          ) : null}
          <div className="grid gap-2">
            <Label htmlFor="e">Email</Label>
            <Input
              id="e"
              type="email"
              required
              placeholder="you@company.com"
              value={email}
              onChange={(ev) => setEmail(ev.target.value)}
            />
          </div>
          <Button type="submit" disabled={submitting}>{submitting ? "Sending…" : "Send reset link"}</Button>
        </form>
      )}
    </AuthLayout>
  );
}
