import { createFileRoute, Link } from "@tanstack/react-router";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";

export const Route = createFileRoute("/forgot-password")({
  head: () => ({
    meta: [
      { title: "Forgot Password | Dahabo Global Logistics" },
      { name: "description", content: "Request a password reset link for your Dahabo Global Logistics staff account." },
      { property: "og:title", content: "Forgot Password | Dahabo Global Logistics" },
      { property: "og:description", content: "Request a password reset link for your Dahabo Global Logistics staff account." },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <AuthLayout
      title="Reset your password"
      subtitle="We'll email you a secure reset link."
      footer={<Link to="/staff-login" className="font-semibold text-primary hover:text-gold">Back to sign in</Link>}
    >
      <form className="grid gap-4">
        <div className="grid gap-2"><Label htmlFor="e">Email</Label><Input id="e" type="email" placeholder="you@company.com" /></div>
        <Button asChild><Link to="/reset-password">Send reset link</Link></Button>
      </form>
    </AuthLayout>
  );
}
