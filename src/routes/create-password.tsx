import { createFileRoute, Link } from "@tanstack/react-router";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";

export const Route = createFileRoute("/create-password")({
  head: () => ({
    meta: [
      { title: "Create Password | Dahabo Global Logistics" },
      { name: "description", content: "Set the password for your new Dahabo portal account." },
      { property: "og:title", content: "Create Password | Dahabo Global Logistics" },
      { property: "og:description", content: "Set the password for your new Dahabo portal account." },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <AuthLayout title="Create your password" subtitle="Welcome to Dahabo — set a password to activate your account."
      footer={<Link to="/login" className="font-semibold text-primary hover:text-gold">Back to sign in</Link>}>
      <form className="grid gap-4">
        <div className="grid gap-2"><Label htmlFor="p1">Password</Label><Input id="p1" type="password" /></div>
        <div className="grid gap-2"><Label htmlFor="p2">Confirm password</Label><Input id="p2" type="password" /></div>
        <label className="flex items-center gap-2 text-sm text-muted-foreground"><Checkbox /> I accept the terms of service</label>
        <Button asChild><Link to="/portal">Activate account</Link></Button>
      </form>
    </AuthLayout>
  );
}
