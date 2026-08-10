import { useState, type FormEvent } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/lock")({
  head: () => ({
    meta: [
      { title: "Screen Locked | Dahabo Global Logistics" },
      { name: "description", content: "Your session is locked. Enter your password to resume work." },
      { property: "og:title", content: "Screen Locked | Dahabo Global Logistics" },
      { property: "og:description", content: "Your session is locked. Enter your password to resume work." },
    ],
  }),
  component: Page,
});

function Page() {
  const { user, profile, signIn } = useAuth();
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const email = profile?.email ?? user?.email ?? "";

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!email) {
      navigate({ to: "/staff-login" });
      return;
    }
    setError(null);
    setSubmitting(true);
    const { error } = await signIn(email, password);
    setSubmitting(false);
    if (error) {
      setError(error);
      return;
    }
    navigate({ to: "/staff" });
  }

  return (
    <AuthLayout
      title="Session locked"
      subtitle={profile ? `${profile.fullName} · ${profile.roleLabel}` : "Enter your password to resume"}
      footer={<Link to="/staff-login" className="font-semibold text-primary hover:text-gold">Sign in as someone else</Link>}
    >
      <form className="grid gap-4" onSubmit={handleSubmit}>
        {error ? (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </div>
        ) : null}
        <div className="grid gap-2">
          <Label htmlFor="p">Password</Label>
          <Input id="p" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        <Button type="submit" disabled={submitting}>{submitting ? "Unlocking…" : "Unlock"}</Button>
      </form>
    </AuthLayout>
  );
}
