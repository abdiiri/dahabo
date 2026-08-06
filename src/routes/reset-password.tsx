import { createFileRoute, Link } from "@tanstack/react-router";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Reset Password | Dahabo Global Logistics" },
      { name: "description", content: "Choose a new password for your Dahabo portal account." },
      { property: "og:title", content: "Reset Password | Dahabo Global Logistics" },
      { property: "og:description", content: "Choose a new password for your Dahabo portal account." },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <AuthLayout title="Choose a new password" subtitle="Use at least 10 characters with a number and a symbol."
      footer={<Link to="/login" className="font-semibold text-primary hover:text-gold">Back to sign in</Link>}>
      <form className="grid gap-4">
        <div className="grid gap-2"><Label htmlFor="p1">New password</Label><Input id="p1" type="password" /></div>
        <div className="grid gap-2"><Label htmlFor="p2">Confirm password</Label><Input id="p2" type="password" /></div>
        <Button asChild><Link to="/login">Update password</Link></Button>
      </form>
    </AuthLayout>
  );
}
