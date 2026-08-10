import { useState, type FormEvent } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/create-password")({
  head: () => ({
    meta: [
      { title: "Create Password | Dahabo Global Logistics" },
      { name: "description", content: "Set the password for your new Dahabo Global Logistics staff account." },
      { property: "og:title", content: "Create Password | Dahabo Global Logistics" },
      { property: "og:description", content: "Set the password for your new Dahabo Global Logistics staff account." },
    ],
  }),
  component: Page,
});

function Page() {
  const { user, profile, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!user || !supabase) {
      navigate({ to: "/staff-login" });
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
    const { error: updateAuthError } = await supabase.auth.updateUser({ password });
    if (updateAuthError) {
      setSubmitting(false);
      setError(updateAuthError.message);
      return;
    }

    const { error: updateProfileError } = await supabase
      .from("profiles")
      .update({ must_change_password: false })
      .eq("id", user.id);
    setSubmitting(false);
    if (updateProfileError) {
      setError(updateProfileError.message);
      return;
    }

    await refreshProfile();
    navigate({ to: profile?.role === "driver" ? "/driver" : "/staff" });
  }

  return (
    <AuthLayout
      title="Create your password"
      subtitle="Welcome to Dahabo — set a password to activate your account."
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
        <Button type="submit" disabled={submitting}>{submitting ? "Saving…" : "Activate account"}</Button>
      </form>
    </AuthLayout>
  );
}
