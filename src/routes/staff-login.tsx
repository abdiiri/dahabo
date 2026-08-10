import { useState, type FormEvent } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/staff-login")({
  head: () => ({
    meta: [
      { title: "Staff Login | Dahabo Global Logistics" },
      { name: "description", content: "Secure sign in for Dahabo Global Logistics staff and operations teams." },
      { property: "og:title", content: "Staff Login | Dahabo Global Logistics" },
      { property: "og:description", content: "Secure sign in for Dahabo Global Logistics staff and operations teams." },
    ],
  }),
  component: Page,
});

function Page() {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
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
      title="Admin & Staff sign in"
      subtitle="Operations, finance, warehouse and fleet teams."
      footer={<>Trouble signing in? <Link to="/forgot-password" className="font-semibold text-primary hover:text-gold">Reset your password</Link> or contact your system administrator.</>}
    >
      <form className="grid gap-4" onSubmit={handleSubmit}>
        {error ? (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </div>
        ) : null}
        <div className="grid gap-2">
          <Label htmlFor="e">Work email</Label>
          <Input
            id="e"
            type="email"
            required
            autoComplete="email"
            placeholder="you@dahaboglobal.com"
            value={email}
            onChange={(ev) => setEmail(ev.target.value)}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="p">Password</Label>
          <Input
            id="p"
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(ev) => setPassword(ev.target.value)}
          />
        </div>
        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            <Checkbox defaultChecked /> Trust this device
          </label>
        </div>
        <Button type="submit" className="mt-1" disabled={submitting}>
          {submitting ? "Signing in…" : "Sign in"}
        </Button>
      </form>
    </AuthLayout>
  );
}
